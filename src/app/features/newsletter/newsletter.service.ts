import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, catchError, map } from 'rxjs';
import { NewsletterResult } from './newsletter.model';

@Injectable({ providedIn: 'root' })
export class NewsletterService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/newsletter/subscribe';
  private readonly storageKey = 'newsletter_subscribed';

  subscribe(email: string): Observable<NewsletterResult> {
    return this.http.post<{ message?: string }>(this.apiUrl, { email }).pipe(
      map(() => ({
        status: 'success' as const,
        message: "You're subscribed! Check your inbox for a welcome email.",
      })),
      catchError((error: HttpErrorResponse) => {
        if (error.status === 409) {
          return of({
            status: 'duplicate' as const,
            message: 'This email is already subscribed.',
          });
        }
        return of({
          status: 'error' as const,
          message: 'Something went wrong. Please try again.',
        });
      })
    );
  }

  isSubscribed(): boolean {
    return !!this.getStorageItem(this.storageKey);
  }

  setSubscribed(): void {
    this.setStorageItem(this.storageKey, 'true');
  }

  getStorageItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  setStorageItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      // localStorage unavailable
    }
  }
}
