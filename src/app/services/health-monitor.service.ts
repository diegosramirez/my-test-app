import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, combineLatest, timer, Subject } from 'rxjs';
import { map, startWith, takeUntil, tap, catchError } from 'rxjs/operators';
import {
  HealthStatus,
  ApiHealthStatus,
  CacheHealthStatus,
  WorkerHealthStatus,
  PerformanceMetrics,
  SystemAlert
} from '../interfaces/health.interface';
import { FootballDataService } from './football-data.service';
import { CacheService } from './cache.service';
import { SchedulerService } from './scheduler.service';

@Injectable({
  providedIn: 'root'
})
export class HealthMonitorService {
  private destroy$ = new Subject<void>();

  // Health status subjects
  private overallHealth$ = new BehaviorSubject<HealthStatus['overall']>('healthy');
  private apiHealth$ = new BehaviorSubject<ApiHealthStatus>({
    status: 'healthy',
    responseTime: 0,
    successRate: 100,
    lastSuccessfulFetch: Date.now(),
    rateLimitRemaining: 100,
    consecutiveFailures: 0
  });
  private cacheHealth$ = new BehaviorSubject<CacheHealthStatus>({
    status: 'healthy',
    hitRatio: 0,
    storageUsage: 0,
    staleDataPercentage: 0,
    corruptedEntries: 0,
    lastCleanup: Date.now()
  });
  private workerHealth$ = new BehaviorSubject<WorkerHealthStatus>({
    status: 'healthy',
    isActive: false,
    lastHeartbeat: Date.now(),
    totalPolls: 0,
    failedPolls: 0,
    averageExecutionTime: 0
  });

  // Performance and alerts
  private performanceMetrics$ = new BehaviorSubject<PerformanceMetrics>({
    apiResponseTimes: [],
    cacheOperationTimes: [],
    workerExecutionTimes: [],
    memoryUsage: 0,
    timestamp: Date.now()
  });
  private systemAlerts$ = new BehaviorSubject<SystemAlert[]>([]);

  // Combined health status
  private healthStatus$: Observable<HealthStatus>;

  constructor(
    private footballDataService: FootballDataService,
    private cacheService: CacheService,
    private schedulerService: SchedulerService
  ) {
    this.initializeHealthMonitoring();
    this.healthStatus$ = this.createHealthStatus();
    this.startPeriodicHealthChecks();
  }

  private initializeHealthMonitoring(): void {
    // Monitor API health
    this.schedulerService.results$.pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (result) => this.updateApiHealth(result),
      error: (error) => this.handleApiError(error)
    });

    this.schedulerService.errors$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(error => this.handleApiError(error));

    // Monitor cache health
    this.cacheService.stats$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(stats => this.updateCacheHealth(stats));

    // Monitor worker health
    this.schedulerService.status$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(status => this.updateWorkerHealth(status));
  }

  private createHealthStatus(): Observable<HealthStatus> {
    return combineLatest([
      this.apiHealth$,
      this.cacheHealth$,
      this.workerHealth$
    ]).pipe(
      map(([api, cache, worker]) => {
        const overall = this.calculateOverallHealth(api, cache, worker);

        return {
          overall,
          api,
          cache,
          worker,
          lastUpdate: Date.now()
        };
      })
    );
  }

  private calculateOverallHealth(
    api: ApiHealthStatus,
    cache: CacheHealthStatus,
    worker: WorkerHealthStatus
  ): HealthStatus['overall'] {
    const statuses = [api.status, cache.status, worker.status];

    if (statuses.includes('critical')) {
      return 'critical';
    }
    if (statuses.includes('warning')) {
      return 'warning';
    }
    return 'healthy';
  }

  private updateApiHealth(result: any): void {
    const metrics = this.footballDataService.getHealthMetrics();

    let status: ApiHealthStatus['status'] = 'healthy';

    // Determine API status
    if (metrics.consecutiveFailures >= 5 || metrics.successRate < 50) {
      status = 'critical';
    } else if (metrics.consecutiveFailures >= 2 || metrics.successRate < 80) {
      status = 'warning';
    }

    // Rate limiting check
    if (metrics.rateLimitRemaining < 10) {
      status = status === 'critical' ? 'critical' : 'warning';
      this.addAlert('warning', 'API rate limit approaching', 'api');
    }

    const apiHealth: ApiHealthStatus = {
      status,
      responseTime: result.responseTime || 0,
      successRate: metrics.successRate,
      lastSuccessfulFetch: metrics.lastSuccessfulFetch,
      rateLimitRemaining: metrics.rateLimitRemaining,
      consecutiveFailures: metrics.consecutiveFailures
    };

    this.apiHealth$.next(apiHealth);

    // Update performance metrics
    this.updatePerformanceMetrics('api', result.responseTime || 0);
  }

  private handleApiError(error: any): void {
    console.error('API health error:', error);

    const currentHealth = this.apiHealth$.value;
    const updatedHealth: ApiHealthStatus = {
      ...currentHealth,
      status: currentHealth.consecutiveFailures >= 5 ? 'critical' : 'warning',
      consecutiveFailures: currentHealth.consecutiveFailures + 1
    };

    this.apiHealth$.next(updatedHealth);
    this.addAlert('error', `API error: ${error}`, 'api');
  }

  private updateCacheHealth(stats: any): void {
    let status: CacheHealthStatus['status'] = 'healthy';

    // Determine cache status based on hit ratio and corruption
    if (stats.hitRatio < 30 || stats.corruptedEntries > 0) {
      status = 'critical';
    } else if (stats.hitRatio < 60) {
      status = 'warning';
    }

    // Storage usage check
    const storageUsage = this.calculateStorageUsage(stats);
    if (storageUsage > 90) {
      status = 'critical';
      this.addAlert('warning', 'Cache storage usage high', 'cache');
    }

    const cacheHealth: CacheHealthStatus = {
      status,
      hitRatio: stats.hitRatio,
      storageUsage,
      staleDataPercentage: this.calculateStaleDataPercentage(stats),
      corruptedEntries: 0, // Would be detected during cache operations
      lastCleanup: stats.lastCleanup
    };

    this.cacheHealth$.next(cacheHealth);
  }

  private updateWorkerHealth(status: any): void {
    let healthStatus: WorkerHealthStatus['status'] = 'healthy';

    const timeSinceLastHeartbeat = Date.now() - status.lastHeartbeat;
    const failureRate = status.totalPolls > 0 ? (status.failedPolls / status.totalPolls) * 100 : 0;

    // Determine worker status
    if (!status.isActive || timeSinceLastHeartbeat > 5 * 60 * 1000 || failureRate > 50) {
      healthStatus = 'critical';
    } else if (timeSinceLastHeartbeat > 2 * 60 * 1000 || failureRate > 20) {
      healthStatus = 'warning';
    }

    const workerHealth: WorkerHealthStatus = {
      status: healthStatus,
      isActive: status.isActive,
      lastHeartbeat: status.lastHeartbeat,
      totalPolls: status.totalPolls,
      failedPolls: status.failedPolls,
      averageExecutionTime: status.averageExecutionTime
    };

    this.workerHealth$.next(workerHealth);

    // Update performance metrics
    this.updatePerformanceMetrics('worker', status.averageExecutionTime);
  }

  private updatePerformanceMetrics(component: 'api' | 'cache' | 'worker', value: number): void {
    const current = this.performanceMetrics$.value;
    const updated = { ...current };

    switch (component) {
      case 'api':
        updated.apiResponseTimes.push(value);
        if (updated.apiResponseTimes.length > 50) {
          updated.apiResponseTimes = updated.apiResponseTimes.slice(-50);
        }
        break;
      case 'cache':
        updated.cacheOperationTimes.push(value);
        if (updated.cacheOperationTimes.length > 50) {
          updated.cacheOperationTimes = updated.cacheOperationTimes.slice(-50);
        }
        break;
      case 'worker':
        updated.workerExecutionTimes.push(value);
        if (updated.workerExecutionTimes.length > 50) {
          updated.workerExecutionTimes = updated.workerExecutionTimes.slice(-50);
        }
        break;
    }

    updated.memoryUsage = this.estimateMemoryUsage();
    updated.timestamp = Date.now();

    this.performanceMetrics$.next(updated);
  }

  private addAlert(type: SystemAlert['type'], message: string, component: SystemAlert['component']): void {
    const alert: SystemAlert = {
      id: `alert-${Date.now()}-${Math.random()}`,
      type,
      message,
      timestamp: Date.now(),
      resolved: false,
      component
    };

    const currentAlerts = this.systemAlerts$.value;
    const updatedAlerts = [alert, ...currentAlerts].slice(0, 100); // Keep last 100 alerts

    this.systemAlerts$.next(updatedAlerts);
  }

  private calculateStorageUsage(stats: any): number {
    // Estimate storage usage based on entry count and average size
    // This is a simplified calculation
    const estimatedSizePerEntry = 5000; // 5KB average
    const totalSize = stats.totalEntries * estimatedSizePerEntry;
    const maxStorage = 50 * 1024 * 1024; // 50MB max
    return (totalSize / maxStorage) * 100;
  }

  private calculateStaleDataPercentage(stats: any): number {
    return stats.totalEntries > 0 ? (stats.staleEntries / stats.totalEntries) * 100 : 0;
  }

  private estimateMemoryUsage(): number {
    // Simplified memory usage estimation
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100;
    }
    return 0;
  }

  private startPeriodicHealthChecks(): void {
    // Perform comprehensive health check every 5 minutes
    timer(0, 5 * 60 * 1000).pipe(
      takeUntil(this.destroy$),
      tap(() => this.performHealthCheck())
    ).subscribe();

    // Clean up old alerts every hour
    timer(0, 60 * 60 * 1000).pipe(
      takeUntil(this.destroy$),
      tap(() => this.cleanupOldAlerts())
    ).subscribe();
  }

  private performHealthCheck(): void {
    // Trigger cache cleanup if needed
    const cacheHealth = this.cacheHealth$.value;
    if (cacheHealth.staleDataPercentage > 50) {
      this.cacheService.cleanup().subscribe({
        next: (deletedCount) => {
          console.log(`Health check triggered cache cleanup: ${deletedCount} entries removed`);
        },
        error: (error) => {
          console.error('Cache cleanup failed:', error);
          this.addAlert('error', 'Cache cleanup failed', 'cache');

          // Update cache health status to warning on cleanup failures
          const currentCacheHealth = this.cacheHealth$.value;
          this.cacheHealth$.next({
            ...currentCacheHealth,
            status: 'warning'
          });
        }
      });
    }

    // Request scheduler status update
    this.schedulerService.requestStatus();

    console.log('Periodic health check completed');
  }

  private cleanupOldAlerts(): void {
    const currentAlerts = this.systemAlerts$.value;
    const oneHourAgo = Date.now() - (60 * 60 * 1000);

    const filteredAlerts = currentAlerts.filter(alert => alert.timestamp > oneHourAgo);
    this.systemAlerts$.next(filteredAlerts);
  }

  // Public API
  getHealthStatus(): Observable<HealthStatus> {
    return this.healthStatus$;
  }

  getPerformanceMetrics(): Observable<PerformanceMetrics> {
    return this.performanceMetrics$.asObservable();
  }

  getSystemAlerts(): Observable<SystemAlert[]> {
    return this.systemAlerts$.asObservable();
  }

  resolveAlert(alertId: string): void {
    const currentAlerts = this.systemAlerts$.value;
    const updatedAlerts = currentAlerts.map(alert =>
      alert.id === alertId ? { ...alert, resolved: true } : alert
    );
    this.systemAlerts$.next(updatedAlerts);
  }

  getCurrentHealth(): HealthStatus {
    return {
      overall: this.overallHealth$.value,
      api: this.apiHealth$.value,
      cache: this.cacheHealth$.value,
      worker: this.workerHealth$.value,
      lastUpdate: Date.now()
    };
  }

  isSystemHealthy(): boolean {
    const health = this.getCurrentHealth();
    return health.overall === 'healthy';
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}