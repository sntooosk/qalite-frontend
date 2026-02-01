import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  startAfter,
  updateDoc,
  type QueryDocumentSnapshot,
  type Unsubscribe,
  where,
  writeBatch,
} from 'firebase/firestore';

import type {
  CreateStorePayload,
  Store,
  StoreCategory,
  StoreCategoryInput,
  StoreExportPayload,
  StoreScenario,
  StoreScenarioInput,
  StoreSuite,
  StoreSuiteInput,
  UpdateStorePayload,
} from '../../domain/entities/store';
import {
  normalizeAutomationEnum,
  normalizeCriticalityEnum,
} from '../../shared/utils/scenarioEnums';
import { firebaseFirestore } from '../database/firebase';
import { CacheStore } from '../cache/CacheStore';
import { getDocCacheFirst, getDocsCacheFirst, getDocsCacheThenServer } from './firestoreCache';

const STORES_COLLECTION = 'stores';
const SCENARIOS_SUBCOLLECTION = 'scenarios';
const SUITES_SUBCOLLECTION = 'suites';
const CATEGORIES_SUBCOLLECTION = 'categories';
const STORE_CACHE = new CacheStore({ namespace: 'stores', version: 'v1', ttlMs: 1000 * 60 * 5 });
const STORE_LIST_CACHE_KEY = 'listSummary';
const STORE_DETAIL_CACHE_PREFIX = 'detail:';
const STORE_PAGE_SIZE = 50;

const timestampToDate = (value: unknown): Date | null => {
  if (value instanceof Timestamp) {
    return value.toDate();
  }

  return null;
};

const mapStore = (id: string, data: Record<string, unknown>): Store => ({
  id,
  organizationId: ((data.organizationId as string) ?? '').trim(),
  name: ((data.name as string) ?? '').trim(),
  site: ((data.site as string) ?? '').trim(),
  stage: ((data.stage as string) ?? '').trim(),
  scenarioCount: Number(data.scenarioCount ?? 0),
  createdAt: timestampToDate(data.createdAt),
  updatedAt: timestampToDate(data.updatedAt),
});

const mapScenario = (
  storeId: string,
  id: string,
  data: Record<string, unknown>,
): StoreScenario => ({
  id,
  storeId,
  title: ((data.title as string) ?? '').trim(),
  category: ((data.category as string) ?? '').trim(),
  automation: normalizeAutomationEnum((data.automation as string) ?? '') || '',
  criticality: normalizeCriticalityEnum((data.criticality as string) ?? '') || '',
  observation: ((data.observation as string) ?? '').trim(),
  bdd: ((data.bdd as string) ?? '').trim(),
  createdAt: timestampToDate(data.createdAt),
  updatedAt: timestampToDate(data.updatedAt),
});

const mapSuite = (storeId: string, id: string, data: Record<string, unknown>): StoreSuite => {
  const rawScenarioIds = Array.isArray(data.scenarioIds) ? (data.scenarioIds as string[]) : [];

  return {
    id,
    storeId,
    name: ((data.name as string) ?? '').trim(),
    description: ((data.description as string) ?? '').trim(),
    scenarioIds: rawScenarioIds
      .map((scenarioId) => scenarioId.trim())
      .filter((scenarioId) => scenarioId.length > 0),
    createdAt: timestampToDate(data.createdAt),
    updatedAt: timestampToDate(data.updatedAt),
  };
};

const mapCategory = (
  storeId: string,
  id: string,
  data: Record<string, unknown>,
): StoreCategory => ({
  id,
  storeId,
  name: ((data.name as string) ?? '').trim(),
  createdAt: timestampToDate(data.createdAt),
  updatedAt: timestampToDate(data.updatedAt),
});

const normalizeScenarioInput = (input: StoreScenarioInput): StoreScenarioInput => ({
  title: input.title.trim(),
  category: input.category.trim(),
  automation: normalizeAutomationEnum(input.automation.trim()),
  criticality: normalizeCriticalityEnum(input.criticality.trim()),
  observation: input.observation.trim(),
  bdd: input.bdd.trim(),
});

const normalizeSuiteInput = (input: StoreSuiteInput): StoreSuiteInput => ({
  name: input.name.trim(),
  description: input.description.trim(),
  scenarioIds: input.scenarioIds
    .map((scenarioId) => scenarioId.trim())
    .filter((scenarioId) => scenarioId.length > 0),
});

const normalizeCategoryInput = (input: StoreCategoryInput): StoreCategoryInput => ({
  name: input.name.trim(),
});

const listStoresFromServer = async (organizationId: string): Promise<Store[]> => {
  const storesCollection = collection(firebaseFirestore, STORES_COLLECTION);
  const storesQuery = query(
    storesCollection,
    where('organizationId', '==', organizationId),
    orderBy('name'),
  );

  const stores: Store[] = [];
  let lastDoc: QueryDocumentSnapshot | null = null;
  let hasMore = true;

  while (hasMore) {
    const pageQuery = lastDoc
      ? query(storesQuery, startAfter(lastDoc), limit(STORE_PAGE_SIZE))
      : query(storesQuery, limit(STORE_PAGE_SIZE));

    const snapshot = await getDocsCacheThenServer(pageQuery);

    snapshot.docs.forEach((docSnapshot) => {
      stores.push(mapStore(docSnapshot.id, docSnapshot.data({ serverTimestamps: 'estimate' })));
    });

    lastDoc = snapshot.docs[snapshot.docs.length - 1] ?? null;
    hasMore = Boolean(lastDoc && snapshot.size === STORE_PAGE_SIZE);
  }

  return stores;
};

export const listStoresSummary = async (organizationId: string): Promise<Store[]> => {
  const cacheKey = `${STORE_LIST_CACHE_KEY}:${organizationId}`;
  const cached = STORE_CACHE.getWithStatus<Store[]>(cacheKey);

  if (cached.value && !cached.isExpired) {
    return cached.value;
  }

  if (cached.value) {
    void listStoresFromServer(organizationId)
      .then((stores) => STORE_CACHE.set(cacheKey, stores))
      .catch((error) => console.error(error));
    return cached.value;
  }

  try {
    const stores = await listStoresFromServer(organizationId);
    STORE_CACHE.set(cacheKey, stores);
    return stores;
  } catch (error) {
    console.error(error);
    return [];
  }
};

export const listStores = listStoresSummary;

export const listenToStores = (
  organizationId: string,
  onChange: (stores: Store[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe => {
  const storesCollection = collection(firebaseFirestore, STORES_COLLECTION);
  const storesQuery = query(storesCollection, where('organizationId', '==', organizationId));

  return onSnapshot(
    storesQuery,
    (snapshot) => {
      // O listener sempre recalcula o array completo para manter a lista consistente no cliente.
      const stores = snapshot.docs.map((docSnapshot) =>
        mapStore(docSnapshot.id, docSnapshot.data({ serverTimestamps: 'estimate' })),
      );
      onChange(stores.sort((a, b) => a.name.localeCompare(b.name)));
    },
    (error) => {
      onError?.(error);
    },
  );
};

const getStoreFromServer = async (storeId: string): Promise<Store | null> => {
  const storeRef = doc(firebaseFirestore, STORES_COLLECTION, storeId);
  const snapshot = await getDocCacheFirst(storeRef);
  return snapshot.exists()
    ? mapStore(snapshot.id, snapshot.data({ serverTimestamps: 'estimate' }) ?? {})
    : null;
};

export const getStoreDetail = async (storeId: string): Promise<Store | null> => {
  if (!storeId) {
    return null;
  }

  const cacheKey = `${STORE_DETAIL_CACHE_PREFIX}${storeId}`;
  const cached = STORE_CACHE.getWithStatus<Store>(cacheKey);

  if (cached.value && !cached.isExpired) {
    return cached.value;
  }

  if (cached.value) {
    void getStoreFromServer(storeId)
      .then((store) => {
        if (store) {
          STORE_CACHE.set(cacheKey, store);
        } else {
          STORE_CACHE.remove(cacheKey);
        }
      })
      .catch((error) => console.error(error));
    return cached.value;
  }

  try {
    const store = await getStoreFromServer(storeId);
    if (store) {
      STORE_CACHE.set(cacheKey, store);
    }
    return store;
  } catch (error) {
    console.error(error);
    return null;
  }
};

export const getStore = getStoreDetail;

export const createStore = async (payload: CreateStorePayload): Promise<Store> => {
  const storesCollection = collection(firebaseFirestore, STORES_COLLECTION);
  const now = new Date();
  const docRef = await addDoc(storesCollection, {
    organizationId: payload.organizationId,
    name: payload.name.trim(),
    site: payload.site.trim(),
    stage: payload.stage.trim(),
    scenarioCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const store: Store = {
    id: docRef.id,
    organizationId: payload.organizationId,
    name: payload.name.trim(),
    site: payload.site.trim(),
    stage: payload.stage.trim(),
    scenarioCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  STORE_CACHE.set(`${STORE_DETAIL_CACHE_PREFIX}${store.id}`, store);
  STORE_CACHE.invalidatePrefix(`${STORE_LIST_CACHE_KEY}:`);

  return store;
};

export const updateStore = async (storeId: string, payload: UpdateStorePayload): Promise<Store> => {
  const storeRef = doc(firebaseFirestore, STORES_COLLECTION, storeId);
  await updateDoc(storeRef, {
    name: payload.name.trim(),
    site: payload.site.trim(),
    stage: payload.stage.trim(),
    updatedAt: serverTimestamp(),
  });

  const snapshot = await getDocCacheFirst(storeRef);
  const updated = mapStore(snapshot.id, snapshot.data({ serverTimestamps: 'estimate' }) ?? {});

  STORE_CACHE.set(`${STORE_DETAIL_CACHE_PREFIX}${storeId}`, updated);
  STORE_CACHE.invalidatePrefix(`${STORE_LIST_CACHE_KEY}:`);

  return updated;
};

export const deleteStore = async (storeId: string): Promise<void> => {
  const storeRef = doc(firebaseFirestore, STORES_COLLECTION, storeId);
  const snapshot = await getDoc(storeRef);

  if (!snapshot.exists()) {
    throw new Error('Loja não encontrada.');
  }

  const scenariosCollection = collection(storeRef, SCENARIOS_SUBCOLLECTION);
  const scenariosSnapshot = await getDocsCacheFirst(scenariosCollection);
  const categoriesCollection = collection(storeRef, CATEGORIES_SUBCOLLECTION);
  const categoriesSnapshot = await getDocsCacheFirst(categoriesCollection);

  const batch = writeBatch(firebaseFirestore);
  scenariosSnapshot.forEach((scenarioDoc) => {
    batch.delete(scenarioDoc.ref);
  });
  categoriesSnapshot.forEach((categoryDoc) => {
    batch.delete(categoryDoc.ref);
  });

  batch.delete(storeRef);
  await batch.commit();
  STORE_CACHE.remove(`${STORE_DETAIL_CACHE_PREFIX}${storeId}`);
  STORE_CACHE.invalidatePrefix(`${STORE_LIST_CACHE_KEY}:`);
};

export const listScenarios = async (storeId: string): Promise<StoreScenario[]> => {
  const storeRef = doc(firebaseFirestore, STORES_COLLECTION, storeId);
  const scenariosCollection = collection(storeRef, SCENARIOS_SUBCOLLECTION);
  const scenariosQuery = query(scenariosCollection, orderBy('title'));
  try {
    const snapshot = await getDocsCacheThenServer(scenariosQuery);
    return snapshot.docs.map((docSnapshot) =>
      mapScenario(storeId, docSnapshot.id, docSnapshot.data({ serverTimestamps: 'estimate' })),
    );
  } catch (error) {
    console.error(error);
    return [];
  }
};

export const createScenario = async (
  payload: { storeId: string } & StoreScenarioInput,
): Promise<StoreScenario> => {
  const { storeId, ...scenarioInput } = payload;
  const storeRef = doc(firebaseFirestore, STORES_COLLECTION, storeId);
  const scenariosCollection = collection(storeRef, SCENARIOS_SUBCOLLECTION);
  const normalizedScenario = normalizeScenarioInput(scenarioInput);
  const now = new Date();

  const scenarioRef = await runTransaction(firebaseFirestore, async (transaction) => {
    const storeSnapshot = await transaction.get(storeRef);

    if (!storeSnapshot.exists()) {
      throw new Error('Loja não encontrada.');
    }

    const newScenarioRef = doc(scenariosCollection);
    transaction.set(newScenarioRef, {
      ...normalizedScenario,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const currentCount = Number(
      storeSnapshot.data({ serverTimestamps: 'estimate' })?.scenarioCount ?? 0,
    );
    transaction.update(storeRef, {
      scenarioCount: currentCount + 1,
      updatedAt: serverTimestamp(),
    });

    return newScenarioRef;
  });

  const scenario: StoreScenario = {
    id: scenarioRef.id,
    storeId,
    title: normalizedScenario.title,
    category: normalizedScenario.category,
    automation: normalizedScenario.automation || '',
    criticality: normalizedScenario.criticality || '',
    observation: normalizedScenario.observation,
    bdd: normalizedScenario.bdd,
    createdAt: now,
    updatedAt: now,
  };

  STORE_CACHE.remove(`${STORE_DETAIL_CACHE_PREFIX}${storeId}`);
  STORE_CACHE.invalidatePrefix(`${STORE_LIST_CACHE_KEY}:`);

  return scenario;
};

export const updateScenario = async (
  storeId: string,
  scenarioId: string,
  payload: StoreScenarioInput,
): Promise<StoreScenario> => {
  const storeRef = doc(firebaseFirestore, STORES_COLLECTION, storeId);
  const scenarioRef = doc(storeRef, SCENARIOS_SUBCOLLECTION, scenarioId);

  await updateDoc(scenarioRef, {
    ...normalizeScenarioInput(payload),
    updatedAt: serverTimestamp(),
  });

  await updateDoc(storeRef, { updatedAt: serverTimestamp() });

  const scenarioSnapshot = await getDocCacheFirst(scenarioRef);
  const updatedScenario = mapScenario(
    storeId,
    scenarioSnapshot.id,
    scenarioSnapshot.data({ serverTimestamps: 'estimate' }) ?? {},
  );

  return updatedScenario;
};

export const deleteScenario = async (storeId: string, scenarioId: string): Promise<void> => {
  const storeRef = doc(firebaseFirestore, STORES_COLLECTION, storeId);
  const scenarioRef = doc(storeRef, SCENARIOS_SUBCOLLECTION, scenarioId);

  await runTransaction(firebaseFirestore, async (transaction) => {
    const storeSnapshot = await transaction.get(storeRef);
    if (!storeSnapshot.exists()) {
      throw new Error('Loja não encontrada.');
    }

    transaction.delete(scenarioRef);

    const currentCount = Number(
      storeSnapshot.data({ serverTimestamps: 'estimate' })?.scenarioCount ?? 0,
    );
    transaction.update(storeRef, {
      scenarioCount: Math.max(currentCount - 1, 0),
      updatedAt: serverTimestamp(),
    });
  });

  STORE_CACHE.remove(`${STORE_DETAIL_CACHE_PREFIX}${storeId}`);
  STORE_CACHE.invalidatePrefix(`${STORE_LIST_CACHE_KEY}:`);
};

export const listSuites = async (storeId: string): Promise<StoreSuite[]> => {
  const storeRef = doc(firebaseFirestore, STORES_COLLECTION, storeId);
  const suitesCollection = collection(storeRef, SUITES_SUBCOLLECTION);
  const suitesQuery = query(suitesCollection, orderBy('name'));
  try {
    const snapshot = await getDocsCacheThenServer(suitesQuery);
    return snapshot.docs.map((docSnapshot) =>
      mapSuite(storeId, docSnapshot.id, docSnapshot.data({ serverTimestamps: 'estimate' })),
    );
  } catch (error) {
    console.error(error);
    return [];
  }
};

export const createSuite = async (
  payload: { storeId: string } & StoreSuiteInput,
): Promise<StoreSuite> => {
  const storeRef = doc(firebaseFirestore, STORES_COLLECTION, payload.storeId);
  const storeSnapshot = await getDocCacheFirst(storeRef);

  if (!storeSnapshot.exists()) {
    throw new Error('Loja não encontrada.');
  }

  const suitesCollection = collection(storeRef, SUITES_SUBCOLLECTION);
  const normalized = normalizeSuiteInput(payload);
  const now = new Date();
  const suiteRef = await addDoc(suitesCollection, {
    ...normalized,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return {
    id: suiteRef.id,
    storeId: payload.storeId,
    name: normalized.name,
    description: normalized.description,
    scenarioIds: normalized.scenarioIds,
    createdAt: now,
    updatedAt: now,
  };
};

export const updateSuite = async (
  storeId: string,
  suiteId: string,
  payload: StoreSuiteInput,
): Promise<StoreSuite> => {
  const storeRef = doc(firebaseFirestore, STORES_COLLECTION, storeId);
  const suiteRef = doc(storeRef, SUITES_SUBCOLLECTION, suiteId);
  const suiteSnapshot = await getDocCacheFirst(suiteRef);

  if (!suiteSnapshot.exists()) {
    throw new Error('Suite de testes não encontrada.');
  }

  await updateDoc(suiteRef, {
    ...normalizeSuiteInput(payload),
    updatedAt: serverTimestamp(),
  });

  const updatedSnapshot = await getDocCacheFirst(suiteRef);
  const updatedSuite = mapSuite(
    storeId,
    updatedSnapshot.id,
    updatedSnapshot.data({ serverTimestamps: 'estimate' }) ?? {},
  );

  return updatedSuite;
};

export const deleteSuite = async (storeId: string, suiteId: string): Promise<void> => {
  const storeRef = doc(firebaseFirestore, STORES_COLLECTION, storeId);
  const suiteRef = doc(storeRef, SUITES_SUBCOLLECTION, suiteId);
  const snapshot = await getDocCacheFirst(suiteRef);

  if (!snapshot.exists()) {
    throw new Error('Suite de testes não encontrada.');
  }

  await deleteDoc(suiteRef);
};

export const listCategories = async (storeId: string): Promise<StoreCategory[]> => {
  const storeRef = doc(firebaseFirestore, STORES_COLLECTION, storeId);
  const categoriesCollection = collection(storeRef, CATEGORIES_SUBCOLLECTION);
  const categoriesQuery = query(categoriesCollection, orderBy('searchName'));
  try {
    const snapshot = await getDocsCacheThenServer(categoriesQuery);
    return snapshot.docs.map((docSnapshot) =>
      mapCategory(storeId, docSnapshot.id, docSnapshot.data({ serverTimestamps: 'estimate' })),
    );
  } catch (error) {
    console.error(error);
    return [];
  }
};

export const createCategory = async (
  payload: { storeId: string } & StoreCategoryInput,
): Promise<StoreCategory> => {
  const storeRef = doc(firebaseFirestore, STORES_COLLECTION, payload.storeId);
  const storeSnapshot = await getDocCacheFirst(storeRef);

  if (!storeSnapshot.exists()) {
    throw new Error('Loja não encontrada.');
  }

  const { name } = normalizeCategoryInput(payload);
  if (!name) {
    throw new Error('Informe o nome da categoria.');
  }

  const searchName = name.toLowerCase();
  const categoriesCollection = collection(storeRef, CATEGORIES_SUBCOLLECTION);
  const existingQuery = query(categoriesCollection, where('searchName', '==', searchName));
  const existingSnapshot = await getDocsCacheFirst(existingQuery);

  if (!existingSnapshot.empty) {
    throw new Error('Já existe uma categoria com este nome.');
  }

  const categoryRef = await addDoc(categoriesCollection, {
    name,
    searchName,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const now = new Date();
  return {
    id: categoryRef.id,
    storeId: payload.storeId,
    name,
    createdAt: now,
    updatedAt: now,
  };
};

export const updateCategory = async (
  storeId: string,
  categoryId: string,
  payload: StoreCategoryInput,
): Promise<StoreCategory> => {
  const storeRef = doc(firebaseFirestore, STORES_COLLECTION, storeId);
  const categoryRef = doc(storeRef, CATEGORIES_SUBCOLLECTION, categoryId);
  const categorySnapshot = await getDocCacheFirst(categoryRef);

  if (!categorySnapshot.exists()) {
    throw new Error('Categoria não encontrada.');
  }

  const previousName = (
    (categorySnapshot.data({ serverTimestamps: 'estimate' })?.name as string) ?? ''
  ).trim();
  const { name } = normalizeCategoryInput(payload);
  if (!name) {
    throw new Error('Informe o nome da categoria.');
  }

  const searchName = name.toLowerCase();
  const categoriesCollection = collection(storeRef, CATEGORIES_SUBCOLLECTION);
  const existingQuery = query(categoriesCollection, where('searchName', '==', searchName));
  const existingSnapshot = await getDocsCacheFirst(existingQuery);
  const duplicated = existingSnapshot.docs.some((docSnapshot) => docSnapshot.id !== categoryId);

  if (duplicated) {
    throw new Error('Já existe uma categoria com este nome.');
  }

  await updateDoc(categoryRef, {
    name,
    searchName,
    updatedAt: serverTimestamp(),
  });

  if (previousName && previousName !== name) {
    await updateScenarioCategories(storeId, previousName, name);
  }

  const updatedSnapshot = await getDocCacheFirst(categoryRef);
  return mapCategory(
    storeId,
    updatedSnapshot.id,
    updatedSnapshot.data({ serverTimestamps: 'estimate' }) ?? {},
  );
};

export const deleteCategory = async (
  storeId: string,
  categoryId: string,
  options: { allowDeleteWithScenarios?: boolean } = {},
): Promise<void> => {
  const storeRef = doc(firebaseFirestore, STORES_COLLECTION, storeId);
  const categoryRef = doc(storeRef, CATEGORIES_SUBCOLLECTION, categoryId);
  const snapshot = await getDocCacheFirst(categoryRef);

  if (!snapshot.exists()) {
    throw new Error('Categoria não encontrada.');
  }

  if (!options.allowDeleteWithScenarios) {
    const scenariosCollection = collection(storeRef, SCENARIOS_SUBCOLLECTION);
    const scenariosQuery = query(
      scenariosCollection,
      where('category', '==', snapshot.data({ serverTimestamps: 'estimate' })?.name),
    );
    const scenariosSnapshot = await getDocsCacheFirst(scenariosQuery);

    if (!scenariosSnapshot.empty) {
      throw new Error(
        'Não é possível remover uma categoria associada a cenários. Atualize ou remova os cenários primeiro.',
      );
    }
  }

  await deleteDoc(categoryRef);
};

const updateScenarioCategories = async (
  storeId: string,
  previousName: string,
  newName: string,
): Promise<void> => {
  const storeRef = doc(firebaseFirestore, STORES_COLLECTION, storeId);
  const scenariosCollection = collection(storeRef, SCENARIOS_SUBCOLLECTION);
  const scenariosQuery = query(scenariosCollection, where('category', '==', previousName));
  const snapshot = await getDocsCacheFirst(scenariosQuery);

  if (snapshot.empty) {
    return;
  }

  const batch = writeBatch(firebaseFirestore);
  snapshot.forEach((docSnapshot) => {
    batch.update(docSnapshot.ref, {
      category: newName,
      updatedAt: serverTimestamp(),
    });
  });

  await batch.commit();
};

export const exportStoreData = async (storeId: string): Promise<StoreExportPayload> => {
  const store = await getStore(storeId);

  if (!store) {
    throw new Error('Loja não encontrada.');
  }

  const scenarios = await listScenarios(storeId);
  return {
    store: {
      id: store.id,
      name: store.name,
      site: store.site,
      stage: store.stage,
      scenarioCount: scenarios.length,
    },
    exportedAt: new Date().toISOString(),
    scenarios,
  };
};
