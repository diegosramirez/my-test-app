import { render, screen } from '@testing-library/angular';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';

describe('App', () => {
  async function setup() {
    return await render(App, {
      providers: [provideRouter(routes)],
    });
  }

  it('should render a skip-link targeting #main-content', async () => {
    await setup();
    const skipLink = screen.getByRole('link', { name: /skip to main content/i });
    expect(skipLink).toBeTruthy();
    expect(skipLink.getAttribute('href')).toBe('#main-content');
  });

  it('should render the navigation menu', async () => {
    await setup();
    const nav = screen.getByRole('navigation', { name: /main navigation/i });
    expect(nav).toBeTruthy();
  });

  it('should wrap router-outlet in <main> with id="main-content" and tabindex="-1"', async () => {
    const { fixture } = await setup();
    const mainEl = fixture.nativeElement.querySelector('main#main-content');
    expect(mainEl).toBeTruthy();
    expect(mainEl.getAttribute('tabindex')).toBe('-1');
  });

  it('should contain a router-outlet inside the main content area', async () => {
    const { fixture } = await setup();
    const mainEl = fixture.nativeElement.querySelector('main#main-content');
    const outlet = mainEl?.querySelector('router-outlet');
    expect(outlet).toBeTruthy();
  });

  it('should render skip-link before nav, and nav before main#main-content in DOM order', async () => {
    const { fixture } = await setup();
    const root = fixture.nativeElement as HTMLElement;
    const skipLink = screen.getByRole('link', { name: /skip to main content/i });
    const nav = screen.getByRole('navigation', { name: /main navigation/i });
    const mainEl = root.querySelector('main#main-content') as HTMLElement;

    // DOCUMENT_POSITION_FOLLOWING = 4
    expect(skipLink.compareDocumentPosition(nav) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(nav.compareDocumentPosition(mainEl) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('should render nav-menu outside the main content area', async () => {
    const { fixture } = await setup();
    const mainEl = fixture.nativeElement.querySelector('main#main-content') as HTMLElement;
    const nav = screen.getByRole('navigation', { name: /main navigation/i });
    expect(mainEl.contains(nav)).toBe(false);
  });

  it('should render the password generator link via the nav menu', async () => {
    await setup();
    const link = screen.getByRole('link', { name: /password generator/i });
    expect(link).toBeTruthy();
  });
});
