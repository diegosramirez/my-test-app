import { formatTime, isOverflow, getMaxDuration } from './stopwatch.utils';

describe('Stopwatch Utils', () => {
  describe('formatTime', () => {
    it('should format milliseconds correctly to mm:ss.ss format', () => {
      const testCases = [
        // Basic cases
        { input: 0, expected: '00:00.00', description: 'zero milliseconds' },
        { input: 100, expected: '00:00.10', description: '100 milliseconds' },
        { input: 500, expected: '00:00.50', description: '500 milliseconds' },
        { input: 999, expected: '00:00.99', description: '999 milliseconds' },

        // Seconds boundary
        { input: 1000, expected: '00:01.00', description: '1 second' },
        { input: 1001, expected: '00:01.00', description: '1 second 1 millisecond' },
        { input: 1010, expected: '00:01.01', description: '1 second 10 milliseconds' },
        { input: 1500, expected: '00:01.50', description: '1.5 seconds' },
        { input: 9999, expected: '00:09.99', description: '9.99 seconds' },

        // Minutes boundary
        { input: 60000, expected: '01:00.00', description: '1 minute' },
        { input: 61000, expected: '01:01.00', description: '1 minute 1 second' },
        { input: 61500, expected: '01:01.50', description: '1 minute 1.5 seconds' },
        { input: 119999, expected: '01:59.99', description: '1 minute 59.99 seconds' },

        // Multiple minutes
        { input: 120000, expected: '02:00.00', description: '2 minutes' },
        { input: 599000, expected: '09:59.00', description: '9 minutes 59 seconds' },
        { input: 600000, expected: '10:00.00', description: '10 minutes' },
        { input: 3600000, expected: '60:00.00', description: '60 minutes' },

        // Maximum valid time
        { input: 5999990, expected: '99:59.99', description: 'maximum time 99:59.99' },

        // Precision testing
        { input: 12345, expected: '00:12.34', description: 'precision test 1' },
        { input: 67890, expected: '01:07.89', description: 'precision test 2' },
        { input: 123456, expected: '02:03.45', description: 'precision test 3' }
      ];

      testCases.forEach(({ input, expected, description }) => {
        expect(formatTime(input)).toBe(expected, `Failed for ${description}`);
      });
    });

    it('should handle edge cases for negative values', () => {
      expect(formatTime(-1)).toBe('00:00.00');
      expect(formatTime(-1000)).toBe('00:00.00');
      expect(formatTime(-999999)).toBe('00:00.00');
    });

    it('should handle edge cases for overflow values', () => {
      expect(formatTime(5999990)).toBe('99:59.99'); // Exactly at max
      expect(formatTime(5999991)).toBe('99:59.99'); // 1ms over max
      expect(formatTime(6000000)).toBe('99:59.99'); // 10ms over max
      expect(formatTime(999999999)).toBe('99:59.99'); // Way over max
    });

    it('should handle decimal precision correctly', () => {
      // Test that rounding works properly for centiseconds
      expect(formatTime(105)).toBe('00:00.10'); // 10.5 centiseconds rounds down
      expect(formatTime(994)).toBe('00:00.99'); // 99.4 centiseconds rounds down
      expect(formatTime(995)).toBe('00:00.99'); // 99.5 centiseconds rounds down (Math.floor)
      expect(formatTime(1004)).toBe('00:01.00'); // 100.4 centiseconds rounds down
    });

    it('should pad single digits with leading zeros', () => {
      expect(formatTime(1000)).toBe('00:01.00'); // Single second
      expect(formatTime(10000)).toBe('00:10.00'); // Single ten-second
      expect(formatTime(60000)).toBe('01:00.00'); // Single minute
      expect(formatTime(600000)).toBe('10:00.00'); // Single ten-minute
    });

    it('should handle fractional milliseconds consistently', () => {
      // Ensure consistent behavior with fractional inputs (though not expected in real use)
      expect(formatTime(123.7)).toBe('00:00.12');
      expect(formatTime(1234.9)).toBe('00:01.23');
    });

    it('should maintain formatting consistency for batch operations', () => {
      const times = [];
      for (let i = 0; i <= 1000; i += 10) {
        times.push(formatTime(i));
      }

      // All formatted times should be exactly 8 characters
      times.forEach(time => {
        expect(time.length).toBe(8);
        expect(time).toMatch(/^\d{2}:\d{2}\.\d{2}$/);
      });
    });

    it('should handle boundary values correctly', () => {
      // Test values around minute and second boundaries
      expect(formatTime(59999)).toBe('00:59.99');
      expect(formatTime(60000)).toBe('01:00.00');
      expect(formatTime(60001)).toBe('01:00.00');

      expect(formatTime(999)).toBe('00:00.99');
      expect(formatTime(1000)).toBe('00:01.00');
      expect(formatTime(1001)).toBe('00:01.00');
    });
  });

  describe('isOverflow', () => {
    it('should return false for values below maximum', () => {
      expect(isOverflow(0)).toBe(false);
      expect(isOverflow(1000)).toBe(false);
      expect(isOverflow(60000)).toBe(false);
      expect(isOverflow(3600000)).toBe(false);
      expect(isOverflow(5999989)).toBe(false); // 1ms below max
    });

    it('should return true for values at or above maximum', () => {
      expect(isOverflow(5999990)).toBe(true); // Exactly at max
      expect(isOverflow(5999991)).toBe(true); // 1ms over max
      expect(isOverflow(6000000)).toBe(true); // 10ms over max
      expect(isOverflow(999999999)).toBe(true); // Way over max
    });

    it('should handle negative values', () => {
      expect(isOverflow(-1)).toBe(false);
      expect(isOverflow(-1000)).toBe(false);
      expect(isOverflow(-999999)).toBe(false);
    });

    it('should use consistent threshold with getMaxDuration', () => {
      const maxDuration = getMaxDuration();

      expect(isOverflow(maxDuration - 1)).toBe(false);
      expect(isOverflow(maxDuration)).toBe(true);
      expect(isOverflow(maxDuration + 1)).toBe(true);
    });

    it('should handle decimal inputs consistently', () => {
      const maxDuration = getMaxDuration();

      expect(isOverflow(maxDuration - 0.1)).toBe(false);
      expect(isOverflow(maxDuration + 0.1)).toBe(true);
    });

    it('should work correctly for performance timing scenarios', () => {
      // Test values that might come from performance.now()
      expect(isOverflow(123456.789)).toBe(false);
      expect(isOverflow(5999989.999)).toBe(false);
      expect(isOverflow(5999990.001)).toBe(true);
    });
  });

  describe('getMaxDuration', () => {
    it('should return the correct maximum duration in milliseconds', () => {
      const maxDuration = getMaxDuration();

      expect(maxDuration).toBe(5999990);
      expect(typeof maxDuration).toBe('number');
    });

    it('should correspond to 99:59.99 when formatted', () => {
      const maxDuration = getMaxDuration();
      const formatted = formatTime(maxDuration);

      expect(formatted).toBe('99:59.99');
    });

    it('should be consistent with isOverflow threshold', () => {
      const maxDuration = getMaxDuration();

      expect(isOverflow(maxDuration - 1)).toBe(false);
      expect(isOverflow(maxDuration)).toBe(true);
    });

    it('should represent exactly 99 minutes, 59 seconds, and 99 centiseconds', () => {
      const maxDuration = getMaxDuration();

      // 99 minutes = 99 * 60 * 1000 = 5,940,000 ms
      // 59 seconds = 59 * 1000 = 59,000 ms
      // 99 centiseconds = 99 * 10 = 990 ms
      // Total: 5,940,000 + 59,000 + 990 = 5,999,990 ms

      const expectedMs = (99 * 60 * 1000) + (59 * 1000) + (99 * 10);
      expect(maxDuration).toBe(expectedMs);
    });

    it('should be immutable', () => {
      const maxDuration1 = getMaxDuration();
      const maxDuration2 = getMaxDuration();

      expect(maxDuration1).toBe(maxDuration2);
      expect(maxDuration1 === maxDuration2).toBe(true);
    });
  });

  describe('Integration between utilities', () => {
    it('should work correctly together for overflow scenarios', () => {
      const maxDuration = getMaxDuration();

      // Value just under max should not be overflow and format correctly
      const underMax = maxDuration - 10;
      expect(isOverflow(underMax)).toBe(false);
      expect(formatTime(underMax)).toBe('99:59.98');

      // Value at max should be overflow and format to max display
      expect(isOverflow(maxDuration)).toBe(true);
      expect(formatTime(maxDuration)).toBe('99:59.99');

      // Value over max should be overflow and clamp to max display
      const overMax = maxDuration + 1000;
      expect(isOverflow(overMax)).toBe(true);
      expect(formatTime(overMax)).toBe('99:59.99');
    });

    it('should handle timer progression correctly', () => {
      // Simulate timer progression from 0 to just beyond max
      const testValues = [
        0,
        1000,
        60000,
        3600000,
        5999980, // 99:59.98
        5999989, // 99:59.98 (rounds down)
        5999990, // 99:59.99 (max)
        5999991, // Should be treated as overflow
        6000000  // Way over max
      ];

      testValues.forEach(value => {
        const formatted = formatTime(value);
        const overflow = isOverflow(value);

        // Verify formatting is always valid
        expect(formatted).toMatch(/^\d{2}:\d{2}\.\d{2}$/);

        // Verify overflow detection is correct
        if (value >= getMaxDuration()) {
          expect(overflow).toBe(true);
          expect(formatted).toBe('99:59.99');
        } else {
          expect(overflow).toBe(false);
        }
      });
    });

    it('should handle rapid timer updates correctly', () => {
      // Simulate rapid timer updates like the component does
      let currentTime = 0;
      const increment = 10; // 10ms intervals like the component
      const updates = [];

      while (currentTime <= getMaxDuration() + 100) {
        updates.push({
          time: currentTime,
          formatted: formatTime(currentTime),
          overflow: isOverflow(currentTime)
        });

        currentTime += increment;
      }

      // Verify all updates are valid
      updates.forEach(update => {
        expect(update.formatted.length).toBe(8);
        expect(update.formatted).toMatch(/^\d{2}:\d{2}\.\d{2}$/);

        if (update.overflow) {
          expect(update.formatted).toBe('99:59.99');
          expect(update.time).toBeGreaterThanOrEqual(getMaxDuration());
        }
      });

      // Verify we have the expected number of updates
      expect(updates.length).toBe(Math.floor((getMaxDuration() + 100) / increment) + 1);
    });

    it('should maintain precision for performance measurements', () => {
      // Test with performance.now() style timestamps
      const performanceValues = [
        123.456,
        1234.567,
        12345.678,
        123456.789,
        1234567.89,
        5999989.123
      ];

      performanceValues.forEach(value => {
        const formatted = formatTime(value);
        const overflow = isOverflow(value);

        // Should handle decimal precision gracefully
        expect(formatted).toMatch(/^\d{2}:\d{2}\.\d{2}$/);
        expect(typeof overflow).toBe('boolean');
      });
    });
  });

  describe('Error resilience', () => {
    it('should handle invalid inputs gracefully', () => {
      // Test with various invalid inputs
      expect(formatTime(NaN)).toBe('00:00.00');
      expect(formatTime(Infinity)).toBe('99:59.99');
      expect(formatTime(-Infinity)).toBe('00:00.00');

      expect(isOverflow(NaN)).toBe(false);
      expect(isOverflow(Infinity)).toBe(true);
      expect(isOverflow(-Infinity)).toBe(false);
    });

    it('should handle very large numbers', () => {
      const veryLarge = Number.MAX_SAFE_INTEGER;

      expect(formatTime(veryLarge)).toBe('99:59.99');
      expect(isOverflow(veryLarge)).toBe(true);
    });

    it('should handle very small numbers', () => {
      const verySmall = Number.MIN_VALUE;

      expect(formatTime(verySmall)).toBe('00:00.00');
      expect(isOverflow(verySmall)).toBe(false);
    });
  });
});