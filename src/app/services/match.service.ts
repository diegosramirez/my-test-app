import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError, timer } from 'rxjs';
import { catchError, retry, delay, switchMap, tap } from 'rxjs/operators';
import { Match, MatchesResponse } from '../models/match.interface';

@Injectable({
  providedIn: 'root'
})
export class MatchService {
  private readonly API_BASE_URL = '/api/matches';
  private readonly CACHE_KEY = 'premier_league_matches_cache';
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private circuitBreakerFailures = 0;
  private readonly circuitBreakerThreshold = 3;
  private circuitBreakerOpenUntil = 0;

  constructor(private http: HttpClient) {}

  getRecentMatches(): Observable<MatchesResponse> {
    // Check circuit breaker
    if (this.isCircuitBreakerOpen()) {
      return this.getFallbackData();
    }

    // Try to get from cache first
    const cachedData = this.getCachedData();
    if (cachedData) {
      // Only fetch fresh data in background if cache is getting stale (> 3 minutes old)
      const cached = localStorage.getItem(this.CACHE_KEY);
      if (cached) {
        const { timestamp } = JSON.parse(cached);
        const cacheAge = Date.now() - timestamp;
        if (cacheAge > 3 * 60 * 1000) { // 3 minutes
          this.fetchFreshData().subscribe();
        }
      }
      return of(cachedData);
    }

    return this.fetchFreshData();
  }

  private fetchFreshData(): Observable<MatchesResponse> {
    const params = {
      league: 'premier-league',
      limit: '10',
      status: 'completed'
    };

    return this.http.get<MatchesResponse>(`${this.API_BASE_URL}/recent`, { params })
      .pipe(
        retry({
          count: 3,
          delay: (error, retryCount) => {
            const backoffTime = Math.min(1000 * Math.pow(2, retryCount - 1), 10000);
            return timer(backoffTime);
          }
        }),
        tap(response => {
          this.setCachedData(response);
          this.resetCircuitBreaker();
        }),
        catchError(error => this.handleError(error))
      );
  }

  private handleError(error: HttpErrorResponse): Observable<MatchesResponse> {
    this.circuitBreakerFailures++;

    if (this.circuitBreakerFailures >= this.circuitBreakerThreshold) {
      this.circuitBreakerOpenUntil = Date.now() + 60000; // Open for 1 minute
    }

    // Try to return cached data as fallback
    const cachedData = this.getCachedData(true); // Allow stale cache
    if (cachedData) {
      return of(cachedData);
    }

    // If no cache available, return error
    return throwError(() => error);
  }

  private isCircuitBreakerOpen(): boolean {
    return Date.now() < this.circuitBreakerOpenUntil;
  }

  private resetCircuitBreaker(): void {
    this.circuitBreakerFailures = 0;
    this.circuitBreakerOpenUntil = 0;
  }

  private getCachedData(allowStale: boolean = false): MatchesResponse | null {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      if (!cached) return null;

      const { data, timestamp } = JSON.parse(cached);
      const isExpired = Date.now() - timestamp > this.CACHE_DURATION;

      if (isExpired && !allowStale) return null;

      return data as MatchesResponse;
    } catch {
      return null;
    }
  }

  private setCachedData(data: MatchesResponse): void {
    try {
      const cacheEntry = {
        data,
        timestamp: Date.now()
      };
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(cacheEntry));
    } catch {
      // Silently fail if localStorage is not available
    }
  }

  private getFallbackData(): Observable<MatchesResponse> {
    const cachedData = this.getCachedData(true);
    if (cachedData) {
      return of(cachedData);
    }

    // Return empty response with current timestamp
    return of({
      matches: [],
      lastUpdated: new Date().toISOString()
    });
  }

  getLastUpdatedTime(): string | null {
    const cachedData = this.getCachedData(true);
    return cachedData?.lastUpdated || null;
  }
}