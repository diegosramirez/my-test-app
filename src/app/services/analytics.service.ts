import { Injectable } from '@angular/core';

export interface AnalyticsEvent {
  fixture_count?: number;
  load_time?: number;
  accuracy_available?: boolean;
  match_id?: number;
  prediction_confidence?: string;
  user_action?: string;
  predicted_probability?: number;
  actual_outcome?: string;
  refresh_type?: string;
  calculation_time?: number;
}

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private eventQueue: Array<{ event: string; properties: AnalyticsEvent; timestamp: Date }> = [];

  constructor() {}

  trackEvent(eventName: string, properties: AnalyticsEvent): void {
    const event = {
      event: eventName,
      properties: {
        ...properties,
        timestamp: Date.now()
      },
      timestamp: new Date()
    };

    this.eventQueue.push(event);
    this.logEvent(event); // For development - replace with real analytics service

    // In a real implementation, you would batch and send these to your analytics service
    this.processBatchIfReady();
  }

  trackPredictionAccuracy(matchId: number, predictedProbability: number, actualOutcome: string): void {
    this.trackEvent('prediction_accuracy_tracked', {
      match_id: matchId,
      predicted_probability: predictedProbability,
      actual_outcome: actualOutcome
    });
  }

  private logEvent(event: any): void {
    console.log(`[Analytics] ${event.event}:`, event.properties);
  }

  private processBatchIfReady(): void {
    // Send batch to analytics service when queue reaches certain size or time threshold
    if (this.eventQueue.length >= 10) {
      this.sendBatch();
    }
  }

  private sendBatch(): void {
    // In a real implementation, send this.eventQueue to your analytics service
    // For now, just clear the queue
    if (this.eventQueue.length > 0) {
      console.log(`[Analytics] Sending batch of ${this.eventQueue.length} events`);
      this.eventQueue = [];
    }
  }

  // Method to get events for testing purposes
  getQueuedEvents(): Array<{ event: string; properties: AnalyticsEvent; timestamp: Date }> {
    return [...this.eventQueue];
  }

  clearQueue(): void {
    this.eventQueue = [];
  }
}