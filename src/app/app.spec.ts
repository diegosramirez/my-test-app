import { render, screen } from '@testing-library/angular';
import { provideRouter } from '@angular/router';
import { Component } from '@angular/core';
import { App } from './app';

@Component({ standalone: true, template: '<p>Password Generator Works</p>' })
class DummyComponent {}

const routes = [{ path: 'password-generator', component: DummyComponent }];

describe('App (root component)', () => {
  async function setup() {
    return render(App, {
      providers: [provideRouter(routes)],
    });
  }

  /** Helper: get the main element that has id="main-content" */
  function getMainContent(): HTMLElement {
    const mains = screen.getAllByRole('main');
    const mainContent = mains.find((el) => el.id === 'main-content');
    if (!mainContent) throw new Error('No <main id="main-content"> found');
    return mainContent;
  }

  // --- Skip link ---

  it('should render a skip-link targeting #main-content', async () => {
    await setup();
    const skipLink = screen.getByRole('link', { name: /skip to main content/i });
    expect(skipLink).toBeTruthy();
    expect(skipLink.getAttribute('href')).toBe('#main-content');
  });

  it('should have the skip-link with class "skip-link"', async () => {
    await setup();
    const skipLink = screen.getByRole('link', { name: /skip to main content/i });
    expect(skipLink.classList.contains('skip-link')).toBe(true);
  });

  // --- NavMenuComponent rendered ---

  it('should render the navigation menu with "Main navigation" label', async () => {
    await setup();
    const nav = screen.getByRole('navigation', { name: /main navigation/i });
    expect(nav).toBeTruthy();
  });

  it('should render the Password Generator link inside the nav', async () => {
    await setup();
    const link = screen.getByRole('link', { name: /password generator/i });
    expect(link).toBeTruthy();
  });

  // --- Main content area ---

  it('should render a <main> element with id="main-content"', async () => {
    await setup();
    const main = getMainContent();
    expect(main).toBeTruthy();
  });

  it('should have tabindex="-1" on the main-content element for skip-link focus', async () => {
    await setup();
    const main = getMainContent();
    expect(main.getAttribute('tabindex')).toBe('-1');
  });

  // --- NavMenu is outside router-outlet (persists across routes) ---

  it('should render nav outside the main-content element (not inside routed view)', async () => {
    await setup();
    const main = getMainContent();
    const nav = screen.getByRole('navigation', { name: /main navigation/i });
    expect(main.contains(nav)).toBe(false);
  });

  // --- Structural ordering: skip-link -> nav -> main-content ---

  it('should render skip-link before nav and nav before main-content in DOM order', async () => {
    await setup();
    const skipLink = screen.getByRole('link', { name: /skip to main content/i });
    const nav = screen.getByRole('navigation', { name: /main navigation/i });
    const main = getMainContent();

    expect(skipLink.compareDocumentPosition(nav) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(nav.compareDocumentPosition(main) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  // --- App component is standalone ---

  it('should be a standalone component', () => {
    const cmp = (App as any).ɵcmp;
    expect(cmp).toBeTruthy();
  });
});
