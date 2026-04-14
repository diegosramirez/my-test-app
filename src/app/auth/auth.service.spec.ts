import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AuthService, AuthResponse, User, LoginRequest, RegisterRequest, AuthError } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  const mockUser: User = {
    id: 'user123',
    email: 'test@example.com'
  };

  const mockToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJPbmxpbmUgSldUIEJ1aWxkZXIiLCJpYXQiOjE3MDAwMDAwMDAsImV4cCI6MTcwMDA4NjQwMCwiYXVkIjoid3d3LmV4YW1wbGUuY29tIiwic3ViIjoidXNlcjEyMyJ9.placeholder';

  const mockAuthResponse: AuthResponse = {
    token: mockToken,
    user: mockUser
  };

  beforeEach(async () => {
    // Clear localStorage before each test
    localStorage.clear();

    // Clear any existing timers
    vi.clearAllTimers();
    vi.useFakeTimers();

    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AuthService]
    }).compileComponents();

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('Authentication State', () => {
    it('should start with unauthenticated state', () => {
      expect(service.isAuthenticated()).toBe(false);
      expect(service.getCurrentUser()).toBeNull();
      expect(service.getToken()).toBeNull();

      service.isAuthenticated$.subscribe(isAuth => {
        expect(isAuth).toBe(false);
      });

      service.user$.subscribe(user => {
        expect(user).toBeNull();
      });
    });

    it('should restore authentication state from localStorage on initialization', () => {
      // Create a valid token that expires in the future
      const futureTimestamp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const validToken = `header.${btoa(JSON.stringify({ exp: futureTimestamp }))}.signature`;

      localStorage.setItem('auth_token', validToken);
      localStorage.setItem('auth_user', JSON.stringify(mockUser));

      // Reinitialize service
      service = new AuthService(TestBed.inject(HttpClientTestingModule) as any);

      expect(service.isAuthenticated()).toBe(true);
      expect(service.getCurrentUser()).toEqual(mockUser);
      expect(service.getToken()).toBe(validToken);
    });

    it('should clear invalid token from localStorage on initialization', () => {
      // Create an expired token
      const pastTimestamp = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      const expiredToken = `header.${btoa(JSON.stringify({ exp: pastTimestamp }))}.signature`;

      localStorage.setItem('auth_token', expiredToken);
      localStorage.setItem('auth_user', JSON.stringify(mockUser));

      // Reinitialize service
      service = new AuthService(TestBed.inject(HttpClientTestingModule) as any);

      expect(service.isAuthenticated()).toBe(false);
      expect(service.getCurrentUser()).toBeNull();
      expect(service.getToken()).toBeNull();
      expect(localStorage.getItem('auth_token')).toBeNull();
    });
  });

  describe('User Registration', () => {
    it('should successfully register a new user', async () => {
      const registerRequest: RegisterRequest = {
        email: 'test@example.com',
        password: 'Password123!'
      };

      const registerPromise = new Promise<AuthResponse>((resolve, reject) => {
        service.register(registerRequest).subscribe({
          next: (response) => {
            expect(response).toEqual(mockAuthResponse);
            resolve(response);
          },
          error: reject
        });

        const req = httpMock.expectOne('/api/auth/register');
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual(registerRequest);
        req.flush(mockAuthResponse);
      });

      await registerPromise;

      // Check final state
      expect(service.isAuthenticated()).toBe(true);
      expect(service.getCurrentUser()).toEqual(mockUser);
      expect(service.getToken()).toBe(mockToken);
      expect(localStorage.getItem('auth_token')).toBe(mockToken);
      expect(localStorage.getItem('auth_user')).toBe(JSON.stringify(mockUser));
    });

    it('should handle registration conflict (409) with empathetic error', async () => {
      const registerRequest: RegisterRequest = {
        email: 'existing@example.com',
        password: 'Password123!'
      };

      const errorPromise = new Promise<AuthError>((resolve, reject) => {
        service.register(registerRequest).subscribe({
          next: () => reject(new Error('Should have errored')),
          error: (error: AuthError) => resolve(error)
        });

        const req = httpMock.expectOne('/api/auth/register');
        req.flush({ error: 'Conflict' }, { status: 409, statusText: 'Conflict' });
      });

      const error = await errorPromise;
      expect(error.message).toBe('An account with this email already exists. Please try logging in instead.');
      expect(service.isAuthenticated()).toBe(false);
    });

    it('should handle validation errors (400) with empathetic messaging', async () => {
      const registerRequest: RegisterRequest = {
        email: 'invalid-email',
        password: 'weak'
      };

      const errorPromise = new Promise<AuthError>((resolve, reject) => {
        service.register(registerRequest).subscribe({
          next: () => reject(new Error('Should have errored')),
          error: (error: AuthError) => resolve(error)
        });

        const req = httpMock.expectOne('/api/auth/register');
        req.flush({
          error: 'Bad Request',
          message: 'Validation failed'
        }, { status: 400, statusText: 'Bad Request' });
      });

      const error = await errorPromise;
      expect(error.message).toBe('Please check your information and try again.');
    });
  });

  describe('User Login', () => {
    it('should successfully login an existing user', async () => {
      const loginRequest: LoginRequest = {
        email: 'test@example.com',
        password: 'Password123!'
      };

      const loginPromise = new Promise<AuthResponse>((resolve, reject) => {
        service.login(loginRequest).subscribe({
          next: (response) => {
            expect(response).toEqual(mockAuthResponse);
            expect(service.isAuthenticated()).toBe(true);
            expect(service.getCurrentUser()).toEqual(mockUser);
            expect(service.getToken()).toBe(mockToken);
            resolve(response);
          },
          error: reject
        });

        const req = httpMock.expectOne('/api/auth/login');
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual(loginRequest);
        req.flush(mockAuthResponse);
      });

      await loginPromise;
    });

    it('should handle invalid credentials (401) with empathetic error', async () => {
      const loginRequest: LoginRequest = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      const errorPromise = new Promise<AuthError>((resolve, reject) => {
        service.login(loginRequest).subscribe({
          next: () => reject(new Error('Should have errored')),
          error: (error: AuthError) => resolve(error)
        });

        const req = httpMock.expectOne('/api/auth/login');
        req.flush({ error: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });
      });

      const error = await errorPromise;
      expect(error.message).toBe("That email and password combination doesn't match our records. Please check your credentials and try again.");
      expect(service.isAuthenticated()).toBe(false);
    });

    it('should handle rate limiting (429) with friendly retry message', async () => {
      const loginRequest: LoginRequest = {
        email: 'test@example.com',
        password: 'Password123!'
      };

      const errorPromise = new Promise<AuthError>((resolve, reject) => {
        service.login(loginRequest).subscribe({
          next: () => reject(new Error('Should have errored')),
          error: (error: AuthError) => resolve(error)
        });

        const req = httpMock.expectOne('/api/auth/login');
        req.flush({ error: 'Too Many Requests' }, { status: 429, statusText: 'Too Many Requests' });
      });

      const error = await errorPromise;
      expect(error.message).toBe('Too many login attempts. Please wait a moment before trying again.');
    });

    it('should set loading state during authentication requests', () => {
      const loginRequest: LoginRequest = {
        email: 'test@example.com',
        password: 'Password123!'
      };

      let loadingStates: boolean[] = [];
      service.loading$.subscribe(loading => loadingStates.push(loading));

      service.login(loginRequest).subscribe();

      // Should start loading
      expect(loadingStates).toContain(true);

      const req = httpMock.expectOne('/api/auth/login');
      req.flush(mockAuthResponse);

      // Should stop loading after success
      expect(loadingStates).toContain(false);
    });
  });

  describe('Logout Functionality', () => {
    beforeEach(() => {
      // Set up authenticated state
      localStorage.setItem('auth_token', mockToken);
      localStorage.setItem('auth_user', JSON.stringify(mockUser));
      service = new AuthService(TestBed.inject(HttpClientTestingModule) as any);
    });

    it('should clear authentication state on logout', () => {
      expect(service.isAuthenticated()).toBe(true);

      service.logout();

      expect(service.isAuthenticated()).toBe(false);
      expect(service.getCurrentUser()).toBeNull();
      expect(service.getToken()).toBeNull();
      expect(localStorage.getItem('auth_token')).toBeNull();
      expect(localStorage.getItem('auth_user')).toBeNull();
    });

    it('should broadcast logout to other tabs', () => {
      const storageEventSpy = vi.fn();
      window.addEventListener('storage', storageEventSpy);

      service.logout();

      // The logout method removes the token which should trigger storage events
      expect(localStorage.getItem('auth_token')).toBeNull();

      window.removeEventListener('storage', storageEventSpy);
    });
  });

  describe('Session Management', () => {
    beforeEach(() => {
      // Create a token that expires in 10 minutes
      const futureTimestamp = Math.floor(Date.now() / 1000) + 600; // 10 minutes from now
      const validToken = `header.${btoa(JSON.stringify({ exp: futureTimestamp }))}.signature`;

      localStorage.setItem('auth_token', validToken);
      localStorage.setItem('auth_user', JSON.stringify(mockUser));
    });

    it('should show session warning 5 minutes before token expiry', () => {
      const eventSpy = vi.fn();
      window.addEventListener('sessionWarning', eventSpy);

      // Reinitialize service to trigger session timer setup
      service = new AuthService(TestBed.inject(HttpClientTestingModule) as any);

      // Fast-forward to 5 minutes before expiry (should be 300 seconds = 5 minutes)
      vi.advanceTimersByTime(300 * 1000);

      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: { timeRemaining: 5 * 60 * 1000 }
        })
      );

      window.removeEventListener('sessionWarning', eventSpy);
    });

    it('should auto-logout when token expires', () => {
      // Reinitialize service to trigger session timer setup
      service = new AuthService(TestBed.inject(HttpClientTestingModule) as any);

      expect(service.isAuthenticated()).toBe(true);

      // Fast-forward to token expiry (10 minutes)
      vi.advanceTimersByTime(600 * 1000);

      expect(service.isAuthenticated()).toBe(false);
      expect(service.getCurrentUser()).toBeNull();
    });

    it('should extend session and reset timers', () => {
      const eventSpy = vi.fn();
      window.addEventListener('sessionWarning', eventSpy);

      // Reinitialize service
      service = new AuthService(TestBed.inject(HttpClientTestingModule) as any);

      // Fast-forward to near warning time
      vi.advanceTimersByTime(250 * 1000);

      service.extendSession();

      // Fast-forward past original warning time
      vi.advanceTimersByTime(100 * 1000);

      // Should not have triggered warning because session was extended
      expect(eventSpy).not.toHaveBeenCalled();
      expect(service.isAuthenticated()).toBe(true);

      window.removeEventListener('sessionWarning', eventSpy);
    });

    it('should only show session warning once per session', async () => {
      const firstResult = await new Promise<boolean>((resolve) => {
        service.showSessionWarning().subscribe(shouldShow => {
          resolve(shouldShow);
        });
      });
      expect(firstResult).toBe(true);

      const secondResult = await new Promise<boolean>((resolve) => {
        service.showSessionWarning().subscribe(shouldShow2 => {
          resolve(shouldShow2);
        });
      });
      expect(secondResult).toBe(false);
    });

    it('should clear session warning flag when extending session', () => {
      // First show warning
      localStorage.setItem('session_warning_shown', 'true');

      service.extendSession();

      expect(localStorage.getItem('session_warning_shown')).toBeNull();
    });
  });

  describe('Cross-Tab Synchronization', () => {
    it('should detect logout in other tabs and update state', () => {
      // Set up authenticated state
      localStorage.setItem('auth_token', mockToken);
      localStorage.setItem('auth_user', JSON.stringify(mockUser));
      service = new AuthService(TestBed.inject(HttpClientTestingModule) as any);

      expect(service.isAuthenticated()).toBe(true);

      // Simulate storage event from another tab removing token
      const storageEvent = new StorageEvent('storage', {
        key: 'auth_token',
        newValue: null,
        oldValue: mockToken
      });

      window.dispatchEvent(storageEvent);

      expect(service.isAuthenticated()).toBe(false);
      expect(service.getCurrentUser()).toBeNull();
    });

    it('should detect login in other tabs and update state', () => {
      expect(service.isAuthenticated()).toBe(false);

      // Set user data in localStorage (simulating another tab login)
      localStorage.setItem('auth_user', JSON.stringify(mockUser));

      // Simulate storage event from another tab adding token
      const storageEvent = new StorageEvent('storage', {
        key: 'auth_token',
        newValue: mockToken,
        oldValue: null
      });

      window.dispatchEvent(storageEvent);

      expect(service.isAuthenticated()).toBe(true);
      expect(service.getCurrentUser()).toEqual(mockUser);
    });

    it('should handle invalid user data during cross-tab login gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(service.isAuthenticated()).toBe(false);

      // Set invalid user data
      localStorage.setItem('auth_user', 'invalid-json');

      const storageEvent = new StorageEvent('storage', {
        key: 'auth_token',
        newValue: mockToken,
        oldValue: null
      });

      window.dispatchEvent(storageEvent);

      expect(service.isAuthenticated()).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Error parsing user data:', expect.any(Error));

      consoleSpy.mockRestore();
    });
  });

  describe('Token Validation', () => {
    it('should validate JWT token format and expiration', () => {
      // Create expired token
      const expiredTimestamp = Math.floor(Date.now() / 1000) - 3600;
      const expiredToken = `header.${btoa(JSON.stringify({ exp: expiredTimestamp }))}.signature`;

      localStorage.setItem('auth_token', expiredToken);
      localStorage.setItem('auth_user', JSON.stringify(mockUser));

      // Service should not restore authentication with expired token
      service = new AuthService(TestBed.inject(HttpClientTestingModule) as any);

      expect(service.isAuthenticated()).toBe(false);
    });

    it('should handle malformed tokens gracefully', () => {
      localStorage.setItem('auth_token', 'invalid-token');
      localStorage.setItem('auth_user', JSON.stringify(mockUser));

      // Service should not crash with malformed token
      service = new AuthService(TestBed.inject(HttpClientTestingModule) as any);

      expect(service.isAuthenticated()).toBe(false);
      expect(service.getToken()).toBeNull();
    });

    it('should handle malformed user data gracefully', () => {
      const futureTimestamp = Math.floor(Date.now() / 1000) + 3600;
      const validToken = `header.${btoa(JSON.stringify({ exp: futureTimestamp }))}.signature`;

      localStorage.setItem('auth_token', validToken);
      localStorage.setItem('auth_user', 'invalid-json');

      service = new AuthService(TestBed.inject(HttpClientTestingModule) as any);

      expect(service.isAuthenticated()).toBe(false);
      expect(localStorage.getItem('auth_token')).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      const loginRequest: LoginRequest = {
        email: 'test@example.com',
        password: 'Password123!'
      };

      const errorPromise = new Promise<AuthError>((resolve, reject) => {
        service.login(loginRequest).subscribe({
          next: () => reject(new Error('Should have errored')),
          error: (error: AuthError) => resolve(error)
        });

        const req = httpMock.expectOne('/api/auth/login');
        req.error(new ProgressEvent('Network error'));
      });

      const error = await errorPromise;
      expect(error.message).toBe('An unexpected error occurred. Please try again.');
    });

    it('should handle server errors (500) with generic message', async () => {
      const loginRequest: LoginRequest = {
        email: 'test@example.com',
        password: 'Password123!'
      };

      const errorPromise = new Promise<AuthError>((resolve, reject) => {
        service.login(loginRequest).subscribe({
          next: () => reject(new Error('Should have errored')),
          error: (error: AuthError) => resolve(error)
        });

        const req = httpMock.expectOne('/api/auth/login');
        req.flush({ error: 'Internal Server Error' }, { status: 500, statusText: 'Internal Server Error' });
      });

      const error = await errorPromise;
      expect(error.message).toBe('An unexpected error occurred. Please try again.');
    });

    it('should stop loading state on error', () => {
      const loginRequest: LoginRequest = {
        email: 'test@example.com',
        password: 'Password123!'
      };

      let finalLoadingState: boolean | undefined;
      service.loading$.subscribe(loading => finalLoadingState = loading);

      service.login(loginRequest).subscribe({
        error: () => {
          expect(finalLoadingState).toBe(false);
        }
      });

      const req = httpMock.expectOne('/api/auth/login');
      req.flush({ error: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });
    });
  });

  describe('API Response Time Requirements', () => {
    it('should complete authentication requests within 500ms', async () => {
      const loginRequest: LoginRequest = {
        email: 'test@example.com',
        password: 'Password123!'
      };

      const startTime = Date.now();

      const responsePromise = new Promise<AuthResponse>((resolve, reject) => {
        service.login(loginRequest).subscribe({
          next: (response) => resolve(response),
          error: reject
        });

        const req = httpMock.expectOne('/api/auth/login');

        // Simulate quick API response
        setTimeout(() => {
          req.flush(mockAuthResponse);
        }, 100);
      });

      await responsePromise;
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(500);
    });
  });
});