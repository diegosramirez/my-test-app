import { routes } from '../app.routes';

describe('Health route configuration', () => {
  const healthRoute = routes.find((r) => r.path === 'health');

  it('should have a /health route defined', () => {
    expect(healthRoute).toBeDefined();
  });

  it('should use loadComponent for lazy loading', () => {
    expect(healthRoute!.loadComponent).toBeDefined();
    expect(typeof healthRoute!.loadComponent).toBe('function');
  });

  it('should not have any route guards', () => {
    expect(healthRoute!.canActivate).toBeUndefined();
    expect(healthRoute!.canActivateChild).toBeUndefined();
    expect(healthRoute!.canDeactivate).toBeUndefined();
    expect(healthRoute!.canMatch).toBeUndefined();
  });

  it('should not have redirect logic', () => {
    expect(healthRoute!.redirectTo).toBeUndefined();
  });

  it('should lazy-load HealthCheckComponent', async () => {
    const component = await healthRoute!.loadComponent!() as any;
    // loadComponent returns the component class (or a module with the component)
    const resolved = component.HealthCheckComponent ?? component;
    expect(resolved).toBeDefined();
    expect(resolved.name).toContain('HealthCheckComponent');
  });
});
