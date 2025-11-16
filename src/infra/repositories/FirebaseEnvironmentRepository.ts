import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  type QueryConstraint,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import type {
  CreateEnvironmentInput,
  Environment,
  EnvironmentScenario,
  EnvironmentScenarioStatus,
  EnvironmentStatus,
  UpdateEnvironmentInput,
} from '../../domain/entities/Environment';
import type {
  EnvironmentRealtimeFilters,
  IEnvironmentRepository,
} from '../../domain/repositories/EnvironmentRepository';
import { firebaseFirestore, firebaseStorage } from '../firebase/firebaseConfig';

const ENVIRONMENTS_COLLECTION = 'environments';
const ACCEPTED_EVIDENCE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'application/pdf',
  'video/mp4',
  'video/quicktime',
  'application/zip',
  'application/x-zip-compressed',
];

const environmentsCollection = collection(firebaseFirestore, ENVIRONMENTS_COLLECTION);

const FIRESTORE_TO_DOMAIN_SCENARIO_STATUS: Record<string, EnvironmentScenarioStatus> = {
  pendente: 'pending',
  em_andamento: 'in_progress',
  concluido: 'done',
  concluido_automatizado: 'automated_done',
  nao_se_aplica: 'not_applicable',
};

const DOMAIN_TO_FIRESTORE_SCENARIO_STATUS: Record<EnvironmentScenarioStatus, string> = {
  pending: 'pendente',
  in_progress: 'em_andamento',
  done: 'concluido',
  automated_done: 'concluido_automatizado',
  not_applicable: 'nao_se_aplica',
};

const DEFAULT_SCENARIO: EnvironmentScenario = {
  title: '',
  category: '',
  criticality: '',
  status: 'pending',
  evidenceFileUrl: null,
};

const getString = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback;

const getStringOrNull = (value: unknown): string | null =>
  typeof value === 'string' ? value : null;

const getStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
    : [];

const parseTimestamp = (value: Timestamp | string | null | undefined): string | null => {
  if (!value) {
    return null;
  }

  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }

  return typeof value === 'string' ? value : null;
};

const parseScenarioMap = (
  data: Record<string, unknown> | undefined,
): Record<string, EnvironmentScenario> => {
  if (!data) {
    return {};
  }

  return Object.entries(data).reduce<Record<string, EnvironmentScenario>>((acc, [id, value]) => {
    if (typeof value !== 'object' || value === null) {
      acc[id] = { ...DEFAULT_SCENARIO };
      return acc;
    }

    const entry = value as Record<string, unknown>;
    acc[id] = {
      title: getString(entry.titulo ?? entry.title),
      category: getString(entry.categoria ?? entry.category),
      criticality: getString(entry.criticidade ?? entry.criticality),
      status: FIRESTORE_TO_DOMAIN_SCENARIO_STATUS[String(entry.status)] ?? DEFAULT_SCENARIO.status,
      evidenceFileUrl: getStringOrNull(entry.evidenciaArquivoUrl ?? entry.evidenceFileUrl),
    };
    return acc;
  }, {});
};

const normalizeEnvironment = (id: string, data: Record<string, unknown>): Environment => ({
  id,
  identifier: getString(data.identifier ?? data.identificador),
  storeId: getString(data.storeId ?? data.loja),
  suiteId: getStringOrNull(data.suiteId ?? data.suite),
  suiteName: getStringOrNull(data.suiteName ?? data.nomeSuite),
  urls: getStringArray(data.urls),
  jiraTask: getString(data.jiraTask),
  environmentType: getString(data.environmentType ?? data.tipoAmbiente),
  testType: getString(data.testType ?? data.tipoTeste),
  status: (data.status ?? 'backlog') as EnvironmentStatus,
  createdAt: parseTimestamp(data.createdAt as Timestamp | string | null | undefined) ?? null,
  updatedAt: parseTimestamp(data.updatedAt as Timestamp | string | null | undefined) ?? null,
  timeTracking: {
    start: parseTimestamp(
      (data.timeTracking as Record<string, unknown> | undefined)?.start as
        | Timestamp
        | string
        | null
        | undefined,
    ),
    end: parseTimestamp(
      (data.timeTracking as Record<string, unknown> | undefined)?.end as
        | Timestamp
        | string
        | null
        | undefined,
    ),
    totalMs: Number(
      typeof (data.timeTracking as Record<string, unknown> | undefined)?.totalMs === 'number'
        ? (data.timeTracking as Record<string, unknown>).totalMs
        : ((data.timeTracking as Record<string, unknown> | undefined)?.totalMs ?? 0),
    ),
  },
  presentUsersIds: getStringArray(data.presentUsersIds),
  concludedBy: getStringOrNull(data.concludedBy),
  scenarios: parseScenarioMap(data.scenarios as Record<string, unknown> | undefined),
  bugs: Number(data.bugs ?? 0),
  totalScenarios: Number(data.totalScenarios ?? data.totalCenarios ?? 0),
  participants: getStringArray(data.participants),
});

const updateScenarioField = async (
  environmentId: string,
  scenarioId: string,
  updates: Partial<Pick<EnvironmentScenario, 'status' | 'evidenceFileUrl'>>,
) => {
  const environmentRef = doc(firebaseFirestore, ENVIRONMENTS_COLLECTION, environmentId);
  const firestoreUpdates: Record<string, unknown> = {};

  if (updates.status) {
    firestoreUpdates[`scenarios.${scenarioId}.status`] =
      DOMAIN_TO_FIRESTORE_SCENARIO_STATUS[updates.status] ??
      DOMAIN_TO_FIRESTORE_SCENARIO_STATUS.pending;
  }

  if (updates.evidenceFileUrl !== undefined) {
    firestoreUpdates[`scenarios.${scenarioId}.evidenciaArquivoUrl`] = updates.evidenceFileUrl;
  }

  await updateDoc(environmentRef, {
    ...firestoreUpdates,
    updatedAt: serverTimestamp(),
  });
};

const mapScenarioToFirestore = (scenario: EnvironmentScenario): Record<string, unknown> => ({
  titulo: scenario.title,
  categoria: scenario.category,
  criticidade: scenario.criticality,
  status: DOMAIN_TO_FIRESTORE_SCENARIO_STATUS[scenario.status] ?? 'pendente',
  evidenciaArquivoUrl: scenario.evidenceFileUrl,
});

const mapScenariosToFirestore = (
  scenarios: Record<string, EnvironmentScenario>,
): Record<string, unknown> =>
  Object.entries(scenarios).reduce<Record<string, unknown>>((acc, [id, scenario]) => {
    acc[id] = mapScenarioToFirestore(scenario);
    return acc;
  }, {});

const mapEnvironmentPayloadToFirestore = (
  payload: Partial<CreateEnvironmentInput> | UpdateEnvironmentInput,
): Record<string, unknown> => {
  const data: Record<string, unknown> = {};
  const assignIfDefined = (key: string, value: unknown): void => {
    if (value !== undefined) {
      data[key] = value;
    }
  };

  if ('identifier' in payload) {
    assignIfDefined('identifier', payload.identifier);
    assignIfDefined('identificador', payload.identifier);
  }

  if ('storeId' in payload) {
    assignIfDefined('storeId', payload.storeId);
    assignIfDefined('loja', payload.storeId);
  }

  if ('suiteId' in payload) {
    assignIfDefined('suiteId', payload.suiteId);
    assignIfDefined('suite', payload.suiteId);
  }

  if ('suiteName' in payload) {
    assignIfDefined('suiteName', payload.suiteName);
    assignIfDefined('nomeSuite', payload.suiteName);
  }

  if ('urls' in payload) {
    assignIfDefined('urls', payload.urls);
  }

  if ('jiraTask' in payload) {
    assignIfDefined('jiraTask', payload.jiraTask);
  }

  if ('environmentType' in payload) {
    assignIfDefined('environmentType', payload.environmentType);
    assignIfDefined('tipoAmbiente', payload.environmentType);
  }

  if ('testType' in payload) {
    assignIfDefined('testType', payload.testType);
    assignIfDefined('tipoTeste', payload.testType);
  }

  if ('status' in payload) {
    assignIfDefined('status', payload.status);
  }

  if ('timeTracking' in payload) {
    assignIfDefined('timeTracking', payload.timeTracking);
  }

  if ('presentUsersIds' in payload) {
    assignIfDefined('presentUsersIds', payload.presentUsersIds);
  }

  if ('concludedBy' in payload) {
    assignIfDefined('concludedBy', payload.concludedBy);
  }

  if ('scenarios' in payload && payload.scenarios) {
    assignIfDefined('scenarios', mapScenariosToFirestore(payload.scenarios));
  }

  if ('bugs' in payload) {
    assignIfDefined('bugs', payload.bugs);
  }

  if ('totalScenarios' in payload) {
    assignIfDefined('totalScenarios', payload.totalScenarios);
    assignIfDefined('totalCenarios', payload.totalScenarios);
  }

  if ('participants' in payload) {
    assignIfDefined('participants', payload.participants);
  }

  return data;
};

export class FirebaseEnvironmentRepository implements IEnvironmentRepository {
  create = async (payload: CreateEnvironmentInput): Promise<Environment> => {
    const docRef = await addDoc(environmentsCollection, {
      ...mapEnvironmentPayloadToFirestore(payload),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const snapshot = await getDoc(docRef);
    return normalizeEnvironment(snapshot.id, (snapshot.data() ?? {}) as Record<string, unknown>);
  };

  update = async (environmentId: string, payload: UpdateEnvironmentInput): Promise<void> => {
    const environmentRef = doc(firebaseFirestore, ENVIRONMENTS_COLLECTION, environmentId);
    const data: Record<string, unknown> = {
      ...mapEnvironmentPayloadToFirestore(payload),
      updatedAt: serverTimestamp(),
    };

    await updateDoc(environmentRef, data);
  };

  delete = async (environmentId: string): Promise<void> => {
    const environmentRef = doc(firebaseFirestore, ENVIRONMENTS_COLLECTION, environmentId);
    await deleteDoc(environmentRef);
  };

  observeById = (
    environmentId: string,
    callback: (environment: Environment | null) => void,
  ): (() => void) => {
    const environmentRef = doc(firebaseFirestore, ENVIRONMENTS_COLLECTION, environmentId);
    return onSnapshot(environmentRef, (snapshot) => {
      if (!snapshot.exists()) {
        callback(null);
        return;
      }

      callback(normalizeEnvironment(snapshot.id, snapshot.data() ?? {}));
    });
  };

  observeAll = (
    filters: EnvironmentRealtimeFilters,
    callback: (environments: Environment[]) => void,
  ): (() => void) => {
    const constraints: QueryConstraint[] = [];

    if (filters.storeId) {
      constraints.push(where('loja', '==', filters.storeId));
    }

    const environmentsQuery =
      constraints.length > 0
        ? query(environmentsCollection, ...constraints)
        : environmentsCollection;

    return onSnapshot(environmentsQuery, (snapshot) => {
      const list = snapshot.docs
        .map((docSnapshot) => normalizeEnvironment(docSnapshot.id, docSnapshot.data() ?? {}))
        .sort((a, b) => {
          const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return bDate - aDate;
        });

      callback(list);
    });
  };

  addUser = async (environmentId: string, userId: string): Promise<void> => {
    const environmentRef = doc(firebaseFirestore, ENVIRONMENTS_COLLECTION, environmentId);
    await runTransaction(firebaseFirestore, async (transaction) => {
      const snapshot = await transaction.get(environmentRef);
      if (!snapshot.exists()) {
        throw new Error('Environment not found.');
      }

      const data = snapshot.data();
      if (data.status === 'done') {
        throw new Error('Environment already finished.');
      }

      const presentUsers: string[] = data.presentUsersIds ?? [];
      const participants: string[] = data.participants ?? [];

      if (presentUsers.includes(userId)) {
        return;
      }

      transaction.update(environmentRef, {
        presentUsersIds: [...presentUsers, userId],
        participants: participants.includes(userId) ? participants : [...participants, userId],
        updatedAt: serverTimestamp(),
      });
    });
  };

  removeUser = async (environmentId: string, userId: string): Promise<void> => {
    const environmentRef = doc(firebaseFirestore, ENVIRONMENTS_COLLECTION, environmentId);
    await runTransaction(firebaseFirestore, async (transaction) => {
      const snapshot = await transaction.get(environmentRef);
      if (!snapshot.exists()) {
        return;
      }

      const presentUsers: string[] = snapshot.data()?.presentUsersIds ?? [];
      transaction.update(environmentRef, {
        presentUsersIds: presentUsers.filter((id) => id !== userId),
        updatedAt: serverTimestamp(),
      });
    });
  };

  updateScenarioStatus = async (
    environmentId: string,
    scenarioId: string,
    status: EnvironmentScenarioStatus,
  ): Promise<void> => {
    await updateScenarioField(environmentId, scenarioId, { status });
  };

  uploadScenarioEvidence = async (
    environmentId: string,
    scenarioId: string,
    file: File,
  ): Promise<string> => {
    if (!ACCEPTED_EVIDENCE_TYPES.includes(file.type)) {
      throw new Error('Unsupported file format.');
    }

    const path = `environments/${environmentId}/scenarios/${scenarioId}/${Date.now()}-${file.name}`;
    const storageRef = ref(firebaseStorage, path);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    await updateScenarioField(environmentId, scenarioId, { evidenceFileUrl: url });
    return url;
  };
}
