import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class StorageAdapter {
  readonly storageAvailable = signal(false);

  constructor() {
    this.storageAvailable.set(this.detectStorage());
  }

  private detectStorage(): boolean {
    try {
      const testKey = '__storage_test__';
      localStorage.setItem(testKey, 'test');
      const result = localStorage.getItem(testKey);
      localStorage.removeItem(testKey);
      return result === 'test';
    } catch {
      return false;
    }
  }

  read<T>(key: string): T | null {
    if (!this.storageAvailable()) return null;
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  write(key: string, data: unknown): boolean {
    if (!this.storageAvailable()) return false;
    try {
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (e) {
      if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.code === 22)) {
        return false;
      }
      return false;
    }
  }
}
