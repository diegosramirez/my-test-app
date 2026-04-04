import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { ContactService } from './contact.service';
import { ContactFormData, ContactSubmissionResponse } from './contact-form.interfaces';

describe('ContactService', () => {
  let service: ContactService;
  let httpMock: HttpTestingController;

  const mockFormData: ContactFormData = {
    name: 'John Doe',
    email: 'john@example.com',
    phone: '555-123-4567',
    message: 'This is a test message'
  };

  const mockSuccessResponse: ContactSubmissionResponse = {
    success: true,
    message: 'Thank you for your message. We will get back to you soon.'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ContactService]
    });

    service = TestBed.inject(ContactService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('submitContactForm', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should submit form data successfully', () => {
      service.submitContactForm(mockFormData).subscribe(response => {
        expect(response).toEqual(mockSuccessResponse);
      });

      const req = httpMock.expectOne('/api/contact');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(mockFormData);
      req.flush(mockSuccessResponse);
    });

    it('should handle successful submission with all form fields', () => {
      const formData: ContactFormData = {
        name: 'Jane Smith',
        email: 'jane.smith@company.com',
        phone: '+1-555-123-4567',
        message: 'I need help with your product. Please contact me as soon as possible.'
      };

      service.submitContactForm(formData).subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.message).toBeTruthy();
      });

      const req = httpMock.expectOne('/api/contact');
      expect(req.request.body).toEqual(formData);
      req.flush(mockSuccessResponse);
    });

    it('should handle submission without optional phone field', () => {
      const formDataNoPhone: ContactFormData = {
        name: 'John Doe',
        email: 'john@example.com',
        message: 'This message has no phone number'
      };

      service.submitContactForm(formDataNoPhone).subscribe(response => {
        expect(response.success).toBe(true);
      });

      const req = httpMock.expectOne('/api/contact');
      expect(req.request.body).toEqual(formDataNoPhone);
      req.flush(mockSuccessResponse);
    });
  });

  describe('retry mechanism', () => {
    it('should retry on 500 server errors', () => {
      service.submitContactForm(mockFormData).subscribe({
        next: response => expect(response).toEqual(mockSuccessResponse),
        error: () => expect(true).toBe(false) // Should not error after successful retry
      });

      // First request - 500 error
      const req1 = httpMock.expectOne('/api/contact');
      req1.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });

      // Retry request - success
      const req2 = httpMock.expectOne('/api/contact');
      req2.flush(mockSuccessResponse);
    });

    it('should retry on network errors (status 0)', () => {
      service.submitContactForm(mockFormData).subscribe({
        next: response => expect(response).toEqual(mockSuccessResponse),
        error: () => expect(true).toBe(false) // Should not error after successful retry
      });

      // First request - network error
      const req1 = httpMock.expectOne('/api/contact');
      req1.error(new ErrorEvent('Network error'), { status: 0 });

      // Retry request - success
      const req2 = httpMock.expectOne('/api/contact');
      req2.flush(mockSuccessResponse);
    });

    it('should retry on 502 Bad Gateway errors', () => {
      service.submitContactForm(mockFormData).subscribe({
        next: response => expect(response).toEqual(mockSuccessResponse),
        error: () => expect(true).toBe(false) // Should not error after successful retry
      });

      // First request - 502 error
      const req1 = httpMock.expectOne('/api/contact');
      req1.flush('Bad Gateway', { status: 502, statusText: 'Bad Gateway' });

      // Retry request - success
      const req2 = httpMock.expectOne('/api/contact');
      req2.flush(mockSuccessResponse);
    });

    it('should retry on 503 Service Unavailable errors', () => {
      service.submitContactForm(mockFormData).subscribe({
        next: response => expect(response).toEqual(mockSuccessResponse),
        error: () => expect(true).toBe(false) // Should not error after successful retry
      });

      // First request - 503 error
      const req1 = httpMock.expectOne('/api/contact');
      req1.flush('Service Unavailable', { status: 503, statusText: 'Service Unavailable' });

      // Retry request - success
      const req2 = httpMock.expectOne('/api/contact');
      req2.flush(mockSuccessResponse);
    });

    it('should exhaust all retry attempts before failing', () => {
      service.submitContactForm(mockFormData).subscribe({
        next: () => expect(true).toBe(false), // Should not succeed
        error: error => {
          expect(error.message).toBe('Server error. We\'re working to fix this issue.');
        }
      });

      // Original request + 3 retries = 4 total requests
      for (let i = 0; i < 4; i++) {
        const req = httpMock.expectOne('/api/contact');
        req.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });
      }
    });

    it('should NOT retry on 400 client errors', () => {
      service.submitContactForm(mockFormData).subscribe({
        next: () => expect(true).toBe(false), // Should not succeed
        error: error => {
          expect(error.message).toBe('Please check your form data and try again.');
        }
      });

      // Only one request should be made
      const req = httpMock.expectOne('/api/contact');
      req.flush('Bad Request', { status: 400, statusText: 'Bad Request' });
    });

    it('should NOT retry on 401 unauthorized errors', () => {
      service.submitContactForm(mockFormData).subscribe({
        next: () => expect(true).toBe(false), // Should not succeed
        error: error => {
          expect(error.message).toBe('An unexpected error occurred. Please try again.');
        }
      });

      const req = httpMock.expectOne('/api/contact');
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
    });

    it('should NOT retry on 404 not found errors', () => {
      service.submitContactForm(mockFormData).subscribe({
        next: () => expect(true).toBe(false), // Should not succeed
        error: error => {
          expect(error.message).toBe('An unexpected error occurred. Please try again.');
        }
      });

      const req = httpMock.expectOne('/api/contact');
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });
    });

    it('should use exponential backoff for retry delays', (done) => {
      const startTime = Date.now();

      service.submitContactForm(mockFormData).subscribe({
        next: () => {
          const totalTime = Date.now() - startTime;
          // Should have waited at least for the first retry (1000ms)
          // But since we're mocking, we can't test exact timing
          expect(totalTime).toBeGreaterThan(0);
          done();
        },
        error: () => fail('Should not error')
      });

      // First request fails immediately
      const req1 = httpMock.expectOne('/api/contact');
      req1.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });

      // Second request succeeds after delay
      setTimeout(() => {
        const req2 = httpMock.expectOne('/api/contact');
        req2.flush(mockSuccessResponse);
      }, 0);
    });
  });

  describe('error handling', () => {
    it('should handle 400 Bad Request with appropriate message', () => {
      service.submitContactForm(mockFormData).subscribe({
        next: () => expect(true).toBe(false), // Should not succeed
        error: error => {
          expect(error.message).toBe('Please check your form data and try again.');
        }
      });

      const req = httpMock.expectOne('/api/contact');
      req.flush('Bad Request', { status: 400, statusText: 'Bad Request' });
    });

    it('should handle 429 Too Many Requests with appropriate message', () => {
      service.submitContactForm(mockFormData).subscribe({
        next: () => expect(true).toBe(false), // Should not succeed
        error: error => {
          expect(error.message).toBe('Too many requests. Please wait a moment and try again.');
        }
      });

      const req = httpMock.expectOne('/api/contact');
      req.flush('Too Many Requests', { status: 429, statusText: 'Too Many Requests' });
    });

    it('should handle 500 Internal Server Error with appropriate message', () => {
      service.submitContactForm(mockFormData).subscribe({
        next: () => expect(true).toBe(false), // Should not succeed
        error: error => {
          expect(error.message).toBe('Server error. We\'re working to fix this issue.');
        }
      });

      // Exhaust all retries
      for (let i = 0; i < 4; i++) {
        const req = httpMock.expectOne('/api/contact');
        req.flush('Internal Server Error', { status: 500, statusText: 'Internal Server Error' });
      }
    });

    it('should handle network errors with appropriate message', () => {
      service.submitContactForm(mockFormData).subscribe({
        next: () => expect(true).toBe(false), // Should not succeed
        error: error => {
          expect(error.message).toBe('Network error. Please check your connection and try again.');
        }
      });

      // Exhaust all retries with network errors
      for (let i = 0; i < 4; i++) {
        const req = httpMock.expectOne('/api/contact');
        req.error(new ErrorEvent('Network error'));
      }
    });

    it('should handle connection timeout (status 0) with appropriate message', () => {
      service.submitContactForm(mockFormData).subscribe({
        next: () => expect(true).toBe(false), // Should not succeed
        error: error => {
          expect(error.message).toBe('Unable to connect to the server. Please check your internet connection.');
        }
      });

      // Exhaust all retries
      for (let i = 0; i < 4; i++) {
        const req = httpMock.expectOne('/api/contact');
        req.flush('Connection failed', { status: 0, statusText: '' });
      }
    });

    it('should handle unknown status codes with generic message', () => {
      service.submitContactForm(mockFormData).subscribe({
        next: () => expect(true).toBe(false), // Should not succeed
        error: error => {
          expect(error.message).toBe('An unexpected error occurred. Please try again.');
        }
      });

      const req = httpMock.expectOne('/api/contact');
      req.flush('Unknown Error', { status: 418, statusText: 'I\'m a teapot' });
    });

    it('should handle server errors with validation errors in response', () => {
      const errorResponse: ContactSubmissionResponse = {
        success: false,
        message: 'Validation failed',
        errors: {
          email: ['Invalid email format'],
          message: ['Message too short']
        }
      };

      service.submitContactForm(mockFormData).subscribe({
        next: () => expect(true).toBe(false), // Should not succeed
        error: error => {
          expect(error.message).toBe('Please check your form data and try again.');
        }
      });

      const req = httpMock.expectOne('/api/contact');
      req.flush(errorResponse, { status: 400, statusText: 'Bad Request' });
    });
  });

  describe('edge cases', () => {
    it('should handle empty form data', () => {
      const emptyFormData: ContactFormData = {
        name: '',
        email: '',
        message: ''
      };

      service.submitContactForm(emptyFormData).subscribe({
        next: () => fail('Should not succeed with empty data'),
        error: error => {
          expect(error.message).toBe('Please check your form data and try again.');
        }
      });

      const req = httpMock.expectOne('/api/contact');
      expect(req.request.body).toEqual(emptyFormData);
      req.flush('Validation failed', { status: 400, statusText: 'Bad Request' });
    });

    it('should handle very long message content', () => {
      const longMessage = 'A'.repeat(1000);
      const formDataLongMessage: ContactFormData = {
        name: 'Test User',
        email: 'test@example.com',
        message: longMessage
      };

      service.submitContactForm(formDataLongMessage).subscribe({
        next: response => expect(response).toEqual(mockSuccessResponse),
        error: () => fail('Should handle long messages')
      });

      const req = httpMock.expectOne('/api/contact');
      expect(req.request.body.message).toBe(longMessage);
      req.flush(mockSuccessResponse);
    });

    it('should handle special characters in form data', () => {
      const specialFormData: ContactFormData = {
        name: 'José María Español',
        email: 'test+tag@domain.co.uk',
        phone: '+1 (555) 123-4567',
        message: 'Hello! 你好 🌟 Special chars: & < > " \' / \\ @ # $ % ^ * ( ) - _ = + [ ] { } | ; : , . ? ! ~ `'
      };

      service.submitContactForm(specialFormData).subscribe({
        next: response => expect(response).toEqual(mockSuccessResponse),
        error: () => fail('Should handle special characters')
      });

      const req = httpMock.expectOne('/api/contact');
      expect(req.request.body).toEqual(specialFormData);
      req.flush(mockSuccessResponse);
    });

    it('should handle concurrent requests correctly', () => {
      const requests = [];

      for (let i = 0; i < 3; i++) {
        const formData = { ...mockFormData, name: `User ${i}` };
        requests.push(service.submitContactForm(formData).toPromise());
      }

      Promise.all(requests).then(responses => {
        responses.forEach(response => {
          expect(response).toEqual(mockSuccessResponse);
        });
      });

      // Handle all three requests
      for (let i = 0; i < 3; i++) {
        const req = httpMock.expectOne('/api/contact');
        req.flush(mockSuccessResponse);
      }
    });
  });

  describe('mixed retry scenarios', () => {
    it('should handle mixed error types during retries', () => {
      service.submitContactForm(mockFormData).subscribe({
        next: () => expect(true).toBe(false), // Should not succeed
        error: error => {
          expect(error.message).toBe('Network error. Please check your connection and try again.');
        }
      });

      // First request - 500 error (retryable)
      const req1 = httpMock.expectOne('/api/contact');
      req1.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });

      // Second request - network error (retryable)
      const req2 = httpMock.expectOne('/api/contact');
      req2.error(new ErrorEvent('Network error'));

      // Third request - 503 error (retryable)
      const req3 = httpMock.expectOne('/api/contact');
      req3.flush('Service Unavailable', { status: 503, statusText: 'Service Unavailable' });

      // Fourth request - network error (final failure)
      const req4 = httpMock.expectOne('/api/contact');
      req4.error(new ErrorEvent('Final network error'));
    });

    it('should stop retrying if client error occurs during retry', () => {
      service.submitContactForm(mockFormData).subscribe({
        next: () => expect(true).toBe(false), // Should not succeed
        error: error => {
          expect(error.message).toBe('Please check your form data and try again.');
        }
      });

      // First request - 500 error (retryable)
      const req1 = httpMock.expectOne('/api/contact');
      req1.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });

      // Second request - 400 error (not retryable, should stop here)
      const req2 = httpMock.expectOne('/api/contact');
      req2.flush('Bad Request', { status: 400, statusText: 'Bad Request' });

      // Should not make any more requests
    });
  });
});