import { TestBed } from '@angular/core/testing';
import { UserService } from './user.service';

describe('UserService', () => {
  let service: UserService;

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

    TestBed.configureTestingModule({});
    service = TestBed.inject(UserService);
  });

  afterEach(() => {
    // Clean up localStorage between tests
    localStorageMock.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('emailExists', () => {
    it('should return false for non-existent email', () => {
      expect(service.emailExists('test@example.com')).toBe(false);
    });

    it('should return true for existing email', () => {
      // Create a user first
      const userData = {
        email: 'test@example.com',
        passwordHash: 'hashedpassword'
      };

      service.createUser(userData);
      expect(service.emailExists('test@example.com')).toBe(true);
    });

    it('should be case insensitive', () => {
      const userData = {
        email: 'test@example.com',
        passwordHash: 'hashedpassword'
      };

      service.createUser(userData);
      expect(service.emailExists('TEST@EXAMPLE.COM')).toBe(true);
      expect(service.emailExists('Test@Example.Com')).toBe(true);
    });
  });

  describe('createUser', () => {
    it('should create a new user successfully', () => {
      const userData = {
        email: 'test@example.com',
        passwordHash: 'hashedpassword'
      };

      const result = service.createUser(userData);

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user?.email).toBe('test@example.com');
      expect(result.user?.passwordHash).toBe('hashedpassword');
      expect(result.user?.id).toBeDefined();
      expect(result.user?.createdAt).toBeInstanceOf(Date);
    });

    it('should normalize email to lowercase', () => {
      const userData = {
        email: 'TEST@EXAMPLE.COM',
        passwordHash: 'hashedpassword'
      };

      const result = service.createUser(userData);

      expect(result.success).toBe(true);
      expect(result.user?.email).toBe('test@example.com');
    });

    it('should reject duplicate emails', () => {
      const userData1 = {
        email: 'test@example.com',
        passwordHash: 'hashedpassword1'
      };

      const userData2 = {
        email: 'test@example.com',
        passwordHash: 'hashedpassword2'
      };

      // Create first user
      const result1 = service.createUser(userData1);
      expect(result1.success).toBe(true);

      // Try to create second user with same email
      const result2 = service.createUser(userData2);
      expect(result2.success).toBe(false);
      expect(result2.error).toContain('already exists');
    });

    it('should reject duplicate emails case insensitively', () => {
      const userData1 = {
        email: 'test@example.com',
        passwordHash: 'hashedpassword1'
      };

      const userData2 = {
        email: 'TEST@EXAMPLE.COM',
        passwordHash: 'hashedpassword2'
      };

      const result1 = service.createUser(userData1);
      expect(result1.success).toBe(true);

      const result2 = service.createUser(userData2);
      expect(result2.success).toBe(false);
      expect(result2.error).toContain('already exists');
    });
  });

  describe('authenticateUser', () => {
    beforeEach(() => {
      // Create a test user
      const userData = {
        email: 'test@example.com',
        passwordHash: 'hashedpassword'
      };
      service.createUser(userData);
    });

    it('should authenticate valid credentials', () => {
      const result = service.authenticateUser('test@example.com', 'hashedpassword');

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user?.email).toBe('test@example.com');
      expect(result.user?.lastLoginAt).toBeInstanceOf(Date);
    });

    it('should reject invalid email', () => {
      const result = service.authenticateUser('wrong@example.com', 'hashedpassword');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid email or password');
    });

    it('should reject invalid password', () => {
      const result = service.authenticateUser('test@example.com', 'wrongpassword');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid email or password');
    });

    it('should be case insensitive for email', () => {
      const result = service.authenticateUser('TEST@EXAMPLE.COM', 'hashedpassword');

      expect(result.success).toBe(true);
      expect(result.user?.email).toBe('test@example.com');
    });
  });

  describe('getCurrentUser and setCurrentUser', () => {
    it('should return null when no current user is set', () => {
      expect(service.getCurrentUser()).toBeNull();
    });

    it('should set and get current user', () => {
      const userData = {
        email: 'test@example.com',
        passwordHash: 'hashedpassword'
      };

      const createResult = service.createUser(userData);
      const user = createResult.user!;

      const setResult = service.setCurrentUser(user);
      expect(setResult).toBe(true);

      const currentUser = service.getCurrentUser();
      expect(currentUser).toBeDefined();
      expect(currentUser?.email).toBe('test@example.com');
      expect(currentUser?.id).toBe(user.id);
    });

    it('should handle null user (logout)', () => {
      const userData = {
        email: 'test@example.com',
        passwordHash: 'hashedpassword'
      };

      const createResult = service.createUser(userData);
      service.setCurrentUser(createResult.user!);

      // Logout
      const setResult = service.setCurrentUser(null);
      expect(setResult).toBe(true);

      expect(service.getCurrentUser()).toBeNull();
    });
  });

  describe('logout', () => {
    it('should clear current user', () => {
      const userData = {
        email: 'test@example.com',
        passwordHash: 'hashedpassword'
      };

      const createResult = service.createUser(userData);
      service.setCurrentUser(createResult.user!);

      expect(service.getCurrentUser()).toBeDefined();

      const logoutResult = service.logout();
      expect(logoutResult).toBe(true);
      expect(service.getCurrentUser()).toBeNull();
    });
  });

  describe('getUserStats', () => {
    it('should return stats for users', () => {
      // Create a few users
      service.createUser({ email: 'user1@example.com', passwordHash: 'hash1' });
      service.createUser({ email: 'user2@example.com', passwordHash: 'hash2' });
      service.createUser({ email: 'user3@example.com', passwordHash: 'hash3' });

      const stats = service.getUserStats();
      expect(stats.totalUsers).toBe(3);
      expect(stats.recentRegistrations).toBe(3); // All are recent
    });

    it('should return zero stats when no users', () => {
      const stats = service.getUserStats();
      expect(stats.totalUsers).toBe(0);
      expect(stats.recentRegistrations).toBe(0);
    });
  });

  describe('clearAllUsers', () => {
    it('should clear all user data', () => {
      // Create some users
      service.createUser({ email: 'user1@example.com', passwordHash: 'hash1' });
      service.createUser({ email: 'user2@example.com', passwordHash: 'hash2' });

      expect(service.getUserStats().totalUsers).toBe(2);

      const clearResult = service.clearAllUsers();
      expect(clearResult).toBe(true);

      expect(service.getUserStats().totalUsers).toBe(0);
      expect(service.getCurrentUser()).toBeNull();
    });
  });

  describe('localStorage error handling', () => {
    beforeEach(() => {
      // Mock localStorage to throw errors
      localStorageMock.getItem.and.throwError('Storage error');
      localStorageMock.setItem.and.throwError('Storage error');
    });

    it('should handle storage errors gracefully', () => {
      expect(service.emailExists('test@example.com')).toBe(false);

      const result = service.createUser({
        email: 'test@example.com',
        passwordHash: 'hash'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('try again');
    });
  });
});