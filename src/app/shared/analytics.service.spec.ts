import { TestBed } from '@angular/core/testing';
import { AnalyticsService } from './analytics.service';

describe('AnalyticsService', () => {
  let service: AnalyticsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AnalyticsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should be a singleton (providedIn root)', () => {
    const service2 = TestBed.inject(AnalyticsService);
    expect(service).toBe(service2);
  });

  it('should log to console.debug when track is called', () => {
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    service.track('test_event', { key: 'value' });
    expect(debugSpy).toHaveBeenCalledWith('[Analytics] test_event', { key: 'value' });
    debugSpy.mockRestore();
  });

  it('should accept any event name and meta object', () => {
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    expect(() => service.track('', {})).not.toThrow();
    expect(() => service.track('health_check_requested', { timestamp: 'x', uptime: 0, status: 'UP' })).not.toThrow();
    debugSpy.mockRestore();
  });
});
