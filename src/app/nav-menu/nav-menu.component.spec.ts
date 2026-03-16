import { render, screen } from '@testing-library/angular';
import { provideRouter, Router } from '@angular/router';
import { NavMenuComponent } from './nav-menu.component';
import { routes } from '../app.routes';
import { Component } from '@angular/core';

@Component({ standalone: true, template: '<p>Dummy</p>' })
class DummyComponent {}

describe('NavMenuComponent', () => {
  async function setup(currentRoutes = routes) {
    return await render(NavMenuComponent, {
      providers: [provideRouter(currentRoutes)],
    });
  }

  it('should render a navigation landmark with "Main navigation" label', async () => {
    await setup();
    const nav = screen.getByRole('navigation', { name: /main navigation/i });
    expect(nav).toBeTruthy();
  });

  it('should render a link to /password-generator', async () => {
    await setup();
    const link = screen.getByRole('link', { name: /password generator/i });
    expect(link).toBeTruthy();
    expect(link.getAttribute('href')).toBe('/password-generator');
  });

  it('should use a list structure inside nav', async () => {
    await setup();
    const nav = screen.getByRole('navigation', { name: /main navigation/i });
    const list = screen.getByRole('list');
    expect(nav.contains(list)).toBe(true);

    const items = screen.getAllByRole('listitem');
    expect(items.length).toBeGreaterThanOrEqual(1);

    const link = screen.getByRole('link', { name: /password generator/i });
    expect(items[0].contains(link)).toBe(true);
  });

  it('should not have aria-current="page" when route is not active', async () => {
    await setup();
    const link = screen.getByRole('link', { name: /password generator/i });
    expect(link.getAttribute('aria-current')).not.toBe('page');
  });

  it('should set aria-current="page" when the route is active', async () => {
    const { fixture } = await setup();
    const router = fixture.debugElement.injector.get(Router);

    await router.navigateByUrl('/password-generator');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const link = screen.getByRole('link', { name: /password generator/i });
    expect(link.getAttribute('aria-current')).toBe('page');
  });

  it('should apply active class when navigated to /password-generator', async () => {
    const { fixture } = await setup();
    const router = fixture.debugElement.injector.get(Router);

    await router.navigateByUrl('/password-generator');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const link = screen.getByRole('link', { name: /password generator/i });
    expect(link.classList.contains('active')).toBe(true);
  });

  it('should NOT apply active class when on a different route', async () => {
    const testRoutes = [
      ...routes,
      { path: 'other', component: DummyComponent },
    ];
    const { fixture } = await setup(testRoutes);
    const router = fixture.debugElement.injector.get(Router);

    await router.navigateByUrl('/other');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const link = screen.getByRole('link', { name: /password generator/i });
    expect(link.classList.contains('active')).toBe(false);
  });

  it('should be a standalone component', () => {
    // Verified by the fact that it renders without a module, but also check metadata
    expect((NavMenuComponent as any).ɵcmp).toBeTruthy();
  });
});
