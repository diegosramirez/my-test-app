import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { AuthResponse } from '../models/auth.models';

function makeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256' }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.sig`;
}

const mockUser = { id: 'u1', email: 'test@example.com', name: 'Test' };
const validToken = makeJwt({ sub: 'u1', email: 'test@example.com', exp: Date.now() / 1000 + 3600, iat: Date.now() / 1000 });
const expiredToken = makeJwt({ sub: 'u1', email: 'test@example.com', exp: Date.now() / 1000 - 100, iat: Date.now() / 1000 - 3700 });

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
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
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('isAuthenticated', () => {
    it('returns false when no token', () => {
      expect(service.isAuthenticated()).toBe(false);
    });

    it('returns true for valid token', () => {
      localStorage.setItem('auth_token', validToken);
      expect(service.isAuthenticated()).toBe(true);
    });

    it('returns false for expired token', () => {
      localStorage.setItem('auth_token', expiredToken);
      expect(service.isAuthenticated()).toBe(false);
    });

    it('returns false for malformed token', () => {
      localStorage.setItem('auth_token', 'garbage');
      expect(service.isAuthenticated()).toBe(false);
    });
  });

  describe('hydration on construction', () => {
    it('hydrates user from valid token in localStorage', () => {
      localStorage.setItem('auth_token', validToken);
      localStorage.setItem('auth_user', JSON.stringify(mockUser));
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
      });
      const fresh = TestBed.inject(AuthService);
      expect(fresh.currentUser).toBeTruthy();
    });

    it('clears storage if token is expired', () => {
      localStorage.setItem('auth_token', expiredToken);
      localStorage.setItem('auth_user', JSON.stringify(mockUser));
      // Need new injector to test constructor
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
      });
      const svc = TestBed.inject(AuthService);
      expect(svc.currentUser).toBeNull();
      expect(localStorage.getItem('auth_token')).toBeNull();
    });

    it('clears storage if token is malformed', () => {
      localStorage.setItem('auth_token', 'not.valid');
      localStorage.setItem('auth_user', JSON.stringify(mockUser));
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
      });
      const svc = TestBed.inject(AuthService);
      expect(svc.currentUser).toBeNull();
    });
  });

  describe('login', () => {
    it('sends lowercase email and stores token on success', () => {
      const response: AuthResponse = { token: validToken, user: mockUser };
      service.login('Test@Example.COM', 'password1').subscribe(res => {
        expect(res.user.email).toBe('test@example.com');
      });
      const req = httpMock.expectOne('/api/auth/login');
      expect(req.request.body.email).toBe('test@example.com');
      req.flush(response);
      expect(localStorage.getItem('auth_token')).toBe(validToken);
      expect(service.currentUser).toEqual(mockUser);
    });

    it('trims email whitespace', () => {
      service.login('  test@example.com  ', 'password1').subscribe();
      const req = httpMock.expectOne('/api/auth/login');
      expect(req.request.body.email).toBe('test@example.com');
      req.flush({ token: validToken, user: mockUser });
    });
  });

  describe('register', () => {
    it('sends lowercase email and stores token on success', () => {
      const response: AuthResponse = { token: validToken, user: mockUser };
      service.register('Test', 'Test@Example.COM', 'password1').subscribe();
      const req = httpMock.expectOne('/api/auth/register');
      expect(req.request.body.email).toBe('test@example.com');
      expect(req.request.body.name).toBe('Test');
      req.flush(response);
      expect(localStorage.getItem('auth_token')).toBe(validToken);
      expect(service.currentUser).toEqual(mockUser);
    });
  });

  describe('logout', () => {
    it('clears token, user, and navigates to /login', () => {
      vi.spyOn(router, 'navigateByUrl');
      localStorage.setItem('auth_token', validToken);
      localStorage.setItem('auth_user', JSON.stringify(mockUser));

      service.logout();

      expect(localStorage.getItem('auth_token')).toBeNull();
      expect(localStorage.getItem('auth_user')).toBeNull();
      expect(service.currentUser).toBeNull();
      expect(router.navigateByUrl).toHaveBeenCalledWith('/login', { replaceUrl: true });
    });
  });

  describe('getToken', () => {
    it('returns token from localStorage', () => {
      localStorage.setItem('auth_token', 'abc');
      expect(service.getToken()).toBe('abc');
    });

    it('returns null when no token', () => {
      expect(service.getToken()).toBeNull();
    });
  });
});
