export interface FirestoreQueryDetails {
  label: string;
  collection?: string;
  where?: string[];
  orderBy?: string[];
  limit?: number;
  startAfter?: string;
  docPath?: string;
  source?: string;
}

export interface FirestoreReadDetails {
  label: string;
  count: number;
}

export interface FirestoreSubscriptionDetails {
  label: string;
  collection?: string;
  docPath?: string;
  source?: string;
}

interface FirebaseDebugState {
  reads: number;
  subscriptions: number;
  queryCounts: Record<string, number>;
  activeSubscriptions: Record<string, number>;
}

const DEBUG_FIREBASE = import.meta.env.VITE_DEBUG_FIREBASE === 'true';

const getState = (): FirebaseDebugState => {
  const globalScope = globalThis as typeof globalThis & {
    __firebaseDebugState__?: FirebaseDebugState;
  };

  if (!globalScope.__firebaseDebugState__) {
    globalScope.__firebaseDebugState__ = {
      reads: 0,
      subscriptions: 0,
      queryCounts: {},
      activeSubscriptions: {},
    };
  }

  return globalScope.__firebaseDebugState__;
};

const logIfEnabled = (message: string, payload: Record<string, unknown>) => {
  if (!DEBUG_FIREBASE) {
    return;
  }

  // eslint-disable-next-line no-console
  console.info(`[firebase-debug] ${message}`, payload);
};

export const firebaseDebug = {
  get state() {
    return getState();
  },
  trackQuery(details: FirestoreQueryDetails) {
    if (!DEBUG_FIREBASE) {
      return;
    }

    const state = getState();
    const key = details.label;
    state.queryCounts[key] = (state.queryCounts[key] ?? 0) + 1;

    logIfEnabled('query', {
      ...details,
      totalQueries: state.queryCounts[key],
      totalReads: state.reads,
      activeSubscriptions: state.subscriptions,
    });

    if (state.queryCounts[key] > 1) {
      logIfEnabled('duplicate-query', {
        label: details.label,
        count: state.queryCounts[key],
      });
    }
  },
  trackRead(details: FirestoreReadDetails) {
    if (!DEBUG_FIREBASE) {
      return;
    }

    const state = getState();
    state.reads += details.count;

    logIfEnabled('read', {
      ...details,
      totalReads: state.reads,
      activeSubscriptions: state.subscriptions,
    });
  },
  trackSubscriptionStart(details: FirestoreSubscriptionDetails) {
    if (!DEBUG_FIREBASE) {
      return;
    }

    const state = getState();
    state.subscriptions += 1;
    state.activeSubscriptions[details.label] = (state.activeSubscriptions[details.label] ?? 0) + 1;

    logIfEnabled('subscription-start', {
      ...details,
      activeSubscriptions: state.subscriptions,
      activeByLabel: state.activeSubscriptions[details.label],
    });
  },
  trackSubscriptionStop(details: FirestoreSubscriptionDetails) {
    if (!DEBUG_FIREBASE) {
      return;
    }

    const state = getState();
    state.subscriptions = Math.max(0, state.subscriptions - 1);
    state.activeSubscriptions[details.label] = Math.max(
      0,
      (state.activeSubscriptions[details.label] ?? 1) - 1,
    );

    logIfEnabled('subscription-stop', {
      ...details,
      activeSubscriptions: state.subscriptions,
      activeByLabel: state.activeSubscriptions[details.label],
    });
  },
};
