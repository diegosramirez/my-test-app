import { Injectable } from '@angular/core';
import { Observable, from, throwError, BehaviorSubject } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { CachedData, CacheMetadata, CacheConfig, CacheStats, CacheOperation } from '../interfaces/cache.interface';

@Injectable({
  providedIn: 'root'
})
export class CacheService {
  private readonly dbName = 'FootballDataCache';
  private readonly dbVersion = 1;
  private readonly storeName = 'footballData';
  private db: IDBDatabase | null = null;
  private initializationError: string | null = null;

  private readonly config: CacheConfig = {
    defaultTTL: 30 * 60 * 1000, // 30 minutes
    maxSize: 100,
    staleThreshold: 30 * 60 * 1000 // 30 minutes
  };

  private stats: CacheStats = {
    totalEntries: 0,
    staleEntries: 0,
    hitRatio: 0,
    totalHits: 0,
    totalMisses: 0,
    storageSize: 0,
    lastCleanup: Date.now()
  };

  private statsSubject = new BehaviorSubject<CacheStats>(this.stats);
  public stats$ = this.statsSubject.asObservable();

  constructor() {
    this.initializeDB().subscribe({
      next: () => {
        console.log('Cache service initialized');
        this.initializationError = null;
      },
      error: (error) => {
        console.error('Failed to initialize cache:', error);
        this.initializationError = error.message || 'Database initialization failed';
      }
    });
  }

  private initializeDB(): Observable<IDBDatabase> {
    return new Observable(observer => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        observer.error(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        observer.next(this.db);
        observer.complete();
      };

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;

        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          store.createIndex('timestamp', 'metadata.timestamp');
          store.createIndex('dataType', 'metadata.dataType');
          store.createIndex('expiresAt', 'metadata.expiresAt');
        }
      };
    });
  }

  get<T>(key: string): Observable<CachedData<T> | null> {
    return from(this.performTransaction('readonly', store => {
      return new Promise<CachedData<T> | null>((resolve, reject) => {
        const request = store.get(key);

        request.onsuccess = () => {
          const result = request.result;

          if (result) {
            this.updateAccessTime(result);
            this.recordOperation('get', key, true, JSON.stringify(result).length);
            this.stats.totalHits++;
            resolve(result);
          } else {
            this.recordOperation('get', key, false);
            this.stats.totalMisses++;
            resolve(null);
          }

          this.updateStats();
        };

        request.onerror = () => {
          this.recordOperation('get', key, false, 0, request.error?.toString());
          reject(request.error);
        };
      });
    }));
  }

  set<T>(key: string, data: T, dataType: string = 'football-data'): Observable<boolean> {
    const cachedData: CachedData<T> = {
      id: key,
      data,
      metadata: {
        timestamp: Date.now(),
        expiresAt: Date.now() + this.config.defaultTTL,
        version: 1,
        dataType,
        isStale: false,
        lastAccessedAt: Date.now()
      }
    };

    return from(this.performTransaction('readwrite', store => {
      return new Promise<boolean>((resolve, reject) => {
        const request = store.put(cachedData);

        request.onsuccess = () => {
          const dataSize = JSON.stringify(cachedData).length;
          this.recordOperation('set', key, true, dataSize);
          this.stats.totalEntries++;
          this.updateStats();
          resolve(true);
        };

        request.onerror = () => {
          this.recordOperation('set', key, false, 0, request.error?.toString());
          reject(request.error);
        };
      });
    }));
  }

  delete(key: string): Observable<boolean> {
    return from(this.performTransaction('readwrite', store => {
      return new Promise<boolean>((resolve, reject) => {
        const request = store.delete(key);

        request.onsuccess = () => {
          this.recordOperation('delete', key, true);
          this.stats.totalEntries = Math.max(0, this.stats.totalEntries - 1);
          this.updateStats();
          resolve(true);
        };

        request.onerror = () => {
          this.recordOperation('delete', key, false, 0, request.error?.toString());
          reject(request.error);
        };
      });
    }));
  }

  clear(): Observable<boolean> {
    return from(this.performTransaction('readwrite', store => {
      return new Promise<boolean>((resolve, reject) => {
        const request = store.clear();

        request.onsuccess = () => {
          this.recordOperation('clear', 'all', true);
          this.stats.totalEntries = 0;
          this.stats.staleEntries = 0;
          this.updateStats();
          resolve(true);
        };

        request.onerror = () => {
          this.recordOperation('clear', 'all', false, 0, request.error?.toString());
          reject(request.error);
        };
      });
    }));
  }

  getStaleData<T>(): Observable<CachedData<T>[]> {
    return from(this.performTransaction('readonly', store => {
      return new Promise<CachedData<T>[]>((resolve, reject) => {
        const staleData: CachedData<T>[] = [];
        const request = store.openCursor();

        request.onsuccess = (event: any) => {
          const cursor = event.target.result;

          if (cursor) {
            const item: CachedData<T> = cursor.value;
            if (this.isStale(item)) {
              staleData.push(item);
            }
            cursor.continue();
          } else {
            resolve(staleData);
          }
        };

        request.onerror = () => reject(request.error);
      });
    }));
  }

  cleanup(): Observable<number> {
    return from(this.performTransaction('readwrite', store => {
      return new Promise<number>((resolve, reject) => {
        let deletedCount = 0;
        const request = store.openCursor();

        request.onsuccess = (event: any) => {
          const cursor = event.target.result;

          if (cursor) {
            const item: CachedData<any> = cursor.value;

            if (Date.now() > item.metadata.expiresAt) {
              cursor.delete();
              deletedCount++;
            }
            cursor.continue();
          } else {
            this.stats.lastCleanup = Date.now();
            this.stats.totalEntries -= deletedCount;
            this.updateStats();
            resolve(deletedCount);
          }
        };

        request.onerror = () => reject(request.error);
      });
    }));
  }

  private performTransaction<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => Promise<T>): Promise<T> {
    if (!this.db) {
      return Promise.reject(new Error('Database not initialized'));
    }

    try {
      const transaction = this.db.transaction([this.storeName], mode);
      const store = transaction.objectStore(this.storeName);
      return operation(store);
    } catch (error) {
      return Promise.reject(error);
    }
  }

  private isStale(item: CachedData<any>): boolean {
    return Date.now() - item.metadata.timestamp > this.config.staleThreshold;
  }

  private updateAccessTime(item: CachedData<any>): void {
    item.metadata.lastAccessedAt = Date.now();
    item.metadata.isStale = this.isStale(item);

    // Persist the updated access time to IndexedDB
    if (this.db) {
      try {
        const transaction = this.db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        store.put(item);
      } catch (error) {
        console.warn('Failed to persist access time update:', error);
      }
    }
  }

  private recordOperation(type: CacheOperation['type'], key: string, success: boolean, dataSize?: number, error?: string): void {
    // In a real implementation, you might want to store these operations for analytics
    console.log(`Cache operation: ${type} ${key} - ${success ? 'success' : 'failed'}`, { dataSize, error });
  }

  private updateStats(): void {
    // Calculate hit ratio
    const totalRequests = this.stats.totalHits + this.stats.totalMisses;
    this.stats.hitRatio = totalRequests > 0 ? (this.stats.totalHits / totalRequests) * 100 : 0;

    // Update subject
    this.statsSubject.next({ ...this.stats });
  }

  getStats(): CacheStats {
    return { ...this.stats };
  }

  isHealthy(): boolean {
    return this.db !== null && this.initializationError === null && this.stats.hitRatio > 50; // Arbitrary health threshold
  }

  getInitializationError(): string | null {
    return this.initializationError;
  }
}