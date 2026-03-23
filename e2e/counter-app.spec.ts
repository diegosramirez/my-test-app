import { test, expect } from '@playwright/test';

test.describe('Counter + History App', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('shows initial state with counter at 0 and empty history', async ({ page }) => {
    await expect(page.getByTestId('counter-value')).toHaveText('0');
    await expect(page.getByText('No actions yet')).toBeVisible();
    await expect(page.getByTestId('history-list')).not.toBeVisible();
  });

  test('increment button increases counter and adds +1 history entry', async ({ page }) => {
    await page.getByLabel('Increment counter by one').click();
    await expect(page.getByTestId('counter-value')).toHaveText('1');

    const entries = page.getByTestId('history-entry');
    await expect(entries).toHaveCount(1);
    await expect(entries.first()).toContainText('+1');
    await expect(page.getByText('No actions yet')).not.toBeVisible();
  });

  test('decrement button decreases counter including to negative values', async ({ page }) => {
    await page.getByLabel('Decrement counter by one').click();
    await expect(page.getByTestId('counter-value')).toHaveText('-1');

    await page.getByLabel('Decrement counter by one').click();
    await expect(page.getByTestId('counter-value')).toHaveText('-2');

    const entries = page.getByTestId('history-entry');
    await expect(entries).toHaveCount(2);
    await expect(entries.first()).toContainText('-1');
  });

  test('reset button sets counter to 0 and adds reset history entry', async ({ page }) => {
    // Increment a few times first
    await page.getByLabel('Increment counter by one').click();
    await page.getByLabel('Increment counter by one').click();
    await expect(page.getByTestId('counter-value')).toHaveText('2');

    await page.getByLabel('Reset counter to zero').click();
    await expect(page.getByTestId('counter-value')).toHaveText('0');

    const entries = page.getByTestId('history-entry');
    await expect(entries.first()).toContainText('reset');
  });

  test('reset from zero still adds history entry and fires tracking event', async ({ page }) => {
    const consoleLogs: string[] = [];
    page.on('console', msg => consoleLogs.push(msg.text()));

    await page.getByLabel('Reset counter to zero').click();
    await expect(page.getByTestId('counter-value')).toHaveText('0');

    const entries = page.getByTestId('history-entry');
    await expect(entries).toHaveCount(1);
    await expect(entries.first()).toContainText('reset');

    expect(consoleLogs.some(log => log.includes('counter_reset'))).toBeTruthy();
  });

  test('history displays in reverse-chronological order with timestamps', async ({ page }) => {
    await page.getByLabel('Increment counter by one').click();
    await page.getByLabel('Decrement counter by one').click();
    await page.getByLabel('Reset counter to zero').click();

    const entries = page.getByTestId('history-entry');
    await expect(entries).toHaveCount(3);

    // Newest first: reset, -1, +1
    await expect(entries.nth(0)).toContainText('reset');
    await expect(entries.nth(1)).toContainText('-1');
    await expect(entries.nth(2)).toContainText('+1');

    // Each entry should have a timestamp in HH:MM:SS format
    const firstEntryText = await entries.first().textContent();
    expect(firstEntryText).toMatch(/\d{2}:\d{2}:\d{2}/);
  });

  test('empty state returns after browser refresh', async ({ page }) => {
    await page.getByLabel('Increment counter by one').click();
    await expect(page.getByTestId('counter-value')).toHaveText('1');

    await page.reload();
    await expect(page.getByTestId('counter-value')).toHaveText('0');
    await expect(page.getByText('No actions yet')).toBeVisible();
  });

  test('accessibility: aria-live, aria-labels, keyboard operability', async ({ page }) => {
    // aria-live on counter display
    const counterDisplay = page.getByTestId('counter-value');
    await expect(counterDisplay).toHaveAttribute('aria-live', 'polite');

    // aria-labels on buttons
    await expect(page.getByLabel('Increment counter by one')).toBeVisible();
    await expect(page.getByLabel('Decrement counter by one')).toBeVisible();
    await expect(page.getByLabel('Reset counter to zero')).toBeVisible();

    // Keyboard operability: Tab to increment, press Enter
    await page.getByLabel('Increment counter by one').focus();
    await page.keyboard.press('Enter');
    await expect(counterDisplay).toHaveText('1');

    // Tab to decrement, press Space
    await page.keyboard.press('Tab');
    await page.keyboard.press('Space');
    await expect(counterDisplay).toHaveText('0');

    // History uses semantic list
    await expect(page.getByTestId('history-list')).toBeVisible();
    const tagName = await page.getByTestId('history-list').evaluate(el => el.tagName.toLowerCase());
    expect(tagName).toBe('ul');
  });

  test('tracking events fire with correct data', async ({ page }) => {
    const consoleLogs: { text: string }[] = [];
    page.on('console', msg => consoleLogs.push({ text: msg.text() }));

    await page.getByLabel('Increment counter by one').click();
    expect(consoleLogs.some(l => l.text.includes('counter_incremented'))).toBeTruthy();

    await page.getByLabel('Decrement counter by one').click();
    expect(consoleLogs.some(l => l.text.includes('counter_decremented'))).toBeTruthy();

    await page.getByLabel('Reset counter to zero').click();
    expect(consoleLogs.some(l => l.text.includes('counter_reset'))).toBeTruthy();
  });

  test('every click produces exactly one history entry', async ({ page }) => {
    for (let i = 0; i < 5; i++) {
      await page.getByLabel('Increment counter by one').click();
    }
    await expect(page.getByTestId('counter-value')).toHaveText('5');
    await expect(page.getByTestId('history-entry')).toHaveCount(5);
  });
});
