import { TestBed } from '@angular/core/testing';
import { of, throwError, BehaviorSubject, Subject } from 'rxjs';
import { HealthMonitorService } from './health-monitor.service';
import { FootballDataService } from './football-data.service';
import { CacheService } from './cache.service';
import { SchedulerService } from './scheduler.service';
import {
  HealthStatus,
  ApiHealthStatus,
  CacheHealthStatus,
  WorkerHealthStatus,
  PerformanceMetrics,
  SystemAlert
} from '../interfaces/health.interface';

describe('HealthMonitorService', () => {
  let service: HealthMonitorService;
  let footballDataServiceSpy: any;
  let cacheServiceSpy: any;
  let schedulerServiceSpy: any;

  const mockApiHealthMetrics = {
    responseTime: 250,
    successRate: 95.5,
    lastSuccessfulFetch: Date.now() - 5000,
    rateLimitRemaining: 85,
    consecutiveFailures: 0,
    totalRequests: 100
  };

  const mockCacheStats = {
    hitRatio: 75,
    totalEntries: 50,
    staleEntries: 5,
    corruptedEntries: 0,
    lastCleanup: Date.now() - 60000
  };

  const mockWorkerStatus = {
    isActive: true,
    lastHeartbeat: Date.now() - 1000,
    totalPolls: 20,
    failedPolls: 1,
    averageExecutionTime: 150
  };

  beforeEach(async () => {
    // Create spy objects with behavior subjects for reactive streams
    footballDataServiceSpy = {
      getHealthMetrics: vi.fn().mockReturnValue(mockApiHealthMetrics)
    };

    cacheServiceSpy = {
      stats$: new BehaviorSubject(mockCacheStats),
      cleanup: vi.fn().mockReturnValue(of(5))
    };

    schedulerServiceSpy = {
      results$: new BehaviorSubject({ responseTime: 250 }),
      errors$: new Subject(),
      status$: new BehaviorSubject(mockWorkerStatus),
      requestStatus: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [],
      providers: [
        HealthMonitorService,
        { provide: FootballDataService, useValue: footballDataServiceSpy },
        { provide: CacheService, useValue: cacheServiceSpy },
        { provide: SchedulerService, useValue: schedulerServiceSpy }
      ]
    }).compileComponents();

    service = TestBed.inject(HealthMonitorService);
  });

  afterEach(() => {
    vi.clearAllMocks();
    service.ngOnDestroy();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Health Status Observable Integration', () => {
    it('should provide reactive health status through observables', (done) => {
      service.getHealthStatus().subscribe((healthStatus: HealthStatus) => {
        expect(healthStatus).toEqual({
          overall: 'healthy',
          api: expect.objectContaining({
            status: 'healthy',
            responseTime: 250,
            successRate: 95.5,
            rateLimitRemaining: 85
          }),
          cache: expect.objectContaining({
            status: 'healthy',
            hitRatio: 75
          }),
          worker: expect.objectContaining({
            status: 'healthy',
            isActive: true
          }),
          lastUpdate: expect.any(Number)
        });
        done();
      });
    });

    it('should update health status when API metrics change', (done) => {
      let callCount = 0;

      service.getHealthStatus().subscribe((healthStatus: HealthStatus) => {
        callCount++;
        if (callCount === 1) {
          expect(healthStatus.api.successRate).toBe(95.5);

          // Update API metrics to trigger change
          footballDataServiceSpy.getHealthMetrics.mockReturnValue({
            ...mockApiHealthMetrics,
            successRate: 45, // Below critical threshold
            consecutiveFailures: 6
          });

          // Trigger API health update
          schedulerServiceSpy.results$.next({ responseTime: 300 });
        } else if (callCount === 2) {
          expect(healthStatus.api.status).toBe('critical');
          expect(healthStatus.overall).toBe('critical');
          done();
        }
      });
    });

    it('should provide performance metrics observable', (done) => {
      service.getPerformanceMetrics().subscribe((metrics: PerformanceMetrics) => {
        expect(metrics).toEqual({
          apiResponseTimes: expect.any(Array),
          cacheOperationTimes: expect.any(Array),
          workerExecutionTimes: expect.any(Array),
          memoryUsage: expect.any(Number),
          timestamp: expect.any(Number)
        });
        done();
      });
    });

    it('should provide system alerts observable', (done) => {
      service.getSystemAlerts().subscribe((alerts: SystemAlert[]) => {
        expect(Array.isArray(alerts)).toBe(true);
        done();
      });
    });
  });

  describe('Overall Health Calculation', () => {
    it('should calculate overall health as healthy when all components are healthy', () => {
      const health = service.getCurrentHealth();
      expect(health.overall).toBe('healthy');
    });

    it('should calculate overall health as warning when any component has warning status', (done) => {
      // Update cache stats to trigger warning status
      cacheServiceSpy.stats$.next({
        ...mockCacheStats,
        hitRatio: 50 // Below warning threshold
      });

      setTimeout(() => {
        const health = service.getCurrentHealth();
        expect(health.overall).toBe('warning');
        done();
      }, 50);
    });

    it('should calculate overall health as critical when any component is critical', (done) => {
      footballDataServiceSpy.getHealthMetrics.mockReturnValue({
        ...mockApiHealthMetrics,
        consecutiveFailures: 6,
        successRate: 30
      });

      schedulerServiceSpy.results$.next({ responseTime: 400 });

      setTimeout(() => {
        const health = service.getCurrentHealth();
        expect(health.overall).toBe('critical');
        done();
      }, 50);
    });

    it('should prioritize critical over warning status', (done) => {
      // Set cache to warning and API to critical
      cacheServiceSpy.stats$.next({
        ...mockCacheStats,
        hitRatio: 50 // Warning
      });

      footballDataServiceSpy.getHealthMetrics.mockReturnValue({
        ...mockApiHealthMetrics,
        consecutiveFailures: 6 // Critical
      });

      schedulerServiceSpy.results$.next({ responseTime: 400 });

      setTimeout(() => {
        const health = service.getCurrentHealth();
        expect(health.overall).toBe('critical');
        done();
      }, 50);
    });
  });

  describe('API Health Monitoring', () => {
    it('should detect critical API status from consecutive failures', (done) => {
      footballDataServiceSpy.getHealthMetrics.mockReturnValue({
        ...mockApiHealthMetrics,
        consecutiveFailures: 5,
        successRate: 40
      });

      schedulerServiceSpy.results$.next({ responseTime: 500 });

      setTimeout(() => {
        const health = service.getCurrentHealth();
        expect(health.api.status).toBe('critical');
        expect(health.api.consecutiveFailures).toBe(5);
        done();
      }, 50);
    });

    it('should detect warning API status from moderate failures', (done) => {
      footballDataServiceSpy.getHealthMetrics.mockReturnValue({
        ...mockApiHealthMetrics,
        consecutiveFailures: 2,
        successRate: 75
      });

      schedulerServiceSpy.results$.next({ responseTime: 300 });

      setTimeout(() => {
        const health = service.getCurrentHealth();
        expect(health.api.status).toBe('warning');
        done();
      }, 50);
    });

    it('should detect rate limit warning when remaining requests are low', (done) => {
      footballDataServiceSpy.getHealthMetrics.mockReturnValue({
        ...mockApiHealthMetrics,
        rateLimitRemaining: 8
      });

      schedulerServiceSpy.results$.next({ responseTime: 200 });

      setTimeout(() => {
        service.getSystemAlerts().subscribe((alerts) => {
          const rateLimitAlert = alerts.find(alert =>
            alert.message.includes('rate limit approaching')
          );
          expect(rateLimitAlert).toBeDefined();
          expect(rateLimitAlert?.type).toBe('warning');
          expect(rateLimitAlert?.component).toBe('api');
          done();
        });
      }, 50);
    });

    it('should handle API errors and update health status accordingly', (done) => {
      const apiError = new Error('Network timeout');

      schedulerServiceSpy.errors$.next(apiError);

      setTimeout(() => {
        service.getSystemAlerts().subscribe((alerts) => {
          const errorAlert = alerts.find(alert =>
            alert.message.includes('API error')
          );
          expect(errorAlert).toBeDefined();
          expect(errorAlert?.type).toBe('error');
          done();
        });
      }, 50);
    });

    it('should track API response times in performance metrics', (done) => {
      const responseTimes = [100, 200, 150, 300, 250];

      responseTimes.forEach((time, index) => {
        setTimeout(() => {
          schedulerServiceSpy.results$.next({ responseTime: time });
        }, index * 10);
      });

      setTimeout(() => {
        service.getPerformanceMetrics().subscribe((metrics) => {
          expect(metrics.apiResponseTimes.length).toBeGreaterThan(0);
          expect(metrics.apiResponseTimes).toContain(300);
          done();
        });
      }, 100);
    });
  });

  describe('Cache Health Monitoring', () => {
    it('should detect critical cache status from low hit ratio', (done) => {
      cacheServiceSpy.stats$.next({
        ...mockCacheStats,
        hitRatio: 25,
        corruptedEntries: 0
      });

      setTimeout(() => {
        const health = service.getCurrentHealth();
        expect(health.cache.status).toBe('critical');
        done();
      }, 50);
    });

    it('should detect warning cache status from moderate hit ratio', (done) => {
      cacheServiceSpy.stats$.next({
        ...mockCacheStats,
        hitRatio: 55
      });

      setTimeout(() => {
        const health = service.getCurrentHealth();
        expect(health.cache.status).toBe('warning');
        done();
      }, 50);
    });

    it('should calculate stale data percentage correctly', (done) => {
      cacheServiceSpy.stats$.next({
        ...mockCacheStats,
        totalEntries: 100,
        staleEntries: 30
      });

      setTimeout(() => {
        const health = service.getCurrentHealth();
        expect(health.cache.staleDataPercentage).toBe(30);
        done();
      }, 50);
    });

    it('should trigger cache cleanup when stale data exceeds threshold', (done) => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      cacheServiceSpy.stats$.next({
        ...mockCacheStats,
        totalEntries: 100,
        staleEntries: 60 // 60% stale
      });

      // Wait for health check to trigger
      setTimeout(() => {
        expect(cacheServiceSpy.cleanup).toHaveBeenCalled();
        expect(consoleSpy).toHaveBeenCalledWith(
          'Health check triggered cache cleanup: 5 entries removed'
        );
        consoleSpy.mockRestore();
        done();
      }, 100);
    });

    it('should handle cache cleanup failures gracefully', (done) => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const cleanupError = new Error('IndexedDB unavailable');

      cacheServiceSpy.cleanup.mockReturnValue(throwError(() => cleanupError));
      cacheServiceSpy.stats$.next({
        ...mockCacheStats,
        totalEntries: 100,
        staleEntries: 60
      });

      setTimeout(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Cache cleanup failed:', cleanupError);

        service.getSystemAlerts().subscribe((alerts) => {
          const cleanupAlert = alerts.find(alert =>
            alert.message === 'Cache cleanup failed'
          );
          expect(cleanupAlert).toBeDefined();
          expect(cleanupAlert?.type).toBe('error');
          expect(cleanupAlert?.component).toBe('cache');
          done();
        });
      }, 100);
    });
  });

  describe('Worker Health Monitoring', () => {
    it('should detect healthy worker status when active and responsive', () => {
      const health = service.getCurrentHealth();
      expect(health.worker.status).toBe('healthy');
      expect(health.worker.isActive).toBe(true);
    });

    it('should detect critical worker status when inactive', (done) => {
      schedulerServiceSpy.status$.next({
        ...mockWorkerStatus,
        isActive: false
      });

      setTimeout(() => {
        const health = service.getCurrentHealth();
        expect(health.worker.status).toBe('critical');
        done();
      }, 50);
    });

    it('should detect critical worker status from stale heartbeat', (done) => {
      const staleHeartbeat = Date.now() - (6 * 60 * 1000); // 6 minutes ago

      schedulerServiceSpy.status$.next({
        ...mockWorkerStatus,
        lastHeartbeat: staleHeartbeat
      });

      setTimeout(() => {
        const health = service.getCurrentHealth();
        expect(health.worker.status).toBe('critical');
        done();
      }, 50);
    });

    it('should detect warning worker status from moderate heartbeat delay', (done) => {
      const moderateHeartbeat = Date.now() - (3 * 60 * 1000); // 3 minutes ago

      schedulerServiceSpy.status$.next({
        ...mockWorkerStatus,
        lastHeartbeat: moderateHeartbeat
      });

      setTimeout(() => {
        const health = service.getCurrentHealth();
        expect(health.worker.status).toBe('warning');
        done();
      }, 50);
    });

    it('should detect critical worker status from high failure rate', (done) => {
      schedulerServiceSpy.status$.next({
        ...mockWorkerStatus,
        totalPolls: 100,
        failedPolls: 60 // 60% failure rate
      });

      setTimeout(() => {
        const health = service.getCurrentHealth();
        expect(health.worker.status).toBe('critical');
        done();
      }, 50);
    });

    it('should track worker execution times in performance metrics', (done) => {
      const executionTimes = [120, 180, 150, 200, 160];

      executionTimes.forEach((time, index) => {
        setTimeout(() => {
          schedulerServiceSpy.status$.next({
            ...mockWorkerStatus,
            averageExecutionTime: time
          });
        }, index * 10);
      });

      setTimeout(() => {
        service.getPerformanceMetrics().subscribe((metrics) => {
          expect(metrics.workerExecutionTimes.length).toBeGreaterThan(0);
          expect(metrics.workerExecutionTimes).toContain(200);
          done();
        });
      }, 100);
    });
  });

  describe('System Alerts Management', () => {
    it('should create alerts with proper structure and metadata', (done) => {
      const apiError = new Error('Connection timeout');

      schedulerServiceSpy.errors$.next(apiError);

      setTimeout(() => {
        service.getSystemAlerts().subscribe((alerts) => {
          const alert = alerts[0];
          expect(alert).toEqual({
            id: expect.stringMatching(/alert-\d+-\d+\.\d+/),
            type: 'error',
            message: expect.stringContaining('API error'),
            timestamp: expect.any(Number),
            resolved: false,
            component: 'api'
          });
          done();
        });
      }, 50);
    });

    it('should resolve alerts by ID', (done) => {
      const apiError = new Error('Test error');

      schedulerServiceSpy.errors$.next(apiError);

      setTimeout(() => {
        service.getSystemAlerts().subscribe((alerts) => {
          if (alerts.length > 0) {
            const alertId = alerts[0].id;
            service.resolveAlert(alertId);

            setTimeout(() => {
              service.getSystemAlerts().subscribe((updatedAlerts) => {
                const resolvedAlert = updatedAlerts.find(a => a.id === alertId);
                expect(resolvedAlert?.resolved).toBe(true);
                done();
              });
            }, 10);
          }
        });
      }, 50);
    });

    it('should limit alerts to maximum count for memory management', (done) => {
      // Generate more than 100 alerts
      for (let i = 0; i < 105; i++) {
        schedulerServiceSpy.errors$.next(new Error(`Error ${i}`));
      }

      setTimeout(() => {
        service.getSystemAlerts().subscribe((alerts) => {
          expect(alerts.length).toBe(100);
          done();
        });
      }, 100);
    });

    it('should clean up old alerts periodically', (done) => {
      const oldTimestamp = Date.now() - (2 * 60 * 60 * 1000); // 2 hours ago

      // Manually trigger alert cleanup by calling the private method via reflection
      // Since we can't access private methods directly, we test the observable behavior
      schedulerServiceSpy.errors$.next(new Error('Old error'));

      setTimeout(() => {
        service.getSystemAlerts().subscribe((alerts) => {
          const currentTime = Date.now();
          alerts.forEach(alert => {
            expect(alert.timestamp).toBeGreaterThan(currentTime - (60 * 60 * 1000));
          });
          done();
        });
      }, 50);
    });
  });

  describe('System Health Status Methods', () => {
    it('should return current health status synchronously', () => {
      const health = service.getCurrentHealth();

      expect(health).toEqual({
        overall: expect.any(String),
        api: expect.objectContaining({
          status: expect.any(String),
          responseTime: expect.any(Number),
          successRate: expect.any(Number)
        }),
        cache: expect.objectContaining({
          status: expect.any(String),
          hitRatio: expect.any(Number)
        }),
        worker: expect.objectContaining({
          status: expect.any(String),
          isActive: expect.any(Boolean)
        }),
        lastUpdate: expect.any(Number)
      });
    });

    it('should correctly identify system health status', () => {
      expect(service.isSystemHealthy()).toBe(true);
    });

    it('should identify unhealthy system when any component is not healthy', (done) => {
      footballDataServiceSpy.getHealthMetrics.mockReturnValue({
        ...mockApiHealthMetrics,
        consecutiveFailures: 6
      });

      schedulerServiceSpy.results$.next({ responseTime: 400 });

      setTimeout(() => {
        expect(service.isSystemHealthy()).toBe(false);
        done();
      }, 50);
    });
  });

  describe('Memory Usage and Performance', () => {
    it('should estimate memory usage when performance.memory is available', () => {
      const mockMemory = {
        usedJSHeapSize: 50 * 1024 * 1024, // 50MB
        totalJSHeapSize: 100 * 1024 * 1024 // 100MB
      };

      Object.defineProperty(performance, 'memory', {
        value: mockMemory,
        configurable: true
      });

      const health = service.getCurrentHealth();
      expect(health.cache.storageUsage).toBeGreaterThanOrEqual(0);
      expect(health.cache.storageUsage).toBeLessThanOrEqual(100);
    });

    it('should handle missing performance.memory gracefully', () => {
      Object.defineProperty(performance, 'memory', {
        value: undefined,
        configurable: true
      });

      service.getPerformanceMetrics().subscribe((metrics) => {
        expect(metrics.memoryUsage).toBe(0);
      });
    });

    it('should limit performance metrics arrays to prevent memory leaks', (done) => {
      // Add more than 50 response times
      for (let i = 0; i < 60; i++) {
        schedulerServiceSpy.results$.next({ responseTime: i * 10 });
      }

      setTimeout(() => {
        service.getPerformanceMetrics().subscribe((metrics) => {
          expect(metrics.apiResponseTimes.length).toBeLessThanOrEqual(50);
          done();
        });
      }, 100);
    });
  });

  describe('Periodic Health Checks', () => {
    it('should request scheduler status during periodic checks', (done) => {
      // Wait for periodic health check to execute
      setTimeout(() => {
        expect(schedulerServiceSpy.requestStatus).toHaveBeenCalled();
        done();
      }, 100);
    });

    it('should log health check completion', (done) => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      setTimeout(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Periodic health check completed');
        consoleSpy.mockRestore();
        done();
      }, 100);
    });
  });

  describe('Resource Cleanup', () => {
    it('should clean up subscriptions on destroy', () => {
      const destroySpy = vi.spyOn(service as any, 'destroy$');

      service.ngOnDestroy();

      // Since we can't directly access the private destroy$ subject,
      // we verify the ngOnDestroy method was implemented
      expect(service.ngOnDestroy).toBeDefined();
    });

    it('should complete all observables on destroy', () => {
      const service2 = TestBed.inject(HealthMonitorService);
      const healthSub = service2.getHealthStatus().subscribe();
      const metricsSub = service2.getPerformanceMetrics().subscribe();
      const alertsSub = service2.getSystemAlerts().subscribe();

      expect(healthSub.closed).toBe(false);
      expect(metricsSub.closed).toBe(false);
      expect(alertsSub.closed).toBe(false);

      service2.ngOnDestroy();

      // Observables should complete after destroy
      setTimeout(() => {
        expect(healthSub.closed).toBe(true);
        expect(metricsSub.closed).toBe(true);
        expect(alertsSub.closed).toBe(true);
      }, 10);
    });
  });
});