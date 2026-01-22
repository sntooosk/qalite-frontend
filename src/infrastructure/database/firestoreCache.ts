import {
  getDocs,
  getDocsFromCache,
  type CollectionReference,
  type DocumentData,
  type Query,
  type QuerySnapshot,
} from 'firebase/firestore';

export const getDocsCacheFirst = async <T = DocumentData>(
  source: Query<T> | CollectionReference<T>,
): Promise<QuerySnapshot<T>> => {
  try {
    return await getDocsFromCache(source);
  } catch {
    return getDocs(source);
  }
};
