import { TestBed } from '@angular/core/testing';
import { DOCUMENT } from '@angular/common';
import { ThemeService } from './theme.service';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('ThemeService', () => {
  afterEach(() => {
    document.body.classList.remove('dark-mode');
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  function createService(
    storageState: Record<string, string> = {},
    prefersDark = false
  ): ThemeService {
    const storage: Record<string, string> = { ...storageState };
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key: string) => storage[key] ?? null);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key: string, value: string) => {
      storage[key] = value;
    });

    document.body.classList.remove('dark-mode');

    window.matchMedia = vi.fn().mockReturnValue({
      matches: prefersDark,
      media: '(prefers-color-scheme: dark)',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      onchange: null,
      dispatchEvent: vi.fn(() => false),
    } as unknown as MediaQueryList);

    TestBed.configureTestingModule({
      providers: [
        ThemeService,
        { provide: DOCUMENT, useValue: document },
      ],
    });

    return TestBed.inject(ThemeService);
  }

  // --- Three-tier resolution ---

  it('should default to light mode when no stored value and no OS preference', () => {
    const service = createService();
    expect(service.darkMode()).toBe(false);
    expect(document.body.classList.contains('dark-mode')).toBe(false);
  });

  it('should read stored "true" and apply dark mode', () => {
    const service = createService({ darkModeEnabled: 'true' });
    expect(service.darkMode()).toBe(true);
    expect(document.body.classList.contains('dark-mode')).toBe(true);
  });

  it('should read stored "false" and stay light', () => {
    const service = createService({ darkModeEnabled: 'false' });
    expect(service.darkMode()).toBe(false);
    expect(document.body.classList.contains('dark-mode')).toBe(false);
  });

  it('should treat unexpected stored value as light mode', () => {
    const service = createService({ darkModeEnabled: 'maybe' });
    expect(service.darkMode()).toBe(false);
  });

  it('should treat empty string stored value as light mode', () => {
    const service = createService({ darkModeEnabled: '' });
    expect(service.darkMode()).toBe(false);
  });

  it('should fall back to OS dark preference when no stored value', () => {
    const service = createService({}, true);
    expect(service.darkMode()).toBe(true);
    expect(document.body.classList.contains('dark-mode')).toBe(true);
  });

  it('should prefer stored "false" over OS dark preference', () => {
    const service = createService({ darkModeEnabled: 'false' }, true);
    expect(service.darkMode()).toBe(false);
  });

  it('should prefer stored "true" over OS light preference', () => {
    const service = createService({ darkModeEnabled: 'true' }, false);
    expect(service.darkMode()).toBe(true);
  });

  // --- Toggle ---

  it('should toggle from light to dark', () => {
    const service = createService();
    service.toggle();
    expect(service.darkMode()).toBe(true);
    expect(document.body.classList.contains('dark-mode')).toBe(true);
    expect(localStorage.setItem).toHaveBeenCalledWith('darkModeEnabled', 'true');
  });

  it('should toggle from dark to light', () => {
    const service = createService({ darkModeEnabled: 'true' });
    service.toggle();
    expect(service.darkMode()).toBe(false);
    expect(document.body.classList.contains('dark-mode')).toBe(false);
    expect(localStorage.setItem).toHaveBeenCalledWith('darkModeEnabled', 'false');
  });

  it('should support setDarkMode directly', () => {
    const service = createService();
    service.setDarkMode(true);
    expect(service.darkMode()).toBe(true);
    service.setDarkMode(false);
    expect(service.darkMode()).toBe(false);
  });

  // --- localStorage error handling ---

  it('should handle localStorage throwing on getItem', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('access denied');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {});
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false, media: '', addEventListener: vi.fn(),
      removeEventListener: vi.fn(), addListener: vi.fn(),
      removeListener: vi.fn(), onchange: null, dispatchEvent: vi.fn(() => false),
    } as unknown as MediaQueryList);

    document.body.classList.remove('dark-mode');
    TestBed.configureTestingModule({
      providers: [
        ThemeService,
        { provide: DOCUMENT, useValue: document },
      ],
    });
    const service = TestBed.inject(ThemeService);
    expect(service.darkMode()).toBe(false);
    expect(service.storageAvailable).toBe(false);
  });

  it('should handle localStorage throwing on setItem', () => {
    const service = createService();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });
    service.toggle();
    expect(service.darkMode()).toBe(true);
    expect(service.storageAvailable).toBe(false);
  });

  it('should report storageAvailable as true by default', () => {
    const service = createService();
    expect(service.storageAvailable).toBe(true);
  });

  // --- Cross-tab sync via storage event ---

  it('should sync on storage event with "true"', () => {
    const service = createService();
    expect(service.darkMode()).toBe(false);
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'darkModeEnabled',
      newValue: 'true',
    }));
    expect(service.darkMode()).toBe(true);
    expect(document.body.classList.contains('dark-mode')).toBe(true);
  });

  it('should sync on storage event with "false"', () => {
    const service = createService({ darkModeEnabled: 'true' });
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'darkModeEnabled',
      newValue: 'false',
    }));
    expect(service.darkMode()).toBe(false);
    expect(document.body.classList.contains('dark-mode')).toBe(false);
  });

  it('should ignore storage events for other keys', () => {
    const service = createService();
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'otherKey',
      newValue: 'true',
    }));
    expect(service.darkMode()).toBe(false);
  });

  it('should ignore storage events with unexpected values', () => {
    const service = createService();
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'darkModeEnabled',
      newValue: 'garbage',
    }));
    expect(service.darkMode()).toBe(false);
  });

  it('should ignore storage events with null value', () => {
    const service = createService({ darkModeEnabled: 'true' });
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'darkModeEnabled',
      newValue: null,
    }));
    // Should remain unchanged
    expect(service.darkMode()).toBe(true);
  });
});
