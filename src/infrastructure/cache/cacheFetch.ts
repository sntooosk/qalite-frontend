import type { CacheStore } from './CacheStore';

type CacheStoreValue<T> = {
  cache: CacheStore;
  key: string;
  fetcher: () => Promise<T>;
  fallback: T;
  store?: (value: T) => void;
};

const defaultStore = <T>(cache: CacheStore, key: string, value: T) => {
  cache.set(key, value);
};

export const fetchWithCache = async <T>({
  cache,
  key,
  fetcher,
  fallback,
  store,
}: CacheStoreValue<T>): Promise<T> => {
  const cached = cache.getWithStatus<T>(key);
  const storeValue = store ?? ((value: T) => defaultStore(cache, key, value));

  if (cached.value && !cached.isExpired) {
    return cached.value;
  }

  if (cached.value) {
    void fetcher()
      .then((value) => storeValue(value))
      .catch((error) => console.error(error));
    return cached.value;
  }

  try {
    const value = await fetcher();
    storeValue(value);
    return value;
  } catch (error) {
    console.error(error);
    return fallback;
  }
};
