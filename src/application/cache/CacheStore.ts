export interface CacheValue<T> {
  value: T;
  isStale: boolean;
  cachedAt: number;
  expiresAt: number;
}

export interface CacheStore {
  get<T>(key: string): CacheValue<T> | null;
  set<T>(key: string, value: T, ttlMs: number): void;
  remove(key: string): void;
  clearByPrefix(prefix: string): void;
}
