import { Injectable, isDevMode } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  track(eventName: string, meta: Record<string, unknown>): void {
    if (isDevMode()) {
      console.debug(`[Analytics] ${eventName}`, meta);
    }
  }
}
