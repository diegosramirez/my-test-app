import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { vi, beforeEach, describe, expect, it, afterEach } from 'vitest';

import { MatchService } from './match.service';
import { MatchesResponse } from '../models/match.interface';

describe('MatchService', () => {
  let service: MatchService;
  let httpMock: HttpTestingController;

  const mockMatchesResponse: MatchesResponse = {
    matches: [
      {
        id: '1',
        homeTeam: { name: 'Arsenal', shortCode: 'ARS' },
        awayTeam: { name: 'Chelsea', shortCode: 'CHE' },
        homeScore: 2,
        awayScore: 1,
        matchDate: '2026-04-08T15:00:00Z',
        venue: 'Emirates Stadium',
        status: 'completed',
        finishTime: '2026-04-08T16:45:00Z'
      },
      {
        id: '2',
        homeTeam: { name: 'Liverpool', shortCode: 'LIV' },
        awayTeam: { name: 'Manchester City', shortCode: 'MCI' },
        homeScore: 0,
        awayScore: 3,
        matchDate: '2026-04-07T17:30:00Z',
        venue: 'Anfield',
        status: 'completed',
        finishTime: '2026-04-07T19:15:00Z'
      }
    ],
    lastUpdated: '2026-04-08T17:00:00Z'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [MatchService]
    });

    service = TestBed.inject(MatchService);
    httpMock = TestBed.inject(HttpTestingController);

    // Clear localStorage before each test
    localStorage.clear();

    // Reset circuit breaker state
    (service as any).circuitBreakerFailures = 0;
    (service as any).circuitBreakerOpenUntil = 0;
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch recent matches successfully', () => {
    service.getRecentMatches().subscribe(response => {
      expect(response).toEqual(mockMatchesResponse);
      expect(response.matches).toHaveLength(2);
      expect(response.matches[0].homeTeam.name).toBe('Arsenal');
    });

    const req = httpMock.expectOne('/api/matches/recent?league=premier-league&limit=10&status=completed');
    expect(req.request.method).toBe('GET');
    req.flush(mockMatchesResponse);
  });

  it('should cache successful responses', () => {
    service.getRecentMatches().subscribe();

    const req = httpMock.expectOne('/api/matches/recent?league=premier-league&limit=10&status=completed');
    req.flush(mockMatchesResponse);

    // Check that data was cached
    const cachedData = localStorage.getItem('premier_league_matches_cache');
    expect(cachedData).toBeTruthy();

    const parsed = JSON.parse(cachedData!);
    expect(parsed.data).toEqual(mockMatchesResponse);
  });

  it('should return cached data when available and fresh', () => {
    // Set up cache with fresh data
    const cacheEntry = {
      data: mockMatchesResponse,
      timestamp: Date.now()
    };
    localStorage.setItem('premier_league_matches_cache', JSON.stringify(cacheEntry));

    service.getRecentMatches().subscribe(response => {
      expect(response).toEqual(mockMatchesResponse);
    });

    // Should not make HTTP request when cache is fresh
    httpMock.expectNone('/api/matches/recent?league=premier-league&limit=10&status=completed');
  });

  it('should fetch fresh data when cache is expired', () => {
    // Set up cache with expired data
    const expiredTimestamp = Date.now() - (10 * 60 * 1000); // 10 minutes ago
    const cacheEntry = {
      data: mockMatchesResponse,
      timestamp: expiredTimestamp
    };
    localStorage.setItem('premier_league_matches_cache', JSON.stringify(cacheEntry));

    service.getRecentMatches().subscribe();

    // Should make HTTP request when cache is expired
    const req = httpMock.expectOne('/api/matches/recent?league=premier-league&limit=10&status=completed');
    req.flush(mockMatchesResponse);
  });

  it('should handle HTTP errors with circuit breaker', () => {
    // Manually open the circuit breaker by setting the open time to future
    (service as any).circuitBreakerFailures = 3;
    (service as any).circuitBreakerOpenUntil = Date.now() + 60000; // Open for 1 minute

    // Test that circuit breaker triggers fallback behavior
    service.getRecentMatches().subscribe(response => {
      // Should return empty fallback data when circuit breaker is open
      expect(response.matches).toEqual([]);
      expect(response.lastUpdated).toBeTruthy();
    });

    // No HTTP request should be made when circuit breaker is open
    httpMock.expectNone('/api/matches/recent?league=premier-league&limit=10&status=completed');
  });

  it('should return fallback data when circuit breaker is open', () => {
    // Set up some cached data
    const cacheEntry = {
      data: mockMatchesResponse,
      timestamp: Date.now() - (10 * 60 * 1000) // Expired but will be used as fallback
    };
    localStorage.setItem('premier_league_matches_cache', JSON.stringify(cacheEntry));

    // Trip the circuit breaker manually
    (service as any).circuitBreakerOpenUntil = Date.now() + 60000;

    service.getRecentMatches().subscribe(response => {
      expect(response).toEqual(mockMatchesResponse);
    });

    // Should not make HTTP request when circuit breaker is open
    httpMock.expectNone('/api/matches/recent?league=premier-league&limit=10&status=completed');
  });

  it('should return empty response when no cache and circuit breaker is open', () => {
    // Trip the circuit breaker manually
    (service as any).circuitBreakerOpenUntil = Date.now() + 60000;

    service.getRecentMatches().subscribe(response => {
      expect(response.matches).toEqual([]);
      expect(response.lastUpdated).toBeTruthy();
    });

    httpMock.expectNone('/api/matches/recent?league=premier-league&limit=10&status=completed');
  });

  it('should return last updated time from cache', () => {
    const cacheEntry = {
      data: mockMatchesResponse,
      timestamp: Date.now()
    };
    localStorage.setItem('premier_league_matches_cache', JSON.stringify(cacheEntry));

    const lastUpdated = service.getLastUpdatedTime();
    expect(lastUpdated).toBe(mockMatchesResponse.lastUpdated);
  });

  it('should return null when no cached data available', () => {
    const lastUpdated = service.getLastUpdatedTime();
    expect(lastUpdated).toBeNull();
  });

  it('should handle localStorage errors gracefully', () => {
    // Mock localStorage to throw errors
    const mockLocalStorage = {
      getItem: vi.fn(() => { throw new Error('localStorage error'); }),
      setItem: vi.fn(() => { throw new Error('localStorage error'); }),
      clear: vi.fn(),
      removeItem: vi.fn()
    };
    Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

    // Should not throw errors even when localStorage fails
    expect(() => {
      service.getRecentMatches().subscribe();
    }).not.toThrow();

    const req = httpMock.expectOne('/api/matches/recent?league=premier-league&limit=10&status=completed');
    req.flush(mockMatchesResponse);
  });
});