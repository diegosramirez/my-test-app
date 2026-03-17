import { TestBed } from '@angular/core/testing';
import { AnalyticsService } from './analytics.service';

describe('AnalyticsService', () => {
  let service: AnalyticsService;

  beforeEach(() => {
    service = TestBed.inject(AnalyticsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should call console.debug on track', () => {
    const spy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    service.track('test_event', { key: 'value' });
    expect(spy).toHaveBeenCalledWith('[Analytics] test_event', { key: 'value' });
    spy.mockRestore();
  });
});
