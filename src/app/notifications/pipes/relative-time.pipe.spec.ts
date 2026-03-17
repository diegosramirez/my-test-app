import { describe, it, expect } from 'vitest';
import { RelativeTimePipe } from './relative-time.pipe';

describe('RelativeTimePipe', () => {
  const pipe = new RelativeTimePipe();

  it('should transform an ISO string to relative time', () => {
    const recent = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(pipe.transform(recent)).toBe('5m ago');
  });

  it('should return "just now" for very recent timestamps', () => {
    expect(pipe.transform(new Date().toISOString())).toBe('just now');
  });

  it('should accept optional refreshTick argument without error', () => {
    const iso = new Date(Date.now() - 120000).toISOString();
    expect(pipe.transform(iso, 1)).toBe('2m ago');
  });
});
