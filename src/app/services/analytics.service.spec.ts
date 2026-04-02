import { AnalyticsService } from './analytics.service';

describe('AnalyticsService', () => {
  let service: AnalyticsService;

  beforeEach(() => {
    service = new AnalyticsService();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should log to console when track is called', () => {
    const spy = vi.spyOn(console, 'log');
    service.track('test_event', { key: 'value' });
    expect(spy).toHaveBeenCalledWith('[Analytics] test_event', { key: 'value' });
    spy.mockRestore();
  });

  it('should accept empty meta', () => {
    const spy = vi.spyOn(console, 'log');
    service.track('empty_meta', {});
    expect(spy).toHaveBeenCalledWith('[Analytics] empty_meta', {});
    spy.mockRestore();
  });
});
