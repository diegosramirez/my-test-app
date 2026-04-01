import { Injectable } from '@angular/core';
import { StorageError } from '../interfaces/subscription.interface';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private memoryFallback = new Map<string, any>();
  private storageMethod: 'localStorage' | 'sessionStorage' | 'memory' = 'localStorage';
  private isStorageAvailable = false;

  constructor() {
    this.detectStorageCapabilities();
  }

  /**
   * Detects available storage capabilities and sets fallback strategy
   */
  private detectStorageCapabilities(): void {
    try {
      // Test localStorage availability
      const testKey = '__storage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      this.storageMethod = 'localStorage';
      this.isStorageAvailable = true;
    } catch (error) {
      try {
        // Fallback to sessionStorage
        const testKey = '__storage_test__';
        sessionStorage.setItem(testKey, 'test');
        sessionStorage.removeItem(testKey);
        this.storageMethod = 'sessionStorage';
        this.isStorageAvailable = true;
        console.warn('localStorage unavailable, using sessionStorage');
      } catch (sessionError) {
        // Final fallback to memory
        this.storageMethod = 'memory';
        this.isStorageAvailable = false;
        console.warn('Browser storage unavailable, using in-memory storage. Data will not persist between sessions.');
      }
    }
  }

  /**
   * Stores data with automatic fallback handling
   */
  async store(key: string, data: any): Promise<boolean> {
    try {
      const serializedData = JSON.stringify(data);

      switch (this.storageMethod) {
        case 'localStorage':
          localStorage.setItem(key, serializedData);
          break;
        case 'sessionStorage':
          sessionStorage.setItem(key, serializedData);
          break;
        case 'memory':
          this.memoryFallback.set(key, data);
          break;
      }

      return true;
    } catch (error) {
      console.error('Storage operation failed:', error);

      // If primary storage fails, try fallback
      if (this.storageMethod !== 'memory') {
        console.warn(`${this.storageMethod} failed, falling back to memory storage`);
        this.storageMethod = 'memory';
        this.isStorageAvailable = false;
        this.memoryFallback.set(key, data);
        return true;
      }

      return false;
    }
  }

  /**
   * Retrieves data with type safety and error handling
   */
  async retrieve<T>(key: string): Promise<T | null> {
    try {
      let serializedData: string | null = null;

      switch (this.storageMethod) {
        case 'localStorage':
          serializedData = localStorage.getItem(key);
          break;
        case 'sessionStorage':
          serializedData = sessionStorage.getItem(key);
          break;
        case 'memory':
          const data = this.memoryFallback.get(key);
          return data !== undefined ? data : null;
      }

      if (serializedData === null) {
        return null;
      }

      return JSON.parse(serializedData) as T;
    } catch (error) {
      console.error('Failed to retrieve data:', error);

      // Try memory fallback if parsing fails
      if (this.storageMethod !== 'memory') {
        const data = this.memoryFallback.get(key);
        return data !== undefined ? data : null;
      }

      return null;
    }
  }

  /**
   * Removes data from storage
   */
  async remove(key: string): Promise<boolean> {
    try {
      switch (this.storageMethod) {
        case 'localStorage':
          localStorage.removeItem(key);
          break;
        case 'sessionStorage':
          sessionStorage.removeItem(key);
          break;
        case 'memory':
          this.memoryFallback.delete(key);
          break;
      }

      return true;
    } catch (error) {
      console.error('Failed to remove data:', error);
      return false;
    }
  }

  /**
   * Clears all stored data
   */
  async clear(): Promise<boolean> {
    try {
      switch (this.storageMethod) {
        case 'localStorage':
          localStorage.clear();
          break;
        case 'sessionStorage':
          sessionStorage.clear();
          break;
        case 'memory':
          this.memoryFallback.clear();
          break;
      }

      return true;
    } catch (error) {
      console.error('Failed to clear storage:', error);
      return false;
    }
  }

  /**
   * Gets all keys from storage
   */
  async getKeys(): Promise<string[]> {
    try {
      switch (this.storageMethod) {
        case 'localStorage':
          return Object.keys(localStorage);
        case 'sessionStorage':
          return Object.keys(sessionStorage);
        case 'memory':
          return Array.from(this.memoryFallback.keys());
      }
    } catch (error) {
      console.error('Failed to get storage keys:', error);
      return [];
    }
  }

  /**
   * Checks if storage is available and functional
   */
  isAvailable(): boolean {
    return this.isStorageAvailable;
  }

  /**
   * Gets current storage method being used
   */
  getStorageMethod(): 'localStorage' | 'sessionStorage' | 'memory' {
    return this.storageMethod;
  }

  /**
   * Gets storage capacity information
   */
  async getStorageInfo(): Promise<{
    method: string;
    available: boolean;
    persistent: boolean;
    estimatedQuota?: number;
    estimatedUsage?: number;
  }> {
    const info = {
      method: this.storageMethod,
      available: this.isStorageAvailable,
      persistent: this.storageMethod !== 'memory',
      estimatedQuota: undefined as number | undefined,
      estimatedUsage: undefined as number | undefined
    };

    // Try to get storage quota information if available
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        info.estimatedQuota = estimate.quota;
        info.estimatedUsage = estimate.usage;
      } catch (error) {
        // Storage estimation not available or failed
      }
    }

    return info;
  }

  /**
   * Attempts to clean up old or invalid data
   */
  async cleanup(maxAge?: number): Promise<{ removed: number; errors: number }> {
    const stats = { removed: 0, errors: 0 };

    try {
      const keys = await this.getKeys();
      const cutoffTime = maxAge ? Date.now() - maxAge : undefined;

      for (const key of keys) {
        try {
          // Only clean up subscription-related keys
          if (!key.startsWith('subscription_') && !key.startsWith('email_')) {
            continue;
          }

          const data = await this.retrieve(key);

          // Remove if data is corrupted
          if (!data) {
            await this.remove(key);
            stats.removed++;
            continue;
          }

          // Remove if data is too old
          if (cutoffTime && data && typeof data === 'object' && 'timestamp' in data &&
              typeof data.timestamp === 'number' && data.timestamp < cutoffTime) {
            await this.remove(key);
            stats.removed++;
            continue;
          }

        } catch (error) {
          stats.errors++;
          console.warn(`Failed to process key ${key} during cleanup:`, error);
        }
      }
    } catch (error) {
      console.error('Storage cleanup failed:', error);
      stats.errors++;
    }

    return stats;
  }

  /**
   * Creates a structured storage error
   */
  createStorageError(
    code: StorageError['code'],
    message: string,
    technicalDetails: string,
    fallbackUsed = false
  ): StorageError {
    return {
      type: 'storage',
      code,
      message,
      technicalDetails,
      fallbackUsed
    };
  }
}