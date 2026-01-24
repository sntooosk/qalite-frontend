import {
  getDocFromCache,
  getDocFromServer,
  getDocsFromCache,
  getDocsFromServer,
  type CollectionReference,
  type DocumentReference,
  type DocumentData,
  type Query,
  type QuerySnapshot,
  type DocumentSnapshot,
} from 'firebase/firestore';

export const getDocCacheFirst = async <T>(
  reference: DocumentReference<T>,
): Promise<DocumentSnapshot<T>> => {
  try {
    return await getDocFromCache(reference);
  } catch {
    return await getDocFromServer(reference);
  }
};

export const getDocCacheThenServer = async <T>(
  reference: DocumentReference<T>,
): Promise<DocumentSnapshot<T>> => {
  let cacheSnapshot: DocumentSnapshot<T> | null = null;

  try {
    cacheSnapshot = await getDocFromCache(reference);
  } catch {
    cacheSnapshot = null;
  }

  try {
    return await getDocFromServer(reference);
  } catch (error) {
    console.error(error);
    if (cacheSnapshot) {
      return cacheSnapshot;
    }
    throw error;
  }
};

export const getDocsCacheFirst = async <T = DocumentData>(
  reference: Query<T> | CollectionReference<T>,
): Promise<QuerySnapshot<T>> => {
  try {
    return await getDocsFromCache(reference);
  } catch {
    return await getDocsFromServer(reference);
  }
};

export const getDocsCacheThenServer = async <T = DocumentData>(
  reference: Query<T> | CollectionReference<T>,
): Promise<QuerySnapshot<T>> => {
  let cacheSnapshot: QuerySnapshot<T> | null = null;

  try {
    cacheSnapshot = await getDocsFromCache(reference);
  } catch {
    cacheSnapshot = null;
  }

  try {
    return await getDocsFromServer(reference);
  } catch (error) {
    console.error(error);
    if (cacheSnapshot) {
      return cacheSnapshot;
    }
    throw error;
  }
};

export const createInMemoryCache = <T>() => {
  const cache = new Map<string, T>();
  const inflight = new Map<string, Promise<T>>();

  const get = (key: string) => cache.get(key);
  const set = (key: string, value: T) => {
    cache.set(key, value);
  };
  const clear = (key: string) => {
    cache.delete(key);
    inflight.delete(key);
  };
  const clearAll = () => {
    cache.clear();
    inflight.clear();
  };

  const fetch = (key: string, loader: () => Promise<T>) => {
    const cached = cache.get(key);
    if (cached !== undefined) {
      return Promise.resolve(cached);
    }

    const pending = inflight.get(key);
    if (pending) {
      return pending;
    }

    const request = loader()
      .then((value) => {
        cache.set(key, value);
        return value;
      })
      .finally(() => {
        inflight.delete(key);
      });

    inflight.set(key, request);
    return request;
  };

  return {
    get,
    set,
    clear,
    clearAll,
    fetch,
  };
};
