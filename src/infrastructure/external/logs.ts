import {
  Timestamp,
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from 'firebase/firestore';

import type { ActivityLog, ActivityLogInput } from '../../domain/entities/activityLog';
import { getCurrentUser } from './auth';
import { firebaseFirestore } from '../database/firebase';
import { firebaseDebug } from '../database/firebaseDebug';

const LOGS_COLLECTION = 'logs';
const THIRTY_DAYS_MS = 1000 * 60 * 60 * 24 * 30;

const logsCollection = collection(firebaseFirestore, LOGS_COLLECTION);

const mapLog = (id: string, data: Record<string, unknown>): ActivityLog => {
  const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : null;
  return {
    id,
    organizationId: (data.organizationId as string) ?? '',
    entityId: (data.entityId as string) ?? '',
    entityType: (data.entityType as ActivityLog['entityType']) ?? 'organization',
    action: (data.action as ActivityLog['action']) ?? 'create',
    message: (data.message as string) ?? '',
    actorId: (data.actorId as string | undefined | null) ?? null,
    actorName: (data.actorName as string | undefined | null) ?? 'Usuário não identificado',
    createdAt,
  };
};

const cleanupOldLogs = async (organizationId: string): Promise<void> => {
  const cutoff = Timestamp.fromMillis(Date.now() - THIRTY_DAYS_MS);
  const oldLogsQuery = query(
    logsCollection,
    where('organizationId', '==', organizationId),
    where('createdAt', '<', cutoff),
  );

  firebaseDebug.trackQuery({
    label: 'logs.cleanupOld',
    collection: LOGS_COLLECTION,
    where: ['organizationId ==', 'createdAt <'],
    source: 'cleanupOldLogs',
  });
  const snapshot = await getDocs(oldLogsQuery);
  firebaseDebug.trackRead({ label: 'logs.cleanupOld', count: snapshot.size });

  if (snapshot.empty) {
    return;
  }

  const batch = writeBatch(firebaseFirestore);
  snapshot.docs.forEach((docSnapshot) => batch.delete(docSnapshot.ref));
  await batch.commit();
};

export const logActivity = async (input: ActivityLogInput): Promise<void> => {
  const actor = input.actor ?? (await getCurrentUser());

  await cleanupOldLogs(input.organizationId);

  await addDoc(logsCollection, {
    organizationId: input.organizationId,
    entityId: input.entityId,
    entityType: input.entityType,
    action: input.action,
    message: input.message,
    actorId: actor?.uid ?? null,
    actorName: actor?.displayName ?? actor?.email ?? 'Usuário não identificado',
    createdAt: serverTimestamp(),
  });
};

export const listOrganizationLogs = async (organizationId: string): Promise<ActivityLog[]> => {
  await cleanupOldLogs(organizationId);

  const logsQuery = query(
    logsCollection,
    where('organizationId', '==', organizationId),
    orderBy('createdAt', 'desc'),
  );

  firebaseDebug.trackQuery({
    label: 'logs.listByOrganization',
    collection: LOGS_COLLECTION,
    where: ['organizationId =='],
    orderBy: ['createdAt desc'],
    source: 'listOrganizationLogs',
  });
  const snapshot = await getDocs(logsQuery);
  firebaseDebug.trackRead({ label: 'logs.listByOrganization', count: snapshot.size });
  return snapshot.docs.map((docSnapshot) => mapLog(docSnapshot.id, docSnapshot.data() ?? {}));
};
