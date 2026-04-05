import { createLogger } from '../logger';

const log = createLogger('cache');

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class CacheService {
  private store = new Map<string, CacheEntry<unknown>>();
  private maxSize: number;

  constructor(maxSize = 1000) {
    this.maxSize = maxSize;
  }

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }

    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs: number): void {
    // LRU: supprimer la plus ancienne si plein
    if (this.store.size >= this.maxSize) {
      const firstKey = this.store.keys().next().value;
      if (firstKey) this.store.delete(firstKey);
    }

    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  delete(key: string): boolean {
    return this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
    log.info('Cache cleared');
  }

  get size(): number {
    return this.store.size;
  }

  // Nettoyer les entrees expirees
  cleanup(): number {
    const now = Date.now();
    let removed = 0;
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
        removed++;
      }
    }
    return removed;
  }
}

// Instance globale
export const cache = new CacheService(500);

// Nettoyer toutes les 5 minutes
setInterval(() => {
  const removed = cache.cleanup();
  if (removed > 0) {
    log.info(`Cache cleanup: ${removed} entrees expirees supprimees`);
  }
}, 5 * 60 * 1000);

export default cache;
