import { Injectable } from '@angular/core';
import { Event } from '../models/event.interface';

@Injectable({
  providedIn: 'root'
})
export class LocalStorageService {
  private readonly STORAGE_KEY = 'event-planner-events';
  private readonly QUOTA_EXCEEDED_KEY = 'event-planner-quota-exceeded';
  private useSessionStorage = false;

  constructor() {
    this.checkStorageAvailability();
    this.setupStorageListener();
  }

  saveEvents(events: Event[]): void {
    try {
      const storage = this.getStorage();
      const jsonData = JSON.stringify(events);
      storage.setItem(this.STORAGE_KEY, jsonData);

      // Clear quota exceeded flag on successful save
      storage.removeItem(this.QUOTA_EXCEEDED_KEY);
    } catch (error) {
      this.handleStorageError(error, events);
    }
  }

  loadEvents(): Event[] {
    try {
      const storage = this.getStorage();
      const jsonData = storage.getItem(this.STORAGE_KEY);

      if (!jsonData) {
        return [];
      }

      const events = JSON.parse(jsonData);
      return this.validateAndParseEvents(events);
    } catch (error) {
      console.error('Error loading events from storage:', error);
      return [];
    }
  }

  isQuotaExceeded(): boolean {
    const storage = this.getStorage();
    return storage.getItem(this.QUOTA_EXCEEDED_KEY) === 'true';
  }

  getStorageInfo(): { type: 'localStorage' | 'sessionStorage'; quotaExceeded: boolean } {
    return {
      type: this.useSessionStorage ? 'sessionStorage' : 'localStorage',
      quotaExceeded: this.isQuotaExceeded()
    };
  }

  private getStorage(): Storage {
    return this.useSessionStorage ? sessionStorage : localStorage;
  }

  private checkStorageAvailability(): void {
    try {
      const testKey = 'test-storage-availability';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
    } catch (error) {
      console.warn('localStorage not available, falling back to sessionStorage');
      this.useSessionStorage = true;
    }
  }

  private handleStorageError(error: any, events: Event[]): void {
    if (error.name === 'QuotaExceededError' || error.code === 22) {
      console.warn('Storage quota exceeded, attempting fallback to sessionStorage');

      if (!this.useSessionStorage) {
        this.useSessionStorage = true;
        try {
          this.getStorage().setItem(this.QUOTA_EXCEEDED_KEY, 'true');
        } catch (flagError) {
          // Ignore error when setting quota flag
        }

        try {
          sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(events));
        } catch (sessionError) {
          console.error('Both localStorage and sessionStorage quota exceeded:', sessionError);
          try {
            this.getStorage().setItem(this.QUOTA_EXCEEDED_KEY, 'true');
          } catch (flagError) {
            // Ignore error when setting quota flag
          }
        }
      } else {
        try {
          this.getStorage().setItem(this.QUOTA_EXCEEDED_KEY, 'true');
        } catch (flagError) {
          // Ignore error when setting quota flag
        }
        console.error('Session storage quota also exceeded:', error);
      }
    } else {
      console.error('Storage error:', error);
    }
  }

  private validateAndParseEvents(events: any[]): Event[] {
    if (!Array.isArray(events)) {
      console.warn('Invalid events data format, returning empty array');
      return [];
    }

    return events.map(event => {
      try {
        const parsedDate = new Date(event.date);
        const parsedCreatedAt = new Date(event.createdAt);
        const parsedUpdatedAt = new Date(event.updatedAt);

        // Check if any of the dates are invalid
        if (isNaN(parsedDate.getTime()) || isNaN(parsedCreatedAt.getTime()) || isNaN(parsedUpdatedAt.getTime())) {
          throw new Error('Invalid date format');
        }

        return {
          ...event,
          date: parsedDate,
          createdAt: parsedCreatedAt,
          updatedAt: parsedUpdatedAt
        };
      } catch (error) {
        console.warn('Invalid event data, skipping:', event, error);
        return null;
      }
    }).filter((event): event is Event => event !== null);
  }

  private setupStorageListener(): void {
    window.addEventListener('storage', (e) => {
      if (e.key === this.STORAGE_KEY) {
        // Emit custom event for cross-tab synchronization
        window.dispatchEvent(new CustomEvent('events-updated', {
          detail: { source: 'storage-event' }
        }));
      }
    });
  }
}