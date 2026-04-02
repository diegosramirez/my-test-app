import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  track(eventName: string, meta: Record<string, unknown>): void {
    console.log(`[Analytics] ${eventName}`, meta);
  }
}
