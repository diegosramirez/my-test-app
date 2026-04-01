import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from '../services/auth.service';
import { authGuard } from './auth.guard';
import { ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';

describe('authGuard', () => {
  let authService: AuthService;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ]
    });
    authService = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
  });

  afterEach(() => localStorage.clear());

  function runGuard(url: string): boolean | UrlTree {
    const route = {} as ActivatedRouteSnapshot;
    const state = { url } as RouterStateSnapshot;
    return TestBed.runInInjectionContext(() => authGuard(route, state)) as boolean | UrlTree;
  }

  it('returns true when authenticated', () => {
    vi.spyOn(authService, 'isAuthenticated').mockReturnValue(true);
    expect(runGuard('/dashboard')).toBe(true);
  });

  it('returns UrlTree to /login with returnUrl when not authenticated', () => {
    vi.spyOn(authService, 'isAuthenticated').mockReturnValue(false);
    const result = runGuard('/dashboard') as UrlTree;
    expect(result.toString()).toBe('/login?returnUrl=%2Fdashboard');
  });

  it('preserves complex returnUrl paths', () => {
    vi.spyOn(authService, 'isAuthenticated').mockReturnValue(false);
    const result = runGuard('/projects/3/tasks') as UrlTree;
    expect(result.toString()).toContain('returnUrl');
    expect(result.toString()).toContain('projects');
  });
});
