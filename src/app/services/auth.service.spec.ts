import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { LoginRequest, RegisterRequest, AuthResponse } from '../models/auth.interface';
import { User } from '../models/user.interface';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  const mockUser: User = {
    id: '1',
    email: 'test@example.com',
    createdAt: new Date()
  };

  const mockAuthResponse: AuthResponse = {
    token: 'mock-jwt-token',
    user: mockUser
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AuthService]
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);

    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  describe('initialization', () => {
    it('should create the service', () => {
      expect(service).toBeTruthy();
    });

    it('should load user from token on init if token exists', () => {
      // Set token before creating service
      localStorage.setItem('auth_token', 'existing-token');

      // Create a fresh TestBed and service instance
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [HttpClientTestingModule],
        providers: [AuthService]
      });

      service = TestBed.inject(AuthService);
      httpMock = TestBed.inject(HttpTestingController);

      const req = httpMock.expectOne('/api/auth/me');
      expect(req.request.method).toBe('GET');

      req.flush(mockUser);

      service.user$.subscribe(user => {
        expect(user).toEqual(mockUser);
      });
    });

    it('should handle invalid token on init by logging out', () => {
      // Set token before creating service
      localStorage.setItem('auth_token', 'invalid-token');

      // Create a fresh TestBed and service instance
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [HttpClientTestingModule],
        providers: [AuthService]
      });

      service = TestBed.inject(AuthService);
      httpMock = TestBed.inject(HttpTestingController);

      const req = httpMock.expectOne('/api/auth/me');
      req.flush('', { status: 401, statusText: 'Unauthorized' });

      expect(localStorage.getItem('auth_token')).toBeNull();
      service.user$.subscribe(user => {
        expect(user).toBeNull();
      });
    });

    it('should not make request if no token exists on init', () => {
      service = TestBed.inject(AuthService);
      httpMock.expectNone('/api/auth/me');
    });
  });

  describe('register', () => {
    it('should register user successfully', () => {
      const registerRequest: RegisterRequest = {
        email: 'test@example.com',
        password: 'password123'
      };

      service.register(registerRequest).subscribe(response => {
        expect(response).toEqual(mockAuthResponse);
        expect(localStorage.getItem('auth_token')).toBe('mock-jwt-token');
      });

      const req = httpMock.expectOne('/api/auth/register');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(registerRequest);

      req.flush(mockAuthResponse);

      service.user$.subscribe(user => {
        expect(user).toEqual(mockUser);
      });
    });

    it('should handle registration errors - email already exists', () => {
      const registerRequest: RegisterRequest = {
        email: 'test@example.com',
        password: 'password123'
      };

      service.register(registerRequest).subscribe({
        next: () => expect.unreachable('Should have thrown error'),
        error: (error) => {
          expect(error.message).toBe('Email already exists. Please use a different email.');
        }
      });

      const req = httpMock.expectOne('/api/auth/register');
      req.flush('', { status: 409, statusText: 'Conflict' });
    });

    it('should handle registration errors - bad request', () => {
      const registerRequest: RegisterRequest = {
        email: 'invalid-email',
        password: 'short'
      };

      service.register(registerRequest).subscribe({
        next: () => expect.unreachable('Should have thrown error'),
        error: (error) => {
          expect(error.message).toBe('Invalid request. Please check your input.');
        }
      });

      const req = httpMock.expectOne('/api/auth/register');
      req.flush('', { status: 400, statusText: 'Bad Request' });
    });

    it('should handle registration errors - custom message', () => {
      const registerRequest: RegisterRequest = {
        email: 'test@example.com',
        password: 'password123'
      };

      const errorResponse = { message: 'Custom error message' };

      service.register(registerRequest).subscribe({
        next: () => expect.unreachable('Should have thrown error'),
        error: (error) => {
          expect(error.message).toBe('Custom error message');
        }
      });

      const req = httpMock.expectOne('/api/auth/register');
      req.flush(errorResponse, { status: 500, statusText: 'Server Error' });
    });
  });

  describe('login', () => {
    it('should login user successfully', () => {
      const loginRequest: LoginRequest = {
        email: 'test@example.com',
        password: 'password123'
      };

      service.login(loginRequest).subscribe(response => {
        expect(response).toEqual(mockAuthResponse);
        expect(localStorage.getItem('auth_token')).toBe('mock-jwt-token');
      });

      const req = httpMock.expectOne('/api/auth/login');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(loginRequest);

      req.flush(mockAuthResponse);

      service.user$.subscribe(user => {
        expect(user).toEqual(mockUser);
      });
    });

    it('should handle login errors - invalid credentials', () => {
      const loginRequest: LoginRequest = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      service.login(loginRequest).subscribe({
        next: () => expect.unreachable('Should have thrown error'),
        error: (error) => {
          expect(error.message).toBe('Invalid credentials. Please try again.');
        }
      });

      const req = httpMock.expectOne('/api/auth/login');
      req.flush('', { status: 401, statusText: 'Unauthorized' });
    });

    it('should handle login errors - generic server error', () => {
      const loginRequest: LoginRequest = {
        email: 'test@example.com',
        password: 'password123'
      };

      service.login(loginRequest).subscribe({
        next: () => expect.unreachable('Should have thrown error'),
        error: (error) => {
          expect(error.message).toBe('An error occurred');
        }
      });

      const req = httpMock.expectOne('/api/auth/login');
      req.flush('', { status: 500, statusText: 'Server Error' });
    });
  });

  describe('logout', () => {
    it('should logout user and clear token', () => {
      // Set up logged in state
      localStorage.setItem('auth_token', 'test-token');
      service['userSubject'].next(mockUser);

      service.logout();

      expect(localStorage.getItem('auth_token')).toBeNull();
      service.user$.subscribe(user => {
        expect(user).toBeNull();
      });
    });

    it('should logout user even if no token exists', () => {
      service.logout();

      expect(localStorage.getItem('auth_token')).toBeNull();
      service.user$.subscribe(user => {
        expect(user).toBeNull();
      });
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user observable', () => {
      service['userSubject'].next(mockUser);

      const currentUser$ = service.getCurrentUser();

      currentUser$.subscribe(user => {
        expect(user).toEqual(mockUser);
      });
    });

    it('should return null when no user is logged in', () => {
      const currentUser$ = service.getCurrentUser();

      currentUser$.subscribe(user => {
        expect(user).toBeNull();
      });
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when user is logged in and token exists', () => {
      localStorage.setItem('auth_token', 'test-token');
      service['userSubject'].next(mockUser);

      service.isAuthenticated().subscribe(isAuth => {
        expect(isAuth).toBe(true);
      });
    });

    it('should return false when user is logged in but no token', () => {
      service['userSubject'].next(mockUser);

      service.isAuthenticated().subscribe(isAuth => {
        expect(isAuth).toBe(false);
      });
    });

    it('should return false when token exists but no user', () => {
      localStorage.setItem('auth_token', 'test-token');

      service.isAuthenticated().subscribe(isAuth => {
        expect(isAuth).toBe(false);
      });
    });

    it('should return false when neither user nor token exist', () => {
      service.isAuthenticated().subscribe(isAuth => {
        expect(isAuth).toBe(false);
      });
    });
  });

  describe('getToken', () => {
    it('should return token from localStorage', () => {
      localStorage.setItem('auth_token', 'test-token');

      const token = service.getToken();

      expect(token).toBe('test-token');
    });

    it('should return null when no token exists', () => {
      const token = service.getToken();

      expect(token).toBeNull();
    });
  });
});