import { TestBed } from '@angular/core/testing';
import { HealthService } from './health.service';
import { HealthResponse } from './health.model';

describe('HealthService', () => {
  let service: HealthService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(HealthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return status UP', () => {
    const health: HealthResponse = service.getHealth();
    expect(health.status).toBe('UP');
  });

  it('should return uptime as a non-negative integer', () => {
    const health = service.getHealth();
    expect(typeof health.uptime).toBe('number');
    expect(health.uptime).toBeGreaterThanOrEqual(0);
    expect(health.uptime).toBe(Math.floor(health.uptime));
  });

  it('should return a valid ISO 8601 timestamp', () => {
    const health = service.getHealth();
    const parsed = new Date(health.timestamp);
    expect(parsed.toISOString()).toBe(health.timestamp);
  });

  it('should return HealthResponse with all required fields', () => {
    const health = service.getHealth();
    expect(health).toHaveProperty('status');
    expect(health).toHaveProperty('uptime');
    expect(health).toHaveProperty('timestamp');
  });

  it('should use performance.now() for monotonic uptime', () => {
    const perfSpy = vi.spyOn(performance, 'now');
    service.getHealth();
    expect(perfSpy).toHaveBeenCalled();
    perfSpy.mockRestore();
  });

  it('should be a singleton (same instance from root injector)', () => {
    const service2 = TestBed.inject(HealthService);
    expect(service).toBe(service2);
  });

  it('should calculate uptime accurately within ±2s tolerance', () => {
    // Mock performance.now to control the start mark and elapsed time
    const mockStart = 1000;
    const mockCurrent = 6000; // 5 seconds later
    const perfSpy = vi.spyOn(performance, 'now').mockReturnValue(mockStart);

    const freshService = new HealthService();

    // Now simulate 5 seconds passing
    perfSpy.mockReturnValue(mockCurrent);

    const health = freshService.getHealth();
    expect(health.uptime).toBe(5);

    vi.restoreAllMocks();
  });
});
