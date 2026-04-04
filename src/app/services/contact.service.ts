import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, timer } from 'rxjs';
import { retry, catchError, timeout, switchMap } from 'rxjs/operators';
import { ContactFormData, ContactSubmissionResponse } from '../models/contact-form.models';

@Injectable({
  providedIn: 'root'
})
export class ContactService {
  private readonly apiUrl = '/api/contact';
  private readonly maxRetries = 3;
  private readonly requestTimeout = 30000; // 30 seconds

  constructor(private http: HttpClient) {}

  submitContactForm(formData: ContactFormData): Observable<ContactSubmissionResponse> {
    return this.http.post<ContactSubmissionResponse>(this.apiUrl, formData).pipe(
      timeout(this.requestTimeout),
      retry({
        count: this.maxRetries,
        delay: (error, retryIndex) => {
          // Exponential backoff: 1s, 2s, 4s
          const delayTime = Math.pow(2, retryIndex) * 1000;
          return timer(delayTime);
        }
      }),
      catchError(this.handleError.bind(this))
    );
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An unexpected error occurred. Please try again.';
    let userFriendlyMessage = errorMessage;

    if (error.error instanceof ErrorEvent) {
      // Client-side or network error
      errorMessage = `Network error: ${error.error.message}`;
      userFriendlyMessage = 'Connection failed. Please check your internet connection and try again.';
    } else {
      // Backend returned an unsuccessful response code
      switch (error.status) {
        case 400:
          userFriendlyMessage = 'Please check your form data and try again.';
          errorMessage = `Validation error: ${error.error?.message || 'Invalid form data'}`;
          break;
        case 429:
          userFriendlyMessage = 'Too many requests. Please wait a moment before trying again.';
          errorMessage = 'Rate limit exceeded';
          break;
        case 500:
          userFriendlyMessage = 'Server error. Please try again in a few moments.';
          errorMessage = `Server error: ${error.error?.message || 'Internal server error'}`;
          break;
        case 0:
        case 408:
          userFriendlyMessage = 'Request timeout. Please check your connection and try again.';
          errorMessage = 'Request timeout or network unavailable';
          break;
        default:
          errorMessage = `HTTP ${error.status}: ${error.error?.message || error.message}`;
      }
    }

    // Log technical details for debugging
    console.error('Contact form submission error:', {
      status: error.status,
      message: errorMessage,
      error: error.error,
      url: error.url
    });

    // Return user-friendly error
    return throwError(() => ({
      userMessage: userFriendlyMessage,
      technicalMessage: errorMessage,
      status: error.status,
      retryable: this.isRetryableError(error.status)
    }));
  }

  private isRetryableError(status: number): boolean {
    // Retry on network errors, timeouts, and server errors
    // Don't retry on client errors (400-499 range except 408 and 429)
    return status === 0 ||
           status === 408 ||
           status === 429 ||
           (status >= 500 && status < 600);
  }
}