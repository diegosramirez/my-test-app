import { routes } from './app.routes';
import { HelloWorldComponent } from './pages/hello-world/hello-world.component';
import { describe, it, expect } from 'vitest';

describe('App Routes', () => {
  it('should have at least one route defined', () => {
    expect(routes.length).toBeGreaterThan(0);
  });

  it('should map empty path to HelloWorldComponent', () => {
    const defaultRoute = routes.find(r => r.path === '');
    expect(defaultRoute).toBeDefined();
    expect(defaultRoute!.component).toBe(HelloWorldComponent);
  });

  it('should use eager loading (no loadComponent) for the default route', () => {
    const defaultRoute = routes.find(r => r.path === '');
    expect(defaultRoute).toBeDefined();
    expect(defaultRoute!.component).toBe(HelloWorldComponent);
    expect((defaultRoute as any).loadComponent).toBeUndefined();
  });

  it('should not have a wildcard route (out of scope)', () => {
    const wildcardRoute = routes.find(r => r.path === '**');
    expect(wildcardRoute).toBeUndefined();
  });
});
