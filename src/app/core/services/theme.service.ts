import { Injectable, inject, signal, DestroyRef } from '@angular/core';
import { DOCUMENT } from '@angular/common';

const STORAGE_KEY = 'darkModeEnabled';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private document = inject(DOCUMENT);
  private destroyRef = inject(DestroyRef);
  private _storageAvailable = true;
  private _darkMode = signal(this.resolveInitialTheme());

  readonly darkMode = this._darkMode.asReadonly();

  get storageAvailable(): boolean {
    return this._storageAvailable;
  }

  constructor() {
    this.applyTheme(this._darkMode());
    this.listenForCrossTabChanges();
  }

  toggle(): void {
    this.setDarkMode(!this._darkMode());
  }

  setDarkMode(enabled: boolean): void {
    this._darkMode.set(enabled);
    this.applyTheme(enabled);
    this.writeToStorage(enabled);
  }

  private resolveInitialTheme(): boolean {
    // Tier 1: localStorage
    try {
      const stored = this.document?.defaultView?.localStorage?.getItem(STORAGE_KEY) ?? null;
      if (stored === 'true') return true;
      if (stored === 'false') return false;
      // Any other value (including null/absent) falls through
    } catch {
      this._storageAvailable = false;
    }

    // Tier 2: OS preference (only if no explicit stored value)
    try {
      const win = this.document?.defaultView;
      if (win?.matchMedia('(prefers-color-scheme: dark)').matches) {
        return true;
      }
    } catch {
      // matchMedia unavailable
    }

    // Tier 3: default light
    return false;
  }

  private applyTheme(dark: boolean): void {
    const body = this.document?.body;
    if (!body) return;
    if (dark) {
      body.classList.add('dark-mode');
    } else {
      body.classList.remove('dark-mode');
    }
  }

  private writeToStorage(enabled: boolean): void {
    try {
      this.document?.defaultView?.localStorage?.setItem(STORAGE_KEY, String(enabled));
    } catch {
      this._storageAvailable = false;
    }
  }

  private listenForCrossTabChanges(): void {
    const win = this.document?.defaultView;
    if (!win) return;

    const handler = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      const newValue = event.newValue;
      if (newValue === 'true') {
        this._darkMode.set(true);
        this.applyTheme(true);
      } else if (newValue === 'false') {
        this._darkMode.set(false);
        this.applyTheme(false);
      }
      // Ignore unexpected values
    };

    win.addEventListener('storage', handler);
    this.destroyRef.onDestroy(() => {
      win.removeEventListener('storage', handler);
    });
  }
}
