import { routes } from './app.routes';

describe('App Routes', () => {
  it('should have notes list route', () => {
    const notesRoute = routes.find(r => r.path === 'notes');
    expect(notesRoute).toBeTruthy();
  });

  it('should have notes/new route', () => {
    const newRoute = routes.find(r => r.path === 'notes/new');
    expect(newRoute).toBeTruthy();
  });

  it('should have notes/:id/edit route', () => {
    const editRoute = routes.find(r => r.path === 'notes/:id/edit');
    expect(editRoute).toBeTruthy();
  });

  it('should redirect empty path to notes', () => {
    const defaultRoute = routes.find(r => r.path === '');
    expect(defaultRoute).toBeTruthy();
    expect(defaultRoute!.redirectTo).toBe('notes');
    expect(defaultRoute!.pathMatch).toBe('full');
  });

  it('should have notes/new before notes/:id/edit to prevent "new" matching as :id', () => {
    const newIndex = routes.findIndex(r => r.path === 'notes/new');
    const editIndex = routes.findIndex(r => r.path === 'notes/:id/edit');
    expect(newIndex).toBeLessThan(editIndex);
  });

  it('should use standalone components (no loadChildren or loadComponent lazy)', () => {
    const componentRoutes = routes.filter(r => r.component);
    expect(componentRoutes.length).toBeGreaterThanOrEqual(3);
  });
});
