import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { spawnSync } from 'node:child_process';

const executionId = process.env.EXECUTION_ID;
if (!executionId) {
  throw new Error('EXECUTION_ID env var is required.');
}

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

const executionRef = db.collection(QUEUE_COLLECTION).doc(executionId);
const executionSnap = await executionRef.get();

if (!executionSnap.exists) {
  throw new Error(`Execution ${executionId} not found.`);
}

const executionData = executionSnap.data();
const requesterId = executionData?.requestedBy?.uid;

let browserstackCredentials = null;
if (requesterId) {
  const userSnap = await db.doc(`users/${requesterId}`).get();
  if (userSnap.exists) {
    browserstackCredentials = userSnap.data()?.browserstackCredentials ?? null;
  }
}

const testCommand = executionData?.testCommand || process.env.TEST_COMMAND || 'npm run cypress:run';

let status = 'finished';
let errorMessage = null;

try {
  const env = {
    ...process.env,
    BROWSERSTACK_USERNAME: browserstackCredentials?.username ?? process.env.BROWSERSTACK_USERNAME,
    BROWSERSTACK_ACCESS_KEY:
      browserstackCredentials?.accessKey ?? process.env.BROWSERSTACK_ACCESS_KEY,
  };

  const result = spawnSync(testCommand, {
    stdio: 'inherit',
    shell: true,
    env,
  });

  if (result.status !== 0) {
    throw new Error(`Test command failed with exit code ${result.status}`);
  }
} catch (error) {
  status = 'failed';
  errorMessage = error instanceof Error ? error.message : 'Unknown error';
} finally {
  const buildId = process.env.BROWSERSTACK_BUILD_ID || null;
  const buildUrl = process.env.BROWSERSTACK_BUILD_URL || null;

  await db.runTransaction(async (transaction) => {
    transaction.update(executionRef, {
      status,
      finishedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      ...(buildId ? { browserstackBuildId: buildId } : {}),
      ...(buildUrl ? { browserstackBuildUrl: buildUrl } : {}),
      ...(errorMessage ? { errorMessage } : {}),
    });

    const capacityRef = db.doc(CAPACITY_DOC);
    const capacitySnap = await transaction.get(capacityRef);
    const runningCount = capacitySnap.exists ? (capacitySnap.data().runningCount ?? 0) : 0;
    transaction.set(
      capacityRef,
      {
        maxParallel: capacitySnap.exists ? (capacitySnap.data().maxParallel ?? 2) : 2,
        runningCount: Math.max(0, runningCount - 1),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  });
}

if (status !== 'finished') {
  console.error(errorMessage);
  process.exit(1);
}
