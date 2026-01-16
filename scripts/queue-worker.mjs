import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!serviceAccountJson) {
  throw new Error('FIREBASE_SERVICE_ACCOUNT env var is required.');
}

const serviceAccount = JSON.parse(serviceAccountJson);

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

const db = getFirestore();
const QUEUE_COLLECTION = 'testQueueExecutions';
const CAPACITY_DOC = 'queueControls/browserstack';

const dispatchWorkflow = async ({ executionId }) => {
  const token = process.env.GITHUB_TOKEN || process.env.GH_PAT;
  if (!token) {
    throw new Error('GITHUB_TOKEN or GH_PAT env var is required to dispatch workflows.');
  }

  const repo = process.env.GITHUB_REPOSITORY;
  if (!repo) {
    throw new Error('GITHUB_REPOSITORY env var is required.');
  }

  const ref = process.env.GITHUB_REF_NAME || 'main';
  const workflowFile = process.env.TEST_WORKFLOW_FILE || 'test-execution.yml';

  const response = await fetch(
    `https://api.github.com/repos/${repo}/actions/workflows/${workflowFile}/dispatches`,
    {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ref,
        inputs: {
          executionId,
        },
      }),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to dispatch workflow: ${response.status} ${text}`);
  }
};

const result = await db.runTransaction(async (transaction) => {
  const capacityRef = db.doc(CAPACITY_DOC);
  const capacitySnap = await transaction.get(capacityRef);
  const maxParallel = capacitySnap.exists ? (capacitySnap.data().maxParallel ?? 2) : 2;
  const runningCount = capacitySnap.exists ? (capacitySnap.data().runningCount ?? 0) : 0;

  if (runningCount >= maxParallel) {
    return null;
  }

  const waitingQuery = db
    .collection(QUEUE_COLLECTION)
    .where('status', '==', 'waiting')
    .orderBy('createdAt', 'asc')
    .limit(1);
  const waitingSnap = await transaction.get(waitingQuery);

  if (waitingSnap.empty) {
    return null;
  }

  const waitingDoc = waitingSnap.docs[0];
  transaction.update(waitingDoc.ref, {
    status: 'running',
    startedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  transaction.set(
    capacityRef,
    {
      maxParallel,
      runningCount: runningCount + 1,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return waitingDoc.id;
});

if (!result) {
  console.log('No executions available or capacity is full.');
  process.exit(0);
}

await dispatchWorkflow({ executionId: result });
console.log(`Dispatched execution ${result}.`);
