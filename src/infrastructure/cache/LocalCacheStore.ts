import type { CacheStore, CacheValue } from '../../application/cache/CacheStore';

interface StoredEntry<T> {
  value: T;
  cachedAt: number;
  expiresAt: number;
}

const STORAGE_PREFIX = 'qalite-cache:';

const isStorageAvailable = () => {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const testKey = `${STORAGE_PREFIX}__test__`;
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
};

const storageAvailable = isStorageAvailable();

export class LocalCacheStore implements CacheStore {
  private memory = new Map<string, StoredEntry<unknown>>();

  get<T>(key: string): CacheValue<T> | null {
    const entry = this.readEntry<T>(key);

    if (!entry) {
      return null;
    }

    const now = Date.now();

    return {
      value: entry.value,
      cachedAt: entry.cachedAt,
      expiresAt: entry.expiresAt,
      isStale: now > entry.expiresAt,
    };
  }

  set<T>(key: string, value: T, ttlMs: number): void {
    const now = Date.now();
    const entry: StoredEntry<T> = {
      value,
      cachedAt: now,
      expiresAt: now + ttlMs,
    };

    this.memory.set(key, entry);
    this.persistEntry(key, entry);
  }

  remove(key: string): void {
    this.memory.delete(key);

    if (storageAvailable) {
      try {
        window.localStorage.removeItem(this.buildStorageKey(key));
      } catch {
        // Ignore storage errors to keep cache optional.
      }
    }
  }

  clearByPrefix(prefix: string): void {
    const keys = Array.from(this.memory.keys()).filter((key) => key.startsWith(prefix));
    keys.forEach((key) => this.remove(key));

    if (!storageAvailable) {
      return;
    }

    try {
      Object.keys(window.localStorage)
        .filter((storageKey) => storageKey.startsWith(this.buildStorageKey(prefix)))
        .forEach((storageKey) => window.localStorage.removeItem(storageKey));
    } catch {
      // Ignore storage errors to keep cache optional.
    }
  }

  private readEntry<T>(key: string): StoredEntry<T> | null {
    if (this.memory.has(key)) {
      return this.memory.get(key) as StoredEntry<T>;
    }

    if (!storageAvailable) {
      return null;
    }

    let raw: string | null = null;
    try {
      raw = window.localStorage.getItem(this.buildStorageKey(key));
    } catch {
      return null;
    }

    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as StoredEntry<T>;
      if (parsed && typeof parsed.expiresAt === 'number') {
        this.memory.set(key, parsed as StoredEntry<unknown>);
        return parsed;
      }
    } catch {
      this.remove(key);
    }

    return null;
  }

  private persistEntry<T>(key: string, entry: StoredEntry<T>) {
    if (!storageAvailable) {
      return;
    }

    try {
      window.localStorage.setItem(this.buildStorageKey(key), JSON.stringify(entry));
    } catch (error) {
      console.warn('Falha ao persistir cache local.', error);
    }
  }

  private buildStorageKey(key: string) {
    return `${STORAGE_PREFIX}${key}`;
  }
}

export const localCacheStore = new LocalCacheStore();
