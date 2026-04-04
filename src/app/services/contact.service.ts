import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, retry, delay, timeout } from 'rxjs/operators';
import { ContactFormData, FormSubmissionResponse } from '../interfaces/contact-form.interfaces';

/**
 * Service for handling contact form submissions
 * Includes retry logic, error handling, and network resilience
 */
@Injectable({
  providedIn: 'root'
})
export class ContactService {
  private readonly apiUrl = '/api/contact';
  private readonly requestTimeout = 10000; // 10 seconds
  private readonly maxRetries = 3;

  constructor(private http: HttpClient) {}

  /**
   * Submits contact form data to the server
   * @param formData The contact form data to submit
   * @returns Observable with the submission response
   */
  submitContactForm(formData: ContactFormData): Observable<FormSubmissionResponse> {
    // Create a clean copy of form data, removing empty optional fields
    const cleanedData: ContactFormData = {
      name: formData.name.trim(),
      email: formData.email.trim(),
      message: formData.message.trim()
    };

    // Only include phone if it has a value
    if (formData.phone && formData.phone.trim().length > 0) {
      cleanedData.phone = formData.phone.trim();
    }

    return this.http.post<FormSubmissionResponse>(this.apiUrl, cleanedData, {
      headers: {
        'Content-Type': 'application/json',
        // Add CSRF token if available
        ...(this.getCsrfToken() && { 'X-CSRF-Token': this.getCsrfToken()! })
      }
    }).pipe(
      timeout(this.requestTimeout),
      retry({
        count: this.maxRetries,
        delay: (error, retryIndex) => {
          // Exponential backoff: 1s, 2s, 4s
          const delayTime = Math.pow(2, retryIndex) * 1000;
          return of(error).pipe(delay(delayTime));
        }
      }),
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * Handles HTTP errors and provides user-friendly error messages
   * @param error The HTTP error response
   * @returns Observable error with formatted message
   */
  private handleError(error: HttpErrorResponse): Observable<FormSubmissionResponse> {
    let errorResponse: FormSubmissionResponse;

    if (error.error instanceof ErrorEvent) {
      // Client-side/network error
      errorResponse = {
        success: false,
        message: 'Unable to connect to the server. Please check your internet connection and try again.'
      };
    } else if (error.status === 0) {
      // Network error or CORS issue
      errorResponse = {
        success: false,
        message: 'Network error. Please check your connection and try again.'
      };
    } else if (error.status === 400) {
      // Validation errors from server
      errorResponse = {
        success: false,
        message: error.error?.message || 'Please check your input and try again.',
        errors: error.error?.errors || {}
      };
    } else if (error.status === 429) {
      // Rate limiting
      errorResponse = {
        success: false,
        message: 'Too many requests. Please wait a moment before trying again.'
      };
    } else if (error.status >= 500) {
      // Server error
      errorResponse = {
        success: false,
        message: 'Server error. Please try again later or contact support if the problem persists.'
      };
    } else if (error.message && error.message.includes('timeout')) {
      // Request timeout
      errorResponse = {
        success: false,
        message: 'Request timed out. Please try again.'
      };
    } else {
      // Other errors
      errorResponse = {
        success: false,
        message: `An error occurred: ${error.status}. Please try again.`
      };
    }

    return of(errorResponse);
  }

  /**
   * Gets CSRF token from meta tag or cookie
   * @returns CSRF token if available
   */
  private getCsrfToken(): string | null {
    // Try to get CSRF token from meta tag first
    const metaElement = document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement;
    if (metaElement) {
      return metaElement.content;
    }

    // Fallback to cookie-based CSRF token
    const match = document.cookie.match(/(?:^|;\s*)csrf-token=([^;]*)/);
    return match ? match[1] : null;
  }

  /**
   * Validates network connectivity
   * @returns Observable indicating if the network is available
   */
  checkNetworkStatus(): Observable<boolean> {
    return new Observable(observer => {
      if (!navigator.onLine) {
        observer.next(false);
        observer.complete();
        return;
      }

      // Try a lightweight request to check server connectivity
      const subscription = this.http.head(this.apiUrl, { timeout: 5000 }).pipe(
        catchError(() => of(false))
      ).subscribe({
        next: (result) => {
          // The result will be either the successful HTTP response object or false from catchError
          observer.next(typeof result !== 'boolean' || result === true);
          observer.complete();
        },
        error: () => {
          observer.next(false);
          observer.complete();
        }
      });

      // Return cleanup function
      return () => {
        subscription.unsubscribe();
      };
    });
  }

  /**
   * Simulates form submission for development/testing
   * Remove this method in production
   */
  simulateSubmission(formData: ContactFormData): Observable<FormSubmissionResponse> {
    // Simulate API delay
    return of({
      success: true,
      message: 'Thank you for your message! We\'ll get back to you soon.'
    }).pipe(delay(1000));
  }
}