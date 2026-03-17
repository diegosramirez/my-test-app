import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  track(eventName: string, properties: Record<string, unknown>): void {
    // TODO: Replace with real analytics provider (Segment, Amplitude, etc.)
    console.debug(`[Analytics] ${eventName}`, properties);
  }
}
