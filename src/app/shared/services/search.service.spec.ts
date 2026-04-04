import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { SearchService } from './search.service';
import { SearchResponse, ApiError } from '../models/search.models';

describe('SearchService', () => {
  let service: SearchService;
  let httpMock: HttpTestingController;
  const apiUrl = '/api/search';

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
  });

  describe('search method', () => {
    it('should return search results for valid query', (done) => {
      const mockResponse: SearchResponse = {
        results: [
          { id: '1', title: 'Test Result 1', description: 'Test description 1' },
          { id: '2', title: 'Test Result 2', description: 'Test description 2' }
        ],
        total: 2
      };

      service.search('test query').subscribe({
        next: (response) => {
          expect(response).toEqual(mockResponse);
          done();
        },
        error: (error) => done.fail(error)
      });

      const req = httpMock.expectOne(`${apiUrl}?q=test query`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should reject queries shorter than 2 characters', (done) => {
      service.search('a').subscribe({
        next: () => done.fail('Should have thrown an error'),
        error: (error) => {
          expect(error.message).toBe('Query must be at least 2 characters long');
          done();
        }
      });

      httpMock.expectNone(`${apiUrl}?q=a`);
    });

    it('should reject empty queries', (done) => {
      service.search('').subscribe({
        next: () => done.fail('Should have thrown an error'),
        error: (error) => {
          expect(error.message).toBe('Query must be at least 2 characters long');
          done();
        }
      });

      httpMock.expectNone(`${apiUrl}?q=`);
    });

    it('should sanitize query with special characters', (done) => {
      const mockResponse: SearchResponse = { results: [], total: 0 };

      service.search('test<script>alert("xss")</script>').subscribe({
        next: () => done(),
        error: (error) => done.fail(error)
      });

      const req = httpMock.expectOne(`${apiUrl}?q=testscriptalert(xss)/script`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should trim whitespace from query', (done) => {
      const mockResponse: SearchResponse = { results: [], total: 0 };

      service.search('  test query  ').subscribe({
        next: () => done(),
        error: (error) => done.fail(error)
      });

      const req = httpMock.expectOne(`${apiUrl}?q=test query`);
      req.flush(mockResponse);
    });
  });

  describe('error handling', () => {
    it('should handle network errors', (done) => {
      service.search('test').subscribe({
        next: () => done.fail('Should have thrown an error'),
        error: (error: ApiError) => {
          expect(error.error).toBe('Network connection error. Please check your internet connection.');
          expect(error.code).toBe(0);
          done();
        }
      });

      const req = httpMock.expectOne(`${apiUrl}?q=test`);
      req.error(new ProgressEvent('error'), { status: 0 });
    });

    it('should handle 400 errors', (done) => {
      const errorResponse = { error: 'Invalid query parameter' };

      service.search('test').subscribe({
        next: () => done.fail('Should have thrown an error'),
        error: (error: ApiError) => {
          expect(error.error).toBe('Invalid query parameter');
          expect(error.code).toBe(400);
          done();
        }
      });

      const req = httpMock.expectOne(`${apiUrl}?q=test`);
      req.flush(errorResponse, { status: 400, statusText: 'Bad Request' });
    });

    it('should handle 500 errors', (done) => {
      service.search('test').subscribe({
        next: () => done.fail('Should have thrown an error'),
        error: (error: ApiError) => {
          expect(error.error).toBe('Server error. Please try again later.');
          expect(error.code).toBe(500);
          done();
        }
      });

      const req = httpMock.expectOne(`${apiUrl}?q=test`);
      req.error(new ProgressEvent('error'), { status: 500, statusText: 'Internal Server Error' });
    });

    it('should handle unknown errors', (done) => {
      service.search('test').subscribe({
        next: () => done.fail('Should have thrown an error'),
        error: (error: ApiError) => {
          expect(error.error).toBe('An unexpected error occurred. Please try again.');
          expect(error.code).toBe(-1);
          done();
        }
      });

      const req = httpMock.expectOne(`${apiUrl}?q=test`);
      req.error(new ProgressEvent('error'), { status: 999 });
    });
  });

  describe('retry logic', () => {
    it('should retry failed requests with exponential backoff', (done) => {
      const mockResponse: SearchResponse = { results: [], total: 0 };
      let requestCount = 0;

      service.search('test').subscribe({
        next: (response) => {
          expect(requestCount).toBe(3); // 1 original + 2 retries
          expect(response).toEqual(mockResponse);
          done();
        },
        error: (error) => done.fail(error)
      });

      // Handle multiple requests due to retries
      const handleRequest = () => {
        requestCount++;
        const req = httpMock.expectOne(`${apiUrl}?q=test`);

        if (requestCount < 3) {
          // Fail the first two requests
          req.error(new ProgressEvent('error'), { status: 503 });
          setTimeout(handleRequest, 50); // Wait for retry delay
        } else {
          // Succeed on the third request
          req.flush(mockResponse);
        }
      };

      handleRequest();
    });

    it('should not retry client errors (4xx)', (done) => {
      service.search('test').subscribe({
        next: () => done.fail('Should have thrown an error'),
        error: (error: ApiError) => {
          expect(error.code).toBe(400);
          done();
        }
      });

      const req = httpMock.expectOne(`${apiUrl}?q=test`);
      req.error(new ProgressEvent('error'), { status: 400 });
    });

    it('should give up after maximum retries', (done) => {
      let requestCount = 0;

      service.search('test').subscribe({
        next: () => done.fail('Should have thrown an error'),
        error: (error: ApiError) => {
          expect(requestCount).toBe(4); // 1 original + 3 retries
          done();
        }
      });

      const handleRequest = () => {
        requestCount++;
        const req = httpMock.expectOne(`${apiUrl}?q=test`);
        req.error(new ProgressEvent('error'), { status: 503 });

        if (requestCount < 4) {
          setTimeout(handleRequest, 50);
        }
      };

      handleRequest();
    });
  });
});