import { Injectable } from '@angular/core';

export abstract class AnalyticsService {
  abstract track(event: string, meta: Record<string, unknown>): void;
}

@Injectable()
export class ConsoleAnalyticsService extends AnalyticsService {
  track(event: string, meta: Record<string, unknown>): void {
    console.log(`[Analytics] ${event}`, meta);
  }
}
