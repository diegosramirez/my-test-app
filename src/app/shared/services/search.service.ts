import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, of, throwError, timer } from 'rxjs';
import { catchError, retry, retryWhen, switchMap, delay, take, tap, map } from 'rxjs/operators';
import { SearchResult, SearchResponse, SearchOptions } from '../interfaces/search-result.interface';
import { SearchError, SearchErrorType } from '../interfaces/search-error.interface';

interface CachedResult<T> {
  data: SearchResponse<T>;
  timestamp: number;
  ttl: number;
}

@Injectable({
  providedIn: 'root'
})
export class SearchService {
  private cache = new Map<string, CachedResult<any>>();
  private readonly defaultCacheTtl = 5 * 60 * 1000; // 5 minutes

  constructor(private http: HttpClient) {}

  search<T>(
    searchFn: (query: string, signal?: AbortSignal) => Observable<SearchResponse<T>>,
    query: string,
    options: SearchOptions = {},
    signal?: AbortSignal
  ): Observable<SearchResponse<T> & { cacheHit: boolean }> {
    const cacheKey = this.generateCacheKey(query, options);

    // Check cache first
    const cacheResult = this.getCachedResultWithStatus<T>(cacheKey);
    if (cacheResult.data) {
      return of({ ...cacheResult.data, cacheHit: cacheResult.cacheHit });
    }

    return searchFn(query, signal).pipe(
      retry({
        count: 3,
        delay: (error, retryCount) => this.calculateRetryDelay(error, retryCount)
      }),
      tap(response => this.setCachedResult(cacheKey, response, options.cacheTimeout)),
      map(response => ({ ...response, cacheHit: false })),
      catchError(error => this.handleSearchError(error))
    );
  }

  // Generic mock search for demo purposes
  mockSearch<T>(items: T[], displayField: keyof T, idField: keyof T) {
    return (query: string, signal?: AbortSignal): Observable<SearchResponse<T>> => {
      // Simulate network delay
      return timer(Math.random() * 300 + 100).pipe(
        switchMap(() => {
          if (signal?.aborted) {
            return throwError(() => new Error('Request cancelled'));
          }

          const lowerQuery = query.toLowerCase();
          const filteredItems = items.filter(item =>
            String(item[displayField]).toLowerCase().includes(lowerQuery)
          );

          const results: SearchResult<T>[] = filteredItems.map(item => ({
            id: String(item[idField]),
            displayValue: String(item[displayField]),
            data: item
          }));

          return of({
            results,
            totalCount: results.length,
            query
          });
        }),
        take(1)
      );
    };
  }

  clearCache(): void {
    this.cache.clear();
  }

  private generateCacheKey(query: string, options: SearchOptions): string {
    return `${query}_${JSON.stringify(options)}`;
  }

  private getCachedResult<T>(cacheKey: string): SearchResponse<T> | null {
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }

    if (cached) {
      this.cache.delete(cacheKey);
    }

    return null;
  }

  private getCachedResultWithStatus<T>(cacheKey: string): { data: SearchResponse<T> | null; cacheHit: boolean } {
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return { data: cached.data, cacheHit: true };
    }

    if (cached) {
      this.cache.delete(cacheKey);
    }

    return { data: null, cacheHit: false };
  }

  private setCachedResult<T>(
    cacheKey: string,
    data: SearchResponse<T>,
    customTtl?: number
  ): void {
    const ttl = customTtl || this.defaultCacheTtl;
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  private calculateRetryDelay(error: any, retryCount: number): Observable<any> {
    const baseDelay = 1000; // 1 second
    const maxDelay = 10000; // 10 seconds
    const exponentialDelay = Math.min(baseDelay * Math.pow(2, retryCount - 1), maxDelay);

    return timer(exponentialDelay);
  }

  private handleSearchError(error: any): Observable<never> {
    let searchError: SearchError;
    const timestamp = new Date();

    if (error instanceof HttpErrorResponse) {
      switch (error.status) {
        case 0:
        case -1:
          searchError = {
            type: SearchErrorType.NETWORK_ERROR,
            message: 'Network connection error. Please check your internet connection and try again.',
            retryCount: 0,
            canRetry: true,
            originalError: error,
            timestamp
          };
          break;
        case 408:
        case 504:
          searchError = {
            type: SearchErrorType.TIMEOUT,
            message: 'Request timed out. Please try again.',
            retryCount: 0,
            canRetry: true,
            originalError: error,
            timestamp
          };
          break;
        case 429:
          searchError = {
            type: SearchErrorType.RATE_LIMITED,
            message: 'Too many requests. Please wait a moment and try again.',
            retryCount: 0,
            canRetry: true,
            originalError: error,
            timestamp
          };
          break;
        case 400:
          searchError = {
            type: SearchErrorType.INVALID_QUERY,
            message: 'Invalid search query. Please modify your search and try again.',
            retryCount: 0,
            canRetry: false,
            originalError: error,
            timestamp
          };
          break;
        case 500:
        case 502:
        case 503:
          searchError = {
            type: SearchErrorType.SERVER_ERROR,
            message: 'Server error occurred. Please try again in a few moments.',
            retryCount: 0,
            canRetry: true,
            originalError: error,
            timestamp
          };
          break;
        default:
          searchError = {
            type: SearchErrorType.UNKNOWN,
            message: 'An unexpected error occurred. Please try again.',
            retryCount: 0,
            canRetry: true,
            originalError: error,
            timestamp
          };
      }
    } else {
      searchError = {
        type: SearchErrorType.UNKNOWN,
        message: error.message || 'An unexpected error occurred. Please try again.',
        retryCount: 0,
        canRetry: true,
        originalError: error,
        timestamp
      };
    }

    return throwError(() => searchError);
  }
}