export interface CacheEntry<T> {
  value: T;
  storedAt: number;
  ttlMs: number;
  schemaVersion: number;
}

export interface CacheOptions {
  ttlMs: number;
  schemaVersion: number;
  entity: string;
}

export interface CacheHit<T> {
  value: T;
  isStale: boolean;
}

export interface CacheStore {
  get: <T>(key: string, options: CacheOptions) => CacheHit<T> | null;
  set: <T>(key: string, value: T, options: CacheOptions) => void;
  remove: (key: string) => void;
  invalidatePrefix: (prefix: string) => void;
  clear: () => void;
}
