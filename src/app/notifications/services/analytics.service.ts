import { Injectable } from '@angular/core';

export abstract class AnalyticsService {
  abstract track(eventName: string, meta: Record<string, unknown>): void;
}

@Injectable()
export class ConsoleAnalyticsService extends AnalyticsService {
  track(eventName: string, meta: Record<string, unknown>): void {
    console.debug('[Analytics]', eventName, meta);
  }
}
