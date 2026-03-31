import { Injectable } from '@angular/core';

/**
 * Stub analytics service that logs events to console.debug.
 *
 * TODO: Before connecting to a real analytics pipeline, evaluate sampling
 * or a separate low-priority event stream. High-frequency polling of the
 * /health route could generate excessive event volume.
 */
@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  track(eventName: string, meta: Record<string, unknown>): void {
    console.debug(`[Analytics] ${eventName}`, meta);
  }
}
