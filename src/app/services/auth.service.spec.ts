import { TestBed } from '@angular/core/testing';
import { AuthService, RegistrationRequest } from './auth.service';
import { UserService } from './user.service';
import { ValidationService } from './validation.service';
import * as bcrypt from 'bcryptjs';

describe('AuthService', () => {
  let service: AuthService;
  let userService: jasmine.SpyObj<UserService>;
  let validationService: jasmine.SpyObj<ValidationService>;

  // Mock localStorage
  let localStorageMock: any;

  beforeEach(() => {
    // Create localStorage mock
    localStorageMock = {
      store: {} as any,
      getItem: jasmine.createSpy('getItem').and.callFake((key: string) => {
        return localStorageMock.store[key] || null;
      }),
      setItem: jasmine.createSpy('setItem').and.callFake((key: string, value: string) => {
        localStorageMock.store[key] = value;
      }),
      removeItem: jasmine.createSpy('removeItem').and.callFake((key: string) => {
        delete localStorageMock.store[key];
      }),
      clear: jasmine.createSpy('clear').and.callFake(() => {
        localStorageMock.store = {};
      })
    };

    // Replace localStorage with mock
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true
    });

    // Create service spies
    const userServiceSpy = jasmine.createSpyObj('UserService', [
      'emailExists',
      'createUser',
      'getCurrentUser',
      'setCurrentUser',
      'logout'
    ]);

    const validationServiceSpy = jasmine.createSpyObj('ValidationService', [
      'validateEmail',
      'validatePasswordStrength'
    ]);

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: UserService, useValue: userServiceSpy },
        { provide: ValidationService, useValue: validationServiceSpy }
      ]
    });

    service = TestBed.inject(AuthService);
    userService = TestBed.inject(UserService) as jasmine.SpyObj<UserService>;
    validationService = TestBed.inject(ValidationService) as jasmine.SpyObj<ValidationService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('register', () => {
    beforeEach(() => {
      // Setup default mock responses
      validationService.validateEmail.and.returnValue({ isValid: true });
      validationService.validatePasswordStrength.and.returnValue({
        score: 4,
        feedback: [],
        isValid: true
      });
      userService.emailExists.and.returnValue(false);
      userService.createUser.and.returnValue({
        success: true,
        user: {
          id: 'test-id',
          email: 'test@example.com',
          passwordHash: 'hashed-password',
          createdAt: new Date()
        }
      });
      userService.setCurrentUser.and.returnValue(true);
    });

    it('should register user with valid data', async () => {
      const registrationData: RegistrationRequest = {
        email: 'test@example.com',
        password: 'StrongPassword123!'
      };

      const result = await service.register(registrationData);

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user?.email).toBe('test@example.com');
      expect(userService.setCurrentUser).toHaveBeenCalled();
    });

    it('should reject registration with invalid email', async () => {
      validationService.validateEmail.and.returnValue({
        isValid: false,
        error: 'Invalid email format'
      });

      const registrationData: RegistrationRequest = {
        email: 'invalid-email',
        password: 'StrongPassword123!'
      };

      const result = await service.register(registrationData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('validation errors');
      expect(result.fieldErrors?.email).toBe('Invalid email format');
    });

    it('should reject registration with weak password', async () => {
      validationService.validatePasswordStrength.and.returnValue({
        score: 2,
        feedback: ['Password too weak', 'Add more complexity'],
        isValid: false
      });

      const registrationData: RegistrationRequest = {
        email: 'test@example.com',
        password: 'weak'
      };

      const result = await service.register(registrationData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('validation errors');
      expect(result.fieldErrors?.password).toBe('Password too weak, Add more complexity');
    });

    it('should reject registration with existing email', async () => {
      userService.emailExists.and.returnValue(true);

      const registrationData: RegistrationRequest = {
        email: 'existing@example.com',
        password: 'StrongPassword123!'
      };

      const result = await service.register(registrationData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('already exists');
      expect(result.fieldErrors?.email).toBe('This email is already registered');
    });

    it('should hash password before storing', async () => {
      const registrationData: RegistrationRequest = {
        email: 'test@example.com',
        password: 'PlainTextPassword123!'
      };

      await service.register(registrationData);

      const createUserCall = userService.createUser.calls.mostRecent();
      const userData = createUserCall.args[0];

      expect(userData.passwordHash).toBeDefined();
      expect(userData.passwordHash).not.toBe('PlainTextPassword123!');
      // Verify it's a bcrypt hash (starts with $2a$, $2b$, or $2y$)
      expect(userData.passwordHash).toMatch(/^\$2[ayb]\$\d{2}\$/);
    });

    it('should handle user creation failure', async () => {
      userService.createUser.and.returnValue({
        success: false,
        error: 'Database error'
      });

      const registrationData: RegistrationRequest = {
        email: 'test@example.com',
        password: 'StrongPassword123!'
      };

      const result = await service.register(registrationData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });

    it('should handle password hashing errors', async () => {
      // Mock bcrypt to throw error
      spyOn(bcrypt, 'hash').and.rejectWith(new Error('Hashing failed'));

      const registrationData: RegistrationRequest = {
        email: 'test@example.com',
        password: 'StrongPassword123!'
      };

      const result = await service.register(registrationData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('system error');
    });

    it('should emit analytics events', async () => {
      spyOn(console, 'log');
      spyOn(window, 'dispatchEvent');

      const registrationData: RegistrationRequest = {
        email: 'test@example.com',
        password: 'StrongPassword123!'
      };

      await service.register(registrationData);

      expect(console.log).toHaveBeenCalledWith('Analytics Event:', jasmine.any(Object));
      expect(window.dispatchEvent).toHaveBeenCalledWith(jasmine.any(CustomEvent));
    });
  });

  describe('login', () => {
    let mockUsers: any[];

    beforeEach(() => {
      mockUsers = [{
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: '$2a$12$hashedPasswordExample',
        createdAt: new Date(),
        lastLoginAt: new Date()
      }];

      // Mock private getUsers method access
      (userService as any).getUsers = jasmine.createSpy('getUsers').and.returnValue(mockUsers);
      userService.setCurrentUser.and.returnValue(true);
    });

    it('should login with valid credentials', async () => {
      // Mock password verification
      spyOn(bcrypt, 'compare').and.resolveTo(true);

      const result = await service.login('test@example.com', 'correctPassword');

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user?.email).toBe('test@example.com');
      expect(userService.setCurrentUser).toHaveBeenCalled();
    });

    it('should reject login with invalid email', async () => {
      const result = await service.login('wrong@example.com', 'password');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email or password');
    });

    it('should reject login with invalid password', async () => {
      spyOn(bcrypt, 'compare').and.resolveTo(false);

      const result = await service.login('test@example.com', 'wrongPassword');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email or password');
    });

    it('should handle bcrypt comparison errors', async () => {
      spyOn(bcrypt, 'compare').and.rejectWith(new Error('Comparison failed'));

      const result = await service.login('test@example.com', 'password');

      expect(result.success).toBe(false);
      expect(result.error).toContain('try again');
    });
  });

  describe('logout', () => {
    it('should clear current user', () => {
      userService.logout.and.returnValue(true);

      service.logout();

      expect(userService.logout).toHaveBeenCalled();
    });
  });

  describe('authentication state management', () => {
    it('should track authentication state', () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: 'hash',
        createdAt: new Date()
      };

      // Initially not authenticated
      expect(service.isAuthenticated()).toBe(false);
      expect(service.getCurrentUser()).toBeNull();

      // Set current user through subject
      (service as any).currentUserSubject.next(mockUser);

      expect(service.isAuthenticated()).toBe(true);
      expect(service.getCurrentUser()).toBe(mockUser);
    });
  });

  describe('email availability', () => {
    it('should check email availability', () => {
      userService.emailExists.and.returnValue(false);

      expect(service.isEmailAvailable('available@example.com')).toBe(true);
      expect(userService.emailExists).toHaveBeenCalledWith('available@example.com');

      userService.emailExists.and.returnValue(true);

      expect(service.isEmailAvailable('taken@example.com')).toBe(false);
    });
  });

  describe('analytics tracking', () => {
    beforeEach(() => {
      spyOn(console, 'log');
      spyOn(window, 'dispatchEvent');
    });

    it('should track page view', () => {
      service.trackPageView();

      expect(console.log).toHaveBeenCalledWith('Analytics Event:', jasmine.objectContaining({
        event: 'registration_page_viewed'
      }));
    });

    it('should track form submission', () => {
      service.trackFormSubmission(1, { valid: true });

      expect(console.log).toHaveBeenCalledWith('Analytics Event:', jasmine.objectContaining({
        event: 'registration_form_submitted',
        properties: jasmine.objectContaining({
          attempt_number: 1,
          validation_state: { valid: true }
        })
      }));
    });

    it('should track field focus', () => {
      service.trackFieldFocus('email', { has_value: true });

      expect(console.log).toHaveBeenCalledWith('Analytics Event:', jasmine.objectContaining({
        event: 'registration_field_focused',
        properties: jasmine.objectContaining({
          field_name: 'email',
          validation_state: { has_value: true }
        })
      }));
    });
  });

  describe('loading state management', () => {
    it('should manage loading state during registration', async () => {
      let loadingStates: boolean[] = [];

      service.isLoading$.subscribe(loading => {
        loadingStates.push(loading);
      });

      const registrationData: RegistrationRequest = {
        email: 'test@example.com',
        password: 'StrongPassword123!'
      };

      await service.register(registrationData);

      // Should have started false, gone to true during operation, then back to false
      expect(loadingStates).toContain(true);
      expect(loadingStates[loadingStates.length - 1]).toBe(false);
    });
  });
});