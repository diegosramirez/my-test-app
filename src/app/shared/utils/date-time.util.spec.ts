import { describe, expect, test, beforeEach, afterEach, vi } from 'vitest';
import { formatRelativeTime } from './date-time.util';

describe('formatRelativeTime', () => {
  const FIXED_TIME = '2024-01-15T12:00:00.000Z';
  const FIXED_TIMESTAMP = new Date(FIXED_TIME).getTime();

  beforeEach(() => {
    // Mock the current time to ensure consistent test results
    vi.useFakeTimers();
    vi.setSystemTime(new Date(FIXED_TIME));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Recent times (less than 1 hour)', () => {
    test('returns "just now" for current time', () => {
      const now = new Date(FIXED_TIME);
      expect(formatRelativeTime(now)).toBe('just now');
    });

    test('returns "just now" for time within 30 seconds', () => {
      const recent = new Date(FIXED_TIMESTAMP - 30000); // 30 seconds ago
      expect(formatRelativeTime(recent)).toBe('just now');
    });

    test('returns "1 minute ago" for 1 minute ago', () => {
      const oneMinute = new Date(FIXED_TIMESTAMP - 60000); // 1 minute ago
      expect(formatRelativeTime(oneMinute)).toBe('1 minute ago');
    });

    test('returns "5 minutes ago" for 5 minutes ago', () => {
      const fiveMinutes = new Date(FIXED_TIMESTAMP - 300000); // 5 minutes ago
      expect(formatRelativeTime(fiveMinutes)).toBe('5 minutes ago');
    });

    test('returns "59 minutes ago" for 59 minutes ago', () => {
      const fiftyNineMinutes = new Date(FIXED_TIMESTAMP - 59 * 60000); // 59 minutes ago
      expect(formatRelativeTime(fiftyNineMinutes)).toBe('59 minutes ago');
    });
  });

  describe('Hourly ranges (1-23 hours)', () => {
    test('returns "1 hour ago" for 1 hour ago', () => {
      const oneHour = new Date(FIXED_TIMESTAMP - 3600000); // 1 hour ago
      expect(formatRelativeTime(oneHour)).toBe('1 hour ago');
    });

    test('returns "2 hours ago" for 2 hours ago', () => {
      const twoHours = new Date(FIXED_TIMESTAMP - 2 * 3600000); // 2 hours ago
      expect(formatRelativeTime(twoHours)).toBe('2 hours ago');
    });

    test('returns "23 hours ago" for 23 hours ago', () => {
      const twentyThreeHours = new Date(FIXED_TIMESTAMP - 23 * 3600000); // 23 hours ago
      expect(formatRelativeTime(twentyThreeHours)).toBe('23 hours ago');
    });
  });

  describe('Daily ranges (1-6 days)', () => {
    test('returns "yesterday" for exactly 1 day ago', () => {
      const yesterday = new Date(FIXED_TIMESTAMP - 24 * 3600000); // 1 day ago
      expect(formatRelativeTime(yesterday)).toBe('yesterday');
    });

    test('returns "2 days ago" for 2 days ago', () => {
      const twoDays = new Date(FIXED_TIMESTAMP - 2 * 24 * 3600000); // 2 days ago
      expect(formatRelativeTime(twoDays)).toBe('2 days ago');
    });

    test('returns "6 days ago" for 6 days ago', () => {
      const sixDays = new Date(FIXED_TIMESTAMP - 6 * 24 * 3600000); // 6 days ago
      expect(formatRelativeTime(sixDays)).toBe('6 days ago');
    });
  });

  describe('Weekly ranges (1-4 weeks)', () => {
    test('returns "1 week ago" for exactly 1 week ago', () => {
      const oneWeek = new Date(FIXED_TIMESTAMP - 7 * 24 * 3600000); // 1 week ago
      expect(formatRelativeTime(oneWeek)).toBe('1 week ago');
    });

    test('returns "2 weeks ago" for 2 weeks ago', () => {
      const twoWeeks = new Date(FIXED_TIMESTAMP - 14 * 24 * 3600000); // 2 weeks ago
      expect(formatRelativeTime(twoWeeks)).toBe('2 weeks ago');
    });

    test('returns "4 weeks ago" for 4 weeks ago', () => {
      const fourWeeks = new Date(FIXED_TIMESTAMP - 28 * 24 * 3600000); // 4 weeks ago
      expect(formatRelativeTime(fourWeeks)).toBe('4 weeks ago');
    });
  });

  describe('Monthly ranges (1-11 months)', () => {
    test('returns "1 month ago" for 1 month ago', () => {
      const oneMonth = new Date(FIXED_TIMESTAMP - 30 * 24 * 3600000); // ~1 month ago
      expect(formatRelativeTime(oneMonth)).toBe('1 month ago');
    });

    test('returns "6 months ago" for 6 months ago', () => {
      const sixMonths = new Date(FIXED_TIMESTAMP - 180 * 24 * 3600000); // ~6 months ago
      expect(formatRelativeTime(sixMonths)).toBe('6 months ago');
    });

    test('returns "11 months ago" for 11 months ago', () => {
      const elevenMonths = new Date(FIXED_TIMESTAMP - 330 * 24 * 3600000); // ~11 months ago
      expect(formatRelativeTime(elevenMonths)).toBe('11 months ago');
    });
  });

  describe('Yearly ranges (12+ months)', () => {
    test('returns "1 year ago" for exactly 1 year ago', () => {
      const oneYear = new Date(FIXED_TIMESTAMP - 365 * 24 * 3600000); // 1 year ago
      expect(formatRelativeTime(oneYear)).toBe('1 year ago');
    });

    test('returns "2 years ago" for 2 years ago', () => {
      const twoYears = new Date(FIXED_TIMESTAMP - 2 * 365 * 24 * 3600000); // 2 years ago
      expect(formatRelativeTime(twoYears)).toBe('2 years ago');
    });

    test('returns "10 years ago" for very old dates', () => {
      const tenYears = new Date(FIXED_TIMESTAMP - 10 * 365 * 24 * 3600000); // 10 years ago
      expect(formatRelativeTime(tenYears)).toBe('10 years ago');
    });
  });

  describe('Future dates', () => {
    test('returns "in X seconds" for near future (less than 1 minute)', () => {
      const nearFuture = new Date(FIXED_TIMESTAMP + 30000); // 30 seconds future
      expect(formatRelativeTime(nearFuture)).toBe('in 30 seconds');
    });

    test('returns "in a moment" for very near future (less than 5 seconds)', () => {
      const veryNearFuture = new Date(FIXED_TIMESTAMP + 3000); // 3 seconds future
      expect(formatRelativeTime(veryNearFuture)).toBe('in a moment');
    });

    test('returns "in 1 minute" for 1 minute future', () => {
      const oneMinuteF = new Date(FIXED_TIMESTAMP + 60000); // 1 minute future
      expect(formatRelativeTime(oneMinuteF)).toBe('in 1 minute');
    });

    test('returns "in 5 minutes" for 5 minutes future', () => {
      const fiveMinutesF = new Date(FIXED_TIMESTAMP + 5 * 60000); // 5 minutes future
      expect(formatRelativeTime(fiveMinutesF)).toBe('in 5 minutes');
    });

    test('returns "in 1 hour" for 1 hour future', () => {
      const oneHourF = new Date(FIXED_TIMESTAMP + 3600000); // 1 hour future
      expect(formatRelativeTime(oneHourF)).toBe('in 1 hour');
    });

    test('returns "tomorrow" for exactly 1 day future', () => {
      const tomorrow = new Date(FIXED_TIMESTAMP + 24 * 3600000); // 1 day future
      expect(formatRelativeTime(tomorrow)).toBe('tomorrow');
    });

    test('returns "in 2 days" for 2 days future', () => {
      const twoDaysF = new Date(FIXED_TIMESTAMP + 2 * 24 * 3600000); // 2 days future
      expect(formatRelativeTime(twoDaysF)).toBe('in 2 days');
    });

    test('returns "in 1 week" for 1 week future', () => {
      const oneWeekF = new Date(FIXED_TIMESTAMP + 7 * 24 * 3600000); // 1 week future
      expect(formatRelativeTime(oneWeekF)).toBe('in 1 week');
    });

    test('returns "in 1 month" for 1 month future', () => {
      const oneMonthF = new Date(FIXED_TIMESTAMP + 30 * 24 * 3600000); // 1 month future
      expect(formatRelativeTime(oneMonthF)).toBe('in 1 month');
    });

    test('returns "in 1 year" for 1 year future', () => {
      const oneYearF = new Date(FIXED_TIMESTAMP + 365 * 24 * 3600000); // 1 year future
      expect(formatRelativeTime(oneYearF)).toBe('in 1 year');
    });
  });

  describe('Input type handling', () => {
    test('accepts Date objects', () => {
      const date = new Date(FIXED_TIMESTAMP - 3600000);
      expect(formatRelativeTime(date)).toBe('1 hour ago');
    });

    test('accepts ISO date strings', () => {
      const isoString = new Date(FIXED_TIMESTAMP - 3600000).toISOString();
      expect(formatRelativeTime(isoString)).toBe('1 hour ago');
    });

    test('accepts other valid date string formats', () => {
      const dateString = 'January 15, 2024 11:00:00 UTC';
      expect(formatRelativeTime(dateString)).toBe('1 hour ago');
    });
  });

  describe('Error handling', () => {
    test('returns "Invalid date" for invalid date strings', () => {
      expect(formatRelativeTime('not-a-date')).toBe('Invalid date');
    });

    test('returns "Invalid date" for invalid Date objects', () => {
      expect(formatRelativeTime(new Date('invalid'))).toBe('Invalid date');
    });

    test('returns "Invalid date" for null input', () => {
      expect(formatRelativeTime(null as any)).toBe('Invalid date');
    });

    test('returns "Invalid date" for undefined input', () => {
      expect(formatRelativeTime(undefined as any)).toBe('Invalid date');
    });

    test('returns "Invalid date" for empty string', () => {
      expect(formatRelativeTime('')).toBe('Invalid date');
    });

    test('returns "Invalid date" for number input', () => {
      expect(formatRelativeTime(123456 as any)).toBe('Invalid date');
    });

    test('returns "Invalid date" for object input', () => {
      expect(formatRelativeTime({} as any)).toBe('Invalid date');
    });

    test('never throws exceptions for any input', () => {
      const invalidInputs = [
        null,
        undefined,
        '',
        'invalid-date',
        123,
        {},
        [],
        true,
        false,
        Symbol('test'),
        new Date('invalid')
      ];

      invalidInputs.forEach(input => {
        expect(() => formatRelativeTime(input as any)).not.toThrow();
        expect(formatRelativeTime(input as any)).toBe('Invalid date');
      });
    });
  });

  describe('Edge cases and boundaries', () => {
    test('handles exact minute boundary', () => {
      const exactMinute = new Date(FIXED_TIMESTAMP - 60000); // Exactly 1 minute
      expect(formatRelativeTime(exactMinute)).toBe('1 minute ago');
    });

    test('handles exact hour boundary', () => {
      const exactHour = new Date(FIXED_TIMESTAMP - 3600000); // Exactly 1 hour
      expect(formatRelativeTime(exactHour)).toBe('1 hour ago');
    });

    test('handles exact day boundary', () => {
      const exactDay = new Date(FIXED_TIMESTAMP - 24 * 3600000); // Exactly 1 day
      expect(formatRelativeTime(exactDay)).toBe('yesterday');
    });

    test('handles exact week boundary', () => {
      const exactWeek = new Date(FIXED_TIMESTAMP - 7 * 24 * 3600000); // Exactly 1 week
      expect(formatRelativeTime(exactWeek)).toBe('1 week ago');
    });

    test('handles leap year considerations', () => {
      // Test a date that would be affected by leap year
      const leapYearDate = new Date('2024-02-29T12:00:00.000Z'); // Feb 29 in leap year
      vi.setSystemTime(new Date('2025-02-28T12:00:00.000Z')); // Almost a year later (364 days)
      expect(formatRelativeTime(leapYearDate)).toBe('1 year ago'); // 364 days is close enough to be considered 1 year
    });

    test('handles month boundary edge cases', () => {
      // Test month transitions
      vi.setSystemTime(new Date('2024-03-31T12:00:00.000Z'));
      const lastMonth = new Date('2024-02-29T12:00:00.000Z'); // Leap year Feb
      expect(formatRelativeTime(lastMonth)).toBe('1 month ago');
    });

    test('handles very old dates consistently', () => {
      const veryOld = new Date(FIXED_TIMESTAMP - 50 * 365 * 24 * 3600000); // 50 years ago
      expect(formatRelativeTime(veryOld)).toBe('50 years ago');
    });

    test('handles very far future dates consistently', () => {
      const veryFuture = new Date(FIXED_TIMESTAMP + 50 * 365 * 24 * 3600000); // 50 years future
      expect(formatRelativeTime(veryFuture)).toBe('in 50 years');
    });
  });

  describe('Performance requirements', () => {
    test('executes within performance threshold (<1ms)', () => {
      const testDate = new Date(FIXED_TIMESTAMP - 3600000);

      // Warmup run
      formatRelativeTime(testDate);

      const start = performance.now();
      formatRelativeTime(testDate);
      const end = performance.now();

      expect(end - start).toBeLessThan(1); // Less than 1ms
    });

    test('performs consistently across multiple calls', () => {
      const testDates = [
        new Date(FIXED_TIMESTAMP),
        new Date(FIXED_TIMESTAMP - 60000),
        new Date(FIXED_TIMESTAMP - 3600000),
        new Date(FIXED_TIMESTAMP - 24 * 3600000),
        new Date(FIXED_TIMESTAMP + 3600000)
      ];

      const times: number[] = [];

      testDates.forEach(date => {
        const start = performance.now();
        formatRelativeTime(date);
        const end = performance.now();
        times.push(end - start);
      });

      // All calls should be under 1ms
      times.forEach(time => {
        expect(time).toBeLessThan(1);
      });

      // Average should be well under threshold
      const average = times.reduce((sum, time) => sum + time, 0) / times.length;
      expect(average).toBeLessThan(0.5);
    });

    test('handles high-frequency scenarios efficiently', () => {
      const testCount = 100;
      const testDate = new Date(FIXED_TIMESTAMP - 3600000);

      const start = performance.now();

      for (let i = 0; i < testCount; i++) {
        formatRelativeTime(testDate);
      }

      const end = performance.now();
      const averageTime = (end - start) / testCount;

      expect(averageTime).toBeLessThan(1); // Average per call under 1ms
    });
  });

  describe('Singular/plural form accuracy', () => {
    test('uses singular form for 1 unit', () => {
      expect(formatRelativeTime(new Date(FIXED_TIMESTAMP - 60000))).toBe('1 minute ago');
      expect(formatRelativeTime(new Date(FIXED_TIMESTAMP - 3600000))).toBe('1 hour ago');
      expect(formatRelativeTime(new Date(FIXED_TIMESTAMP - 24 * 3600000))).toBe('yesterday');
      expect(formatRelativeTime(new Date(FIXED_TIMESTAMP - 7 * 24 * 3600000))).toBe('1 week ago');
    });

    test('uses plural form for multiple units', () => {
      expect(formatRelativeTime(new Date(FIXED_TIMESTAMP - 2 * 60000))).toBe('2 minutes ago');
      expect(formatRelativeTime(new Date(FIXED_TIMESTAMP - 2 * 3600000))).toBe('2 hours ago');
      expect(formatRelativeTime(new Date(FIXED_TIMESTAMP - 2 * 24 * 3600000))).toBe('2 days ago');
      expect(formatRelativeTime(new Date(FIXED_TIMESTAMP - 2 * 7 * 24 * 3600000))).toBe('2 weeks ago');
    });

    test('handles special cases for yesterday/tomorrow', () => {
      expect(formatRelativeTime(new Date(FIXED_TIMESTAMP - 24 * 3600000))).toBe('yesterday');
      expect(formatRelativeTime(new Date(FIXED_TIMESTAMP + 24 * 3600000))).toBe('tomorrow');
    });
  });
});