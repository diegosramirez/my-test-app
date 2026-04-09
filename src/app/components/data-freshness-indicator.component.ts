import { Component, Input, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, Subject, timer, combineLatest } from 'rxjs';
import { takeUntil, map, startWith } from 'rxjs/operators';
import { HealthMonitorService } from '../services/health-monitor.service';
import { CacheService } from '../services/cache.service';
import { HealthStatus } from '../interfaces/health.interface';

@Component({
  selector: 'app-data-freshness-indicator',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="freshness-container" [class]="containerClasses()">
      <!-- Main Status Indicator -->
      <div class="status-indicator" [class]="statusClasses()">
        <span class="status-icon">{{ statusIcon() }}</span>
        <span class="status-text">{{ statusText() }}</span>
      </div>

      <!-- Last Updated Time -->
      <div class="last-updated" [class]="lastUpdatedClasses()">
        {{ lastUpdatedText() }}
      </div>

      <!-- Health Status (when expanded) -->
      @if (showDetails()) {
        <div class="health-details">
          <div class="health-item">
            <span class="health-label">API:</span>
            <span class="health-value" [class]="'status-' + health().api.status">
              {{ health().api.status }}
            </span>
          </div>
          <div class="health-item">
            <span class="health-label">Cache:</span>
            <span class="health-value" [class]="'status-' + health().cache.status">
              {{ health().cache.status }} ({{ health().cache.hitRatio | number:'1.0-1' }}% hit)
            </span>
          </div>
          <div class="health-item">
            <span class="health-label">Worker:</span>
            <span class="health-value" [class]="'status-' + health().worker.status">
              {{ health().worker.isActive ? 'Active' : 'Inactive' }}
            </span>
          </div>
        </div>
      }

      <!-- User-friendly messages for degraded states -->
      @if (showDegradationMessage()) {
        <div class="degradation-message" [class]="degradationMessageClasses()">
          {{ degradationMessage() }}
        </div>
      }
    </div>
  `,
  styles: [`
    .freshness-container {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 8px 12px;
      border-radius: 6px;
      transition: all 0.3s ease;
      font-size: 0.875rem;
      max-width: 100%;
    }

    .freshness-container.mobile {
      padding: 6px 8px;
      font-size: 0.8rem;
    }

    .freshness-container.healthy {
      background-color: #f0fdf4;
      border: 1px solid #bbf7d0;
    }

    .freshness-container.warning {
      background-color: #fffbeb;
      border: 1px solid #fed7aa;
    }

    .freshness-container.critical {
      background-color: #fef2f2;
      border: 1px solid #fecaca;
    }

    .status-indicator {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .status-icon {
      font-size: 1rem;
      line-height: 1;
    }

    .status-text {
      font-weight: 500;
      white-space: nowrap;
    }

    .status-indicator.healthy .status-text {
      color: #166534;
    }

    .status-indicator.warning .status-text {
      color: #92400e;
    }

    .status-indicator.critical .status-text {
      color: #991b1b;
    }

    .last-updated {
      font-size: 0.8em;
      opacity: 0.8;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .last-updated.stale {
      color: #92400e;
      opacity: 0.9;
    }

    .health-details {
      display: flex;
      flex-direction: column;
      gap: 2px;
      margin-top: 4px;
      padding-top: 4px;
      border-top: 1px solid #e5e7eb;
      font-size: 0.75em;
    }

    .health-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .health-label {
      font-weight: 500;
      opacity: 0.8;
    }

    .health-value {
      font-weight: 600;
    }

    .health-value.status-healthy {
      color: #166534;
    }

    .health-value.status-warning {
      color: #92400e;
    }

    .health-value.status-critical {
      color: #991b1b;
    }

    .degradation-message {
      margin-top: 4px;
      padding: 6px 8px;
      border-radius: 4px;
      font-size: 0.8em;
      line-height: 1.3;
    }

    .degradation-message.warning {
      background-color: #fef3c7;
      color: #92400e;
      border: 1px solid #fbbf24;
    }

    .degradation-message.critical {
      background-color: #fee2e2;
      color: #991b1b;
      border: 1px solid #f87171;
    }

    /* Mobile optimizations */
    @media (max-width: 640px) {
      .freshness-container {
        padding: 4px 6px;
        font-size: 0.75rem;
      }

      .health-details {
        display: none; /* Hide details on mobile to save space */
      }

      .status-text {
        max-width: 120px;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .last-updated {
        font-size: 0.7em;
      }

      .degradation-message {
        font-size: 0.7em;
        padding: 4px 6px;
      }
    }
  `]
})
export class DataFreshnessIndicatorComponent implements OnInit, OnDestroy {
  @Input() showDetails = signal(false);
  @Input() isMobile = signal(false);
  @Input() lastDataUpdate?: number;

  private destroy$ = new Subject<void>();
  private currentTime = signal(Date.now());

  // Reactive state
  health = signal<HealthStatus>({
    overall: 'healthy',
    api: {
      status: 'healthy',
      responseTime: 0,
      successRate: 100,
      lastSuccessfulFetch: Date.now(),
      rateLimitRemaining: 100,
      consecutiveFailures: 0,
      totalRequests: 0,
      successfulRequests: 0
    },
    cache: {
      status: 'healthy',
      hitRatio: 0,
      storageUsage: 0,
      staleDataPercentage: 0,
      corruptedEntries: 0,
      lastCleanup: Date.now()
    },
    worker: {
      status: 'healthy',
      isActive: false,
      lastHeartbeat: Date.now(),
      totalPolls: 0,
      failedPolls: 0,
      averageExecutionTime: 0
    },
    lastUpdate: Date.now()
  });

  // Computed properties
  containerClasses = computed(() => {
    const health = this.health();
    return `${health.overall} ${this.isMobile() ? 'mobile' : ''}`;
  });

  statusClasses = computed(() => {
    return this.health().overall;
  });

  statusIcon = computed(() => {
    const status = this.health().overall;
    switch (status) {
      case 'healthy':
        return '✓';
      case 'warning':
        return '⚠';
      case 'critical':
        return '⚠';
      default:
        return '?';
    }
  });

  statusText = computed(() => {
    const health = this.health();
    const lastUpdate = this.lastDataUpdate || health.lastUpdate;
    const isStale = this.isDataStale(lastUpdate);

    if (health.overall === 'critical') {
      return 'Service Issues';
    }

    if (isStale) {
      return 'Showing Recent Data';
    }

    if (health.overall === 'warning') {
      return 'Limited Service';
    }

    return 'Live Data';
  });

  lastUpdatedText = computed(() => {
    const lastUpdate = this.lastDataUpdate || this.health().lastUpdate;
    return `Updated ${this.formatRelativeTime(lastUpdate)}`;
  });

  lastUpdatedClasses = computed(() => {
    const lastUpdate = this.lastDataUpdate || this.health().lastUpdate;
    return this.isDataStale(lastUpdate) ? 'stale' : '';
  });

  showDegradationMessage = computed(() => {
    const health = this.health();
    return health.overall !== 'healthy';
  });

  degradationMessage = computed(() => {
    const health = this.health();

    if (health.overall === 'critical') {
      if (!health.worker.isActive) {
        return 'Background updates paused - showing cached data';
      }
      if (health.api.consecutiveFailures >= 5) {
        return 'External data source unavailable - updates resuming shortly';
      }
      return 'Service temporarily degraded - showing recent data';
    }

    if (health.overall === 'warning') {
      if (health.api.rateLimitRemaining < 10) {
        return 'Rate limit approaching - updates may be delayed';
      }
      return 'Some services experiencing delays';
    }

    return '';
  });

  degradationMessageClasses = computed(() => {
    return this.health().overall;
  });

  constructor(
    private healthMonitorService: HealthMonitorService,
    private cacheService: CacheService
  ) {}

  ngOnInit(): void {
    // Subscribe to health status updates
    this.healthMonitorService.getHealthStatus()
      .pipe(takeUntil(this.destroy$))
      .subscribe(health => {
        this.health.set(health);
      });

    // Update current time every minute for relative time display
    timer(0, 60000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.currentTime.set(Date.now());
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private isDataStale(timestamp: number): boolean {
    const staleDuration = 30 * 60 * 1000; // 30 minutes
    return Date.now() - timestamp > staleDuration;
  }

  private formatRelativeTime(timestamp: number): string {
    const now = this.currentTime();
    const diffMs = now - timestamp;
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) {
      return 'just now';
    } else if (diffMinutes === 1) {
      return '1 minute ago';
    } else if (diffMinutes < 60) {
      return `${diffMinutes} minutes ago`;
    } else if (diffHours === 1) {
      return '1 hour ago';
    } else if (diffHours < 24) {
      return `${diffHours} hours ago`;
    } else if (diffDays === 1) {
      return '1 day ago';
    } else {
      return `${diffDays} days ago`;
    }
  }

  // Public methods for parent components
  refresh(): void {
    // Trigger a manual refresh if needed
    console.log('Manual refresh requested');
  }

  toggleDetails(): void {
    this.showDetails.set(!this.showDetails());
  }
}