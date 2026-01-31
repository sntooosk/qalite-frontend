import {
  Timestamp,
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  documentId,
  getDoc,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  startAfter,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';

import type { BrowserstackCredentials } from '../../domain/entities/browserstack';
import type {
  Organization,
  OrganizationListCursor,
  OrganizationMember,
  OrganizationSummary,
} from '../../domain/entities/organization';
import type { PaginatedResult, PaginationParams } from '../../domain/pagination';
import { getNormalizedEmailDomain, normalizeEmailDomain } from '../../shared/utils/email';
import { firebaseFirestore } from '../database/firebase';
import {
  getDocCacheFirst,
  getDocCacheThenServer,
  getDocsCacheFirst,
  getDocsCacheThenServer,
} from './firestoreCache';

const ORGANIZATIONS_COLLECTION = 'organizations';
const USERS_COLLECTION = 'users';

export interface CreateOrganizationPayload {
  name: string;
  description: string;
  slackWebhookUrl?: string | null;
  emailDomain?: string | null;
  browserstackCredentials?: BrowserstackCredentials | null;
}

export interface UpdateOrganizationPayload {
  name: string;
  description: string;
  slackWebhookUrl?: string | null;
  emailDomain?: string | null;
  browserstackCredentials?: BrowserstackCredentials | null;
}

export interface AddUserToOrganizationPayload {
  organizationId: string;
  userEmail: string;
}

export interface RemoveUserFromOrganizationPayload {
  organizationId: string;
  userId: string;
}

const organizationsCollection = collection(firebaseFirestore, ORGANIZATIONS_COLLECTION);

const normalizeBrowserstackCredentials = (
  credentials: BrowserstackCredentials | null | undefined,
): BrowserstackCredentials | null => {
  const username = credentials?.username?.trim() || '';
  const accessKey = credentials?.accessKey?.trim() || '';

  if (!username && !accessKey) {
    return null;
  }

  return { username, accessKey };
};

export const listOrganizationSummaries = async (
  pagination: PaginationParams<OrganizationListCursor>,
): Promise<PaginatedResult<OrganizationSummary, OrganizationListCursor>> => {
  const organizationsQuery = query(
    organizationsCollection,
    orderBy('name'),
    orderBy('__name__'),
    ...(pagination.cursor ? [startAfter(pagination.cursor.name, pagination.cursor.id)] : []),
    limit(pagination.limit),
  );

  try {
    const snapshot = await getDocsCacheThenServer(organizationsQuery);
    const organizations = snapshot.docs.map((docSnapshot) =>
      mapOrganizationSummary(docSnapshot.id, docSnapshot.data({ serverTimestamps: 'estimate' })),
    );
    const last = organizations.at(-1);
    return {
      items: organizations,
      nextCursor: last ? { name: last.name, id: last.id } : null,
    };
  } catch (error) {
    console.error(error);
    return { items: [], nextCursor: null };
  }
};

export const getOrganizationDetail = async (id: string): Promise<Organization | null> => {
  const organizationRef = doc(firebaseFirestore, ORGANIZATIONS_COLLECTION, id);
  try {
    const snapshot = await getDocCacheThenServer(organizationRef);

    if (!snapshot.exists()) {
      return null;
    }

    return mapOrganization(snapshot.id, snapshot.data({ serverTimestamps: 'estimate' }));
  } catch (error) {
    console.error(error);
    return null;
  }
};

export const createOrganization = async (
  payload: CreateOrganizationPayload,
): Promise<Organization> => {
  const trimmedName = payload.name.trim();
  const trimmedDescription = payload.description.trim();
  const slackWebhookUrl = payload.slackWebhookUrl?.trim() || null;
  const emailDomain = normalizeEmailDomain(payload.emailDomain);
  const browserstackCredentials = normalizeBrowserstackCredentials(payload.browserstackCredentials);

  const docRef = await addDoc(organizationsCollection, {
    name: trimmedName,
    description: trimmedDescription,
    logoUrl: null,
    slackWebhookUrl,
    emailDomain,
    browserstackCredentials,
    members: [],
    memberCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const snapshot = await getDocCacheFirst(docRef);
  return mapOrganization(snapshot.id, snapshot.data({ serverTimestamps: 'estimate' }) ?? {});
};

export const updateOrganization = async (
  id: string,
  payload: UpdateOrganizationPayload,
): Promise<Organization> => {
  const organizationRef = doc(firebaseFirestore, ORGANIZATIONS_COLLECTION, id);
  const browserstackCredentials = normalizeBrowserstackCredentials(payload.browserstackCredentials);

  const updatePayload: Record<string, unknown> = {
    name: payload.name.trim(),
    description: payload.description.trim(),
    slackWebhookUrl: payload.slackWebhookUrl?.trim() || null,
    emailDomain: normalizeEmailDomain(payload.emailDomain),
    updatedAt: serverTimestamp(),
  };

  if (payload.browserstackCredentials !== undefined) {
    updatePayload.browserstackCredentials = browserstackCredentials;
  }

  await updateDoc(organizationRef, updatePayload);

  const snapshot = await getDocCacheFirst(organizationRef);
  return mapOrganization(snapshot.id, snapshot.data({ serverTimestamps: 'estimate' }) ?? {});
};

export const deleteOrganization = async (id: string): Promise<void> => {
  const organizationRef = doc(firebaseFirestore, ORGANIZATIONS_COLLECTION, id);
  const snapshot = await getDoc(organizationRef);

  if (!snapshot.exists()) {
    throw new Error('Organização não encontrada.');
  }

  const members =
    (snapshot.data({ serverTimestamps: 'estimate' })?.members as string[] | undefined) ?? [];
  const batch = writeBatch(firebaseFirestore);

  members.forEach((memberId) => {
    const userRef = doc(firebaseFirestore, USERS_COLLECTION, memberId);
    batch.set(
      userRef,
      {
        organizationId: null,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  });

  batch.delete(organizationRef);
  await batch.commit();
};

export const addUserToOrganization = async (
  payload: AddUserToOrganizationPayload,
): Promise<OrganizationMember> => {
  const normalizedEmail = payload.userEmail.trim().toLowerCase();
  if (!normalizedEmail) {
    throw new Error('Informe um e-mail válido.');
  }

  const usersRef = collection(firebaseFirestore, USERS_COLLECTION);
  const userQuery = query(usersRef, where('email', '==', normalizedEmail), limit(1));
  const userQuerySnapshot = await getDocsCacheFirst(userQuery);

  if (userQuerySnapshot.empty) {
    throw new Error('Usuário não encontrado.');
  }

  const userRef = userQuerySnapshot.docs[0].ref;

  const member = await runTransaction(firebaseFirestore, async (transaction) => {
    const organizationRef = doc(
      firebaseFirestore,
      ORGANIZATIONS_COLLECTION,
      payload.organizationId,
    );
    const organizationSnapshot = await transaction.get(organizationRef);

    if (!organizationSnapshot.exists()) {
      throw new Error('Organização não encontrada.');
    }

    const currentMembers =
      (organizationSnapshot.data({ serverTimestamps: 'estimate' })?.members as
        | string[]
        | undefined) ?? [];

    const userSnapshot = await transaction.get(userRef);
    if (!userSnapshot.exists()) {
      throw new Error('Usuário não encontrado.');
    }

    const userId = userRef.id;
    const userData = userSnapshot.data({ serverTimestamps: 'estimate' }) ?? {};

    const existingOrganizationId = (userData.organizationId as string | null) ?? null;
    if (existingOrganizationId && existingOrganizationId !== payload.organizationId) {
      throw new Error('Usuário já está vinculado a outra organização.');
    }

    if (currentMembers.includes(userId)) {
      throw new Error('Usuário já faz parte da organização.');
    }

    transaction.update(organizationRef, {
      members: arrayUnion(userId),
      memberCount: currentMembers.length + 1,
      updatedAt: serverTimestamp(),
    });

    const userDocRef = doc(firebaseFirestore, USERS_COLLECTION, userId);
    transaction.set(
      userDocRef,
      {
        organizationId: payload.organizationId,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    return {
      uid: userId,
      email: (userData.email as string) ?? normalizedEmail,
      displayName: (userData.displayName as string) ?? normalizedEmail,
      photoURL: (userData.photoURL as string | null) ?? null,
    };
  });

  return member;
};

export const removeUserFromOrganization = async (
  payload: RemoveUserFromOrganizationPayload,
): Promise<void> => {
  const organizationRef = doc(firebaseFirestore, ORGANIZATIONS_COLLECTION, payload.organizationId);
  const userRef = doc(firebaseFirestore, USERS_COLLECTION, payload.userId);

  await runTransaction(firebaseFirestore, async (transaction) => {
    const organizationSnapshot = await transaction.get(organizationRef);

    if (!organizationSnapshot.exists()) {
      throw new Error('Organização não encontrada.');
    }

    const currentMembers =
      (organizationSnapshot.data({ serverTimestamps: 'estimate' })?.members as
        | string[]
        | undefined) ?? [];
    const userSnapshot = await transaction.get(userRef);

    if (!userSnapshot.exists()) {
      return;
    }

    const userData = userSnapshot.data({ serverTimestamps: 'estimate' }) ?? {};
    const currentOrganizationId = (userData.organizationId as string | null) ?? null;

    const shouldRemove = currentMembers.includes(payload.userId);
    const nextCount = shouldRemove ? Math.max(currentMembers.length - 1, 0) : currentMembers.length;

    transaction.update(organizationRef, {
      members: arrayRemove(payload.userId),
      memberCount: nextCount,
      updatedAt: serverTimestamp(),
    });

    if (currentOrganizationId === payload.organizationId) {
      transaction.set(
        userRef,
        {
          organizationId: null,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    }
  });
};

export const getUserOrganization = async (userId: string): Promise<Organization | null> => {
  const userRef = doc(firebaseFirestore, USERS_COLLECTION, userId);
  try {
    const userSnapshot = await getDocCacheThenServer(userRef);

    if (!userSnapshot.exists()) {
      return null;
    }

    const organizationId =
      (userSnapshot.data({ serverTimestamps: 'estimate' })?.organizationId as string | null) ??
      null;
    if (!organizationId) {
      return null;
    }

    return getOrganizationDetail(organizationId);
  } catch (error) {
    console.error(error);
    return null;
  }
};

export const findOrganizationByEmailDomain = async (
  email: string,
): Promise<Organization | null> => {
  const normalizedDomain = getNormalizedEmailDomain(email);

  if (!normalizedDomain) {
    return null;
  }

  try {
    const organizationQuery = query(
      organizationsCollection,
      where('emailDomain', '==', normalizedDomain),
      limit(1),
    );
    const snapshot = await getDocsCacheFirst(organizationQuery);

    if (snapshot.empty) {
      return null;
    }

    const organizationDoc = snapshot.docs[0];
    return mapOrganization(
      organizationDoc.id,
      organizationDoc.data({ serverTimestamps: 'estimate' }),
    );
  } catch (error) {
    console.error(error);
    return null;
  }
};

export const addUserToOrganizationByEmailDomain = async (
  user: Pick<OrganizationMember, 'uid' | 'email' | 'displayName' | 'photoURL'>,
): Promise<string | null> => {
  const organization = await findOrganizationByEmailDomain(user.email);

  if (!organization) {
    return null;
  }

  const organizationRef = doc(firebaseFirestore, ORGANIZATIONS_COLLECTION, organization.id);
  const userRef = doc(firebaseFirestore, USERS_COLLECTION, user.uid);

  let assignedOrganizationId: string | null = null;
  await runTransaction(firebaseFirestore, async (transaction) => {
    const organizationSnapshot = await transaction.get(organizationRef);

    if (!organizationSnapshot.exists()) {
      assignedOrganizationId = null;
      return;
    }

    const currentMembers =
      (organizationSnapshot.data({ serverTimestamps: 'estimate' })?.members as
        | string[]
        | undefined) ?? [];
    const userSnapshot = await transaction.get(userRef);
    const existingOrganizationId =
      (userSnapshot.data({ serverTimestamps: 'estimate' })?.organizationId as string | null) ??
      null;

    if (existingOrganizationId && existingOrganizationId !== organization.id) {
      assignedOrganizationId = existingOrganizationId;
      return;
    }

    const shouldAddMember = !currentMembers.includes(user.uid);
    const resolvedOrganizationId = existingOrganizationId ?? organization.id;

    if (shouldAddMember) {
      transaction.update(organizationRef, {
        members: arrayUnion(user.uid),
        memberCount: currentMembers.length + 1,
        updatedAt: serverTimestamp(),
      });
    }

    transaction.set(
      userRef,
      {
        organizationId: resolvedOrganizationId,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    assignedOrganizationId = resolvedOrganizationId;
  });

  return assignedOrganizationId;
};

const mapOrganizationSummary = (
  id: string,
  data: Record<string, unknown> | undefined,
): OrganizationSummary => {
  const memberIds = (data?.members as string[] | undefined) ?? [];
  const memberCount = Number(data?.memberCount ?? memberIds.length ?? 0);

  return {
    id,
    name: ((data?.name as string) ?? '').trim(),
    description: ((data?.description as string) ?? '').trim(),
    logoUrl: ((data?.logoUrl as string) ?? '').trim() || null,
    memberCount,
    updatedAt: timestampToDate(data?.updatedAt),
  };
};

const mapOrganization = async (
  id: string,
  data: Record<string, unknown> | undefined,
): Promise<Organization> => {
  const memberIds = (data?.members as string[] | undefined) ?? [];
  const members = await fetchMembers(memberIds);
  const browserstackCredentials = normalizeBrowserstackCredentials(
    (data?.browserstackCredentials as BrowserstackCredentials | null | undefined) ?? null,
  );

  return {
    id,
    name: ((data?.name as string) ?? '').trim(),
    description: ((data?.description as string) ?? '').trim(),
    logoUrl: ((data?.logoUrl as string) ?? '').trim() || null,
    slackWebhookUrl: ((data?.slackWebhookUrl as string) ?? '').trim() || null,
    emailDomain: normalizeEmailDomain((data?.emailDomain as string | null | undefined) ?? null),
    browserstackCredentials,
    members,
    memberIds,
    createdAt: timestampToDate(data?.createdAt),
    updatedAt: timestampToDate(data?.updatedAt),
  };
};

const timestampToDate = (value: unknown): Date | null => {
  if (value instanceof Timestamp) {
    return value.toDate();
  }

  return null;
};

const fetchMembers = async (memberIds: string[]): Promise<OrganizationMember[]> => {
  if (memberIds.length === 0) {
    return [];
  }

  const uniqueIds = Array.from(new Set(memberIds)).filter((id) => id.length > 0);
  const usersRef = collection(firebaseFirestore, USERS_COLLECTION);
  const chunks = chunkArray(uniqueIds, 10);
  const snapshots = await Promise.all(
    chunks.map((chunk) =>
      getDocsCacheThenServer(query(usersRef, where(documentId(), 'in', chunk))),
    ),
  );

  const memberMap = new Map<string, OrganizationMember>();
  snapshots.forEach((snapshot) => {
    snapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data({ serverTimestamps: 'estimate' });
      memberMap.set(docSnapshot.id, {
        uid: docSnapshot.id,
        email: (data.email as string) ?? '',
        displayName: (data.displayName as string) ?? '',
        photoURL: (data.photoURL as string | null) ?? null,
      });
    });
  });

  return memberIds
    .map((id) => memberMap.get(id))
    .filter((member): member is OrganizationMember => Boolean(member));
};

const chunkArray = <T>(items: T[], size: number): T[][] => {
  if (items.length === 0) {
    return [];
  }

  return items.reduce<T[][]>((acc, item, index) => {
    const chunkIndex = Math.floor(index / size);
    if (!acc[chunkIndex]) {
      acc[chunkIndex] = [];
    }
    acc[chunkIndex].push(item);
    return acc;
  }, []);
};
