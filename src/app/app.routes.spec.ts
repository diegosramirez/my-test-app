import { routes } from './app.routes';

describe('App Routes', () => {
  it('should have a lazy-loaded /todo route', () => {
    const todoRoute = routes.find(r => r.path === 'todo');
    expect(todoRoute).toBeTruthy();
    expect(todoRoute!.loadComponent).toBeDefined();
    expect(typeof todoRoute!.loadComponent).toBe('function');
  });

  it('should lazy-load TodoListComponent', async () => {
    const todoRoute = routes.find(r => r.path === 'todo')!;
    const mod = await (todoRoute.loadComponent as Function)();
    expect(mod).toBeDefined();
  });
});
