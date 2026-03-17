import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  track(eventName: string, meta: Record<string, string>): void {
    console.debug(`[Analytics] ${eventName}`, meta);
  }
}
