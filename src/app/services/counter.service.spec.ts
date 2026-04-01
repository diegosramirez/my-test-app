import { CounterService } from './counter.service';

describe('CounterService', () => {
  let service: CounterService;

  beforeEach(() => {
    service = new CounterService();
  });

  it('should have initial state of 0 counter, empty history, 0 actionCount', () => {
    expect(service.counter()).toBe(0);
    expect(service.history()).toEqual([]);
    expect(service.actionCount()).toBe(0);
  });

  it('should increment counter and append +1 to history', () => {
    service.increment();
    expect(service.counter()).toBe(1);
    expect(service.history()).toEqual(['+1']);
    expect(service.actionCount()).toBe(1);
  });

  it('should decrement counter and append -1 to history', () => {
    service.decrement();
    expect(service.counter()).toBe(-1);
    expect(service.history()).toEqual(['-1']);
    expect(service.actionCount()).toBe(1);
  });

  it('should reset counter to 0 and append reset to history', () => {
    service.increment();
    service.increment();
    service.reset();
    expect(service.counter()).toBe(0);
    expect(service.history()).toEqual(['+1', '+1', 'reset']);
    expect(service.actionCount()).toBe(3);
  });

  it('should reset even when counter is already 0', () => {
    service.reset();
    expect(service.counter()).toBe(0);
    expect(service.history()).toEqual(['reset']);
    expect(service.actionCount()).toBe(1);
  });

  it('should handle negative values', () => {
    service.decrement();
    service.decrement();
    service.decrement();
    expect(service.counter()).toBe(-3);
    expect(service.actionCount()).toBe(3);
  });

  it('should derive actionCount from history length', () => {
    service.increment();
    service.decrement();
    service.reset();
    service.increment();
    expect(service.actionCount()).toBe(service.history().length);
    expect(service.actionCount()).toBe(4);
  });

  it('should handle rapid sequential operations', () => {
    for (let i = 0; i < 100; i++) {
      service.increment();
    }
    expect(service.counter()).toBe(100);
    expect(service.actionCount()).toBe(100);
  });

  it('should reset from negative value', () => {
    service.decrement();
    service.decrement();
    service.reset();
    expect(service.counter()).toBe(0);
    expect(service.history()).toEqual(['-1', '-1', 'reset']);
  });

  it('should allow multiple resets in a row', () => {
    service.reset();
    service.reset();
    service.reset();
    expect(service.counter()).toBe(0);
    expect(service.actionCount()).toBe(3);
    expect(service.history()).toEqual(['reset', 'reset', 'reset']);
  });

  it('should produce new array references on history updates', () => {
    service.increment();
    const ref1 = service.history();
    service.increment();
    const ref2 = service.history();
    expect(ref1).not.toBe(ref2);
  });

  it('should maintain chronological order in source history', () => {
    service.increment();
    service.decrement();
    service.reset();
    expect(service.history()).toEqual(['+1', '-1', 'reset']);
  });

  it('should increment from negative value', () => {
    service.decrement();
    service.decrement();
    service.increment();
    expect(service.counter()).toBe(-1);
    expect(service.history()).toEqual(['-1', '-1', '+1']);
  });
});
