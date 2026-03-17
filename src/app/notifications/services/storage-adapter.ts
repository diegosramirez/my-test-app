import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class StorageAdapter {
  getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  setItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn('StorageAdapter: failed to write to localStorage', e);
    }
  }

  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      // silently degrade
    }
  }
}
