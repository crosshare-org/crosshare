import * as t from 'io-ts';
import { fromLocalStorage } from './storage.js';

export class LruCache<T> {
  private values: Map<string, T> = new Map<string, T>();

  constructor(
    public readonly localStorageKey: string,
    public readonly maxEntries: number,
    public readonly validator: t.Type<T>
  ) {
    const fromStorage = fromLocalStorage(
      localStorageKey,
      t.array(t.tuple([t.string, validator]))
    );
    if (fromStorage) {
      this.values = new Map(fromStorage);
    }
  }

  public get(key: string): T | undefined {
    const entry = this.values.get(key);
    if (entry !== undefined) {
      // re-insert for LRU strategy
      this.values.delete(key);
      this.values.set(key, entry);
    }

    return entry;
  }

  public set(key: string, value: T) {
    if (this.values.size >= this.maxEntries) {
      // least-recently used cache eviction strategy
      const keyToDelete = this.values.keys().next();
      if (!keyToDelete.done) {
        this.values.delete(keyToDelete.value);
      }
    }
    this.values.set(key, value);
    localStorage.setItem(
      this.localStorageKey,
      JSON.stringify(Array.from(this.values.entries()))
    );
  }
}
