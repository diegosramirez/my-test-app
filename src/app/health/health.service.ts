import { Injectable } from '@angular/core';
import { HealthResponse } from './health.model';

/**
 * Singleton health service that tracks application uptime using a monotonic clock.
 *
 * Uses `performance.now()` instead of `Date.now()` to ensure uptime calculation
 * is immune to NTP sync or system clock adjustments.
 *
 * NOTE: If SSR is adopted later, this service will be per-request scoped with
 * near-zero uptime. The server-side follow-up endpoint should use
 * `process.uptime()` instead. See TODO in app.routes.ts.
 */
@Injectable({ providedIn: 'root' })
export class HealthService {
  private readonly startMark = performance.now();

  getHealth(): HealthResponse {
    return {
      status: 'UP',
      uptime: Math.floor((performance.now() - this.startMark) / 1000),
      timestamp: new Date().toISOString(),
    };
  }
}
