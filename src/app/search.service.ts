import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry, map } from 'rxjs/operators';
import { SearchResult } from './search-result.interface';

@Injectable({
  providedIn: 'root'
})
export class SearchService {
  constructor(private http: HttpClient) {}

  search(query: string, endpoint: string): Observable<SearchResult[]> {
    if (!query.trim()) {
      return throwError(() => new Error('Query cannot be empty'));
    }

    const params = new HttpParams().set('q', query.trim());

    return this.http.get<{ results: SearchResult[] }>(endpoint, { params }).pipe(
      map(response => response.results),
      retry({ count: 1, delay: 1000 }),
      catchError(error => {
        // Handle different types of errors after retry attempts
        if (error.status === 0) {
          return throwError(() => new Error('Network error - please check your connection'));
        } else if (error.status >= 400 && error.status < 500) {
          return throwError(() => new Error('Invalid search request'));
        } else if (error.status >= 500) {
          return throwError(() => new Error('Server error - please try again later'));
        }
        return throwError(() => new Error('Search failed - please try again'));
      })
    );
  }
}