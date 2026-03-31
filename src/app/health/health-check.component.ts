import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { HealthService } from './health.service';
import { HealthResponse } from './health.model';
import { AnalyticsService } from '../shared/analytics.service';

@Component({
  standalone: true,
  selector: 'app-health-check',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { role: 'status' },
  styles: `:host { display: block; font-family: monospace; }`,
  template: `<pre>{{ payload }}</pre>`,
})
export class HealthCheckComponent {
  private readonly healthService = inject(HealthService);
  private readonly titleService = inject(Title);
  private readonly analytics = inject(AnalyticsService);

  readonly payload: string;

  constructor() {
    this.titleService.setTitle('Health Check');
    const health: HealthResponse = this.healthService.getHealth();
    this.payload = JSON.stringify(health, null, 2);
    this.analytics.track('health_check_requested', {
      timestamp: health.timestamp,
      uptime: health.uptime,
      status: health.status,
    });
  }
}
