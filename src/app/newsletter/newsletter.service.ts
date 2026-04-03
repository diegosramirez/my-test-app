import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { delay, map, catchError } from 'rxjs/operators';
import {
  NewsletterSubscription,
  NewsletterSubmissionResult,
  NewsletterValidationError,
  NewsletterTrackingEvent
} from './newsletter.interface';

@Injectable({
  providedIn: 'root'
})
export class NewsletterService {
  private readonly STORAGE_KEY = 'newsletter_subscriptions';
  private readonly MAX_EMAIL_LENGTH = 254;
  private subscriptionsSubject = new BehaviorSubject<NewsletterSubscription[]>([]);

  public subscriptions$ = this.subscriptionsSubject.asObservable();

  constructor() {
    this.loadSubscriptionsFromStorage();
  }

  /**
   * Subscribe a new email address to the newsletter
   */
  subscribe(email: string): Observable<NewsletterSubmissionResult> {
    const trimmedEmail = email.trim().toLowerCase();

    // Validate email format
    const validationError = this.validateEmail(trimmedEmail);
    if (validationError) {
      this.trackEvent('newsletter_validation_error', {
        error_type: validationError.type,
        email_format: this.getEmailDomain(trimmedEmail)
      });
      return throwError(() => validationError);
    }

    // Check for duplicates
    const existingSubscription = this.findExistingSubscription(trimmedEmail);
    if (existingSubscription) {
      this.trackEvent('newsletter_duplicate_attempt', {
        existing_subscription_date: existingSubscription.timestamp
      });
      return of({
        success: true,
        isDuplicate: true,
        message: `Great! ${trimmedEmail} is already subscribed to our newsletter.`,
        subscription: existingSubscription
      });
    }

    // Simulate async operation with delay
    return of(null).pipe(
      delay(800), // Realistic loading time
      map(() => {
        const subscription: NewsletterSubscription = {
          id: this.generateId(),
          email: trimmedEmail,
          timestamp: new Date().toISOString(),
          status: 'active'
        };

        const success = this.saveSubscription(subscription);
        if (!success) {
          throw new Error('Failed to save subscription');
        }

        this.trackEvent('newsletter_subscription_success', {
          email_domain: this.getEmailDomain(trimmedEmail),
          submission_method: 'form'
        });

        return {
          success: true,
          message: `Welcome! You've successfully subscribed with ${trimmedEmail}.`,
          subscription
        };
      }),
      catchError((error) => {
        const storageError: NewsletterValidationError = {
          type: 'storage',
          message: 'Unable to save your subscription. Please try again.'
        };
        return throwError(() => storageError);
      })
    );
  }

  /**
   * Get all subscriptions from local storage
   */
  getSubscriptions(): NewsletterSubscription[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error reading subscriptions from storage:', error);
      return [];
    }
  }

  /**
   * Check if an email is already subscribed
   */
  isSubscribed(email: string): boolean {
    return this.findExistingSubscription(email.trim().toLowerCase()) !== null;
  }

  /**
   * Validate email format and constraints
   */
  validateEmail(email: string): NewsletterValidationError | null {
    if (!email || email.trim().length === 0) {
      return {
        type: 'required',
        message: 'Email address is required.'
      };
    }

    if (email.length > this.MAX_EMAIL_LENGTH) {
      return {
        type: 'email',
        message: 'Email address is too long.'
      };
    }

    const emailPattern = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!emailPattern.test(email)) {
      return {
        type: 'email',
        message: 'Please enter a valid email address.'
      };
    }

    return null;
  }

  /**
   * Track analytics events for newsletter interactions
   */
  private trackEvent(eventName: string, properties: Record<string, any>): void {
    const event: NewsletterTrackingEvent = {
      eventName,
      properties: {
        ...properties,
        user_session_id: this.getSessionId(),
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    };

    // In a real app, this would send to analytics service
    console.log('Newsletter Event:', event);
  }

  /**
   * Load subscriptions from localStorage on service initialization
   */
  private loadSubscriptionsFromStorage(): void {
    const subscriptions = this.getSubscriptions();
    this.subscriptionsSubject.next(subscriptions);
  }

  /**
   * Save a new subscription to localStorage
   */
  private saveSubscription(subscription: NewsletterSubscription): boolean {
    try {
      const currentSubscriptions = this.getSubscriptions();
      const updatedSubscriptions = [...currentSubscriptions, subscription];

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedSubscriptions));
      this.subscriptionsSubject.next(updatedSubscriptions);

      return true;
    } catch (error) {
      console.error('Error saving subscription to storage:', error);
      return false;
    }
  }

  /**
   * Find existing subscription by email
   */
  private findExistingSubscription(email: string): NewsletterSubscription | null {
    const subscriptions = this.getSubscriptions();
    return subscriptions.find(sub =>
      sub.email === email && sub.status === 'active'
    ) || null;
  }

  /**
   * Extract domain from email for analytics
   */
  private getEmailDomain(email: string): string {
    const parts = email.split('@');
    return parts.length > 1 ? parts[1] : 'unknown';
  }

  /**
   * Generate unique ID for subscriptions
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }

  /**
   * Get or create session ID for tracking
   */
  private getSessionId(): string {
    const SESSION_KEY = 'newsletter_session_id';
    let sessionId = sessionStorage.getItem(SESSION_KEY);

    if (!sessionId) {
      sessionId = this.generateId();
      sessionStorage.setItem(SESSION_KEY, sessionId);
    }

    return sessionId;
  }
}