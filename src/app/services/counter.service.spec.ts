import { TestBed } from '@angular/core/testing';
import { CounterService } from './counter.service';

describe('CounterService', () => {
  let service: CounterService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CounterService);
  });

  it('should start with count 0 and empty history', () => {
    expect(service.count()).toBe(0);
    expect(service.history()).toEqual([]);
  });

  it('should increment the counter', () => {
    service.increment();
    expect(service.count()).toBe(1);
    expect(service.history().length).toBe(1);
    expect(service.history()[0].action).toBe('+1');
    expect(service.history()[0].resultingValue).toBe(1);
  });

  it('should decrement the counter including negative', () => {
    service.decrement();
    expect(service.count()).toBe(-1);
    expect(service.history()[0].action).toBe('-1');
    expect(service.history()[0].resultingValue).toBe(-1);
  });

  it('should reset the counter', () => {
    service.increment();
    service.increment();
    service.reset();
    expect(service.count()).toBe(0);
    const last = service.history()[service.history().length - 1];
    expect(last.action).toBe('reset');
    expect(last.resultingValue).toBe(0);
  });

  it('should reset from zero and still add history entry', () => {
    service.reset();
    expect(service.count()).toBe(0);
    expect(service.history().length).toBe(1);
    expect(service.history()[0].action).toBe('reset');
  });

  it('should log counter_incremented on increment', () => {
    const spy = vi.spyOn(console, 'log');
    service.increment();
    expect(spy).toHaveBeenCalledWith('counter_incremented', { newValue: 1, action: '+1' });
  });

  it('should log counter_decremented on decrement', () => {
    const spy = vi.spyOn(console, 'log');
    service.decrement();
    expect(spy).toHaveBeenCalledWith('counter_decremented', { newValue: -1, action: '-1' });
  });

  it('should log counter_reset with previousValue on reset', () => {
    service.increment();
    service.increment();
    const spy = vi.spyOn(console, 'log');
    service.reset();
    expect(spy).toHaveBeenCalledWith('counter_reset', { previousValue: 2, action: 'reset' });
  });

  it('should store history entries with timestamps', () => {
    service.increment();
    const entry = service.history()[0];
    expect(entry.timestamp).toBeInstanceOf(Date);
  });

  it('should accumulate multiple actions in order', () => {
    service.increment();
    service.increment();
    service.decrement();
    service.reset();
    expect(service.history().length).toBe(4);
    expect(service.history().map(e => e.action)).toEqual(['+1', '+1', '-1', 'reset']);
  });
});
