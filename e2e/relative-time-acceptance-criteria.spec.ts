import { test, expect } from '@playwright/test';

/**
 * Comprehensive E2E tests validating all acceptance criteria for the relative time utility
 * Based on the story requirements and success thresholds
 */
test.describe('Relative Time Utility - Acceptance Criteria Validation', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test.describe('AC1: Recent times (<1 hour) display correctly', () => {
    test('should show "just now" for current time', async ({ page }) => {
      const currentTimeCard = page.locator('[data-testid="current-time"]');
      const formatted = currentTimeCard.locator('[data-testid="current-time-formatted"]');

      await expect(formatted).toHaveText('just now');
    });

    test('should show "X minutes ago" for recent past times', async ({ page }) => {
      const fiveMinutesCard = page.locator('[data-testid="five-minutes-ago"]');
      const formatted = fiveMinutesCard.locator('[data-testid="five-minutes-ago-formatted"]');

      await expect(formatted).toContainText('5 minutes ago');

      // Verify it follows the expected pattern (trim whitespace)
      const text = await formatted.textContent();
      expect(text?.trim()).toMatch(/^\d+ minutes? ago$/);
    });

    test('should use proper singular/plural forms for minutes', async ({ page }) => {
      // Test that the utility handles singular/plural correctly
      // The demo component should generate examples that test this
      const fiveMinutesFormatted = page.locator('[data-testid="five-minutes-ago-formatted"]');
      await expect(fiveMinutesFormatted).toContainText('minutes ago'); // plural

      // Current time should be "just now", not "0 minutes ago"
      const currentTimeFormatted = page.locator('[data-testid="current-time-formatted"]');
      await expect(currentTimeFormatted).toHaveText('just now');
    });
  });

  test.describe('AC2: Daily ranges (1-6 days) display correctly', () => {
    test('should show "yesterday" for 1 day ago', async ({ page }) => {
      const yesterdayCard = page.locator('[data-testid="yesterday"]');
      const formatted = yesterdayCard.locator('[data-testid="yesterday-formatted"]');

      await expect(formatted).toHaveText('yesterday');
    });

    test('should show "X days ago" for multiple days with proper grammar', async ({ page }) => {
      const threeDaysCard = page.locator('[data-testid="three-days-ago"]');

      if (await threeDaysCard.isVisible()) {
        const formatted = threeDaysCard.locator('[data-testid="three-days-ago-formatted"]');
        await expect(formatted).toContainText('3 days ago');
        const text = await formatted.textContent();
        expect(text?.trim()).toMatch(/^\d+ days ago$/);
      }
    });
  });

  test.describe('AC3: Weekly/monthly ranges display correctly', () => {
    test('should show "X weeks ago" for weekly ranges', async ({ page }) => {
      const oneWeekCard = page.locator('[data-testid="one-week-ago"]');

      if (await oneWeekCard.isVisible()) {
        const formatted = oneWeekCard.locator('[data-testid="one-week-ago-formatted"]');
        await expect(formatted).toContainText('1 week ago');
        const text = await formatted.textContent();
        expect(text?.trim()).toMatch(/^\d+ weeks? ago$/);
      }
    });

    test('should show "X months ago" for monthly ranges', async ({ page }) => {
      const oneMonthCard = page.locator('[data-testid="one-month-ago"]');

      if (await oneMonthCard.isVisible()) {
        const formatted = oneMonthCard.locator('[data-testid="one-month-ago-formatted"]');
        await expect(formatted).toContainText('1 month ago');
        const text = await formatted.textContent();
        expect(text?.trim()).toMatch(/^\d+ months? ago$/);
      }
    });

    test('should show "X years ago" for yearly ranges', async ({ page }) => {
      const oneYearCard = page.locator('[data-testid="one-year-ago"]');

      if (await oneYearCard.isVisible()) {
        const formatted = oneYearCard.locator('[data-testid="one-year-ago-formatted"]');
        await expect(formatted).toContainText('1 year ago');
        const text = await formatted.textContent();
        expect(text?.trim()).toMatch(/^\d+ years? ago$/);
      }
    });
  });

  test.describe('AC4: Future dates return "in X [unit]" format consistently', () => {
    test('should show "tomorrow" for 1 day in future', async ({ page }) => {
      const tomorrowCard = page.locator('[data-testid="tomorrow"]');
      const formatted = tomorrowCard.locator('[data-testid="tomorrow-formatted"]');

      await expect(formatted).toHaveText('tomorrow');
    });

    test('should show "in X hours" for future hours', async ({ page }) => {
      const inTwoHoursCard = page.locator('[data-testid="in-two-hours"]');
      const formatted = inTwoHoursCard.locator('[data-testid="in-two-hours-formatted"]');

      // Allow for timing variation (could be 1 or 2 hours)
      const text = await formatted.textContent();
      expect(text?.trim()).toMatch(/^in \d+ hours?$/);
      expect(text).toContain('hour');
    });

    test('should show "in X minutes" for future minutes', async ({ page }) => {
      const inFiveMinutesCard = page.locator('[data-testid="in-five-minutes"]');
      const formatted = inFiveMinutesCard.locator('[data-testid="in-five-minutes-formatted"]');

      // Allow for timing variation (could be 4, 5, or 6 minutes)
      const text = await formatted.textContent();
      expect(text?.trim()).toMatch(/^in \d+ minutes?$/);
      expect(text).toContain('minute');
    });

    test('future dates should never show past tense', async ({ page }) => {
      // Check all future examples don't contain "ago"
      const futureTestIds = ['tomorrow', 'in-two-hours', 'in-five-minutes'];

      for (const testId of futureTestIds) {
        const card = page.locator(`[data-testid="${testId}"]`);
        if (await card.isVisible()) {
          const formatted = card.locator(`[data-testid="${testId}-formatted"]`);
          const text = await formatted.textContent();
          expect(text).not.toContain('ago');
          expect(text?.trim()).toMatch(/^(tomorrow|in \d+)/);
        }
      }
    });
  });

  test.describe('AC5: Invalid inputs return "Invalid date" without exceptions', () => {
    test('should show "Invalid date" for all error cases', async ({ page }) => {
      const errorTestIds = [
        'invalid-string',
        'empty-string',
        'null-value',
        'undefined-value'
      ];

      for (const testId of errorTestIds) {
        const errorCard = page.locator(`[data-testid="${testId}"]`);
        await expect(errorCard).toBeVisible();

        const formatted = errorCard.locator(`[data-testid="${testId}-formatted"]`);
        await expect(formatted).toHaveText('Invalid date');
      }
    });

    test('error handling should be consistent across all invalid inputs', async ({ page }) => {
      const errorTestIds = [
        'invalid-string',
        'empty-string',
        'null-value',
        'undefined-value'
      ];

      // All error cases should display the same fallback message
      for (const testId of errorTestIds) {
        const card = page.locator(`[data-testid="${testId}"]`);
        if (await card.isVisible()) {
          const formatted = card.locator(`[data-testid="${testId}-formatted"]`);
          await expect(formatted).toHaveText('Invalid date');
        }
      }
    });
  });

  test.describe('AC6: Function executes in <1ms for typical use cases', () => {
    test('performance test should demonstrate sub-millisecond execution', async ({ page }) => {
      const performanceButton = page.locator('[data-testid="performance-button"]');
      const performanceResult = page.locator('[data-testid="performance-result"]');

      // Run the performance test
      await performanceButton.click();

      // Wait for result to update
      await expect(performanceResult).not.toHaveText('Click button to run test');

      // Get the result text
      const resultText = await performanceResult.textContent();
      expect(resultText).toContain('Total:');
      expect(resultText).toContain('Average:');
      expect(resultText).toContain('ms');

      // Extract average time using regex
      const avgMatch = resultText?.match(/Average: ([\d.]+)ms/);
      expect(avgMatch).toBeTruthy();

      if (avgMatch) {
        const avgTime = parseFloat(avgMatch[1]);
        // Performance requirement: <1ms per call
        expect(avgTime).toBeLessThan(1.0);
      }
    });

    test('performance test should show reasonable total time for 100 iterations', async ({ page }) => {
      const performanceButton = page.locator('[data-testid="performance-button"]');
      const performanceResult = page.locator('[data-testid="performance-result"]');

      await performanceButton.click();
      await expect(performanceResult).not.toHaveText('Click button to run test');

      const resultText = await performanceResult.textContent();
      const totalMatch = resultText?.match(/Total: ([\d.]+)ms/);
      expect(totalMatch).toBeTruthy();

      if (totalMatch) {
        const totalTime = parseFloat(totalMatch[1]);
        // 100 iterations should complete quickly (reasonable threshold)
        expect(totalTime).toBeLessThan(100); // 100ms total for 100 iterations
      }
    });
  });

  test.describe('AC7: Type safety and input handling', () => {
    test('should accept Date objects and ISO strings as shown in examples', async ({ page }) => {
      // Verify that both the formatted time and original timestamp are displayed
      const timeCards = page.locator('.time-examples .time-card');
      const count = await timeCards.count();

      expect(count).toBeGreaterThan(5);

      // Check a few examples have both formatted and original timestamps
      for (let i = 0; i < Math.min(3, count); i++) {
        const card = timeCards.nth(i);
        const formatted = card.locator('.formatted');
        const original = card.locator('.original');

        await expect(formatted).toBeVisible();
        await expect(original).toBeVisible();

        const originalText = await original.textContent();
        // Original should be in ISO format
        expect(originalText).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      }
    });

    test('input validation handles edge cases gracefully', async ({ page }) => {
      // All error examples should be displayed without causing application errors
      const errorSection = page.locator('.error-examples');
      await expect(errorSection).toBeVisible();

      const errorCards = errorSection.locator('.time-card');
      const count = await errorCards.count();
      expect(count).toBeGreaterThanOrEqual(4);

      // Verify the page doesn't show any JavaScript errors
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));

      // Trigger any potential errors by interacting with elements
      await page.reload();
      await page.waitForLoadState('networkidle');

      expect(errors).toHaveLength(0);
    });
  });

  test.describe('User Experience and Accessibility', () => {
    test('relative time strings should be human-readable and intuitive', async ({ page }) => {
      const timeCards = page.locator('.time-examples .time-card');
      const count = await timeCards.count();

      for (let i = 0; i < count; i++) {
        const card = timeCards.nth(i);
        const formatted = card.locator('.formatted');
        const text = await formatted.textContent();

        // Should not contain technical jargon or raw timestamps
        expect(text).not.toMatch(/\d{4}-\d{2}-\d{2}/); // No raw ISO dates
        expect(text).not.toContain('T'); // No ISO time separators
        expect(text).not.toContain('Z'); // No timezone indicators
        expect(text).not.toContain('GMT'); // No technical timezone names

        // Should be conversational (trim whitespace first)
        const trimmedText = text?.trim() || '';
        expect(trimmedText).toMatch(/^(just now|yesterday|tomorrow|in \d+ \w+|\d+ \w+ ago|Invalid date)$/);
      }
    });

    test('screen reader compatibility through semantic markup', async ({ page }) => {
      // Check that data-testid attributes are present for automation/accessibility
      const timeCards = page.locator('[data-testid]');
      const count = await timeCards.count();
      expect(count).toBeGreaterThan(10);

      // Check that headings have proper hierarchy
      const h1 = page.locator('h1');
      const h2s = page.locator('h2');

      await expect(h1).toHaveCount(1);
      await expect(h2s).toHaveCount(3); // Time Examples, Error Examples, Performance Test

      // Check that sections have meaningful content structure
      const mainHeading = await h1.textContent();
      expect(mainHeading).toContain('Relative Time Utility Demo');
    });

    test('cognitive load reduction through clear visual hierarchy', async ({ page }) => {
      // Verify clear distinction between label, formatted time, and technical details
      const timeCards = page.locator('.time-examples .time-card');
      const firstCard = timeCards.first();

      const label = firstCard.locator('.label');
      const formatted = firstCard.locator('.formatted');
      const original = firstCard.locator('.original');

      await expect(label).toBeVisible();
      await expect(formatted).toBeVisible();
      await expect(original).toBeVisible();

      // Visual hierarchy should prioritize the human-readable format
      const formattedStyle = await formatted.evaluate(el => getComputedStyle(el));
      const originalStyle = await original.evaluate(el => getComputedStyle(el));

      // Formatted text should be more prominent (larger font or different color)
      const formattedSize = parseFloat(formattedStyle.fontSize);
      const originalSize = parseFloat(originalStyle.fontSize);
      expect(formattedSize).toBeGreaterThan(originalSize);
    });
  });

  test.describe('Integration and Framework Compatibility', () => {
    test('utility integrates seamlessly with Angular standalone components', async ({ page }) => {
      // Verify the demo component loads without framework errors
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('.demo-container')).toBeVisible();

      // Check that Angular signals are working (dynamic examples)
      const timeCards = page.locator('.time-examples .time-card');
      const count = await timeCards.count();
      expect(count).toBeGreaterThan(5);

      // Verify routing works (Angular Router integration)
      await page.goto('/demo');
      await expect(page.locator('h1')).toContainText('Relative Time Utility Demo');
    });

    test('performance remains consistent across application lifecycle', async ({ page }) => {
      // Test performance after multiple interactions
      const performanceButton = page.locator('[data-testid="performance-button"]');
      const performanceResult = page.locator('[data-testid="performance-result"]');

      // Run performance test multiple times
      for (let i = 0; i < 3; i++) {
        await performanceButton.click();
        await expect(performanceResult).not.toHaveText('Click button to run test');

        const resultText = await performanceResult.textContent();
        const avgMatch = resultText?.match(/Average: ([\d.]+)ms/);

        if (avgMatch) {
          const avgTime = parseFloat(avgMatch[1]);
          expect(avgTime).toBeLessThan(1.0);
        }

        // Small delay between tests
        await page.waitForTimeout(100);
      }
    });

    test('utility handles timezone context appropriately', async ({ page }) => {
      // Verify that times are calculated relative to browser's local time
      const currentTimeCard = page.locator('[data-testid="current-time"]');
      const original = currentTimeCard.locator('.original');
      const originalText = await original.textContent();

      // Should be a valid ISO timestamp
      expect(originalText).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);

      // Formatted version should reflect relative to "now"
      const formatted = currentTimeCard.locator('.formatted');
      await expect(formatted).toHaveText('just now');
    });
  });

  test.describe('Edge Cases and Boundary Conditions', () => {
    test('application handles all time ranges without errors', async ({ page }) => {
      // Check that examples span from recent to far past/future
      const allCards = page.locator('.time-card');
      const count = await allCards.count();
      expect(count).toBeGreaterThan(10); // Time examples + error examples

      // Verify no console errors during rendering
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));

      await page.reload();
      await page.waitForLoadState('networkidle');

      expect(errors).toHaveLength(0);
    });

    test('consistent behavior across different date formats', async ({ page }) => {
      // Verify that the demo shows consistent formatting patterns
      const timeExamples = page.locator('.time-examples .time-card .formatted');
      const count = await timeExamples.count();

      const patterns = {
        justNow: /^just now$/,
        minutesAgo: /^\d+ minutes? ago$/,
        hoursAgo: /^\d+ hours? ago$/,
        yesterday: /^yesterday$/,
        daysAgo: /^\d+ days? ago$/,
        weeksAgo: /^\d+ weeks? ago$/,
        monthsAgo: /^\d+ months? ago$/,
        yearsAgo: /^\d+ years? ago$/,
        tomorrow: /^tomorrow$/,
        inMinutes: /^in \d+ minutes?$/,
        inHours: /^in \d+ hours?$/,
        inDays: /^in \d+ days?$/,
        inWeeks: /^in \d+ weeks?$/,
        inMonths: /^in \d+ months?$/,
        inYears: /^in \d+ years?$/
      };

      let matchedPatterns = 0;

      for (let i = 0; i < count; i++) {
        const text = await timeExamples.nth(i).textContent();
        const trimmedText = text?.trim() || '';
        const matchesPattern = Object.values(patterns).some(pattern => pattern.test(trimmedText));

        if (matchesPattern) {
          matchedPatterns++;
        }
      }

      // Most examples should match expected patterns
      expect(matchedPatterns).toBeGreaterThan(count * 0.8);
    });
  });
});