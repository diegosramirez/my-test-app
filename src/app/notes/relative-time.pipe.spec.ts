import { RelativeTimePipe } from './relative-time.pipe';

describe('RelativeTimePipe', () => {
  const pipe = new RelativeTimePipe();

  it('should return "just now" for recent timestamps', () => {
    expect(pipe.transform(new Date().toISOString())).toBe('just now');
  });

  it('should return minutes ago', () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(pipe.transform(fiveMinAgo)).toBe('5 min ago');
  });

  it('should return hours ago', () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    expect(pipe.transform(threeHoursAgo)).toBe('3h ago');
  });

  it('should return Yesterday', () => {
    const yesterday = new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString();
    expect(pipe.transform(yesterday)).toBe('Yesterday');
  });

  it('should return days ago', () => {
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    expect(pipe.transform(fiveDaysAgo)).toBe('5d ago');
  });

  it('should return empty string for empty input', () => {
    expect(pipe.transform('')).toBe('');
  });
});
