import { test, expect } from '@playwright/test';

test.describe('Counter Component', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/counter');
  });

  test('renders with initial count of 0 and three action buttons', async ({ page }) => {
    // Verify the page title and main heading
    await expect(page.getByRole('heading', { name: 'Counter' })).toBeVisible();

    // Verify initial count display
    const countDisplay = page.getByLabel('Current count');
    await expect(countDisplay).toBeVisible();
    await expect(countDisplay).toHaveText('0');

    // Verify all three buttons are present and visible
    const incrementBtn = page.getByRole('button', { name: 'Increase count by 1' });
    const decrementBtn = page.getByRole('button', { name: 'Decrease count by 1' });
    const resetBtn = page.getByRole('button', { name: 'Reset count to zero' });

    await expect(incrementBtn).toBeVisible();
    await expect(decrementBtn).toBeVisible();
    await expect(resetBtn).toBeVisible();

    // Verify button text content
    await expect(incrementBtn).toContainText('Increment');
    await expect(decrementBtn).toContainText('Decrement');
    await expect(resetBtn).toContainText('Reset');
  });

  test('increment button increases count by 1 with immediate visual update', async ({ page }) => {
    const countDisplay = page.getByLabel('Current count');
    const incrementBtn = page.getByRole('button', { name: 'Increase count by 1' });

    // Initial state
    await expect(countDisplay).toHaveText('0');

    // Click increment once
    await incrementBtn.click();
    await expect(countDisplay).toHaveText('1');

    // Click increment multiple times
    await incrementBtn.click();
    await incrementBtn.click();
    await expect(countDisplay).toHaveText('3');
  });

  test('decrement button decreases count by 1 with immediate visual update', async ({ page }) => {
    const countDisplay = page.getByLabel('Current count');
    const incrementBtn = page.getByRole('button', { name: 'Increase count by 1' });
    const decrementBtn = page.getByRole('button', { name: 'Decrease count by 1' });

    // Set initial count to 5
    for (let i = 0; i < 5; i++) {
      await incrementBtn.click();
    }
    await expect(countDisplay).toHaveText('5');

    // Test decrement
    await decrementBtn.click();
    await expect(countDisplay).toHaveText('4');

    // Test multiple decrements
    await decrementBtn.click();
    await decrementBtn.click();
    await expect(countDisplay).toHaveText('2');

    // Test going negative
    await decrementBtn.click();
    await decrementBtn.click();
    await decrementBtn.click();
    await expect(countDisplay).toHaveText('-1');
  });

  test('reset button returns count to 0 regardless of current value', async ({ page }) => {
    const countDisplay = page.getByLabel('Current count');
    const incrementBtn = page.getByRole('button', { name: 'Increase count by 1' });
    const decrementBtn = page.getByRole('button', { name: 'Decrease count by 1' });
    const resetBtn = page.getByRole('button', { name: 'Reset count to zero' });

    // Test reset from positive number
    await incrementBtn.click();
    await incrementBtn.click();
    await incrementBtn.click();
    await expect(countDisplay).toHaveText('3');
    await resetBtn.click();
    await expect(countDisplay).toHaveText('0');

    // Test reset from negative number
    await decrementBtn.click();
    await decrementBtn.click();
    await expect(countDisplay).toHaveText('-2');
    await resetBtn.click();
    await expect(countDisplay).toHaveText('0');

    // Test reset when already at 0
    await resetBtn.click();
    await expect(countDisplay).toHaveText('0');
  });

  test('supports keyboard navigation with Tab, Enter, and Space keys', async ({ page }) => {
    const countDisplay = page.getByLabel('Current count');
    const incrementBtn = page.getByRole('button', { name: 'Increase count by 1' });
    const decrementBtn = page.getByRole('button', { name: 'Decrease count by 1' });
    const resetBtn = page.getByRole('button', { name: 'Reset count to zero' });

    // Test button focus and Enter key activation
    await incrementBtn.focus();
    await expect(incrementBtn).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(countDisplay).toHaveText('1');

    // Test decrement button focus and Space key activation
    await decrementBtn.focus();
    await expect(decrementBtn).toBeFocused();
    await page.keyboard.press(' ');
    await expect(countDisplay).toHaveText('0');

    // Test reset button focus and Enter key activation
    await incrementBtn.click(); // Set count to 1 first
    await resetBtn.focus();
    await expect(resetBtn).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(countDisplay).toHaveText('0');

    // Test Tab navigation between buttons
    await incrementBtn.focus();
    await page.keyboard.press('Tab');
    await expect(decrementBtn).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(resetBtn).toBeFocused();
  });

  test('has ARIA live region for screen reader announcements', async ({ page }) => {
    const incrementBtn = page.getByRole('button', { name: 'Increase count by 1' });

    // Check that ARIA live region exists (note: it's hidden with .sr-only class)
    const liveRegion = page.locator('[aria-live="polite"]');
    await expect(liveRegion).toHaveAttribute('aria-live', 'polite');
    await expect(liveRegion).toHaveAttribute('aria-atomic', 'true');

    // Verify initial live region content
    await expect(liveRegion).toHaveText('Count: 0');
    await expect(liveRegion).toHaveAttribute('aria-label', 'Count is now 0');

    // Test that live region updates with count changes
    await incrementBtn.click();
    await expect(liveRegion).toHaveText('Count: 1');
    await expect(liveRegion).toHaveAttribute('aria-label', 'Count is now 1');
  });

  test('displays correctly on mobile with proper touch targets', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE size

    const incrementBtn = page.getByRole('button', { name: 'Increase count by 1' });
    const decrementBtn = page.getByRole('button', { name: 'Decrease count by 1' });
    const resetBtn = page.getByRole('button', { name: 'Reset count to zero' });

    // Verify buttons are visible and have adequate touch targets
    await expect(incrementBtn).toBeVisible();
    await expect(decrementBtn).toBeVisible();
    await expect(resetBtn).toBeVisible();

    // Check button dimensions meet accessibility requirements (minimum 44px)
    const incrementBox = await incrementBtn.boundingBox();
    const decrementBox = await decrementBtn.boundingBox();
    const resetBox = await resetBtn.boundingBox();

    expect(incrementBox?.height).toBeGreaterThanOrEqual(44);
    expect(incrementBox?.width).toBeGreaterThanOrEqual(44);
    expect(decrementBox?.height).toBeGreaterThanOrEqual(44);
    expect(decrementBox?.width).toBeGreaterThanOrEqual(44);
    expect(resetBox?.height).toBeGreaterThanOrEqual(44);
    expect(resetBox?.width).toBeGreaterThanOrEqual(44);

    // Verify touch interactions work correctly
    const countDisplay = page.getByLabel('Current count');

    await incrementBtn.click();
    await expect(countDisplay).toHaveText('1');

    await decrementBtn.click();
    await expect(countDisplay).toHaveText('0');

    await resetBtn.click();
    await expect(countDisplay).toHaveText('0');
  });

  test('complete user workflow with multiple interactions', async ({ page }) => {
    const countDisplay = page.getByLabel('Current count');
    const incrementBtn = page.getByRole('button', { name: 'Increase count by 1' });
    const decrementBtn = page.getByRole('button', { name: 'Decrease count by 1' });
    const resetBtn = page.getByRole('button', { name: 'Reset count to zero' });

    // Simulate a realistic user session
    await expect(countDisplay).toHaveText('0');

    // User increments several times
    await incrementBtn.click();
    await incrementBtn.click();
    await incrementBtn.click();
    await incrementBtn.click();
    await incrementBtn.click();
    await expect(countDisplay).toHaveText('5');

    // User decrements a few times
    await decrementBtn.click();
    await decrementBtn.click();
    await expect(countDisplay).toHaveText('3');

    // User increments more
    await incrementBtn.click();
    await incrementBtn.click();
    await expect(countDisplay).toHaveText('5');

    // User goes negative
    for (let i = 0; i < 8; i++) {
      await decrementBtn.click();
    }
    await expect(countDisplay).toHaveText('-3');

    // User resets to start over
    await resetBtn.click();
    await expect(countDisplay).toHaveText('0');

    // Verify everything still works after reset
    await incrementBtn.click();
    await expect(countDisplay).toHaveText('1');
  });
});