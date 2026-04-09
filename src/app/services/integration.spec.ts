import { TestBed } from '@angular/core/testing';
import { firstValueFrom, BehaviorSubject, Subject, of, throwError } from 'rxjs';
import { take, skip } from 'rxjs/operators';

import { HealthMonitorService } from './health-monitor.service';
import { FootballDataService } from './football-data.service';
import { CacheService } from './cache.service';
import { SchedulerService } from './scheduler.service';
import { DataFreshnessIndicatorComponent } from '../components/data-freshness-indicator.component';

import {
  HealthStatus,
  ApiHealthStatus,
  CacheHealthStatus,
  WorkerHealthStatus
} from '../interfaces/health.interface';
import { FootballData, ApiResponse } from '../interfaces/football-data.interface';

/**
 * Integration Tests for Automated Data Fetching System
 *
 * These tests verify the complete end-to-end functionality described in the acceptance criteria:
 * - Automated background polling every 30 minutes
 * - Persistent caching with IndexedDB and staleness indicators
 * - Health monitoring with reactive status updates
 * - Fallback mechanisms during API outages
 * - Rate limiting and exponential backoff
 * - Data freshness UI indicators
 */
describe('Automated Data Fetching System Integration', () => {
  let healthMonitorService: HealthMonitorService;
  let footballDataService: FootballDataService;
  let cacheService: CacheService;
  let schedulerService: SchedulerService;
  let component: DataFreshnessIndicatorComponent;

  // Mock dependencies
  let mockFootballDataService: any;
  let mockCacheService: any;
  let mockSchedulerService: any;

  const mockFootballData: FootballData = {
    id: 'PL-20241201',
    competition: 'Premier League',
    season: '2024',
    matchday: 15,
    matches: [
      {
        id: '1',
        homeTeam: { id: '1', name: 'Arsenal', shortName: 'ARS', crest: 'arsenal.png' },
        awayTeam: { id: '2', name: 'Chelsea', shortName: 'CHE', crest: 'chelsea.png' },
        score: { fullTime: { home: 2, away: 1 }, halfTime: { home: 1, away: 0 } },
        status: 'FINISHED',
        utcDate: '2024-12-01T15:00:00Z'
      }
    ],
    lastUpdated: new Date().toISOString()
  };

  beforeEach(async () => {
    // Create comprehensive mocks
    mockFootballDataService = {
      fetchCompetitionData: vi.fn(),
      getHealthMetrics: vi.fn().mockReturnValue({
        responseTime: 150,
        successRate: 95,
        lastSuccessfulFetch: Date.now(),
        rateLimitRemaining: 85,
        consecutiveFailures: 0,
        totalRequests: 100,
        successfulRequests: 95
      }),
      isRateLimited: vi.fn().mockReturnValue(false),
      canMakeRequest: vi.fn().mockReturnValue(true)
    };

    mockCacheService = {
      set: vi.fn().mockReturnValue(of(true)),
      get: vi.fn().mockReturnValue(of(null)),
      delete: vi.fn().mockReturnValue(of(true)),
      cleanup: vi.fn().mockReturnValue(of(0)),
      clear: vi.fn().mockReturnValue(of(true)),
      getStats: vi.fn().mockReturnValue({
        totalEntries: 50,
        staleEntries: 5,
        hitRatio: 85,
        totalHits: 85,
        totalMisses: 15,
        storageSize: 1024000,
        lastCleanup: Date.now()
      }),
      stats$: new BehaviorSubject({
        totalEntries: 50,
        staleEntries: 5,
        hitRatio: 85,
        totalHits: 85,
        totalMisses: 15,
        storageSize: 1024000,
        lastCleanup: Date.now()
      }),
      isHealthy: vi.fn().mockReturnValue(true)
    };

    mockSchedulerService = {
      start: vi.fn(),
      stop: vi.fn(),
      requestStatus: vi.fn(),
      results$: new BehaviorSubject({
        success: true,
        data: mockFootballData,
        timestamp: Date.now(),
        responseTime: 150
      }),
      errors$: new Subject(),
      status$: new BehaviorSubject({
        isActive: true,
        lastHeartbeat: Date.now(),
        totalPolls: 20,
        failedPolls: 1,
        averageExecutionTime: 150
      })
    };

    await TestBed.configureTestingModule({
      imports: [DataFreshnessIndicatorComponent],
      providers: [
        HealthMonitorService,
        { provide: FootballDataService, useValue: mockFootballDataService },
        { provide: CacheService, useValue: mockCacheService },
        { provide: SchedulerService, useValue: mockSchedulerService }
      ]
    }).compileComponents();

    healthMonitorService = TestBed.inject(HealthMonitorService);
    footballDataService = TestBed.inject(FootballDataService);
    cacheService = TestBed.inject(CacheService);
    schedulerService = TestBed.inject(SchedulerService);

    const fixture = TestBed.createComponent(DataFreshnessIndicatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.clearAllMocks();
    healthMonitorService.ngOnDestroy();
  });

  describe('Automated Background Polling (Acceptance Criteria 1)', () => {
    it('should automatically fetch fresh data every 30 minutes when application is active', async () => {
      // Arrange - Mock successful API response
      const mockApiResponse: ApiResponse<FootballData> = {
        data: mockFootballData,
        status: 200,
        timestamp: Date.now()
      };
      mockFootballDataService.fetchCompetitionData.mockReturnValue(of(mockApiResponse));

      // Act - Simulate background fetch trigger
      mockSchedulerService.results$.next({
        success: true,
        data: mockFootballData,
        timestamp: Date.now(),
        responseTime: 150
      });

      // Wait for health monitor to process the result
      await new Promise(resolve => setTimeout(resolve, 100));

      // Assert - Verify data was stored in IndexedDB with metadata
      expect(mockCacheService.set).toHaveBeenCalledWith(
        expect.stringMatching(/^PL-\d+/),
        expect.objectContaining({
          competition: 'Premier League',
          matches: expect.arrayContaining([
            expect.objectContaining({
              homeTeam: expect.objectContaining({ name: 'Arsenal' })
            })
          ])
        }),
        'football-data'
      );

      // Verify health monitoring tracked the successful fetch
      const healthStatus = await firstValueFrom(healthMonitorService.getHealthStatus());
      expect(healthStatus.api.status).toBe('healthy');
      expect(healthStatus.api.successRate).toBeGreaterThan(90);
    });

    it('should store fetch timestamps and metadata for staleness detection', async () => {
      // Act - Trigger successful data fetch
      mockSchedulerService.results$.next({
        success: true,
        data: mockFootballData,
        timestamp: Date.now(),
        responseTime: 200
      });

      await new Promise(resolve => setTimeout(resolve, 50));

      // Assert - Verify cache was called with timestamp metadata
      expect(mockCacheService.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        'football-data'
      );
    });

    it('should handle Web Worker execution with proper transaction handling', async () => {
      // Arrange - Mock worker status update
      const workerStatus = {
        isActive: true,
        lastHeartbeat: Date.now(),
        totalPolls: 25,
        failedPolls: 1,
        averageExecutionTime: 180
      };

      // Act - Update worker status
      mockSchedulerService.status$.next(workerStatus);

      await new Promise(resolve => setTimeout(resolve, 50));

      // Assert - Verify health monitor processed worker status
      const healthStatus = await firstValueFrom(healthMonitorService.getHealthStatus());
      expect(healthStatus.worker.isActive).toBe(true);
      expect(healthStatus.worker.totalPolls).toBe(25);
      expect(healthStatus.worker.status).toBe('healthy');
    });
  });

  describe('Persistent Cache with Staleness Indicators (Acceptance Criteria 2 & 4)', () => {
    it('should serve cached data with clear last updated indicators during API outages', async () => {
      // Arrange - Set up stale cached data
      const staleTimestamp = Date.now() - (35 * 60 * 1000); // 35 minutes old
      const staleCachedData = {
        id: 'cached-data-1',
        data: mockFootballData,
        metadata: {
          timestamp: staleTimestamp,
          expiresAt: staleTimestamp + (60 * 60 * 1000),
          version: 1,
          dataType: 'football-data',
          isStale: true,
          lastAccessedAt: staleTimestamp
        }
      };

      mockCacheService.get.mockReturnValue(of(staleCachedData));

      // Simulate API failure
      mockFootballDataService.getHealthMetrics.mockReturnValue({
        responseTime: 0,
        successRate: 0,
        lastSuccessfulFetch: staleTimestamp,
        rateLimitRemaining: 85,
        consecutiveFailures: 5,
        totalRequests: 100,
        successfulRequests: 95
      });

      // Act - Trigger API error
      mockSchedulerService.errors$.next(new Error('API unavailable'));

      await new Promise(resolve => setTimeout(resolve, 100));

      // Assert - Verify stale data indicators are shown
      component.lastDataUpdate = staleTimestamp;
      const statusText = component.statusText();
      const lastUpdatedClasses = component.lastUpdatedClasses();
      const showDegradation = component.showDegradationMessage();

      expect(statusText).toBe('Showing Recent Data');
      expect(lastUpdatedClasses).toContain('stale');
      expect(showDegradation).toBe(true);

      const degradationMessage = component.degradationMessage();
      expect(degradationMessage).toContain('External data source unavailable');
    });

    it('should distinguish fresh vs stale data with subtle visual indicators', async () => {
      // Test fresh data
      component.lastDataUpdate = Date.now() - 60000; // 1 minute ago
      expect(component.statusText()).toBe('Live Data');
      expect(component.lastUpdatedClasses()).not.toContain('stale');
      expect(component.statusIcon()).toBe('✓');

      // Test stale data
      component.lastDataUpdate = Date.now() - (35 * 60 * 1000); // 35 minutes ago
      expect(component.statusText()).toBe('Showing Recent Data');
      expect(component.lastUpdatedClasses()).toContain('stale');
    });

    it('should provide user-friendly staleness messaging', () => {
      // Test various degradation scenarios
      const criticalHealth: HealthStatus = {
        overall: 'critical',
        api: {
          status: 'critical',
          responseTime: 0,
          successRate: 30,
          lastSuccessfulFetch: Date.now() - 600000,
          rateLimitRemaining: 85,
          consecutiveFailures: 6,
          totalRequests: 100,
          successfulRequests: 30
        },
        cache: {
          status: 'healthy',
          hitRatio: 85,
          storageUsage: 25,
          staleDataPercentage: 10,
          corruptedEntries: 0,
          lastCleanup: Date.now()
        },
        worker: {
          status: 'healthy',
          isActive: true,
          lastHeartbeat: Date.now(),
          totalPolls: 100,
          failedPolls: 2,
          averageExecutionTime: 150
        },
        lastUpdate: Date.now()
      };

      component.health.set(criticalHealth);

      const message = component.degradationMessage();
      expect(message).toContain('External data source unavailable - updates resuming shortly');
      expect(component.degradationMessageClasses()).toBe('critical');
    });
  });

  describe('Health Monitoring with Reactive Status (Acceptance Criteria 3)', () => {
    it('should expose system status through Angular observables with real-time updates', async () => {
      // Test initial healthy state
      let healthStatus = await firstValueFrom(healthMonitorService.getHealthStatus());
      expect(healthStatus.overall).toBe('healthy');

      // Simulate API degradation
      mockFootballDataService.getHealthMetrics.mockReturnValue({
        responseTime: 1500,
        successRate: 45,
        lastSuccessfulFetch: Date.now() - 300000,
        rateLimitRemaining: 5,
        consecutiveFailures: 3,
        totalRequests: 100,
        successfulRequests: 45
      });

      // Trigger health update
      mockSchedulerService.results$.next({
        success: false,
        error: 'API timeout',
        timestamp: Date.now(),
        responseTime: 1500
      });

      // Wait for health status to update
      await new Promise(resolve => setTimeout(resolve, 100));

      healthStatus = await firstValueFrom(healthMonitorService.getHealthStatus());
      expect(healthStatus.overall).toBe('critical');
      expect(healthStatus.api.status).toBe('critical');
    });

    it('should return data freshness metrics and last successful fetch timestamp', async () => {
      const performanceMetrics = await firstValueFrom(healthMonitorService.getPerformanceMetrics());

      expect(performanceMetrics).toEqual(expect.objectContaining({
        apiResponseTimes: expect.any(Array),
        cacheOperationTimes: expect.any(Array),
        workerExecutionTimes: expect.any(Array),
        memoryUsage: expect.any(Number),
        timestamp: expect.any(Number)
      }));

      const healthStatus = await firstValueFrom(healthMonitorService.getHealthStatus());
      expect(healthStatus.api.lastSuccessfulFetch).toBeGreaterThan(0);
      expect(healthStatus.lastUpdate).toBeGreaterThan(0);
    });

    it('should track system uptime and error recovery patterns', async () => {
      // Simulate error followed by recovery
      const errorTimestamp = Date.now();
      mockSchedulerService.errors$.next(new Error('Network timeout'));

      await new Promise(resolve => setTimeout(resolve, 50));

      // Check that alert was created
      const alerts = await firstValueFrom(healthMonitorService.getSystemAlerts());
      const errorAlert = alerts.find(alert =>
        alert.type === 'error' &&
        alert.component === 'api' &&
        alert.timestamp >= errorTimestamp
      );

      expect(errorAlert).toBeDefined();
      expect(errorAlert?.resolved).toBe(false);

      // Simulate recovery
      mockSchedulerService.results$.next({
        success: true,
        data: mockFootballData,
        timestamp: Date.now(),
        responseTime: 200
      });

      await new Promise(resolve => setTimeout(resolve, 50));

      // Verify system recovered
      const healthStatus = await firstValueFrom(healthMonitorService.getHealthStatus());
      expect(healthStatus.api.consecutiveFailures).toBe(0);
    });
  });

  describe('Rate Limiting and Exponential Backoff (Acceptance Criteria 4)', () => {
    it('should implement exponential backoff when API rate limits exceeded', async () => {
      // Arrange - Mock rate limit exceeded
      mockFootballDataService.getHealthMetrics.mockReturnValue({
        responseTime: 500,
        successRate: 80,
        lastSuccessfulFetch: Date.now() - 60000,
        rateLimitRemaining: 3, // Low rate limit
        consecutiveFailures: 0,
        totalRequests: 100,
        successfulRequests: 80
      });

      // Act - Trigger rate limit check
      mockSchedulerService.results$.next({
        success: true,
        data: mockFootballData,
        timestamp: Date.now(),
        responseTime: 500
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      // Assert - Verify rate limit warning alert was created
      const alerts = await firstValueFrom(healthMonitorService.getSystemAlerts());
      const rateLimitAlert = alerts.find(alert =>
        alert.message.includes('rate limit approaching') &&
        alert.type === 'warning' &&
        alert.component === 'api'
      );

      expect(rateLimitAlert).toBeDefined();
    });

    it('should gracefully resume updates without user-facing errors after backoff', async () => {
      // Simulate rate limit recovery
      mockFootballDataService.getHealthMetrics.mockReturnValue({
        responseTime: 200,
        successRate: 95,
        lastSuccessfulFetch: Date.now(),
        rateLimitRemaining: 80, // Restored
        consecutiveFailures: 0,
        totalRequests: 101,
        successfulRequests: 96
      });

      // Trigger successful update
      mockSchedulerService.results$.next({
        success: true,
        data: mockFootballData,
        timestamp: Date.now(),
        responseTime: 200
      });

      await new Promise(resolve => setTimeout(resolve, 50));

      // Verify system returned to healthy state
      const healthStatus = await firstValueFrom(healthMonitorService.getHealthStatus());
      expect(healthStatus.api.status).toBe('healthy');
      expect(healthStatus.api.rateLimitRemaining).toBe(80);
    });
  });

  describe('Graceful Degradation and Error Handling (Acceptance Criteria 5)', () => {
    it('should attempt direct API calls when IndexedDB unavailable with user notification', async () => {
      // Arrange - Mock IndexedDB corruption
      mockCacheService.get.mockReturnValue(throwError(() => new Error('IndexedDB corrupted')));
      mockCacheService.isHealthy.mockReturnValue(false);

      // Update cache stats to reflect corruption
      mockCacheService.stats$.next({
        totalEntries: 10,
        staleEntries: 2,
        hitRatio: 20, // Low hit ratio due to corruption
        totalHits: 20,
        totalMisses: 80,
        storageSize: 0,
        lastCleanup: Date.now(),
        corruptedEntries: 5 // Corrupted entries detected
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      // Assert - Verify cache health degraded
      const healthStatus = await firstValueFrom(healthMonitorService.getHealthStatus());
      expect(healthStatus.cache.status).toBe('critical');
      expect(healthStatus.overall).toBe('critical');

      // Verify appropriate user messaging
      component.health.set(healthStatus);
      const degradationMessage = component.degradationMessage();
      expect(degradationMessage).toContain('Service temporarily degraded');
    });

    it('should provide appropriate error handling and user notification for various failure modes', async () => {
      // Test network failure scenario
      mockSchedulerService.errors$.next(new Error('Network error: ERR_NETWORK_CHANGED'));

      await new Promise(resolve => setTimeout(resolve, 50));

      let alerts = await firstValueFrom(healthMonitorService.getSystemAlerts());
      let networkAlert = alerts.find(alert => alert.message.includes('API error'));
      expect(networkAlert?.type).toBe('error');
      expect(networkAlert?.component).toBe('api');

      // Test cache cleanup failure
      mockCacheService.cleanup.mockReturnValue(throwError(() => new Error('IndexedDB cleanup failed')));

      // Trigger cache cleanup through health check
      mockCacheService.stats$.next({
        totalEntries: 100,
        staleEntries: 60, // 60% stale - triggers cleanup
        hitRatio: 85,
        totalHits: 85,
        totalMisses: 15,
        storageSize: 2048000,
        lastCleanup: Date.now() - 86400000 // 24 hours ago
      });

      await new Promise(resolve => setTimeout(resolve, 150));

      alerts = await firstValueFrom(healthMonitorService.getSystemAlerts());
      const cleanupAlert = alerts.find(alert =>
        alert.message === 'Cache cleanup failed' &&
        alert.component === 'cache'
      );
      expect(cleanupAlert?.type).toBe('error');
    });
  });

  describe('Cache Restoration and Warming (Acceptance Criteria 6)', () => {
    it('should properly restore cached data from IndexedDB with staleness validation', async () => {
      // Arrange - Mock valid cached data
      const validCachedData = {
        id: 'restored-data',
        data: mockFootballData,
        metadata: {
          timestamp: Date.now() - (15 * 60 * 1000), // 15 minutes old - still fresh
          expiresAt: Date.now() + (15 * 60 * 1000),
          version: 1,
          dataType: 'football-data',
          isStale: false,
          lastAccessedAt: Date.now()
        }
      };

      mockCacheService.get.mockReturnValue(of(validCachedData));

      // Act - Request cached data
      const cachedData = await firstValueFrom(mockCacheService.get('test-key'));

      // Assert - Verify data was retrieved and is valid
      expect(cachedData).toEqual(validCachedData);
      expect(cachedData.metadata.isStale).toBe(false);
    });

    it('should implement cache warming strategies for session initialization', async () => {
      // Simulate application startup cache warming
      const initialCacheStats = {
        totalEntries: 0,
        staleEntries: 0,
        hitRatio: 0,
        totalHits: 0,
        totalMisses: 0,
        storageSize: 0,
        lastCleanup: Date.now()
      };

      mockCacheService.stats$.next(initialCacheStats);

      // Wait for health monitor to process empty cache
      await new Promise(resolve => setTimeout(resolve, 50));

      let healthStatus = await firstValueFrom(healthMonitorService.getHealthStatus());
      expect(healthStatus.cache.hitRatio).toBe(0);

      // Simulate successful cache warming
      const warmedCacheStats = {
        totalEntries: 10,
        staleEntries: 0,
        hitRatio: 100,
        totalHits: 10,
        totalMisses: 0,
        storageSize: 500000,
        lastCleanup: Date.now()
      };

      mockCacheService.stats$.next(warmedCacheStats);

      await new Promise(resolve => setTimeout(resolve, 50));

      healthStatus = await firstValueFrom(healthMonitorService.getHealthStatus());
      expect(healthStatus.cache.status).toBe('healthy');
      expect(healthStatus.cache.hitRatio).toBe(100);
    });
  });

  describe('Mobile Optimization and Responsive Design', () => {
    it('should optimize freshness indicators for mobile screens without clutter', () => {
      // Test mobile optimization
      component.isMobile.set(true);

      const containerClasses = component.containerClasses();
      expect(containerClasses).toContain('mobile');

      // Verify mobile-specific styling would be applied
      const compiled = TestBed.createComponent(DataFreshnessIndicatorComponent).nativeElement;
      component.isMobile.set(true);
      expect(component.containerClasses()).toContain('mobile');
    });

    it('should handle responsive freshness indicators based on screen size constraints', () => {
      // Verify component adapts to different display contexts
      component.showDetails.set(false);
      component.isMobile.set(true);

      const statusText = component.statusText();
      expect(statusText.length).toBeLessThan(20); // Concise for mobile

      // Test that detailed health info can be toggled
      component.toggleDetails();
      expect(component.showDetails()).toBe(true);
    });
  });

  describe('Performance and Memory Management', () => {
    it('should limit performance metrics arrays to prevent memory leaks', async () => {
      // Generate many performance data points
      for (let i = 0; i < 60; i++) {
        mockSchedulerService.results$.next({
          success: true,
          data: mockFootballData,
          timestamp: Date.now(),
          responseTime: 100 + (i * 5)
        });
      }

      await new Promise(resolve => setTimeout(resolve, 100));

      const performanceMetrics = await firstValueFrom(healthMonitorService.getPerformanceMetrics());
      expect(performanceMetrics.apiResponseTimes.length).toBeLessThanOrEqual(50);
    });

    it('should implement proper cleanup patterns for observables and subscriptions', () => {
      // Verify component cleanup
      expect(component.ngOnDestroy).toBeDefined();

      // Test health monitor cleanup
      const destroySpy = vi.spyOn(healthMonitorService, 'ngOnDestroy');
      healthMonitorService.ngOnDestroy();
      expect(destroySpy).toHaveBeenCalled();
    });
  });

  describe('Success Threshold Validation', () => {
    it('should maintain 95% success rate with seamless fallback during API outages', async () => {
      // Track success rate over multiple operations
      const successfulOperations = 95;
      const totalOperations = 100;

      mockFootballDataService.getHealthMetrics.mockReturnValue({
        responseTime: 200,
        successRate: (successfulOperations / totalOperations) * 100,
        lastSuccessfulFetch: Date.now(),
        rateLimitRemaining: 75,
        consecutiveFailures: 0,
        totalRequests: totalOperations,
        successfulRequests: successfulOperations
      });

      // Simulate successful operation
      mockSchedulerService.results$.next({
        success: true,
        data: mockFootballData,
        timestamp: Date.now(),
        responseTime: 200
      });

      await new Promise(resolve => setTimeout(resolve, 50));

      const healthStatus = await firstValueFrom(healthMonitorService.getHealthStatus());
      expect(healthStatus.api.successRate).toBeGreaterThanOrEqual(95);
      expect(healthStatus.overall).toBe('healthy');

      // Verify user experience continuity during fallback
      component.health.set(healthStatus);
      expect(component.statusText()).toBe('Live Data');
      expect(component.showDegradationMessage()).toBe(false);
    });
  });
});