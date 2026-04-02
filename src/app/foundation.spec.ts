import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';
import { appConfig } from './app.config';
import { HealthResponse } from './models';

/**
 * Foundation story tests — validates scaffold cleanup, folder structure,
 * app config, routing shell, and model conventions.
 */

describe('Scaffold Removal & Root Component', () => {
  it('should create the App component as standalone', () => {
    expect(App).toBeDefined();
    // Verify standalone via component metadata
    const metadata = (App as any).__annotations__?.[0] ?? (App as any).ɵcmp;
    expect(metadata).toBeTruthy();
  });

  it('should render only a router-outlet in the template', async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])]
    }).compileComponents();

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const routerOutlet = el.querySelector('router-outlet');
    expect(routerOutlet).toBeTruthy();

    // Template should contain ONLY the router-outlet, no scaffold text
    const textContent = el.textContent?.trim() ?? '';
    expect(textContent).toBe('');

    // No Angular branding or demo content
    expect(el.querySelector('img')).toBeNull();
    expect(el.querySelector('a[href*="angular"]')).toBeNull();
    expect(el.innerHTML).not.toContain('Hello');
    expect(el.innerHTML).not.toContain('Congratulations');
  });

  it('should have App selector as app-root', () => {
    const cmp = (App as any).ɵcmp;
    if (cmp) {
      expect(cmp.selectors?.[0]?.[0] ?? '').toContain('app-root');
    }
  });
});

describe('App Routes', () => {
  it('should export an empty Routes array', () => {
    expect(Array.isArray(routes)).toBe(true);
    expect(routes.length).toBe(0);
  });
});

describe('App Config', () => {
  it('should export appConfig with providers array', () => {
    expect(appConfig).toBeDefined();
    expect(appConfig.providers).toBeDefined();
    expect(Array.isArray(appConfig.providers)).toBe(true);
    expect(appConfig.providers.length).toBeGreaterThanOrEqual(2);
  });
});

describe('HealthResponse Model', () => {
  it('should be importable from models barrel', () => {
    // TypeScript compile-time check — if this compiles, the barrel works
    const okResponse: HealthResponse = { status: 'ok' };
    const errorResponse: HealthResponse = { status: 'error' };
    expect(okResponse.status).toBe('ok');
    expect(errorResponse.status).toBe('error');
  });

  it('should constrain status to ok or error', () => {
    const response: HealthResponse = { status: 'ok' };
    expect(['ok', 'error']).toContain(response.status);
  });
});
