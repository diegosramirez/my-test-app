import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';

import { SearchService } from './search.service';
import { SearchRequest, SearchResponse, SearchError } from './search.interface';

describe('SearchService', () => {
  let service: SearchService;
  let httpMock: HttpTestingController;

  const mockRequest: SearchRequest = {
    query: 'test',
    limit: 10,
    offset: 0
  };

  const mockResponse: SearchResponse = {
    results: [
      { id: '1', title: 'Test Result 1', description: 'First test result' },
      { id: '2', title: 'Test Result 2', description: 'Second test result' }
    ],
    totalCount: 2,
    hasMore: false
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [SearchService]
    });

    service = TestBed.inject(SearchService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    service.clearCache();
  });

  describe('Basic Search Functionality', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should make HTTP request with correct parameters', () => {
      service.search(mockRequest).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne('/api/search?q=test&limit=10');
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should include offset in request when provided', () => {
      const requestWithOffset = { ...mockRequest, offset: 20 };

      service.search(requestWithOffset).subscribe();

      const req = httpMock.expectOne('/api/search?q=test&limit=10&offset=20');
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should include filters in request when provided', () => {
      const requestWithFilters = {
        ...mockRequest,
        filters: { category: 'documents', status: 'active' }
      };

      service.search(requestWithFilters).subscribe();

      const req = httpMock.expectOne('/api/search?q=test&limit=10&category=documents&status=active');
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should use custom config when provided', () => {
      const customConfig = {
        endpoint: '/custom/search',
        resultLimit: 20
      };

      service.search(mockRequest, customConfig).subscribe();

      const req = httpMock.expectOne('/custom/search?q=test&limit=20');
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('Caching', () => {
    it('should cache successful responses', () => {
      // First request
      service.search(mockRequest).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req1 = httpMock.expectOne('/api/search?q=test&limit=10');
      req1.flush(mockResponse);

      // Second identical request should come from cache
      service.search(mockRequest).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      // Should not make another HTTP request
      httpMock.expectNone('/api/search?q=test&limit=10');
    });

    it('should create different cache keys for different requests', () => {
      const request1 = { query: 'test1' };
      const request2 = { query: 'test2' };

      service.search(request1).subscribe();
      service.search(request2).subscribe();

      // Should make two separate requests
      const req1 = httpMock.expectOne(req => req.url.includes('q=test1'));
      const req2 = httpMock.expectOne(req => req.url.includes('q=test2'));

      req1.flush(mockResponse);
      req2.flush(mockResponse);
    });

    it('should expire cache after timeout', async () => {
      // Mock the cache expiry time to be very short for testing
      const originalCacheExpiry = (service as any).cacheExpiryMs;
      (service as any).cacheExpiryMs = 10; // 10ms

      // First request
      service.search(mockRequest).subscribe();

      const req1 = httpMock.expectOne('/api/search?q=test&limit=10');
      req1.flush(mockResponse);

      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 15));

      service.search(mockRequest).subscribe();

      // Should make a new request since cache expired
      const req2 = httpMock.expectOne('/api/search?q=test&limit=10');
      req2.flush(mockResponse);

      // Restore original cache expiry
      (service as any).cacheExpiryMs = originalCacheExpiry;
    });

    it('should limit cache size to prevent memory leaks', () => {
      // Fill cache beyond limit (50 items)
      const promises = [];
      for (let i = 0; i < 55; i++) {
        const request = { query: `test${i}` };
        promises.push(service.search(request).toPromise());

        const req = httpMock.expectOne(req => req.url.includes(`q=test${i}`));
        req.flush({ results: [], totalCount: 0 });
      }

      Promise.all(promises).then(() => {
        const cache = (service as any).cache;
        expect(cache.size).toBeLessThanOrEqual(50);
      });
    });

    it('should clear cache when clearCache is called', () => {
      service.search(mockRequest).subscribe();

      const req = httpMock.expectOne('/api/search?q=test&limit=10');
      req.flush(mockResponse);

      service.clearCache();

      // Next request should not come from cache
      service.search(mockRequest).subscribe();
      const req2 = httpMock.expectOne('/api/search?q=test&limit=10');
      req2.flush(mockResponse);
    });

    it('should clear cache on error', () => {
      service.search(mockRequest).subscribe(
        () => { throw new Error('Should have failed'); },
        () => {
          // Error expected
        }
      );

      const req = httpMock.expectOne('/api/search?q=test&limit=10');
      req.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });

      // Next request should not come from cache (and cache should be cleared)
      service.search(mockRequest).subscribe();
      const req2 = httpMock.expectOne('/api/search?q=test&limit=10');
      req2.flush(mockResponse);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', () => {
      service.search(mockRequest).subscribe(
        () => { throw new Error('Should have failed'); },
        (error: SearchError) => {
          expect(error).toBeInstanceOf(SearchError);
          expect(error.message).toBe('Network connection error. Please check your internet connection.');
          expect(error.errorCode).toBe('HTTP_0');
        }
      );

      const req = httpMock.expectOne('/api/search?q=test&limit=10');
      req.error(new ErrorEvent('Network error'), { status: 0 });
    });

    it('should handle 400 Bad Request', () => {
      service.search(mockRequest).subscribe(
        () => { throw new Error('Should have failed'); },
        (error: SearchError) => {
          expect(error.message).toBe('Invalid search request. Please try a different query.');
          expect(error.errorCode).toBe('HTTP_400');
        }
      );

      const req = httpMock.expectOne('/api/search?q=test&limit=10');
      req.flush('Bad Request', { status: 400, statusText: 'Bad Request' });
    });

    it('should handle 404 Not Found', () => {
      service.search(mockRequest).subscribe(
        () => { throw new Error('Should have failed'); },
        (error: SearchError) => {
          expect(error.message).toBe('Search service not found.');
          expect(error.errorCode).toBe('HTTP_404');
        }
      );

      const req = httpMock.expectOne('/api/search?q=test&limit=10');
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });
    });

    it('should handle 429 Too Many Requests', () => {
      service.search(mockRequest).subscribe(
        () => { throw new Error('Should have failed'); },
        (error: SearchError) => {
          expect(error.message).toBe('Too many requests. Please wait a moment before searching again.');
          expect(error.errorCode).toBe('HTTP_429');
        }
      );

      const req = httpMock.expectOne('/api/search?q=test&limit=10');
      req.flush('Too Many Requests', { status: 429, statusText: 'Too Many Requests' });
    });

    it('should handle 500 Internal Server Error', () => {
      service.search(mockRequest).subscribe(
        () => { throw new Error('Should have failed'); },
        (error: SearchError) => {
          expect(error.message).toBe('Server error occurred. Please try again later.');
          expect(error.errorCode).toBe('HTTP_500');
        }
      );

      const req = httpMock.expectOne('/api/search?q=test&limit=10');
      req.flush('Internal Server Error', { status: 500, statusText: 'Internal Server Error' });
    });

    it('should handle unknown HTTP errors', () => {
      service.search(mockRequest).subscribe(
        () => { throw new Error('Should have failed'); },
        (error: SearchError) => {
          expect(error.message).toContain('Search failed with status 418');
          expect(error.errorCode).toBe('HTTP_418');
        }
      );

      const req = httpMock.expectOne('/api/search?q=test&limit=10');
      req.flush('I\'m a teapot', { status: 418, statusText: 'I\'m a teapot' });
    });
  });

  describe('Retry Logic', () => {
    it('should retry failed requests with exponential backoff', async () => {
      let attemptCount = 0;
      const startTime = Date.now();

      const searchPromise = new Promise((resolve, reject) => {
        service.search(mockRequest).subscribe(
          () => { reject(new Error('Should have failed')); },
          (error: SearchError) => {
            const endTime = Date.now();
            const duration = endTime - startTime;

            expect(error.message).toContain('Search failed after 3 attempts');
            expect(error.retryCount).toBe(3);

            // Should have taken at least the retry delays (200ms + 400ms + 800ms = 1400ms)
            expect(duration).toBeGreaterThanOrEqual(1300);
            resolve(error);
          }
        );
      });

      // Simulate failures for all retry attempts
      for (let i = 0; i <= 3; i++) {
        const req = httpMock.expectOne('/api/search?q=test&limit=10');
        req.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });
      }

      await searchPromise;
    });

    it('should succeed after some retries', async () => {
      let attemptCount = 0;

      const searchPromise = new Promise((resolve, reject) => {
        service.search(mockRequest).subscribe(
          (response: SearchResponse) => {
            expect(response).toEqual(mockResponse);
            expect(attemptCount).toBe(2); // Failed twice, succeeded on third attempt
            resolve(response);
          },
          () => { reject(new Error('Should have succeeded')); }
        );
      });

      // Fail first two attempts
      for (let i = 0; i < 2; i++) {
        const req = httpMock.expectOne('/api/search?q=test&limit=10');
        req.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });
        attemptCount++;
      }

      // Succeed on third attempt
      const req = httpMock.expectOne('/api/search?q=test&limit=10');
      req.flush(mockResponse);
      attemptCount++;

      await searchPromise;
    });

    it('should respect custom maxRetries config', async () => {
      const customConfig = { maxRetries: 1 };

      const searchPromise = new Promise((resolve, reject) => {
        service.search(mockRequest, customConfig).subscribe(
          () => { reject(new Error('Should have failed')); },
          (error: SearchError) => {
            expect(error.message).toContain('Search failed after 1 attempts');
            resolve(error);
          }
        );
      });

      // Should only make 2 requests total (initial + 1 retry)
      for (let i = 0; i <= 1; i++) {
        const req = httpMock.expectOne('/api/search?q=test&limit=10');
        req.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });
      }

      await searchPromise;
    });
  });

  describe('Private Methods', () => {
    it('should create consistent cache keys', () => {
      const getCacheKey = (service as any).getCacheKey.bind(service);

      const key1 = getCacheKey({ query: 'Test', limit: 10 });
      const key2 = getCacheKey({ query: 'test', limit: 10 }); // Different case
      const key3 = getCacheKey({ query: '  test  ', limit: 10 }); // With whitespace

      expect(key1).toBe(key2);
      expect(key2).toBe(key3);
    });

    it('should handle null filter values', () => {
      const request = {
        query: 'test',
        filters: { category: 'docs', status: null, type: undefined }
      };

      service.search(request).subscribe();

      // Should only include non-null filter values
      const req = httpMock.expectOne('/api/search?q=test&limit=10&category=docs');
      expect(req.request.params.has('status')).toBe(false);
      expect(req.request.params.has('type')).toBe(false);
      req.flush(mockResponse);
    });
  });

  describe('Error Message Formatting', () => {
    it('should format generic Error objects', () => {
      const getErrorMessage = (service as any).getErrorMessage.bind(service);
      const error = new Error('Custom error message');

      expect(getErrorMessage(error)).toBe('Custom error message');
    });

    it('should format unknown error types', () => {
      const getErrorMessage = (service as any).getErrorMessage.bind(service);

      expect(getErrorMessage('string error')).toBe('An unexpected error occurred while searching.');
      expect(getErrorMessage(null)).toBe('An unexpected error occurred while searching.');
      expect(getErrorMessage(undefined)).toBe('An unexpected error occurred while searching.');
    });

    it('should get error codes correctly', () => {
      const getErrorCode = (service as any).getErrorCode.bind(service);

      const httpError = new HttpErrorResponse({ status: 404 });
      expect(getErrorCode(httpError)).toBe('HTTP_404');

      const genericError = new Error('Test error');
      expect(getErrorCode(genericError)).toBe('Error');

      expect(getErrorCode('unknown')).toBe('UNKNOWN_ERROR');
    });
  });
});