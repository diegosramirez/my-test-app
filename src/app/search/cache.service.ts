import { Injectable } from '@angular/core';
import { SearchResult, CacheEntry } from './search.models';

@Injectable({
  providedIn: 'root'
})
export class CacheService {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly maxSize: number = 50;
  private readonly accessOrder = new Map<string, number>();
  private accessCounter = 0;

  get(key: string): SearchResult[] | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    // Update access order for LRU
    this.accessOrder.set(key, ++this.accessCounter);
    return entry.results;
  }

  set(key: string, value: SearchResult[]): void {
    // If cache is at max capacity and key doesn't exist, remove LRU item
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    const entry: CacheEntry = {
      query: key,
      results: value,
      timestamp: Date.now()
    };

    this.cache.set(key, entry);
    this.accessOrder.set(key, ++this.accessCounter);
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  clear(): void {
    this.cache.clear();
    this.accessOrder.clear();
    this.accessCounter = 0;
  }

  size(): number {
    return this.cache.size;
  }

  private evictLRU(): void {
    let oldestKey = '';
    let oldestAccess = Infinity;

    for (const [key, accessTime] of this.accessOrder.entries()) {
      if (accessTime < oldestAccess) {
        oldestAccess = accessTime;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.accessOrder.delete(oldestKey);
    }
  }
}