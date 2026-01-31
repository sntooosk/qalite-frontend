import type {
  CacheEntry,
  CacheHit,
  CacheOptions,
  CacheStore,
} from '../../application/cache/CacheStore';

interface CacheStoreConfig {
  storage: Storage | null;
  storagePrefix: string;
}

const buildStorageKey = (prefix: string, key: string) => `${prefix}:${key}`;

class LocalCacheStore implements CacheStore {
  private memory = new Map<string, CacheEntry<unknown>>();
  private storage: Storage | null;
  private storagePrefix: string;

  constructor({ storage, storagePrefix }: CacheStoreConfig) {
    this.storage = storage;
    this.storagePrefix = storagePrefix;
  }

  get<T>(key: string, options: CacheOptions): CacheHit<T> | null {
    const storageKey = buildStorageKey(this.storagePrefix, key);
    const memoryEntry = this.memory.get(storageKey);

    const entry = memoryEntry ?? this.readFromStorage(storageKey);
    if (!entry) {
      return null;
    }

    if (entry.schemaVersion !== options.schemaVersion) {
      this.remove(key);
      return null;
    }

    const age = Date.now() - entry.storedAt;
    const isStale = age > options.ttlMs;
    return { value: entry.value as T, isStale };
  }

  set<T>(key: string, value: T, options: CacheOptions): void {
    const storageKey = buildStorageKey(this.storagePrefix, key);
    const entry: CacheEntry<T> = {
      value,
      storedAt: Date.now(),
      ttlMs: options.ttlMs,
      schemaVersion: options.schemaVersion,
    };

    this.memory.set(storageKey, entry as CacheEntry<unknown>);
    this.writeToStorage(storageKey, entry);
  }

  remove(key: string): void {
    const storageKey = buildStorageKey(this.storagePrefix, key);
    this.memory.delete(storageKey);
    this.storage?.removeItem(storageKey);
  }

  invalidatePrefix(prefix: string): void {
    const storagePrefix = buildStorageKey(this.storagePrefix, prefix);
    Array.from(this.memory.keys())
      .filter((key) => key.startsWith(storagePrefix))
      .forEach((key) => this.memory.delete(key));

    if (!this.storage) {
      return;
    }

    const keysToRemove: string[] = [];
    for (let index = 0; index < this.storage.length; index += 1) {
      const key = this.storage.key(index);
      if (key && key.startsWith(storagePrefix)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => this.storage?.removeItem(key));
  }

  clear(): void {
    this.invalidatePrefix('');
  }

  private readFromStorage(storageKey: string): CacheEntry<unknown> | null {
    if (!this.storage) {
      return null;
    }

    const raw = this.storage.getItem(storageKey);
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as CacheEntry<unknown>;
      this.memory.set(storageKey, parsed);
      return parsed;
    } catch (error) {
      console.error('Failed to parse cache entry', error);
      this.storage.removeItem(storageKey);
      return null;
    }
  }

  private writeToStorage(storageKey: string, entry: CacheEntry<unknown>): void {
    if (!this.storage) {
      return;
    }

    try {
      this.storage.setItem(storageKey, JSON.stringify(entry));
    } catch (error) {
      console.error('Failed to persist cache entry', error);
    }
  }
}

const storage = typeof window !== 'undefined' && window.localStorage ? window.localStorage : null;

export const cacheStore: CacheStore = new LocalCacheStore({
  storage,
  storagePrefix: 'qalite-cache',
});
