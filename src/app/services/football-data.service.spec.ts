import { TestBed } from '@angular/core/testing';
import { HttpClient, HttpResponse, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { of, throwError, timer, firstValueFrom } from 'rxjs';
import { delay } from 'rxjs/operators';
import { FootballDataService } from './football-data.service';
import { FootballData, ApiResponse } from '../interfaces/football-data.interface';

describe('FootballDataService', () => {
  let service: FootballDataService;
  let httpClientSpy: any;

  const mockFootballApiResponse = {
    competition: { name: 'Premier League' },
    season: { startDate: '2024', currentMatchday: 15 },
    matches: [
      {
        id: '1',
        homeTeam: { id: '1', name: 'Arsenal', shortName: 'ARS', crest: 'arsenal.png' },
        awayTeam: { id: '2', name: 'Chelsea', shortName: 'CHE', crest: 'chelsea.png' },
        score: { fullTime: { home: 2, away: 1 }, halfTime: { home: 1, away: 0 } },
        status: 'FINISHED' as const,
        utcDate: '2024-01-01T15:00:00Z'
      }
    ]
  };

  const createMockHttpResponse = (body: any, headers?: any, status = 200) => {
    return new HttpResponse({
      body,
      status,
      headers: new HttpHeaders(headers || {
        'X-RateLimit-Remaining': '95',
        'Content-Type': 'application/json'
      })
    });
  };

  beforeEach(async () => {
    httpClientSpy = {
      get: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [],
      providers: [
        FootballDataService,
        { provide: HttpClient, useValue: httpClientSpy }
      ]
    }).compileComponents();

    service = TestBed.inject(FootballDataService);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.resetAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Environment Configuration Integration', () => {
    it('should use environment configuration for API key and base URL', async () => {
      const mockResponse = createMockHttpResponse(mockFootballApiResponse);
      httpClientSpy.get.mockReturnValue(of(mockResponse));

      await firstValueFrom(service.fetchCompetitionData());

      expect(httpClientSpy.get).toHaveBeenCalledWith(
        'https://api.football-data.org/v4/competitions/PL/matches',
        {
          headers: expect.objectContaining({
            'X-Auth-Token': 'test-api-key-123',
            'X-Response-Control': 'minified'
          }),
          observe: 'response'
        }
      );
    });
  });

  describe('fetchCompetitionData', () => {
    it('should fetch Premier League data successfully with default competition ID', async () => {
      const mockResponse = createMockHttpResponse(mockFootballApiResponse);
      httpClientSpy.get.mockReturnValue(of(mockResponse));

      const result = await firstValueFrom(service.fetchCompetitionData());

      expect(httpClientSpy.get).toHaveBeenCalledWith(
        'https://api.football-data.org/v4/competitions/PL/matches',
        {
          headers: expect.objectContaining({
            'X-Auth-Token': 'test-api-key-123',
            'X-Response-Control': 'minified'
          }),
          observe: 'response'
        }
      );

      expect(result).toEqual({
        data: expect.objectContaining({
          id: expect.stringContaining('PL-'),
          competition: 'Premier League',
          season: '2024',
          matchday: 15,
          matches: expect.arrayContaining([
            expect.objectContaining({
              id: '1',
              homeTeam: { id: '1', name: 'Arsenal' },
              awayTeam: { id: '2', name: 'Chelsea' }
            })
          ]),
          lastUpdated: expect.any(String)
        }),
        status: 200,
        timestamp: expect.any(Number)
      });
    });

    it('should fetch data for specific competition ID', async () => {
      const mockResponse = createMockHttpResponse(mockFootballApiResponse);
      httpClientSpy.get.mockReturnValue(of(mockResponse));

      await firstValueFrom(service.fetchCompetitionData('CL'));

      expect(httpClientSpy.get).toHaveBeenCalledWith(
        'https://api.football-data.org/v4/competitions/CL/matches',
        expect.objectContaining({
          headers: expect.any(HttpHeaders)
        })
      );
    });

    it('should handle missing response data gracefully with fallback values', async () => {
      const emptyResponse = createMockHttpResponse({});
      httpClientSpy.get.mockReturnValue(of(emptyResponse));

      const result = await firstValueFrom(service.fetchCompetitionData());

      expect(result?.data).toEqual({
        id: expect.stringContaining('PL-'),
        competition: 'Premier League',
        season: expect.any(String),
        matchday: 1,
        matches: [],
        lastUpdated: expect.any(String)
      });
    });

    it('should handle timeout errors with proper error structure', async () => {
      const timeoutError = new Error('Timeout');
      httpClientSpy.get.mockReturnValue(throwError(() => timeoutError));

      try {
        await firstValueFrom(service.fetchCompetitionData());
        throw new Error('Should have thrown an error');
      } catch (error: any) {
        expect(error.status).toBe(0);
        expect(error.message).toContain('Network error');
        expect(error.timestamp).toBeGreaterThan(0);
      }
    });
  });

  describe('Rate Limiting and Headers', () => {
    it('should update rate limiting from response headers', async () => {
      const mockResponse = createMockHttpResponse(mockFootballApiResponse, {
        'X-RateLimit-Remaining': '50'
      });
      httpClientSpy.get.mockReturnValue(of(mockResponse));

      await firstValueFrom(service.fetchCompetitionData());

      const healthMetrics = service.getHealthMetrics();
      expect(healthMetrics.rateLimitRemaining).toBe(50);
    });

    it('should detect rate limiting correctly when below threshold', async () => {
      const lowRateResponse = createMockHttpResponse(mockFootballApiResponse, {
        'X-RateLimit-Remaining': '3'
      });
      httpClientSpy.get.mockReturnValue(of(lowRateResponse));

      await firstValueFrom(service.fetchCompetitionData());

      expect(service.isRateLimited()).toBe(true);
      expect(service.canMakeRequest()).toBe(false);
    });

    it('should allow requests when rate limit is sufficient', async () => {
      const goodRateResponse = createMockHttpResponse(mockFootballApiResponse, {
        'X-RateLimit-Remaining': '50'
      });
      httpClientSpy.get.mockReturnValue(of(goodRateResponse));

      await firstValueFrom(service.fetchCompetitionData());

      expect(service.isRateLimited()).toBe(false);
      expect(service.canMakeRequest()).toBe(true);
    });

    it('should handle response with missing rate limit header gracefully', async () => {
      const responseWithoutHeaders = createMockHttpResponse(mockFootballApiResponse, {});
      httpClientSpy.get.mockReturnValue(of(responseWithoutHeaders));

      await firstValueFrom(service.fetchCompetitionData());

      const metrics = service.getHealthMetrics();
      expect(metrics.rateLimitRemaining).toBe(100); // Should maintain initial value
    });
  });

  describe('Exponential Backoff and Retry Logic', () => {
    beforeEach(() => {
      // Mock timer to avoid actual delays in tests
      vi.spyOn(global, 'setTimeout').mockImplementation((fn: any) => {
        fn();
        return 0 as any;
      });
    });

    it('should handle 429 rate limit errors with exponential backoff', async () => {
      const rateLimitError = new HttpErrorResponse({
        status: 429,
        statusText: 'Too Many Requests',
        headers: new HttpHeaders({ 'Retry-After': '60' })
      });

      httpClientSpy.get
        .mockReturnValueOnce(throwError(() => rateLimitError))
        .mockReturnValueOnce(of(createMockHttpResponse(mockFootballApiResponse)));

      const result = await firstValueFrom(service.fetchCompetitionData());
      expect(result).toBeDefined();
    });

    it('should implement exponential backoff for server errors (5xx)', async () => {
      const serverError = new HttpErrorResponse({
        status: 500,
        statusText: 'Internal Server Error'
      });

      httpClientSpy.get
        .mockReturnValueOnce(throwError(() => serverError))
        .mockReturnValueOnce(of(createMockHttpResponse(mockFootballApiResponse)));

      const result = await firstValueFrom(service.fetchCompetitionData());
      expect(result).toBeDefined();
    });

    it('should not retry client errors (4xx except 429)', async () => {
      const clientError = new HttpErrorResponse({
        status: 401,
        statusText: 'Unauthorized',
        error: { message: 'Invalid API key' }
      });
      httpClientSpy.get.mockReturnValue(throwError(() => clientError));

      try {
        await firstValueFrom(service.fetchCompetitionData());
        throw new Error('Should have thrown an error');
      } catch (error: any) {
        expect(error.status).toBe(401);
        expect(error.message).toBe('Invalid API key');
      }

      expect(httpClientSpy.get).toHaveBeenCalledTimes(1);
    });

    it('should respect maximum retry attempts for server errors', async () => {
      const serverError = new HttpErrorResponse({
        status: 503,
        statusText: 'Service Unavailable'
      });

      httpClientSpy.get.mockReturnValue(throwError(() => serverError));

      try {
        await firstValueFrom(service.fetchCompetitionData());
        throw new Error('Should have thrown an error');
      } catch (error: any) {
        expect(error.status).toBe(503);
      }

      expect(httpClientSpy.get).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
    });
  });

  describe('Circuit Breaker Behavior', () => {
    it('should prevent requests after consecutive failure threshold', async () => {
      httpClientSpy.get.mockReturnValue(throwError(() => new Error('Network error')));

      // Make 5 failed requests to trigger circuit breaker
      for (let i = 0; i < 5; i++) {
        try {
          await firstValueFrom(service.fetchCompetitionData());
        } catch {}
      }

      expect(service.canMakeRequest()).toBe(false);

      const metrics = service.getHealthMetrics();
      expect(metrics.consecutiveFailures).toBe(5);
    });

    it('should reset circuit breaker on successful request', async () => {
      // First make some failures
      httpClientSpy.get.mockReturnValue(throwError(() => new Error('Network error')));

      try {
        await firstValueFrom(service.fetchCompetitionData());
      } catch {}

      // Then succeed
      httpClientSpy.get.mockReturnValue(of(createMockHttpResponse(mockFootballApiResponse)));
      await firstValueFrom(service.fetchCompetitionData());

      const metrics = service.getHealthMetrics();
      expect(metrics.consecutiveFailures).toBe(0);
    });
  });

  describe('Health Metrics and Performance Tracking', () => {
    it('should track success metrics correctly', async () => {
      const mockResponse = createMockHttpResponse(mockFootballApiResponse);
      httpClientSpy.get.mockReturnValue(of(mockResponse));

      await firstValueFrom(service.fetchCompetitionData());

      const healthMetrics = service.getHealthMetrics();
      expect(healthMetrics.successfulRequests).toBe(1);
      expect(healthMetrics.totalRequests).toBe(1);
      expect(healthMetrics.successRate).toBe(100);
      expect(healthMetrics.consecutiveFailures).toBe(0);
      expect(healthMetrics.lastSuccessfulFetch).toBeGreaterThan(0);
    });

    it('should calculate success rate correctly after mixed results', async () => {
      const mockResponse = createMockHttpResponse(mockFootballApiResponse);
      httpClientSpy.get
        .mockReturnValueOnce(of(mockResponse))
        .mockReturnValueOnce(throwError(() => new Error('Network error')))
        .mockReturnValueOnce(of(mockResponse));

      // Successful request
      await firstValueFrom(service.fetchCompetitionData());

      // Failed request
      try {
        await firstValueFrom(service.fetchCompetitionData());
      } catch {}

      // Another successful request
      await firstValueFrom(service.fetchCompetitionData());

      const metrics = service.getHealthMetrics();
      expect(metrics.totalRequests).toBe(3);
      expect(metrics.successfulRequests).toBe(2);
      expect(metrics.successRate).toBeCloseTo(66.67, 1);
    });

    it('should return initial health metrics correctly', () => {
      const metrics = service.getHealthMetrics();

      expect(metrics).toEqual({
        responseTime: 0,
        successRate: 0,
        lastSuccessfulFetch: 0,
        rateLimitRemaining: 100,
        consecutiveFailures: 0,
        totalRequests: 0
      });
    });

    it('should log performance metrics for response times', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const mockResponse = createMockHttpResponse(mockFootballApiResponse);

      httpClientSpy.get.mockReturnValue(
        of(mockResponse).pipe(delay(10))
      );

      await firstValueFrom(service.fetchCompetitionData());

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/API call completed in \d+ms/)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Error Handling Edge Cases', () => {
    it('should handle malformed error responses gracefully', async () => {
      const malformedError = new HttpErrorResponse({
        status: 500,
        statusText: 'Internal Server Error',
        error: 'Not valid JSON'
      });
      httpClientSpy.get.mockReturnValue(throwError(() => malformedError));

      try {
        await firstValueFrom(service.fetchCompetitionData());
        throw new Error('Should have thrown an error');
      } catch (error: any) {
        expect(error.status).toBe(500);
        expect(error.message).toContain('HTTP 500: Internal Server Error');
        expect(error.timestamp).toBeGreaterThan(0);
      }
    });

    it('should handle network errors with proper error structure', async () => {
      const networkError = new HttpErrorResponse({
        error: new ErrorEvent('Network Error', { message: 'Connection refused' })
      });
      httpClientSpy.get.mockReturnValue(throwError(() => networkError));

      try {
        await firstValueFrom(service.fetchCompetitionData());
        throw new Error('Should have thrown an error');
      } catch (error: any) {
        expect(error.status).toBe(0);
        expect(error.message).toContain('Network error: Connection refused');
      }
    });

    it('should track consecutive failures correctly', async () => {
      httpClientSpy.get.mockReturnValue(throwError(() => new Error('Network error')));

      // Make multiple failed requests
      for (let i = 1; i <= 3; i++) {
        try {
          await firstValueFrom(service.fetchCompetitionData());
        } catch {}

        const metrics = service.getHealthMetrics();
        expect(metrics.consecutiveFailures).toBe(i);
      }
    });

    it('should handle 429 with Retry-After header parsing', async () => {
      const rateLimitError = new HttpErrorResponse({
        status: 429,
        statusText: 'Too Many Requests',
        headers: new HttpHeaders({ 'Retry-After': '120' })
      });
      httpClientSpy.get.mockReturnValue(throwError(() => rateLimitError));

      try {
        await firstValueFrom(service.fetchCompetitionData());
        throw new Error('Should have thrown an error');
      } catch (error: any) {
        expect(error.status).toBe(429);
        expect(error.retryAfter).toBe(120000); // Should be converted to milliseconds
      }
    });
  });
});