import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HttpErrorResponse } from '@angular/common/http';

import { RegistrationService } from './registration.service';
import { RegistrationRequest, RegistrationResponse } from '../types/registration.types';

describe('RegistrationService', () => {
  let service: RegistrationService;
  let httpMock: HttpTestingController;
  const API_URL = '/api/auth/register';

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [RegistrationService]
    });

    service = TestBed.inject(RegistrationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('Registration API Calls', () => {
    it('should send POST request to correct endpoint with user data', () => {
      const registrationData: RegistrationRequest = {
        email: 'test@example.com',
        password: 'StrongP@ssw0rd123!',
        acceptTerms: true
      };

      const expectedResponse: RegistrationResponse = {
        success: true,
        userId: '12345',
        message: 'Registration successful'
      };

      service.register(registrationData).subscribe(response => {
        expect(response).toEqual(expectedResponse);
        expect(response.success).toBe(true);
        expect(response.userId).toBe('12345');
      });

      const req = httpMock.expectOne(API_URL);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(registrationData);
      expect(req.request.headers.get('Content-Type')).toBe('application/json');

      req.flush(expectedResponse);
    });

    it('should include proper headers for API request', () => {
      const registrationData: RegistrationRequest = {
        email: 'test@example.com',
        password: 'TestPass123!',
        acceptTerms: true
      };

      service.register(registrationData).subscribe();

      const req = httpMock.expectOne(API_URL);
      expect(req.request.headers.get('Content-Type')).toBe('application/json');
      expect(req.request.headers.get('Accept')).toBe('application/json');

      req.flush({ success: true, userId: '123' });
    });

    it('should handle timeout after 30 seconds', () => {
      const registrationData: RegistrationRequest = {
        email: 'test@example.com',
        password: 'TestPass123!',
        acceptTerms: true
      };

      service.register(registrationData).subscribe({
        next: () => fail('Should have timed out'),
        error: (error) => {
          expect(error.message).toContain('timeout');
        }
      });

      // Simulate timeout by not flushing the request
      const req = httpMock.expectOne(API_URL);
      req.error(new ErrorEvent('timeout'), { status: 0 });
    });
  });

  describe('Error Handling and Validation', () => {
    it('should handle duplicate email error with field-specific mapping', () => {
      const registrationData: RegistrationRequest = {
        email: 'existing@example.com',
        password: 'TestPass123!',
        acceptTerms: true
      };

      service.register(registrationData).subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.field).toBe('email');
          expect(error.message).toBe('Email already exists');
        }
      });

      const req = httpMock.expectOne(API_URL);
      req.flush(
        {
          error: 'Email already exists',
          field: 'email'
        },
        { status: 409, statusText: 'Conflict' }
      );
    });

    it('should handle validation errors for password strength', () => {
      const registrationData: RegistrationRequest = {
        email: 'test@example.com',
        password: 'weak',
        acceptTerms: true
      };

      service.register(registrationData).subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.field).toBe('password');
          expect(error.message).toBe('Password does not meet strength requirements');
        }
      });

      const req = httpMock.expectOne(API_URL);
      req.flush(
        {
          error: 'Password does not meet strength requirements',
          field: 'password'
        },
        { status: 400, statusText: 'Bad Request' }
      );
    });

    it('should handle multiple validation errors', () => {
      const registrationData: RegistrationRequest = {
        email: 'invalid-email',
        password: 'weak',
        acceptTerms: true
      };

      service.register(registrationData).subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.errors).toEqual([
            { field: 'email', message: 'Invalid email format' },
            { field: 'password', message: 'Password too weak' }
          ]);
        }
      });

      const req = httpMock.expectOne(API_URL);
      req.flush(
        {
          errors: [
            { field: 'email', message: 'Invalid email format' },
            { field: 'password', message: 'Password too weak' }
          ]
        },
        { status: 400, statusText: 'Bad Request' }
      );
    });

    it('should handle network errors', () => {
      const registrationData: RegistrationRequest = {
        email: 'test@example.com',
        password: 'TestPass123!',
        acceptTerms: true
      };

      service.register(registrationData).subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.message).toContain('Network error');
        }
      });

      const req = httpMock.expectOne(API_URL);
      req.error(new ErrorEvent('Network error'), { status: 0 });
    });

    it('should handle server errors (500, 502, 503)', () => {
      const registrationData: RegistrationRequest = {
        email: 'test@example.com',
        password: 'TestPass123!',
        acceptTerms: true
      };

      const serverErrors = [500, 502, 503];

      serverErrors.forEach(status => {
        service.register(registrationData).subscribe({
          next: () => fail(`Should have failed for status ${status}`),
          error: (error) => {
            expect(error.message).toContain('server error');
            expect(error.retryable).toBe(true);
          }
        });

        const req = httpMock.expectOne(API_URL);
        req.flush(
          { error: 'Internal server error' },
          { status, statusText: 'Server Error' }
        );
      });
    });

    it('should handle rate limiting errors (429)', () => {
      const registrationData: RegistrationRequest = {
        email: 'test@example.com',
        password: 'TestPass123!',
        acceptTerms: true
      };

      service.register(registrationData).subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.message).toContain('rate limit');
          expect(error.retryAfter).toBeDefined();
        }
      });

      const req = httpMock.expectOne(API_URL);
      req.flush(
        { error: 'Rate limit exceeded' },
        {
          status: 429,
          statusText: 'Too Many Requests',
          headers: { 'Retry-After': '60' }
        }
      );
    });
  });

  describe('Rate Limiting and Retry Logic', () => {
    it('should implement exponential backoff for retries', async () => {
      const registrationData: RegistrationRequest = {
        email: 'test@example.com',
        password: 'TestPass123!',
        acceptTerms: true
      };

      let attemptCount = 0;
      service.register(registrationData).subscribe({
        error: (error) => {
          attemptCount++;
          expect(error.attemptCount).toBe(attemptCount);
        }
      });

      // First attempt - immediate failure
      let req = httpMock.expectOne(API_URL);
      req.flush({}, { status: 500, statusText: 'Server Error' });

      // Second attempt should be delayed
      await new Promise(resolve => setTimeout(resolve, 1100)); // Wait for retry delay

      req = httpMock.expectOne(API_URL);
      req.flush({}, { status: 500, statusText: 'Server Error' });

      expect(attemptCount).toBe(2);
    });

    it('should respect rate limiting headers', () => {
      const registrationData: RegistrationRequest = {
        email: 'test@example.com',
        password: 'TestPass123!',
        acceptTerms: true
      };

      service.register(registrationData).subscribe({
        error: (error) => {
          expect(error.retryAfter).toBe(60);
        }
      });

      const req = httpMock.expectOne(API_URL);
      req.flush(
        { error: 'Rate limited' },
        {
          status: 429,
          statusText: 'Too Many Requests',
          headers: { 'Retry-After': '60' }
        }
      );
    });

    it('should not retry on client errors (4xx except 429)', () => {
      const registrationData: RegistrationRequest = {
        email: 'test@example.com',
        password: 'TestPass123!',
        acceptTerms: true
      };

      const clientErrors = [400, 401, 403, 404, 409, 422];

      clientErrors.forEach(status => {
        service.register(registrationData).subscribe({
          error: (error) => {
            expect(error.retryable).toBe(false);
          }
        });

        const req = httpMock.expectOne(API_URL);
        req.flush(
          { error: 'Client error' },
          { status, statusText: 'Client Error' }
        );
      });
    });
  });

  describe('Data Security and Validation', () => {
    it('should not send password in response data', () => {
      const registrationData: RegistrationRequest = {
        email: 'test@example.com',
        password: 'StrongP@ssw0rd123!',
        acceptTerms: true
      };

      service.register(registrationData).subscribe(response => {
        expect(response).not.toHaveProperty('password');
        expect(Object.keys(response)).not.toContain('password');
      });

      const req = httpMock.expectOne(API_URL);
      req.flush({
        success: true,
        userId: '12345',
        email: 'test@example.com'
        // No password in response
      });
    });

    it('should validate email format before sending request', () => {
      const invalidEmailData: RegistrationRequest = {
        email: 'invalid-email',
        password: 'TestPass123!',
        acceptTerms: true
      };

      service.register(invalidEmailData).subscribe({
        next: () => fail('Should have failed validation'),
        error: (error) => {
          expect(error.message).toContain('Invalid email format');
          expect(error.clientValidation).toBe(true);
        }
      });

      // Should not make HTTP request for client validation failures
      httpMock.expectNone(API_URL);
    });

    it('should validate password strength before sending request', () => {
      const weakPasswordData: RegistrationRequest = {
        email: 'test@example.com',
        password: '123',
        acceptTerms: true
      };

      service.register(weakPasswordData).subscribe({
        next: () => fail('Should have failed validation'),
        error: (error) => {
          expect(error.message).toContain('Password does not meet requirements');
          expect(error.clientValidation).toBe(true);
        }
      });

      // Should not make HTTP request for client validation failures
      httpMock.expectNone(API_URL);
    });

    it('should validate terms acceptance before sending request', () => {
      const noTermsData: RegistrationRequest = {
        email: 'test@example.com',
        password: 'StrongP@ssw0rd123!',
        acceptTerms: false
      };

      service.register(noTermsData).subscribe({
        next: () => fail('Should have failed validation'),
        error: (error) => {
          expect(error.message).toContain('Terms must be accepted');
          expect(error.clientValidation).toBe(true);
        }
      });

      httpMock.expectNone(API_URL);
    });
  });

  describe('CSRF Protection and Security Headers', () => {
    it('should include CSRF token in request headers', () => {
      // Mock CSRF token
      spyOn(service, 'getCsrfToken').and.returnValue('mock-csrf-token');

      const registrationData: RegistrationRequest = {
        email: 'test@example.com',
        password: 'TestPass123!',
        acceptTerms: true
      };

      service.register(registrationData).subscribe();

      const req = httpMock.expectOne(API_URL);
      expect(req.request.headers.get('X-CSRF-Token')).toBe('mock-csrf-token');

      req.flush({ success: true, userId: '123' });
    });

    it('should handle CSRF token validation errors', () => {
      const registrationData: RegistrationRequest = {
        email: 'test@example.com',
        password: 'TestPass123!',
        acceptTerms: true
      };

      service.register(registrationData).subscribe({
        error: (error) => {
          expect(error.message).toContain('CSRF token invalid');
          expect(error.requiresRefresh).toBe(true);
        }
      });

      const req = httpMock.expectOne(API_URL);
      req.flush(
        { error: 'CSRF token invalid' },
        { status: 403, statusText: 'Forbidden' }
      );
    });
  });

  describe('Session Handling', () => {
    it('should handle session expiration during registration', () => {
      const registrationData: RegistrationRequest = {
        email: 'test@example.com',
        password: 'TestPass123!',
        acceptTerms: true
      };

      service.register(registrationData).subscribe({
        error: (error) => {
          expect(error.message).toContain('Session expired');
          expect(error.requiresReauth).toBe(true);
        }
      });

      const req = httpMock.expectOne(API_URL);
      req.flush(
        { error: 'Session expired', code: 'SESSION_EXPIRED' },
        { status: 401, statusText: 'Unauthorized' }
      );
    });

    it('should refresh session token if expired and retry', () => {
      spyOn(service, 'refreshSession').and.returnValue(Promise.resolve('new-token'));

      const registrationData: RegistrationRequest = {
        email: 'test@example.com',
        password: 'TestPass123!',
        acceptTerms: true
      };

      service.register(registrationData).subscribe();

      // First request fails with expired session
      let req = httpMock.expectOne(API_URL);
      req.flush(
        { error: 'Session expired' },
        { status: 401, statusText: 'Unauthorized' }
      );

      // Second request should succeed after session refresh
      req = httpMock.expectOne(API_URL);
      expect(req.request.headers.get('Authorization')).toBe('Bearer new-token');
      req.flush({ success: true, userId: '123' });
    });
  });

  describe('Performance and Caching', () => {
    it('should not cache registration requests', () => {
      const registrationData: RegistrationRequest = {
        email: 'test@example.com',
        password: 'TestPass123!',
        acceptTerms: true
      };

      service.register(registrationData).subscribe();

      const req = httpMock.expectOne(API_URL);
      expect(req.request.headers.get('Cache-Control')).toBe('no-cache, no-store, must-revalidate');
      expect(req.request.headers.get('Pragma')).toBe('no-cache');

      req.flush({ success: true, userId: '123' });
    });

    it('should compress request payload for large data', () => {
      const largeRegistrationData: RegistrationRequest = {
        email: 'test@example.com',
        password: 'StrongP@ssw0rd123!',
        acceptTerms: true,
        additionalData: 'x'.repeat(10000) // Large additional data
      };

      service.register(largeRegistrationData).subscribe();

      const req = httpMock.expectOne(API_URL);
      expect(req.request.headers.get('Content-Encoding')).toBe('gzip');

      req.flush({ success: true, userId: '123' });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty response body', () => {
      const registrationData: RegistrationRequest = {
        email: 'test@example.com',
        password: 'TestPass123!',
        acceptTerms: true
      };

      service.register(registrationData).subscribe({
        error: (error) => {
          expect(error.message).toContain('Invalid response');
        }
      });

      const req = httpMock.expectOne(API_URL);
      req.flush(null, { status: 200, statusText: 'OK' });
    });

    it('should handle malformed JSON response', () => {
      const registrationData: RegistrationRequest = {
        email: 'test@example.com',
        password: 'TestPass123!',
        acceptTerms: true
      };

      service.register(registrationData).subscribe({
        error: (error) => {
          expect(error.message).toContain('Invalid response format');
        }
      });

      const req = httpMock.expectOne(API_URL);
      req.flush('invalid json{', { status: 200, statusText: 'OK' });
    });

    it('should handle concurrent registration attempts', async () => {
      const registrationData: RegistrationRequest = {
        email: 'test@example.com',
        password: 'TestPass123!',
        acceptTerms: true
      };

      // Start two registrations simultaneously
      const registration1 = service.register(registrationData);
      const registration2 = service.register(registrationData);

      // Both should receive responses
      registration1.subscribe(response => {
        expect(response.success).toBe(true);
      });

      registration2.subscribe({
        error: (error) => {
          expect(error.message).toContain('Registration in progress');
        }
      });

      // First request succeeds
      let req1 = httpMock.expectOne(API_URL);
      req1.flush({ success: true, userId: '123' });

      // Second request is blocked
      httpMock.expectNone(API_URL);
    });
  });
});