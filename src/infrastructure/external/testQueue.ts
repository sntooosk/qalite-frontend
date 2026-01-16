import {
  Timestamp,
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore';

import type {
  CreateTestQueueExecutionPayload,
  TestQueueCapacity,
  TestQueueExecution,
} from '../../domain/entities/testQueue';
import { firebaseFirestore } from '../database/firebase';

const QUEUE_COLLECTION = 'testQueueExecutions';
const QUEUE_CONTROL_COLLECTION = 'queueControls';
const BROWSERSTACK_CAPACITY_DOC = 'browserstack';

const queueCollection = collection(firebaseFirestore, QUEUE_COLLECTION);

const timestampToIso = (value: unknown): string | null => {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }

  if (typeof value === 'string') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  return null;
};

const mapExecution = (id: string, data: Record<string, unknown>): TestQueueExecution => ({
  id,
  status: (data.status as TestQueueExecution['status']) ?? 'waiting',
  testType: (data.testType as string) ?? '',
  environment: (data.environment as string) ?? '',
  projectId: (data.projectId as string | null) ?? null,
  projectName: (data.projectName as string | null) ?? null,
  createdAt: timestampToIso(data.createdAt),
  startedAt: timestampToIso(data.startedAt),
  finishedAt: timestampToIso(data.finishedAt),
  requestedBy: {
    uid: (data.requestedBy as { uid?: string })?.uid ?? '',
    displayName: (data.requestedBy as { displayName?: string })?.displayName ?? '',
    email: (data.requestedBy as { email?: string })?.email ?? '',
  },
  browserstackBuildId: (data.browserstackBuildId as string | null) ?? null,
  browserstackBuildUrl: (data.browserstackBuildUrl as string | null) ?? null,
  githubWorkflowRunId: (data.githubWorkflowRunId as number | null) ?? null,
});

export const createTestQueueExecution = async (
  payload: CreateTestQueueExecutionPayload,
): Promise<void> => {
  await addDoc(queueCollection, {
    status: 'waiting',
    testType: payload.testType,
    environment: payload.environment,
    projectId: payload.projectId,
    projectName: payload.projectName,
    requestedBy: payload.requestedBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const subscribeToQueue = (
  listener: (executions: TestQueueExecution[]) => void,
): (() => void) => {
  const queueQuery = query(queueCollection, orderBy('createdAt', 'asc'));
  return onSnapshot(queueQuery, (snapshot) => {
    const executions = snapshot.docs.map((docSnapshot) =>
      mapExecution(docSnapshot.id, docSnapshot.data()),
    );
    listener(executions);
  });
};

export const subscribeToCapacity = (
  listener: (capacity: TestQueueCapacity) => void,
): (() => void) => {
  const capacityRef = doc(firebaseFirestore, QUEUE_CONTROL_COLLECTION, BROWSERSTACK_CAPACITY_DOC);
  return onSnapshot(capacityRef, (snapshot) => {
    if (!snapshot.exists()) {
      listener({
        maxParallel: 2,
        runningCount: 0,
        updatedAt: null,
      });
      return;
    }

    const data = snapshot.data();
    listener({
      maxParallel: (data.maxParallel as number) ?? 2,
      runningCount: (data.runningCount as number) ?? 0,
      updatedAt: timestampToIso(data.updatedAt),
    });
  });
};
