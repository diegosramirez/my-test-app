import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, timer, of } from 'rxjs';
import { catchError, retry, timeout, map, retryWhen, mergeMap, finalize } from 'rxjs/operators';
import { FootballData, ApiResponse, ApiError } from '../interfaces/football-data.interface';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class FootballDataService {
  private generateUUID(): string {
    // Fallback UUID implementation for browser compatibility
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }

    // Fallback implementation
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
  private readonly baseUrl = environment.apiBaseUrl;
  private readonly apiKey = environment.apiKey;
  private readonly defaultTimeout = 10000; // 10 seconds
  private readonly maxRetries = environment.scheduler.maxRetries;
  private rateLimitRemaining = 100;
  private consecutiveFailures = 0;
  private lastSuccessfulFetch = 0;
  private totalRequests = 0;
  private successfulRequests = 0;

  constructor(private http: HttpClient) {}

  fetchCompetitionData(competitionId: string = 'PL'): Observable<ApiResponse<FootballData>> {
    const startTime = Date.now();
    this.totalRequests++;

    const headers = new HttpHeaders({
      'X-Auth-Token': this.apiKey,
      'X-Response-Control': 'minified'
    });

    const url = `${this.baseUrl}/competitions/${competitionId}/matches`;

    return this.http.get<any>(url, { headers, observe: 'response' })
      .pipe(
        timeout(this.defaultTimeout),
        map(response => {
          this.updateRateLimiting(response.headers);
          const responseTime = Date.now() - startTime;

          const footballData: FootballData = {
            id: `${competitionId}-${Date.now()}-${this.generateUUID()}`,
            competition: response.body.competition?.name || 'Premier League',
            season: response.body.season?.startDate || new Date().getFullYear().toString(),
            matchday: response.body.season?.currentMatchday || 1,
            matches: response.body.matches || [],
            lastUpdated: new Date().toISOString()
          };

          this.consecutiveFailures = 0;
          this.lastSuccessfulFetch = Date.now();
          this.successfulRequests++;

          return {
            data: footballData,
            status: response.status,
            timestamp: Date.now()
          } as ApiResponse<FootballData>;
        }),
        retryWhen(errors => this.exponentialBackoff(errors)),
        catchError(error => this.handleError(error)),
        finalize(() => {
          // Track performance metrics
          console.log(`API call completed in ${Date.now() - startTime}ms`);
        })
      );
  }

  getHealthMetrics() {
    return {
      responseTime: 0, // This would be calculated from recent requests
      successRate: this.totalRequests > 0 ? (this.successfulRequests / this.totalRequests) * 100 : 0,
      lastSuccessfulFetch: this.lastSuccessfulFetch,
      rateLimitRemaining: this.rateLimitRemaining,
      consecutiveFailures: this.consecutiveFailures,
      totalRequests: this.totalRequests,
      successfulRequests: this.successfulRequests
    };
  }

  private exponentialBackoff(errors: Observable<any>): Observable<any> {
    return errors.pipe(
      mergeMap((error, index) => {
        const retryAttempt = index + 1;

        if (retryAttempt > this.maxRetries) {
          return throwError(() => error);
        }

        if (error.status === 429) { // Rate limit exceeded
          const retryAfter = parseInt(error.headers?.get('Retry-After') || '60', 10) * 1000;
          return timer(retryAfter);
        }

        if (error.status >= 500) { // Server errors
          const backoffDelay = Math.min(1000 * Math.pow(2, retryAttempt), 30000);
          return timer(backoffDelay);
        }

        // Don't retry client errors (4xx except 429)
        return throwError(() => error);
      })
    );
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    this.consecutiveFailures++;

    let apiError: ApiError;

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      apiError = {
        status: 0,
        message: `Network error: ${error.error.message}`,
        timestamp: Date.now()
      };
    } else {
      // Server-side error
      apiError = {
        status: error.status,
        message: error.error?.message || `HTTP ${error.status}: ${error.statusText}`,
        timestamp: Date.now(),
        retryAfter: error.headers?.get('Retry-After')
          ? parseInt(error.headers.get('Retry-After') || '60', 10) * 1000
          : undefined
      };
    }

    console.error('Football API Error:', apiError);
    return throwError(() => apiError);
  }

  private updateRateLimiting(headers: any): void {
    const remaining = headers.get('X-RateLimit-Remaining');
    if (remaining !== null) {
      this.rateLimitRemaining = parseInt(remaining, 10);
    }
  }

  isRateLimited(): boolean {
    return this.rateLimitRemaining <= 5; // Conservative threshold
  }

  canMakeRequest(): boolean {
    return !this.isRateLimited() && this.consecutiveFailures < 5;
  }
}