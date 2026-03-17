import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly theme = signal<'light' | 'dark'>(this.loadTheme());

  toggle(): void {
    const next = this.theme() === 'light' ? 'dark' : 'light';
    this.theme.set(next);
    this.applyTheme(next);
    this.persistTheme(next);
  }

  /** Apply on construction so the theme is set at startup. */
  constructor() {
    this.applyTheme(this.theme());
  }

  private applyTheme(value: 'light' | 'dark'): void {
    // TODO: SSR guard — wrap with isPlatformBrowser if SSR is adopted
    document.documentElement.setAttribute('data-theme', value);
  }

  private loadTheme(): 'light' | 'dark' {
    // TODO: SSR guard
    try {
      const stored = localStorage.getItem('app_theme');
      if (stored === 'dark' || stored === 'light') {
        return stored;
      }
    } catch {
      // Private browsing or quota exceeded — default to light
    }
    return 'light';
  }

  private persistTheme(value: 'light' | 'dark'): void {
    // TODO: SSR guard
    try {
      localStorage.setItem('app_theme', value);
    } catch {
      // Private browsing or quota exceeded — ignore
    }
  }
}
