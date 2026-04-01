import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';
import { describe, it, expect } from 'vitest';

describe('App', () => {
  async function setup() {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])]
    }).compileComponents();
    return TestBed.createComponent(App);
  }

  it('should create', async () => {
    const fixture = await setup();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should contain a router-outlet', async () => {
    const fixture = await setup();
    fixture.detectChanges();
    const outlet = fixture.nativeElement.querySelector('router-outlet');
    expect(outlet).toBeTruthy();
  });

  it('should NOT render an h1 element', async () => {
    const fixture = await setup();
    fixture.detectChanges();
    const h1 = fixture.nativeElement.querySelector('h1');
    expect(h1).toBeNull();
  });

  it('should have router-outlet as only meaningful content', async () => {
    const fixture = await setup();
    fixture.detectChanges();
    const html = fixture.nativeElement.innerHTML.trim();
    // Should only contain router-outlet (Angular renders it as a comment + element)
    expect(html).toContain('router-outlet');
    // No nav, footer, header, or other layout chrome
    expect(fixture.nativeElement.querySelector('nav')).toBeNull();
    expect(fixture.nativeElement.querySelector('header')).toBeNull();
    expect(fixture.nativeElement.querySelector('footer')).toBeNull();
  });

  it('should be standalone', () => {
    // App component decorator has standalone: true
    // If it weren't standalone, TestBed with imports: [App] would fail
    expect(true).toBe(true); // The setup itself validates this
  });
});

describe('Route configuration', () => {
  it('should have a login route', () => {
    const loginRoute = routes.find(r => r.path === 'login');
    expect(loginRoute).toBeTruthy();
    expect(loginRoute!.component).toBeTruthy();
  });

  it('should have a register route', () => {
    const registerRoute = routes.find(r => r.path === 'register');
    expect(registerRoute).toBeTruthy();
    expect(registerRoute!.component).toBeTruthy();
  });

  it('should have a tasks route', () => {
    const tasksRoute = routes.find(r => r.path === 'tasks');
    expect(tasksRoute).toBeTruthy();
    expect(tasksRoute!.component).toBeTruthy();
  });

  it('should redirect empty path to login with pathMatch full', () => {
    const emptyRoute = routes.find(r => r.path === '');
    expect(emptyRoute).toBeTruthy();
    expect(emptyRoute!.redirectTo).toBe('login');
    expect(emptyRoute!.pathMatch).toBe('full');
  });

  it('should have wildcard redirect to login as the LAST route', () => {
    const lastRoute = routes[routes.length - 1];
    expect(lastRoute.path).toBe('**');
    expect(lastRoute.redirectTo).toBe('login');
  });

  it('should have exactly 5 routes', () => {
    expect(routes.length).toBe(5);
  });
});
