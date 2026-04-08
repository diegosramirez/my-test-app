import { test, expect } from '@playwright/test';

test.describe('Relative Time Demo Application', () => {
  test('should load the application successfully', async ({ page }) => {
    await page.goto('/');

    // Check that the main title is visible
    await expect(page.locator('h1')).toContainText('Relative Time Utility Demo');

    // Check that the description is present
    await expect(page.locator('.description')).toContainText('This page demonstrates the formatRelativeTime utility function with various test cases.');
  });

  test('should display time examples section', async ({ page }) => {
    await page.goto('/');

    // Check that the Time Examples section exists
    await expect(page.locator('h2').first()).toContainText('Time Examples');

    // Check that example cards are displayed
    const timeCards = page.locator('[data-testid*="current-time"], [data-testid*="five-minutes-ago"], [data-testid*="two-hours-ago"]');
    await expect(timeCards.first()).toBeVisible();
  });

  test('should show formatted relative time for current time', async ({ page }) => {
    await page.goto('/');

    // Check current time example
    const currentTimeCard = page.locator('[data-testid="current-time"]');
    await expect(currentTimeCard).toBeVisible();

    const formattedText = currentTimeCard.locator('[data-testid="current-time-formatted"]');
    await expect(formattedText).toContainText('just now');
  });

  test('should show formatted relative time for past dates', async ({ page }) => {
    await page.goto('/');

    // Check 5 minutes ago
    const fiveMinutesCard = page.locator('[data-testid="five-minutes-ago"]');
    await expect(fiveMinutesCard).toBeVisible();

    const fiveMinutesFormatted = fiveMinutesCard.locator('[data-testid="five-minutes-ago-formatted"]');
    await expect(fiveMinutesFormatted).toContainText('5 minutes ago');

    // Check 2 hours ago
    const twoHoursCard = page.locator('[data-testid="two-hours-ago"]');
    await expect(twoHoursCard).toBeVisible();

    const twoHoursFormatted = twoHoursCard.locator('[data-testid="two-hours-ago-formatted"]');
    await expect(twoHoursFormatted).toContainText('2 hours ago');

    // Check yesterday
    const yesterdayCard = page.locator('[data-testid="yesterday"]');
    await expect(yesterdayCard).toBeVisible();

    const yesterdayFormatted = yesterdayCard.locator('[data-testid="yesterday-formatted"]');
    await expect(yesterdayFormatted).toContainText('yesterday');
  });

  test('should show formatted relative time for future dates', async ({ page }) => {
    await page.goto('/');

    // Check tomorrow
    const tomorrowCard = page.locator('[data-testid="tomorrow"]');
    await expect(tomorrowCard).toBeVisible();

    const tomorrowFormatted = tomorrowCard.locator('[data-testid="tomorrow-formatted"]');
    await expect(tomorrowFormatted).toContainText('tomorrow');

    // Check in 2 hours
    const inTwoHoursCard = page.locator('[data-testid="in-two-hours"]');
    await expect(inTwoHoursCard).toBeVisible();

    const inTwoHoursFormatted = inTwoHoursCard.locator('[data-testid="in-two-hours-formatted"]');
    await expect(inTwoHoursFormatted).toContainText('in 2 hours');
  });

  test('should display error handling examples section', async ({ page }) => {
    await page.goto('/');

    // Check that the Error Handling Examples section exists
    await expect(page.locator('h2').nth(1)).toContainText('Error Handling Examples');

    // Check error examples are displayed
    const errorCards = page.locator('[data-testid*="invalid-"], [data-testid*="empty-"], [data-testid*="null-"], [data-testid*="undefined-"]');
    await expect(errorCards.first()).toBeVisible();
  });

  test('should show "Invalid date" for error cases', async ({ page }) => {
    await page.goto('/');

    // Check invalid string
    const invalidStringCard = page.locator('[data-testid="invalid-string"]');
    await expect(invalidStringCard).toBeVisible();

    const invalidStringFormatted = invalidStringCard.locator('[data-testid="invalid-string-formatted"]');
    await expect(invalidStringFormatted).toContainText('Invalid date');

    // Check empty string
    const emptyStringCard = page.locator('[data-testid="empty-string"]');
    await expect(emptyStringCard).toBeVisible();

    const emptyStringFormatted = emptyStringCard.locator('[data-testid="empty-string-formatted"]');
    await expect(emptyStringFormatted).toContainText('Invalid date');

    // Check null value
    const nullValueCard = page.locator('[data-testid="null-value"]');
    await expect(nullValueCard).toBeVisible();

    const nullValueFormatted = nullValueCard.locator('[data-testid="null-value-formatted"]');
    await expect(nullValueFormatted).toContainText('Invalid date');

    // Check undefined value
    const undefinedValueCard = page.locator('[data-testid="undefined-value"]');
    await expect(undefinedValueCard).toBeVisible();

    const undefinedValueFormatted = undefinedValueCard.locator('[data-testid="undefined-value-formatted"]');
    await expect(undefinedValueFormatted).toContainText('Invalid date');
  });

  test('should display performance test section', async ({ page }) => {
    await page.goto('/');

    // Check that the Performance Test section exists
    await expect(page.locator('h2').nth(2)).toContainText('Performance Test');

    // Check performance card exists
    const performanceCard = page.locator('[data-testid="performance-test"]');
    await expect(performanceCard).toBeVisible();

    // Check performance button exists
    const performanceButton = page.locator('[data-testid="performance-button"]');
    await expect(performanceButton).toBeVisible();
    await expect(performanceButton).toContainText('Run Performance Test');
  });

  test('should run performance test when button is clicked', async ({ page }) => {
    await page.goto('/');

    // Check initial performance result text
    const performanceResult = page.locator('[data-testid="performance-result"]');
    await expect(performanceResult).toContainText('Click button to run test');

    // Click the performance test button
    const performanceButton = page.locator('[data-testid="performance-button"]');
    await performanceButton.click();

    // Wait for performance test to complete and check result format
    await expect(performanceResult).not.toContainText('Click button to run test');
    await expect(performanceResult).toContainText('Total:');
    await expect(performanceResult).toContainText('Average:');
    await expect(performanceResult).toContainText('ms');
  });

  test('should display original ISO timestamps', async ({ page }) => {
    await page.goto('/');

    // Check that original timestamps are displayed in ISO format
    const currentTimeOriginal = page.locator('[data-testid="current-time"] .original');
    await expect(currentTimeOriginal).toContainText(new RegExp('\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}'));

    const yesterdayOriginal = page.locator('[data-testid="yesterday"] .original');
    await expect(yesterdayOriginal).toContainText(new RegExp('\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}'));
  });

  test('should have consistent card layout for all examples', async ({ page }) => {
    await page.goto('/');

    // Check that all time cards have the expected structure
    const timeCards = page.locator('.time-examples .time-card');
    const count = await timeCards.count();

    // Should have multiple time cards
    expect(count).toBeGreaterThan(5);

    // Each card should have label, formatted text, and original date
    for (let i = 0; i < Math.min(count, 3); i++) {
      const card = timeCards.nth(i);
      await expect(card.locator('.label')).toBeVisible();
      await expect(card.locator('.formatted')).toBeVisible();
      await expect(card.locator('.original')).toBeVisible();
    }
  });

  test('should handle navigation to demo route', async ({ page }) => {
    await page.goto('/demo');

    // Should show the same content as root route
    await expect(page.locator('h1')).toContainText('Relative Time Utility Demo');

    // Check that examples are still visible
    await expect(page.locator('h2').first()).toContainText('Time Examples');
  });

  test('should be responsive and accessible', async ({ page }) => {
    await page.goto('/');

    // Check that the main container has proper styling
    const container = page.locator('.demo-container');
    await expect(container).toBeVisible();

    // Check that headings have proper hierarchy
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('h2').first()).toBeVisible();

    // Check that the grid layout is working
    const exampleGrid = page.locator('.example-grid');
    await expect(exampleGrid.first()).toBeVisible();
  });
});