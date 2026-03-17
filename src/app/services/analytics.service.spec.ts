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

  it('should have a track method', () => {
    expect(typeof service.track).toBe('function');
  });

  it('should call console.debug in dev mode', () => {
    const spy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    service.track('test_event', { key: 'value' });
    expect(spy).toHaveBeenCalledWith('[Analytics] test_event', { key: 'value' });
    spy.mockRestore();
  });

  it('should accept arbitrary meta properties', () => {
    const spy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    service.track('nav_link_clicked', { route_path: '/budget' });
    expect(spy).toHaveBeenCalledWith('[Analytics] nav_link_clicked', { route_path: '/budget' });
    spy.mockRestore();
  });
});
