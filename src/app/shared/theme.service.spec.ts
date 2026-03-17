import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('should default to light theme', () => {
    const service = TestBed.inject(ThemeService);
    expect(service.theme()).toBe('light');
  });

  it('should set data-theme attribute on document', () => {
    TestBed.inject(ThemeService);
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('should toggle to dark then back to light', () => {
    const service = TestBed.inject(ThemeService);
    service.toggle();
    expect(service.theme()).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    service.toggle();
    expect(service.theme()).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('should persist theme to localStorage', () => {
    const service = TestBed.inject(ThemeService);
    service.toggle();
    expect(localStorage.getItem('app_theme')).toBe('dark');
  });

  it('should load persisted theme from localStorage', () => {
    localStorage.setItem('app_theme', 'dark');
    const service = TestBed.inject(ThemeService);
    expect(service.theme()).toBe('dark');
  });

  it('should default to light for invalid stored value', () => {
    localStorage.setItem('app_theme', 'invalid');
    const service = TestBed.inject(ThemeService);
    expect(service.theme()).toBe('light');
  });
});
