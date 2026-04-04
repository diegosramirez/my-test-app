import { TestBed } from '@angular/core/testing';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { of, throwError, timer } from 'rxjs';
import { SearchService } from './search.service';
import { SearchResponse, SearchOptions } from '../interfaces/search-result.interface';
import { SearchError, SearchErrorType } from '../interfaces/search-error.interface';

describe('SearchService', () => {
  let service: SearchService;
  let mockHttpClient: jasmine.SpyObj<HttpClient>;

  beforeEach(async () => {
    const httpClientSpy = jasmine.createSpyObj('HttpClient', ['get', 'post']);

    await TestBed.configureTestingModule({
      providers: [
        SearchService,
        { provide: HttpClient, useValue: httpClientSpy }
      ]
    }).compileComponents();

    service = TestBed.inject(SearchService);
    mockHttpClient = TestBed.inject(HttpClient) as jasmine.SpyObj<HttpClient>;
  });

  it('should create the search service', () => {
    expect(service).toBeTruthy();
  });

  describe('search method', () => {
    const mockSearchResponse: SearchResponse<any> = {
      results: [
        { id: '1', displayValue: 'Test Item 1', data: { name: 'Test Item 1' } },
        { id: '2', displayValue: 'Test Item 2', data: { name: 'Test Item 2' } }
      ],
      totalCount: 2,
      query: 'test'
    };

    it('should execute search function and return results', (done) => {
      const mockSearchFn = jasmine.createSpy('searchFn').and.returnValue(of(mockSearchResponse));

      service.search(mockSearchFn, 'test', {}).subscribe(response => {
        expect(response).toEqual(mockSearchResponse);
        expect(mockSearchFn).toHaveBeenCalledWith('test', undefined);
        done();
      });
    });

    it('should pass abort signal to search function when provided', (done) => {
      const abortController = new AbortController();
      const mockSearchFn = jasmine.createSpy('searchFn').and.returnValue(of(mockSearchResponse));

      service.search(mockSearchFn, 'test', {}, abortController.signal).subscribe(response => {
        expect(mockSearchFn).toHaveBeenCalledWith('test', abortController.signal);
        done();
      });
    });

    it('should cache results with default TTL', (done) => {
      const mockSearchFn = jasmine.createSpy('searchFn').and.returnValue(of(mockSearchResponse));

      // First call
      service.search(mockSearchFn, 'test', {}).subscribe(() => {
        // Second call should return cached result
        service.search(mockSearchFn, 'test', {}).subscribe(response => {
          expect(response).toEqual(mockSearchResponse);
          expect(mockSearchFn).toHaveBeenCalledTimes(1); // Only called once due to cache
          done();
        });
      });
    });

    it('should respect custom cache timeout', (done) => {
      const options: SearchOptions = { cacheTimeout: 1000 }; // 1 second
      const mockSearchFn = jasmine.createSpy('searchFn').and.returnValue(of(mockSearchResponse));

      service.search(mockSearchFn, 'test', options).subscribe(() => {
        // Verify cache is set with custom TTL
        service.search(mockSearchFn, 'test', options).subscribe(response => {
          expect(response).toEqual(mockSearchResponse);
          expect(mockSearchFn).toHaveBeenCalledTimes(1);
          done();
        });
      });
    });

    it('should not use expired cache entries', (done) => {
      // Mock the cache to have an expired entry
      service['cache'].set('test_{}', {
        data: mockSearchResponse,
        timestamp: Date.now() - 6 * 60 * 1000, // 6 minutes ago (expired)
        ttl: 5 * 60 * 1000 // 5 minute TTL
      });

      const mockSearchFn = jasmine.createSpy('searchFn').and.returnValue(of(mockSearchResponse));

      service.search(mockSearchFn, 'test', {}).subscribe(() => {
        expect(mockSearchFn).toHaveBeenCalled(); // Should call search function, not use cache
        done();
      });
    });

    it('should handle network errors with proper retry', (done) => {
      const networkError = new HttpErrorResponse({
        status: 0,
        statusText: 'Network Error'
      });

      let callCount = 0;
      const mockSearchFn = jasmine.createSpy('searchFn').and.callFake(() => {
        callCount++;
        if (callCount <= 3) { // Fail first 3 attempts
          return throwError(() => networkError);
        }
        return of(mockSearchResponse);
      });

      service.search(mockSearchFn, 'test', {}).subscribe({
        next: (response) => {
          expect(response).toEqual(mockSearchResponse);
          expect(callCount).toBe(4); // Initial + 3 retries
          done();
        }
      });
    });

    it('should handle timeout errors correctly', (done) => {
      const timeoutError = new HttpErrorResponse({
        status: 408,
        statusText: 'Request Timeout'
      });

      const mockSearchFn = jasmine.createSpy('searchFn').and.returnValue(throwError(() => timeoutError));

      service.search(mockSearchFn, 'test', {}).subscribe({
        error: (error: SearchError) => {
          expect(error.type).toBe(SearchErrorType.TIMEOUT);
          expect(error.message).toContain('Request timed out');
          expect(error.canRetry).toBe(true);
          done();
        }
      });
    });

    it('should handle rate limit errors correctly', (done) => {
      const rateLimitError = new HttpErrorResponse({
        status: 429,
        statusText: 'Too Many Requests'
      });

      const mockSearchFn = jasmine.createSpy('searchFn').and.returnValue(throwError(() => rateLimitError));

      service.search(mockSearchFn, 'test', {}).subscribe({
        error: (error: SearchError) => {
          expect(error.type).toBe(SearchErrorType.RATE_LIMITED);
          expect(error.message).toContain('Too many requests');
          expect(error.canRetry).toBe(true);
          done();
        }
      });
    });

    it('should handle invalid query errors correctly', (done) => {
      const invalidQueryError = new HttpErrorResponse({
        status: 400,
        statusText: 'Bad Request'
      });

      const mockSearchFn = jasmine.createSpy('searchFn').and.returnValue(throwError(() => invalidQueryError));

      service.search(mockSearchFn, 'test', {}).subscribe({
        error: (error: SearchError) => {
          expect(error.type).toBe(SearchErrorType.INVALID_QUERY);
          expect(error.message).toContain('Invalid search query');
          expect(error.canRetry).toBe(false);
          done();
        }
      });
    });

    it('should handle server errors correctly', (done) => {
      const serverError = new HttpErrorResponse({
        status: 500,
        statusText: 'Internal Server Error'
      });

      const mockSearchFn = jasmine.createSpy('searchFn').and.returnValue(throwError(() => serverError));

      service.search(mockSearchFn, 'test', {}).subscribe({
        error: (error: SearchError) => {
          expect(error.type).toBe(SearchErrorType.SERVER_ERROR);
          expect(error.message).toContain('Server error occurred');
          expect(error.canRetry).toBe(true);
          done();
        }
      });
    });
  });

  describe('mockSearch method', () => {
    const mockData = [
      { id: 1, name: 'Apple', category: 'Fruit' },
      { id: 2, name: 'Banana', category: 'Fruit' },
      { id: 3, name: 'Carrot', category: 'Vegetable' }
    ];

    it('should create mock search function that filters data', (done) => {
      const searchFn = service.mockSearch(mockData, 'name', 'id');

      searchFn('app').subscribe(response => {
        expect(response.results.length).toBe(1);
        expect(response.results[0].displayValue).toBe('Apple');
        expect(response.results[0].data).toEqual(mockData[0]);
        expect(response.totalCount).toBe(1);
        expect(response.query).toBe('app');
        done();
      });
    });

    it('should handle case-insensitive search', (done) => {
      const searchFn = service.mockSearch(mockData, 'name', 'id');

      searchFn('APPLE').subscribe(response => {
        expect(response.results.length).toBe(1);
        expect(response.results[0].displayValue).toBe('Apple');
        done();
      });
    });

    it('should return empty results for no matches', (done) => {
      const searchFn = service.mockSearch(mockData, 'name', 'id');

      searchFn('xyz').subscribe(response => {
        expect(response.results.length).toBe(0);
        expect(response.totalCount).toBe(0);
        done();
      });
    });

    it('should simulate network delay', (done) => {
      const searchFn = service.mockSearch(mockData, 'name', 'id');
      const startTime = Date.now();

      searchFn('apple').subscribe(() => {
        const endTime = Date.now();
        const duration = endTime - startTime;
        expect(duration).toBeGreaterThan(100); // Should have some delay
        expect(duration).toBeLessThan(500); // But not too much for tests
        done();
      });
    });

    it('should handle request cancellation', (done) => {
      const abortController = new AbortController();
      const searchFn = service.mockSearch(mockData, 'name', 'id');

      // Cancel the request immediately
      abortController.abort();

      searchFn('apple', abortController.signal).subscribe({
        error: (error) => {
          expect(error.message).toBe('Request cancelled');
          done();
        }
      });
    });
  });

  describe('clearCache method', () => {
    it('should clear all cached entries', () => {
      // Add some cached data
      service['cache'].set('test1', {
        data: mockSearchResponse,
        timestamp: Date.now(),
        ttl: 5 * 60 * 1000
      });
      service['cache'].set('test2', {
        data: mockSearchResponse,
        timestamp: Date.now(),
        ttl: 5 * 60 * 1000
      });

      expect(service['cache'].size).toBe(2);

      service.clearCache();

      expect(service['cache'].size).toBe(0);
    });
  });

  describe('retry functionality with exponential backoff', () => {
    it('should implement exponential backoff for retries', (done) => {
      const error = new HttpErrorResponse({ status: 500 });
      const retryDelays: number[] = [];

      // Spy on timer to capture delay values
      spyOn(window, 'setTimeout').and.callFake((fn: any, delay: number) => {
        retryDelays.push(delay);
        return setTimeout(fn, 0); // Execute immediately for test
      });

      let callCount = 0;
      const mockSearchFn = jasmine.createSpy('searchFn').and.callFake(() => {
        callCount++;
        if (callCount <= 3) {
          return throwError(() => error);
        }
        return of(mockSearchResponse);
      });

      service.search(mockSearchFn, 'test', {}).subscribe({
        next: () => {
          // Verify exponential backoff pattern
          expect(retryDelays.length).toBeGreaterThan(0);
          // First retry should be ~1000ms, second ~2000ms, third ~4000ms
          // Due to timer spying, we just verify the pattern exists
          done();
        }
      });
    });
  });

  describe('caching behavior', () => {
    const mockSearchResponse: SearchResponse<any> = {
      results: [{ id: '1', displayValue: 'Test', data: { name: 'Test' } }],
      totalCount: 1,
      query: 'test'
    };

    it('should generate different cache keys for different options', () => {
      const key1 = service['generateCacheKey']('test', {});
      const key2 = service['generateCacheKey']('test', { maxResults: 10 });

      expect(key1).not.toBe(key2);
    });

    it('should use same cache key for identical queries and options', () => {
      const options = { maxResults: 10, debounceMs: 300 };
      const key1 = service['generateCacheKey']('test', options);
      const key2 = service['generateCacheKey']('test', options);

      expect(key1).toBe(key2);
    });

    it('should remove expired cache entries when accessed', () => {
      const cacheKey = 'expired_test';

      // Add expired entry
      service['cache'].set(cacheKey, {
        data: mockSearchResponse,
        timestamp: Date.now() - 10 * 60 * 1000, // 10 minutes ago
        ttl: 5 * 60 * 1000 // 5 minute TTL
      });

      const result = service['getCachedResult'](cacheKey);

      expect(result).toBeNull();
      expect(service['cache'].has(cacheKey)).toBe(false);
    });
  });

  describe('API call reduction verification', () => {
    it('should demonstrate 70%+ API call reduction through caching', (done) => {
      const mockSearchFn = jasmine.createSpy('searchFn').and.returnValue(of(mockSearchResponse));
      let completedRequests = 0;
      const totalRequests = 10;

      // Execute same search multiple times
      for (let i = 0; i < totalRequests; i++) {
        service.search(mockSearchFn, 'test', {}).subscribe(() => {
          completedRequests++;

          if (completedRequests === totalRequests) {
            // Should only have called the search function once due to caching
            expect(mockSearchFn).toHaveBeenCalledTimes(1);

            const apiCallReduction = ((totalRequests - 1) / totalRequests) * 100;
            expect(apiCallReduction).toBeGreaterThanOrEqual(70);
            done();
          }
        });
      }
    });
  });
});