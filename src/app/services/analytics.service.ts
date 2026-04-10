import { Injectable, inject, DestroyRef } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { environment } from '../../environments/environment';

export interface AnalyticsEvent {
  eventName: string;
  properties?: Record<string, any>;
}

export interface UserIdentity {
  distinctId: string;
  properties?: Record<string, any>;
}

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private posthog: any = null;
  private initialized = false;
  private eventQueue: AnalyticsEvent[] = [];
  private retryAttempts = 3;
  private retryDelay = 1000;
  private destroyRef = inject(DestroyRef);

  constructor(private router: Router) {
    this.initializePostHog();
    this.setupAutoPageTracking();
  }

  private async initializePostHog(): Promise<void> {
    if (!environment.posthog.enabled) {
      console.log('Analytics disabled in environment');
      return;
    }

    try {
      const startTime = Date.now();

      // Dynamic import for performance optimization
      const { default: posthog } = await import('posthog-js');

      posthog.init(environment.posthog.key, {
        api_host: environment.posthog.host,
        debug: environment.posthog.debug || false,
        capture_pageview: false, // We'll handle this manually
        capture_pageleave: true,
        loaded: () => {
          const loadTime = Date.now() - startTime;
          this.initialized = true;
          this.posthog = posthog;

          // Track initialization success
          this.trackEvent('analytics_initialized', {
            success_status: true,
            load_time: loadTime
          });

          // Process queued events
          this.processEventQueue();
        }
      });
    } catch (error) {
      console.error('Failed to initialize PostHog:', error);
      this.trackError('initialization_failed', error);
    }
  }

  private setupAutoPageTracking(): void {
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((event: NavigationEnd) => {
        this.trackPageView(event.urlAfterRedirects);
      });
  }

  trackPageView(path?: string): void {
    const currentPath = path || this.router.url;

    if (this.initialized && this.posthog) {
      const properties = {
        path: currentPath,
        referrer: document.referrer,
        timestamp: new Date().toISOString()
      };

      try {
        this.posthog.capture('$pageview', properties);
      } catch (error) {
        this.handleTrackingError('pageview_failed', error, '$pageview', properties);
      }
    } else {
      // Queue for later processing
      this.eventQueue.push({
        eventName: '$pageview',
        properties: {
          path: currentPath,
          referrer: document.referrer,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  trackEvent(eventName: string, properties?: Record<string, any>): void {
    if (this.initialized && this.posthog) {
      try {
        const eventProperties = {
          ...properties,
          timestamp: new Date().toISOString()
        };
        this.posthog.capture(eventName, eventProperties);
      } catch (error) {
        const eventProperties = {
          ...properties,
          timestamp: new Date().toISOString()
        };
        this.handleTrackingError('event_failed', error, eventName, eventProperties);
      }
    } else {
      // Queue for later processing
      this.eventQueue.push({
        eventName,
        properties: {
          ...properties,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  identify(user: UserIdentity): void {
    if (this.initialized && this.posthog) {
      try {
        this.posthog.identify(user.distinctId, user.properties);
      } catch (error) {
        this.handleTrackingError('identify_failed', error);
      }
    }
  }

  reset(): void {
    if (this.initialized && this.posthog) {
      try {
        this.posthog.reset();
      } catch (error) {
        this.handleTrackingError('reset_failed', error);
      }
    }
  }

  private processEventQueue(): void {
    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift();
      if (event) {
        if (event.eventName === '$pageview') {
          this.trackPageView(event.properties?.['path']);
        } else {
          this.trackEvent(event.eventName, event.properties);
        }
      }
    }
  }

  private handleTrackingError(errorType: string, error: any, eventName?: string, eventProperties?: Record<string, any>): void {
    console.warn(`Analytics tracking error (${errorType}):`, error);

    // Track the error itself for monitoring
    this.trackError(errorType, error, { eventName });

    // Implement retry logic for network failures
    if (this.isNetworkError(error) && eventName) {
      this.retryEvent(eventName, eventProperties, errorType);
    }
  }

  private trackError(errorType: string, error: any, additionalData?: Record<string, any>): void {
    try {
      if (this.initialized && this.posthog) {
        this.posthog.capture('analytics_error', {
          error_type: errorType,
          error_message: error?.message || 'Unknown error',
          retry_count: 0,
          timestamp: new Date().toISOString(),
          ...additionalData
        });
      }
    } catch (e) {
      // Fail silently for error tracking to prevent infinite loops
      console.error('Failed to track error:', e);
    }
  }

  private isNetworkError(error: any): boolean {
    return error?.message?.includes('network') ||
           error?.message?.includes('fetch') ||
           error?.name === 'NetworkError' ||
           error?.code === 'NETWORK_ERROR';
  }

  private async retryEvent(eventName: string, eventProperties: Record<string, any> | undefined, errorType: string, attempt: number = 1): Promise<void> {
    if (attempt > this.retryAttempts) {
      console.warn(`Max retry attempts reached for event: ${eventName}`);
      return;
    }

    await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));

    try {
      if (this.initialized && this.posthog) {
        // Retry the original event with its properties
        this.posthog.capture(eventName, eventProperties);

        // Track successful retry
        this.posthog.capture('analytics_error', {
          error_type: errorType,
          retry_count: attempt,
          eventName,
          status: 'retry_success',
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      // Track failed retry attempt
      try {
        if (this.initialized && this.posthog) {
          this.posthog.capture('analytics_error', {
            error_type: errorType,
            retry_count: attempt,
            eventName,
            status: 'retry_failed',
            timestamp: new Date().toISOString()
          });
        }
      } catch (e) {
        // Fail silently to prevent infinite loops
      }

      // Continue retrying
      this.retryEvent(eventName, eventProperties, errorType, attempt + 1);
    }
  }

  // Getter for testing purposes
  get isInitialized(): boolean {
    return this.initialized;
  }

  get queueLength(): number {
    return this.eventQueue.length;
  }
}