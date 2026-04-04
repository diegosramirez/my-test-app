import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, timer } from 'rxjs';
import { retry, catchError, mergeMap } from 'rxjs/operators';
import { ContactFormData, ContactSubmissionResponse } from './contact-form.interfaces';

@Injectable({
  providedIn: 'root'
})
export class ContactService {
  private readonly API_BASE_URL = '/api';
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly RETRY_DELAY_MS = 1000;

  constructor(private http: HttpClient) {}

  submitContactForm(formData: ContactFormData): Observable<ContactSubmissionResponse> {
    return this.http.post<ContactSubmissionResponse>(`${this.API_BASE_URL}/contact`, formData)
      .pipe(
        retry({
          count: this.MAX_RETRY_ATTEMPTS,
          delay: (error: HttpErrorResponse, retryCount: number) => {
            // Only retry on network errors or 5xx server errors
            if (error.status >= 500 || error.status === 0) {
              return timer(this.RETRY_DELAY_MS * Math.pow(2, retryCount - 1)); // Exponential backoff
            }
            // Don't retry on client errors (4xx)
            return throwError(() => error);
          }
        }),
        catchError(this.handleError)
      );
  }

  private handleError = (error: HttpErrorResponse): Observable<never> => {
    let errorMessage = 'An unexpected error occurred. Please try again.';

    if (error.error instanceof ErrorEvent) {
      // Client-side or network error
      errorMessage = 'Network error. Please check your connection and try again.';
    } else {
      // Server-side error
      switch (error.status) {
        case 400:
          errorMessage = 'Please check your form data and try again.';
          break;
        case 429:
          errorMessage = 'Too many requests. Please wait a moment and try again.';
          break;
        case 500:
          errorMessage = 'Server error. We\'re working to fix this issue.';
          break;
        case 0:
          errorMessage = 'Unable to connect to the server. Please check your internet connection.';
          break;
      }
    }

    return throwError(() => new Error(errorMessage));
  };
}