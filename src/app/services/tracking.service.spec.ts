import { TestBed } from '@angular/core/testing';
import { TrackingService } from './tracking.service';

describe('TrackingService', () => {
  let service: TrackingService;

  beforeEach(() => {
    service = TestBed.inject(TrackingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should call console.debug when track is called', () => {
    const spy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const event = { eventName: 'counter_increment' as const, previousValue: 0, newValue: 1 };
    service.track(event);
    expect(spy).toHaveBeenCalledWith('[tracking]', 'counter_increment', event);
    spy.mockRestore();
  });
});
