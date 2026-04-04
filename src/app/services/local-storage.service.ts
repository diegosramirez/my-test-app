import { Injectable } from '@angular/core';
import { ContactFormData } from '../models/contact-form.models';

@Injectable({
  providedIn: 'root'
})
export class LocalStorageService {
  private readonly storageKey = 'contact-form-data';
  private readonly sessionStorageKey = 'contact-form-session';

  constructor() {}

  saveFormData(formData: Partial<ContactFormData>): void {
    try {
      const dataToSave = {
        ...formData,
        timestamp: Date.now()
      };
      localStorage.setItem(this.storageKey, JSON.stringify(dataToSave));
    } catch (error) {
      console.warn('Failed to save form data to localStorage:', error);
    }
  }

  getFormData(): Partial<ContactFormData> | null {
    try {
      const savedData = localStorage.getItem(this.storageKey);
      if (!savedData) return null;

      const parsed = JSON.parse(savedData);

      // Check if data is not too old (expire after 24 hours)
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
      if (parsed.timestamp && (Date.now() - parsed.timestamp > maxAge)) {
        this.clearFormData();
        return null;
      }

      // Remove timestamp before returning
      const { timestamp, ...formData } = parsed;
      return formData;
    } catch (error) {
      console.warn('Failed to retrieve form data from localStorage:', error);
      return null;
    }
  }

  clearFormData(): void {
    try {
      localStorage.removeItem(this.storageKey);
    } catch (error) {
      console.warn('Failed to clear form data from localStorage:', error);
    }
  }

  saveSessionData(key: string, value: any): void {
    try {
      sessionStorage.setItem(`${this.sessionStorageKey}-${key}`, JSON.stringify(value));
    } catch (error) {
      console.warn('Failed to save session data:', error);
    }
  }

  getSessionData(key: string): any {
    try {
      const data = sessionStorage.getItem(`${this.sessionStorageKey}-${key}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.warn('Failed to retrieve session data:', error);
      return null;
    }
  }

  clearSessionData(key?: string): void {
    try {
      if (key) {
        sessionStorage.removeItem(`${this.sessionStorageKey}-${key}`);
      } else {
        // Clear all session data for this form
        Object.keys(sessionStorage).forEach(storageKey => {
          if (storageKey.startsWith(this.sessionStorageKey)) {
            sessionStorage.removeItem(storageKey);
          }
        });
      }
    } catch (error) {
      console.warn('Failed to clear session data:', error);
    }
  }

  isStorageAvailable(): boolean {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }
}