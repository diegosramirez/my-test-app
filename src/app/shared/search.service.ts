import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, of, throwError, timer } from 'rxjs';
import { catchError, retryWhen, switchMap, take, tap } from 'rxjs/operators';
import { SearchRequest, SearchResponse, SearchError, SearchConfig } from './search.interface';

@Injectable({
  providedIn: 'root'
})
export class SearchService {
  private readonly defaultConfig: SearchConfig = {
    debounceMs: 300,
    maxRetries: 3,
    endpoint: '/api/search',
    resultLimit: 10,
    minQueryLength: 1
  };

  private cache = new Map<string, { data: SearchResponse; timestamp: number }>();
  private readonly cacheExpiryMs = 5 * 60 * 1000; // 5 minutes

  constructor(private http: HttpClient) {}

  search(request: SearchRequest, config: Partial<SearchConfig> = {}): Observable<SearchResponse> {
    const mergedConfig = { ...this.defaultConfig, ...config };

    // Check cache first
    const cacheKey = this.getCacheKey(request);
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiryMs) {
      return of(cached.data);
    }

    // Build query parameters
    let params = new HttpParams()
      .set('q', request.query)
      .set('limit', (request.limit || mergedConfig.resultLimit).toString());

    if (request.offset) {
      params = params.set('offset', request.offset.toString());
    }

    if (request.filters) {
      Object.entries(request.filters).forEach(([key, value]) => {
        if (value != null) {
          params = params.set(key, String(value));
        }
      });
    }

    return this.http.get<SearchResponse>(mergedConfig.endpoint, { params }).pipe(
      tap(response => this.setCache(cacheKey, response)),
      retryWhen(errors =>
        errors.pipe(
          switchMap((error, retryIndex) => {
            if (retryIndex >= mergedConfig.maxRetries) {
              return throwError(() => new SearchError(
                `Search failed after ${mergedConfig.maxRetries} attempts: ${error.message}`,
                retryIndex,
                error,
                this.getErrorCode(error)
              ));
            }

            // Exponential backoff: 200ms, 400ms, 800ms
            const delayMs = 200 * Math.pow(2, retryIndex);
            return timer(delayMs);
          }),
          take(mergedConfig.maxRetries)
        )
      ),
      catchError(error => {
        // Clear cache on error to ensure fresh data on next attempt
        this.cache.delete(cacheKey);

        if (error instanceof SearchError) {
          return throwError(() => error);
        }

        return throwError(() => new SearchError(
          this.getErrorMessage(error),
          0,
          error,
          this.getErrorCode(error)
        ));
      })
    );
  }

  clearCache(): void {
    this.cache.clear();
  }

  private getCacheKey(request: SearchRequest): string {
    return JSON.stringify({
      query: request.query.toLowerCase().trim(),
      limit: request.limit,
      offset: request.offset,
      filters: request.filters
    });
  }

  private setCache(key: string, data: SearchResponse): void {
    // Limit cache size to prevent memory leaks
    if (this.cache.size >= 50) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      switch (error.status) {
        case 0:
          return 'Network connection error. Please check your internet connection.';
        case 400:
          return 'Invalid search request. Please try a different query.';
        case 404:
          return 'Search service not found.';
        case 429:
          return 'Too many requests. Please wait a moment before searching again.';
        case 500:
          return 'Server error occurred. Please try again later.';
        default:
          return `Search failed with status ${error.status}: ${error.message}`;
      }
    }

    if (error instanceof Error) {
      return error.message;
    }

    return 'An unexpected error occurred while searching.';
  }

  private getErrorCode(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      return `HTTP_${error.status}`;
    }

    if (error instanceof Error) {
      return error.name;
    }

    return 'UNKNOWN_ERROR';
  }
}