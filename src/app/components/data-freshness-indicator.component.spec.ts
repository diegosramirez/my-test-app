import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { DataFreshnessIndicatorComponent } from './data-freshness-indicator.component';
import { HealthMonitorService } from '../services/health-monitor.service';
import { CacheService } from '../services/cache.service';
import { HealthStatus } from '../interfaces/health.interface';

describe('DataFreshnessIndicatorComponent', () => {
  let component: DataFreshnessIndicatorComponent;
  let fixture: ComponentFixture<DataFreshnessIndicatorComponent>;
  let mockHealthMonitorService: any;
  let mockCacheService: any;

  const mockHealthyStatus: HealthStatus = {
    overall: 'healthy',
    api: {
      status: 'healthy',
      responseTime: 150,
      successRate: 95,
      lastSuccessfulFetch: Date.now(),
      rateLimitRemaining: 80,
      consecutiveFailures: 0,
      totalRequests: 100,
      successfulRequests: 95
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
      averageExecutionTime: 500
    },
    lastUpdate: Date.now()
  };

  const mockWarningStatus: HealthStatus = {
    ...mockHealthyStatus,
    overall: 'warning',
    api: {
      ...mockHealthyStatus.api,
      status: 'warning',
      rateLimitRemaining: 5
    }
  };

  const mockCriticalStatus: HealthStatus = {
    ...mockHealthyStatus,
    overall: 'critical',
    api: {
      ...mockHealthyStatus.api,
      status: 'critical',
      consecutiveFailures: 5
    },
    worker: {
      ...mockHealthyStatus.worker,
      status: 'critical',
      isActive: false
    }
  };

  beforeEach(async () => {
    mockHealthMonitorService = {
      getHealthStatus: vi.fn(() => of(mockHealthyStatus))
    };

    mockCacheService = {
      stats$: of({
        totalEntries: 50,
        staleEntries: 5,
        hitRatio: 85,
        totalHits: 100,
        totalMisses: 15,
        storageSize: 1024000,
        lastCleanup: Date.now()
      })
    };

    await TestBed.configureTestingModule({
      imports: [DataFreshnessIndicatorComponent],
      providers: [
        { provide: HealthMonitorService, useValue: mockHealthMonitorService },
        { provide: CacheService, useValue: mockCacheService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DataFreshnessIndicatorComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display healthy status correctly', () => {
    mockHealthMonitorService.getHealthStatus.mockReturnValue(of(mockHealthyStatus));

    fixture.detectChanges();

    const statusText = component.statusText();
    const statusIcon = component.statusIcon();

    expect(statusText).toBe('Live Data');
    expect(statusIcon).toBe('✓');

    const containerClasses = component.containerClasses();
    expect(containerClasses).toContain('healthy');
  });

  it('should display warning status correctly', () => {
    mockHealthMonitorService.getHealthStatus.mockReturnValue(of(mockWarningStatus));

    fixture.detectChanges();

    const statusText = component.statusText();
    const statusIcon = component.statusIcon();

    expect(statusText).toBe('Limited Service');
    expect(statusIcon).toBe('⚠');

    const containerClasses = component.containerClasses();
    expect(containerClasses).toContain('warning');
  });

  it('should display critical status correctly', () => {
    mockHealthMonitorService.getHealthStatus.mockReturnValue(of(mockCriticalStatus));

    fixture.detectChanges();

    const statusText = component.statusText();
    const statusIcon = component.statusIcon();

    expect(statusText).toBe('Service Issues');
    expect(statusIcon).toBe('⚠');

    const containerClasses = component.containerClasses();
    expect(containerClasses).toContain('critical');
  });

  it('should show stale data indicator when data is old', () => {
    const oldTimestamp = Date.now() - (35 * 60 * 1000); // 35 minutes ago
    component.lastDataUpdate = oldTimestamp;

    fixture.detectChanges();

    const statusText = component.statusText();
    expect(statusText).toBe('Showing Recent Data');

    const lastUpdatedClasses = component.lastUpdatedClasses();
    expect(lastUpdatedClasses).toContain('stale');
  });

  it('should format relative time correctly', () => {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const oneHourAgo = now - 3600000;
    const oneDayAgo = now - 86400000;

    // Test with recent timestamp
    component.lastDataUpdate = now - 30000; // 30 seconds ago
    fixture.detectChanges();
    expect(component.lastUpdatedText()).toBe('Updated just now');

    // Test with 1 minute ago
    component.lastDataUpdate = oneMinuteAgo;
    fixture.detectChanges();
    expect(component.lastUpdatedText()).toBe('Updated 1 minute ago');

    // Test with 1 hour ago
    component.lastDataUpdate = oneHourAgo;
    fixture.detectChanges();
    expect(component.lastUpdatedText()).toBe('Updated 1 hour ago');

    // Test with 1 day ago
    component.lastDataUpdate = oneDayAgo;
    fixture.detectChanges();
    expect(component.lastUpdatedText()).toBe('Updated 1 day ago');
  });

  it('should show degradation message for non-healthy states', () => {
    mockHealthMonitorService.getHealthStatus.mockReturnValue(of(mockCriticalStatus));

    fixture.detectChanges();

    const showMessage = component.showDegradationMessage();
    expect(showMessage).toBe(true);

    const message = component.degradationMessage();
    expect(message).toContain('Background updates paused');
  });

  it('should hide degradation message for healthy state', () => {
    mockHealthMonitorService.getHealthStatus.mockReturnValue(of(mockHealthyStatus));

    fixture.detectChanges();

    const showMessage = component.showDegradationMessage();
    expect(showMessage).toBe(false);
  });

  it('should apply mobile classes when isMobile is true', () => {
    component.isMobile.set(true);
    fixture.detectChanges();

    const containerClasses = component.containerClasses();
    expect(containerClasses).toContain('mobile');
  });

  it('should toggle details visibility', () => {
    expect(component.showDetails()).toBe(false);

    component.toggleDetails();
    expect(component.showDetails()).toBe(true);

    component.toggleDetails();
    expect(component.showDetails()).toBe(false);
  });

  it('should handle refresh action', () => {
    const consoleSpy = vi.spyOn(console, 'log');

    component.refresh();

    expect(consoleSpy).toHaveBeenCalledWith('Manual refresh requested');
  });

  it('should render health details when showDetails is true', () => {
    component.showDetails.set(true);
    mockHealthMonitorService.getHealthStatus.mockReturnValue(of(mockHealthyStatus));

    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const healthDetails = compiled.querySelector('.health-details');

    expect(healthDetails).toBeTruthy();
    expect(healthDetails?.textContent).toContain('API:');
    expect(healthDetails?.textContent).toContain('Cache:');
    expect(healthDetails?.textContent).toContain('Worker:');
  });

  it('should not render health details when showDetails is false', () => {
    component.showDetails.set(false);

    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const healthDetails = compiled.querySelector('.health-details');

    expect(healthDetails).toBeFalsy();
  });
});