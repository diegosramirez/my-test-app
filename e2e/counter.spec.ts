import { test, expect } from '@playwright/test';

test.describe('Counter App', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('initial state: counter is 0, empty history message shown, all buttons visible', async ({ page }) => {
    await expect(page.getByTestId('counter-value')).toHaveText('0');
    await expect(page.getByTestId('empty-history')).toHaveText('No actions yet');
    await expect(page.getByRole('button', { name: 'Increment (+1)' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Decrement/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reset' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Increment (+1)' })).toBeEnabled();
    await expect(page.getByRole('button', { name: /Decrement/ })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Reset' })).toBeEnabled();
  });

  test('no scaffold remnants on the page', async ({ page }) => {
    const body = await page.textContent('body');
    expect(body).not.toContain('Hello');
    expect(body).not.toContain('Congratulations');
    expect(body).not.toContain('angular.dev');
  });

  test('increment increases counter and adds history entry', async ({ page }) => {
    await page.getByRole('button', { name: 'Increment (+1)' }).click();
    await expect(page.getByTestId('counter-value')).toHaveText('1');

    const entries = page.getByTestId('history-entry');
    await expect(entries).toHaveCount(1);
    await expect(entries.first()).toContainText('+1 → 1');

    // Empty history message should be gone
    await expect(page.getByTestId('empty-history')).toHaveCount(0);
  });

  test('decrement decreases counter including into negatives', async ({ page }) => {
    await page.getByRole('button', { name: /Decrement/ }).click();
    await expect(page.getByTestId('counter-value')).toHaveText('-1');
    await expect(page.getByTestId('history-entry').first()).toContainText('-1 → -1');

    await page.getByRole('button', { name: /Decrement/ }).click();
    await expect(page.getByTestId('counter-value')).toHaveText('-2');
    await expect(page.getByTestId('history-entry').first()).toContainText('-1 → -2');
  });

  test('reset sets counter to 0 and logs history even when already 0', async ({ page }) => {
    // Reset from non-zero
    await page.getByRole('button', { name: 'Increment (+1)' }).click();
    await page.getByRole('button', { name: 'Increment (+1)' }).click();
    await expect(page.getByTestId('counter-value')).toHaveText('2');

    await page.getByRole('button', { name: 'Reset' }).click();
    await expect(page.getByTestId('counter-value')).toHaveText('0');
    await expect(page.getByTestId('history-entry').first()).toContainText('reset → 0');

    // Reset when already 0 still logs
    await page.getByRole('button', { name: 'Reset' }).click();
    await expect(page.getByTestId('counter-value')).toHaveText('0');
    await expect(page.getByTestId('history-entry')).toHaveCount(4); // inc, inc, reset, reset
  });

  test('history is in reverse-chronological order with correct values', async ({ page }) => {
    await page.getByRole('button', { name: 'Increment (+1)' }).click(); // 1
    await page.getByRole('button', { name: 'Increment (+1)' }).click(); // 2
    await page.getByRole('button', { name: /Decrement/ }).click();       // 1
    await page.getByRole('button', { name: 'Reset' }).click();           // 0

    const entries = page.getByTestId('history-entry');
    await expect(entries).toHaveCount(4);

    // Newest first
    await expect(entries.nth(0)).toContainText('reset → 0');
    await expect(entries.nth(1)).toContainText('-1 → 1');
    await expect(entries.nth(2)).toContainText('+1 → 2');
    await expect(entries.nth(3)).toContainText('+1 → 1');
  });

  test('wildcard routes redirect to counter', async ({ page }) => {
    await page.goto('/some/unknown/path');
    await expect(page.getByTestId('counter-value')).toBeVisible();
    await expect(page.getByTestId('counter-value')).toHaveText('0');
  });

  test('counter display has aria-live attribute', async ({ page }) => {
    const counterEl = page.getByTestId('counter-value');
    await expect(counterEl).toHaveAttribute('aria-live', 'polite');
  });

  test('all buttons are native button elements', async ({ page }) => {
    // Using getByRole('button') confirms they are actual <button> elements
    const buttons = page.getByRole('button');
    await expect(buttons).toHaveCount(3);
  });

  test('rapid clicks each produce exactly one history entry', async ({ page }) => {
    // Click increment 5 times rapidly
    const btn = page.getByRole('button', { name: 'Increment (+1)' });
    for (let i = 0; i < 5; i++) {
      await btn.click();
    }
    await expect(page.getByTestId('counter-value')).toHaveText('5');
    await expect(page.getByTestId('history-entry')).toHaveCount(5);
  });
});
