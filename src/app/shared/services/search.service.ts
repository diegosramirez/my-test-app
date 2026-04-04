import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, timer } from 'rxjs';
import { catchError, retryWhen, mergeMap, take } from 'rxjs/operators';
import { SearchResponse, ApiError } from '../models/search.models';

@Injectable({
  providedIn: 'root'
})
export class SearchService {
  private readonly apiUrl = '/api/search';
  private readonly minQueryLength = 2;
  private readonly maxRetries = 3;

  constructor(private http: HttpClient) {}

  search(query: string): Observable<SearchResponse> {
    if (!this.isValidQuery(query)) {
      return throwError(() => new Error('Query must be at least 2 characters long'));
    }

    const sanitizedQuery = this.sanitizeQuery(query);

    return this.http.get<SearchResponse>(this.apiUrl, {
      params: { q: sanitizedQuery }
    }).pipe(
      retryWhen(errors =>
        errors.pipe(
          mergeMap((error: HttpErrorResponse, index) => {
            if (index >= this.maxRetries || error.status >= 400 && error.status < 500) {
              return throwError(() => error);
            }

            // Exponential backoff: 300ms, 600ms, 1200ms
            const delay = Math.pow(2, index) * 300;
            return timer(delay);
          }),
          take(this.maxRetries + 1)
        )
      ),
      catchError(this.handleError.bind(this))
    );
  }

  private isValidQuery(query: string): boolean {
    return query && query.trim().length >= this.minQueryLength;
  }

  private sanitizeQuery(query: string): string {
    return query.trim().replace(/[<>\"']/g, '');
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage: string;
    let errorCode: number;

    if (error.status === 0) {
      errorMessage = 'Network connection error. Please check your internet connection.';
      errorCode = 0;
    } else if (error.status >= 400 && error.status < 500) {
      errorMessage = error.error?.error || 'Invalid search query. Please try again.';
      errorCode = error.status;
    } else if (error.status >= 500) {
      errorMessage = 'Server error. Please try again later.';
      errorCode = error.status;
    } else {
      errorMessage = 'An unexpected error occurred. Please try again.';
      errorCode = -1;
    }

    const apiError: ApiError = {
      error: errorMessage,
      code: errorCode
    };

    return throwError(() => apiError);
  }
}