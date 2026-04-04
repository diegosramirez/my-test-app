import { Injectable } from '@angular/core';
import { ContactFormAnalytics } from '../models/contact-form.models';

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private startTime: number | null = null;

  constructor() {}

  trackEvent(eventName: string, properties: ContactFormAnalytics): void {
    // In a real application, this would integrate with your analytics provider
    // (e.g., Google Analytics, Segment, Mixpanel, etc.)

    const event = {
      event: eventName,
      timestamp: Date.now(),
      ...properties
    };

    // Log to console for development
    console.log('Analytics Event:', event);

    // Example integration with a hypothetical analytics service:
    // this.sendToAnalyticsProvider(event);

    // Store in sessionStorage for tracking purposes in demo
    try {
      const existingEvents = JSON.parse(sessionStorage.getItem('analytics-events') || '[]');
      existingEvents.push(event);
      sessionStorage.setItem('analytics-events', JSON.stringify(existingEvents));
    } catch (error) {
      console.warn('Failed to store analytics event:', error);
    }
  }

  startFormSession(): void {
    this.startTime = Date.now();
    this.trackEvent('contact_form_viewed', {
      pageUrl: window.location.href,
      userType: 'visitor' // This could be determined based on authentication status
    });
  }

  trackValidationError(fieldName: string, errorType: string): void {
    this.trackEvent('form_validation_error', {
      pageUrl: window.location.href,
      userType: 'visitor',
      fieldName,
      errorType
    });
  }

  trackFormSubmission(retryCount: number): void {
    const completionTime = this.startTime ? Date.now() - this.startTime : 0;

    this.trackEvent('contact_form_submitted', {
      pageUrl: window.location.href,
      userType: 'visitor',
      completionTime,
      retryCount
    });
  }

  trackFormAbandonment(fieldsCompleted: string[]): void {
    const timeSpent = this.startTime ? Date.now() - this.startTime : 0;

    this.trackEvent('form_abandoned', {
      pageUrl: window.location.href,
      userType: 'visitor',
      fieldsCompleted,
      timeSpent
    });
  }

  trackFormSuccess(submissionId: string): void {
    this.trackEvent('contact_form_success', {
      pageUrl: window.location.href,
      userType: 'visitor',
      submissionId,
      userFeedback: 'positive' // Could be collected via additional UI
    });
  }

  getFormCompletionRate(): number {
    try {
      const events = JSON.parse(sessionStorage.getItem('analytics-events') || '[]');
      const viewedEvents = events.filter((e: any) => e.event === 'contact_form_viewed');
      const successEvents = events.filter((e: any) => e.event === 'contact_form_success');

      if (viewedEvents.length === 0) return 0;
      return (successEvents.length / viewedEvents.length) * 100;
    } catch {
      return 0;
    }
  }

  getAnalyticsReport(): any {
    try {
      const events = JSON.parse(sessionStorage.getItem('analytics-events') || '[]');

      return {
        totalViews: events.filter((e: any) => e.event === 'contact_form_viewed').length,
        totalSubmissions: events.filter((e: any) => e.event === 'contact_form_submitted').length,
        totalSuccesses: events.filter((e: any) => e.event === 'contact_form_success').length,
        totalAbandonments: events.filter((e: any) => e.event === 'form_abandoned').length,
        validationErrors: events.filter((e: any) => e.event === 'form_validation_error'),
        completionRate: this.getFormCompletionRate(),
        events
      };
    } catch {
      return { error: 'Unable to generate analytics report' };
    }
  }
}