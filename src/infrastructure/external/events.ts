import {
  Timestamp,
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';

import type {
  CreateOrganizationEventInput,
  OrganizationEvent,
  UpdateOrganizationEventInput,
} from '../../domain/entities/event';
import type { ActivityLog } from '../../domain/entities/activityLog';
import { firebaseFirestore } from '../database/firebase';
import { logActivity } from './logs';

const EVENTS_COLLECTION = 'organizationEvents';
const eventsCollection = collection(firebaseFirestore, EVENTS_COLLECTION);

const timestampToDate = (value: unknown): Date | null => {
  if (value instanceof Timestamp) {
    return value.toDate();
  }

  return null;
};

const normalizeEnvironmentIds = (ids: unknown): string[] =>
  Array.isArray(ids)
    ? ids
        .filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
        .map((entry) => entry.trim())
    : [];

const mapEvent = (id: string, data: Record<string, unknown>): OrganizationEvent => ({
  id,
  organizationId: (data.organizationId as string) ?? '',
  name: (data.name as string) ?? '',
  description: (data.description as string) ?? '',
  environmentIds: normalizeEnvironmentIds(data.environmentIds),
  startDate: (data.startDate as string | undefined | null) ?? null,
  endDate: (data.endDate as string | undefined | null) ?? null,
  createdAt: timestampToDate(data.createdAt),
  updatedAt: timestampToDate(data.updatedAt),
});

const getEventContext = async (
  id: string,
): Promise<{ organizationId: string; name: string } | null> => {
  const eventRef = doc(firebaseFirestore, EVENTS_COLLECTION, id);
  const snapshot = await getDoc(eventRef);

  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.data();
  return {
    organizationId: (data.organizationId as string | undefined) ?? '',
    name: (data.name as string | undefined) ?? '',
  };
};

const registerEventLog = async (
  organizationId: string,
  eventId: string,
  action: ActivityLog['action'],
  message: string,
) =>
  logActivity({
    organizationId,
    entityId: eventId,
    entityType: 'event',
    action,
    message,
  });

export const listOrganizationEvents = async (
  organizationId: string,
): Promise<OrganizationEvent[]> => {
  const eventsQuery = query(
    eventsCollection,
    where('organizationId', '==', organizationId),
    orderBy('createdAt', 'desc'),
  );
  const snapshot = await getDocs(eventsQuery);

  return snapshot.docs.map((docSnapshot) => mapEvent(docSnapshot.id, docSnapshot.data() ?? {}));
};

export const createOrganizationEvent = async (
  input: CreateOrganizationEventInput,
): Promise<OrganizationEvent> => {
  const trimmedName = input.name.trim();
  const trimmedDescription = (input.description ?? '').trim();
  const sanitizedEnvironments = normalizeEnvironmentIds(input.environmentIds);

  const docRef = await addDoc(eventsCollection, {
    organizationId: input.organizationId,
    name: trimmedName,
    description: trimmedDescription,
    environmentIds: sanitizedEnvironments,
    startDate: input.startDate ?? null,
    endDate: input.endDate ?? null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await registerEventLog(
    input.organizationId,
    docRef.id,
    'create',
    `Evento criado: ${trimmedName}`,
  );

  const snapshot = await getDoc(docRef);
  return mapEvent(snapshot.id, snapshot.data() ?? {});
};

export const updateOrganizationEvent = async (
  id: string,
  input: UpdateOrganizationEventInput,
): Promise<OrganizationEvent> => {
  const eventRef = doc(firebaseFirestore, EVENTS_COLLECTION, id);
  const snapshot = await getDoc(eventRef);

  if (!snapshot.exists()) {
    throw new Error('Evento não encontrado.');
  }

  const existingData = snapshot.data();
  const updatePayload: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };

  if (typeof input.name === 'string') {
    updatePayload.name = input.name.trim();
  }

  if (typeof input.description === 'string') {
    updatePayload.description = input.description.trim();
  }

  if (Array.isArray(input.environmentIds)) {
    updatePayload.environmentIds = normalizeEnvironmentIds(input.environmentIds);
  }

  if ('startDate' in input) {
    updatePayload.startDate = input.startDate ?? null;
  }

  if ('endDate' in input) {
    updatePayload.endDate = input.endDate ?? null;
  }

  await updateDoc(eventRef, updatePayload);

  const organizationId = (existingData.organizationId as string | undefined) ?? '';
  const name = (updatePayload.name as string | undefined) ?? existingData.name;

  await registerEventLog(
    organizationId,
    id,
    'update',
    `Evento atualizado: ${(name as string) ?? 'Evento sem nome'}`,
  );

  const updatedSnapshot = await getDoc(eventRef);
  return mapEvent(updatedSnapshot.id, updatedSnapshot.data() ?? {});
};

export const deleteOrganizationEvent = async (id: string): Promise<void> => {
  const context = await getEventContext(id);

  await deleteDoc(doc(firebaseFirestore, EVENTS_COLLECTION, id));

  if (context) {
    await registerEventLog(
      context.organizationId,
      id,
      'delete',
      `Evento removido: ${context.name}`,
    );
  }
};

export const addEnvironmentToEvent = async (
  eventId: string,
  environmentId: string,
): Promise<OrganizationEvent> => {
  const context = await getEventContext(eventId);

  if (!context) {
    throw new Error('Evento não encontrado.');
  }

  const eventRef = doc(firebaseFirestore, EVENTS_COLLECTION, eventId);
  await updateDoc(eventRef, {
    environmentIds: arrayUnion(environmentId.trim()),
    updatedAt: serverTimestamp(),
  });

  await registerEventLog(
    context.organizationId,
    eventId,
    'update',
    `Ambiente vinculado ao evento ${context.name}`,
  );

  const snapshot = await getDoc(eventRef);
  return mapEvent(snapshot.id, snapshot.data() ?? {});
};

export const removeEnvironmentFromEvent = async (
  eventId: string,
  environmentId: string,
): Promise<OrganizationEvent> => {
  const context = await getEventContext(eventId);

  if (!context) {
    throw new Error('Evento não encontrado.');
  }

  const eventRef = doc(firebaseFirestore, EVENTS_COLLECTION, eventId);
  await updateDoc(eventRef, {
    environmentIds: arrayRemove(environmentId.trim()),
    updatedAt: serverTimestamp(),
  });

  await registerEventLog(
    context.organizationId,
    eventId,
    'update',
    `Ambiente desvinculado do evento ${context.name}`,
  );

  const snapshot = await getDoc(eventRef);
  return mapEvent(snapshot.id, snapshot.data() ?? {});
};
