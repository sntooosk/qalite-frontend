import type { CacheStore } from './CacheStore';

interface CacheStrategyOptions<T> {
  cacheStore: CacheStore;
  cacheKey: string;
  ttlMs: number;
  fetcher: () => Promise<T>;
  onRevalidate?: (value: T) => void;
}

export const cacheFirstWithRevalidate = async <T>({
  cacheStore,
  cacheKey,
  ttlMs,
  fetcher,
  onRevalidate,
}: CacheStrategyOptions<T>): Promise<T> => {
  const cached = cacheStore.get<T>(cacheKey);

  if (cached) {
    if (!cached.isStale) {
      return cached.value;
    }

    void fetcher()
      .then((freshValue) => {
        cacheStore.set(cacheKey, freshValue, ttlMs);
        onRevalidate?.(freshValue);
      })
      .catch((error) => {
        console.warn('Falha ao revalidar cache.', error);
      });

    return cached.value;
  }

  const freshValue = await fetcher();
  cacheStore.set(cacheKey, freshValue, ttlMs);
  return freshValue;
};
