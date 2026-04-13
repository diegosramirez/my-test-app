import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface AnalyticsEvent {
  eventName: string;
  properties: Record<string, any>;
  timestamp: Date;
  sessionId: string;
}

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private readonly API_BASE = '/api/analytics';
  private eventQueue: AnalyticsEvent[] = [];
  private isOnline = navigator.onLine;

  constructor(private http: HttpClient) {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.flushEventQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  trackStepStarted(stepNumber: number, stepName: string, sessionId: string): void {
    this.trackEvent('step_started', {
      step_number: stepNumber,
      step_name: stepName,
      session_id: sessionId
    }, sessionId);
  }

  trackStepCompleted(
    stepNumber: number,
    validationErrors: number,
    timeSpent: number,
    sessionId: string
  ): void {
    this.trackEvent('step_completed', {
      step_number: stepNumber,
      validation_errors: validationErrors,
      time_spent: timeSpent,
      session_id: sessionId
    }, sessionId);
  }

  trackWizardCompleted(
    totalTime: number,
    errorCount: number,
    completionPath: string,
    sessionId: string
  ): void {
    this.trackEvent('wizard_completed', {
      total_time: totalTime,
      error_count: errorCount,
      completion_path: completionPath,
      session_id: sessionId
    }, sessionId);
  }

  trackSessionRestored(
    stepNumber: number,
    dataAgeMinutes: number,
    sessionId: string
  ): void {
    this.trackEvent('session_restored', {
      step_number: stepNumber,
      data_age_minutes: dataAgeMinutes,
      session_id: sessionId
    }, sessionId);
  }

  trackContextualHelpUsed(
    fieldName: string,
    stepNumber: number,
    sessionId: string
  ): void {
    this.trackEvent('contextual_help_used', {
      field_name: fieldName,
      step_number: stepNumber,
      session_id: sessionId
    }, sessionId);
  }

  trackValidationFailed(
    fieldName: string,
    errorType: string,
    stepNumber: number,
    sessionId: string
  ): void {
    this.trackEvent('validation_failed', {
      field_name: fieldName,
      error_type: errorType,
      step_number: stepNumber,
      session_id: sessionId
    }, sessionId);
  }

  private trackEvent(eventName: string, properties: Record<string, any>, sessionId: string): void {
    const event: AnalyticsEvent = {
      eventName,
      properties,
      timestamp: new Date(),
      sessionId
    };

    if (this.isOnline) {
      this.sendEvent(event).subscribe({
        error: () => {
          // If sending fails, add to queue for retry
          this.eventQueue.push(event);
        }
      });
    } else {
      this.eventQueue.push(event);
    }
  }

  private sendEvent(event: AnalyticsEvent): Observable<any> {
    // Mock implementation for development - replace with actual API call
    console.log('Analytics Event:', event);

    return this.http.post(`${this.API_BASE}/track-event`, event).pipe(
      catchError(error => {
        console.warn('Analytics tracking failed:', error);
        return of(null);
      })
    );
  }

  private flushEventQueue(): void {
    const eventsToProcess = [...this.eventQueue];
    this.eventQueue = [];

    eventsToProcess.forEach(event => {
      this.sendEvent(event).subscribe({
        error: () => {
          // Put it back in the queue if it fails
          this.eventQueue.push(event);
        }
      });
    });
  }
}