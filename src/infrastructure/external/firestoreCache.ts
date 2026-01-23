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
    if (cacheSnapshot) {
      return cacheSnapshot;
    }
    throw error;
  }
};
