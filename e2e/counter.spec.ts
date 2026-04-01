import { test, expect } from '@playwright/test';

test.describe('Counter + History App', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('initial state: counter is 0, placeholder shown, action count is 0', async ({ page }) => {
    await expect(page.getByTestId('counter-value')).toHaveText('0');
    await expect(page.getByText('No actions yet')).toBeVisible();
    await expect(page.getByText('Total actions: 0')).toBeVisible();
  });

  test('increment: counter increases and +1 appears in history', async ({ page }) => {
    await page.getByRole('button', { name: '+1' }).click();
    await expect(page.getByTestId('counter-value')).toHaveText('1');
    await expect(page.getByText('No actions yet')).not.toBeVisible();
    await expect(page.getByRole('listitem').first()).toHaveText('+1');
    await expect(page.getByText('Total actions: 1')).toBeVisible();
  });

  test('decrement: counter decreases and −1 appears in history', async ({ page }) => {
    await page.getByRole('button', { name: '−1' }).click();
    await expect(page.getByTestId('counter-value')).toHaveText('-1');
    await expect(page.getByRole('listitem').first()).toHaveText('-1');
    await expect(page.getByText('Total actions: 1')).toBeVisible();
  });

  test('reset sets counter to 0 and appends reset to history', async ({ page }) => {
    // First increment to non-zero
    await page.getByRole('button', { name: '+1' }).click();
    await page.getByRole('button', { name: '+1' }).click();
    await expect(page.getByTestId('counter-value')).toHaveText('2');

    await page.getByRole('button', { name: 'Reset' }).click();
    await expect(page.getByTestId('counter-value')).toHaveText('0');
    // Newest entry (reset) should be first in the list
    await expect(page.getByRole('listitem').first()).toHaveText('reset');
    await expect(page.getByText('Total actions: 3')).toBeVisible();
  });

  test('reset when counter is already 0 still appends reset and increments action count', async ({ page }) => {
    await expect(page.getByTestId('counter-value')).toHaveText('0');
    await page.getByRole('button', { name: 'Reset' }).click();
    await expect(page.getByTestId('counter-value')).toHaveText('0');
    await expect(page.getByRole('listitem').first()).toHaveText('reset');
    await expect(page.getByText('Total actions: 1')).toBeVisible();
  });

  test('action count always matches number of history entries', async ({ page }) => {
    await page.getByRole('button', { name: '+1' }).click();
    await page.getByRole('button', { name: '−1' }).click();
    await page.getByRole('button', { name: 'Reset' }).click();
    await page.getByRole('button', { name: '+1' }).click();

    const items = page.getByRole('listitem');
    await expect(items).toHaveCount(4);
    await expect(page.getByText('Total actions: 4')).toBeVisible();
  });

  test('history displays in reverse-chronological order (newest first)', async ({ page }) => {
    await page.getByRole('button', { name: '+1' }).click();
    await page.getByRole('button', { name: '−1' }).click();
    await page.getByRole('button', { name: 'Reset' }).click();

    const items = page.getByRole('listitem');
    await expect(items.nth(0)).toHaveText('reset');
    await expect(items.nth(1)).toHaveText('-1');
    await expect(items.nth(2)).toHaveText('+1');
  });

  test('all buttons remain enabled at all times including negative values', async ({ page }) => {
    const increment = page.getByRole('button', { name: '+1' });
    const decrement = page.getByRole('button', { name: '−1' });
    const reset = page.getByRole('button', { name: 'Reset' });

    await expect(increment).toBeEnabled();
    await expect(decrement).toBeEnabled();
    await expect(reset).toBeEnabled();

    // Go negative
    await decrement.click();
    await decrement.click();
    await expect(page.getByTestId('counter-value')).toHaveText('-2');
    await expect(increment).toBeEnabled();
    await expect(decrement).toBeEnabled();
    await expect(reset).toBeEnabled();
  });

  test('rapid clicks all register correctly', async ({ page }) => {
    const btn = page.getByRole('button', { name: '+1' });
    for (let i = 0; i < 10; i++) {
      await btn.click();
    }
    await expect(page.getByTestId('counter-value')).toHaveText('10');
    await expect(page.getByText('Total actions: 10')).toBeVisible();
    await expect(page.getByRole('listitem')).toHaveCount(10);
  });

  test('accessibility: aria-live regions and semantic markup', async ({ page }) => {
    // Counter value in aria-live region
    const counterRegion = page.getByTestId('counter-value');
    await expect(counterRegion).toHaveAttribute('aria-live', 'polite');

    // Action count in aria-live region
    const actionCount = page.locator('[aria-live="polite"]').filter({ hasText: 'Total actions' });
    await expect(actionCount).toBeVisible();

    // Buttons have data-testid
    await expect(page.getByTestId('increment-btn')).toBeVisible();
    await expect(page.getByTestId('decrement-btn')).toBeVisible();
    await expect(page.getByTestId('reset-btn')).toBeVisible();

    // History uses semantic ul/li
    await page.getByRole('button', { name: '+1' }).click();
    await expect(page.locator('ul')).toBeVisible();
    await expect(page.getByRole('listitem')).toHaveCount(1);
  });

  test('buttons have minimum 44x44px touch targets', async ({ page }) => {
    for (const testId of ['increment-btn', 'decrement-btn', 'reset-btn']) {
      const box = await page.getByTestId(testId).boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
  });
});
