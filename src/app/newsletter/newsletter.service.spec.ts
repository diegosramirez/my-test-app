import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { NewsletterService } from './newsletter.service';
import { NewsletterSubscription, NewsletterValidationError } from './newsletter.interface';

describe('NewsletterService', () => {
  let service: NewsletterService;
  let localStorageMock: jasmine.Spy;
  let sessionStorageMock: jasmine.Spy;

  const mockSubscription: NewsletterSubscription = {
    id: 'test-id-123',
    email: 'test@example.com',
    timestamp: '2024-01-01T00:00:00.000Z',
    status: 'active'
  };

  beforeEach(() => {
    // Mock localStorage
    localStorageMock = jasmine.createSpyObj('localStorage', ['getItem', 'setItem']);
    sessionStorageMock = jasmine.createSpyObj('sessionStorage', ['getItem', 'setItem']);

    Object.defineProperty(window, 'localStorage', { value: localStorageMock });
    Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock });

    TestBed.configureTestingModule({});
    service = TestBed.inject(NewsletterService);

    // Setup default storage returns
    localStorageMock.getItem.and.returnValue(null);
    sessionStorageMock.getItem.and.returnValue(null);

    spyOn(console, 'log');
    spyOn(console, 'error');
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should load existing subscriptions on init', () => {
      const storedSubscriptions = [mockSubscription];
      localStorageMock.getItem.and.returnValue(JSON.stringify(storedSubscriptions));

      // Recreate service to test initialization
      service = TestBed.inject(NewsletterService);

      expect(localStorageMock.getItem).toHaveBeenCalledWith('newsletter_subscriptions');
      expect(service.getSubscriptions()).toEqual(storedSubscriptions);
    });

    it('should handle corrupted storage data gracefully', () => {
      localStorageMock.getItem.and.returnValue('invalid-json');

      // Recreate service to test initialization
      service = TestBed.inject(NewsletterService);

      expect(console.error).toHaveBeenCalledWith('Error reading subscriptions from storage:', jasmine.any(Error));
      expect(service.getSubscriptions()).toEqual([]);
    });
  });

  describe('Email Validation', () => {
    it('should validate required email', () => {
      const error = service.validateEmail('');
      expect(error).toEqual({
        type: 'required',
        message: 'Email address is required.'
      });
    });

    it('should validate email with only whitespace', () => {
      const error = service.validateEmail('   ');
      expect(error).toEqual({
        type: 'required',
        message: 'Email address is required.'
      });
    });

    it('should validate email format', () => {
      const invalidEmails = [
        'invalid-email',
        'test@',
        '@example.com',
        'test..test@example.com',
        'test@.example.com',
        'test@example.',
        'test @example.com'
      ];

      invalidEmails.forEach(email => {
        const error = service.validateEmail(email);
        expect(error).toEqual({
          type: 'email',
          message: 'Please enter a valid email address.'
        });
      });
    });

    it('should accept valid email formats', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'test+tag@example.org',
        'user_name@example-domain.com',
        'a@b.co'
      ];

      validEmails.forEach(email => {
        const error = service.validateEmail(email);
        expect(error).toBeNull();
      });
    });

    it('should validate email length', () => {
      const longEmail = 'a'.repeat(250) + '@example.com';
      const error = service.validateEmail(longEmail);

      expect(error).toEqual({
        type: 'email',
        message: 'Email address is too long.'
      });
    });
  });

  describe('Subscription Management', () => {
    beforeEach(() => {
      localStorageMock.getItem.and.returnValue(null);
    });

    it('should subscribe new email successfully', (done) => {
      const email = 'test@example.com';
      localStorageMock.setItem.and.stub();

      service.subscribe(email).subscribe({
        next: (result) => {
          expect(result.success).toBe(true);
          expect(result.message).toContain('successfully subscribed');
          expect(result.subscription?.email).toBe(email);
          expect(localStorageMock.setItem).toHaveBeenCalled();
          done();
        }
      });
    });

    it('should handle duplicate subscription', (done) => {
      const email = 'test@example.com';
      const existingSubscriptions = [mockSubscription];
      localStorageMock.getItem.and.returnValue(JSON.stringify(existingSubscriptions));

      service.subscribe(email).subscribe({
        next: (result) => {
          expect(result.success).toBe(true);
          expect(result.isDuplicate).toBe(true);
          expect(result.message).toContain('already subscribed');
          expect(localStorageMock.setItem).not.toHaveBeenCalled();
          done();
        }
      });
    });

    it('should normalize email case', (done) => {
      const email = 'Test@Example.COM';
      localStorageMock.setItem.and.stub();

      service.subscribe(email).subscribe({
        next: (result) => {
          expect(result.subscription?.email).toBe('test@example.com');
          done();
        }
      });
    });

    it('should trim email whitespace', (done) => {
      const email = '  test@example.com  ';
      localStorageMock.setItem.and.stub();

      service.subscribe(email).subscribe({
        next: (result) => {
          expect(result.subscription?.email).toBe('test@example.com');
          done();
        }
      });
    });

    it('should handle validation errors', (done) => {
      const invalidEmail = 'invalid-email';

      service.subscribe(invalidEmail).subscribe({
        error: (error: NewsletterValidationError) => {
          expect(error.type).toBe('email');
          expect(error.message).toBe('Please enter a valid email address.');
          done();
        }
      });
    });

    it('should handle storage errors', (done) => {
      const email = 'test@example.com';
      localStorageMock.setItem.and.throwError('Storage quota exceeded');

      service.subscribe(email).subscribe({
        error: (error: NewsletterValidationError) => {
          expect(error.type).toBe('storage');
          expect(error.message).toBe('Unable to save your subscription. Please try again.');
          done();
        }
      });
    });

    it('should generate unique IDs for subscriptions', (done) => {
      const email = 'test@example.com';
      localStorageMock.setItem.and.stub();

      service.subscribe(email).subscribe({
        next: (result1) => {
          service.subscribe('another@example.com').subscribe({
            next: (result2) => {
              expect(result1.subscription?.id).not.toBe(result2.subscription?.id);
              expect(result1.subscription?.id).toBeTruthy();
              expect(result2.subscription?.id).toBeTruthy();
              done();
            }
          });
        }
      });
    });
  });

  describe('Storage Operations', () => {
    it('should get subscriptions from localStorage', () => {
      const mockData = [mockSubscription];
      localStorageMock.getItem.and.returnValue(JSON.stringify(mockData));

      const subscriptions = service.getSubscriptions();

      expect(localStorageMock.getItem).toHaveBeenCalledWith('newsletter_subscriptions');
      expect(subscriptions).toEqual(mockData);
    });

    it('should return empty array when no data in storage', () => {
      localStorageMock.getItem.and.returnValue(null);

      const subscriptions = service.getSubscriptions();

      expect(subscriptions).toEqual([]);
    });

    it('should handle localStorage errors gracefully', () => {
      localStorageMock.getItem.and.throwError('Storage access denied');

      const subscriptions = service.getSubscriptions();

      expect(subscriptions).toEqual([]);
      expect(console.error).toHaveBeenCalledWith('Error reading subscriptions from storage:', jasmine.any(Error));
    });

    it('should check if email is subscribed', () => {
      const existingSubscriptions = [mockSubscription];
      localStorageMock.getItem.and.returnValue(JSON.stringify(existingSubscriptions));

      expect(service.isSubscribed('test@example.com')).toBe(true);
      expect(service.isSubscribed('nonexistent@example.com')).toBe(false);
    });

    it('should handle case insensitive subscription checking', () => {
      const existingSubscriptions = [mockSubscription];
      localStorageMock.getItem.and.returnValue(JSON.stringify(existingSubscriptions));

      expect(service.isSubscribed('Test@Example.COM')).toBe(true);
      expect(service.isSubscribed('TEST@EXAMPLE.COM')).toBe(true);
    });
  });

  describe('Analytics Tracking', () => {
    beforeEach(() => {
      sessionStorageMock.getItem.and.returnValue('test-session-id');
    });

    it('should track successful subscription events', (done) => {
      const email = 'test@example.com';
      localStorageMock.setItem.and.stub();

      service.subscribe(email).subscribe({
        next: () => {
          expect(console.log).toHaveBeenCalledWith('Newsletter Event:', jasmine.objectContaining({
            eventName: 'newsletter_subscription_success',
            properties: jasmine.objectContaining({
              email_domain: 'example.com',
              submission_method: 'form'
            })
          }));
          done();
        }
      });
    });

    it('should track duplicate subscription attempts', (done) => {
      const existingSubscriptions = [mockSubscription];
      localStorageMock.getItem.and.returnValue(JSON.stringify(existingSubscriptions));

      service.subscribe('test@example.com').subscribe({
        next: () => {
          expect(console.log).toHaveBeenCalledWith('Newsletter Event:', jasmine.objectContaining({
            eventName: 'newsletter_duplicate_attempt',
            properties: jasmine.objectContaining({
              existing_subscription_date: mockSubscription.timestamp
            })
          }));
          done();
        }
      });
    });

    it('should track validation errors', (done) => {
      const invalidEmail = 'invalid-email';

      service.subscribe(invalidEmail).subscribe({
        error: () => {
          expect(console.log).toHaveBeenCalledWith('Newsletter Event:', jasmine.objectContaining({
            eventName: 'newsletter_validation_error',
            properties: jasmine.objectContaining({
              error_type: 'email',
              email_format: 'unknown'
            })
          }));
          done();
        }
      });
    });

    it('should generate and store session IDs', () => {
      sessionStorageMock.getItem.and.returnValue(null);
      sessionStorageMock.setItem.and.stub();

      // Trigger a method that uses session ID
      service['getSessionId']();

      expect(sessionStorageMock.getItem).toHaveBeenCalledWith('newsletter_session_id');
      expect(sessionStorageMock.setItem).toHaveBeenCalledWith('newsletter_session_id', jasmine.any(String));
    });

    it('should extract email domains correctly', () => {
      const testCases = [
        { email: 'test@example.com', domain: 'example.com' },
        { email: 'user@subdomain.example.org', domain: 'subdomain.example.org' },
        { email: 'invalid-email', domain: 'unknown' },
        { email: 'test@', domain: 'unknown' }
      ];

      testCases.forEach(({ email, domain }) => {
        const extractedDomain = service['getEmailDomain'](email);
        expect(extractedDomain).toBe(domain);
      });
    });
  });

  describe('Observable Behavior', () => {
    it('should update subscriptions observable when new subscription is added', (done) => {
      localStorageMock.setItem.and.stub();
      const email = 'test@example.com';

      service.subscriptions$.subscribe(subscriptions => {
        if (subscriptions.length > 0) {
          expect(subscriptions[0].email).toBe(email);
          done();
        }
      });

      service.subscribe(email).subscribe();
    });

    it('should have realistic loading delay', (done) => {
      const startTime = Date.now();
      localStorageMock.setItem.and.stub();

      service.subscribe('test@example.com').subscribe({
        next: () => {
          const endTime = Date.now();
          const duration = endTime - startTime;
          expect(duration).toBeGreaterThan(700); // Should take at least 800ms minus some tolerance
          done();
        }
      });
    });
  });
});