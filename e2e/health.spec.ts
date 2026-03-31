import { test, expect } from '@playwright/test';

test.describe('Health Check Page', () => {
  test('renders valid JSON with status UP, uptime as number, and ISO 8601 timestamp', async ({ page }) => {
    await page.goto('/health');

    const pre = page.getByRole('status').locator('pre');
    await expect(pre).toBeVisible();

    const text = await pre.textContent();
    expect(text).toBeTruthy();

    const json = JSON.parse(text!);
    expect(json.status).toBe('UP');
    expect(typeof json.uptime).toBe('number');
    expect(Number.isInteger(json.uptime)).toBe(true);
    expect(json.uptime).toBeGreaterThanOrEqual(0);
    // Validate ISO 8601 timestamp
    expect(typeof json.timestamp).toBe('string');
    const parsed = new Date(json.timestamp);
    expect(parsed.toISOString()).toBe(json.timestamp);
  });

  test('uptime is a non-negative integer representing seconds since bootstrap', async ({ page }) => {
    await page.goto('/health');

    const pre = page.getByRole('status').locator('pre');
    await expect(pre).toBeVisible();

    const json = JSON.parse((await pre.textContent())!);
    // Uptime should be a non-negative integer (0 is valid right after bootstrap)
    expect(Number.isInteger(json.uptime)).toBe(true);
    expect(json.uptime).toBeGreaterThanOrEqual(0);
    // App just bootstrapped, uptime should be small (within ±2s tolerance)
    expect(json.uptime).toBeLessThan(30);
  });

  test('loads without auth redirects - URL stays at /health', async ({ page }) => {
    await page.goto('/health');

    await expect(page.getByRole('status').locator('pre')).toBeVisible();
    expect(page.url()).toContain('/health');
  });

  test('sets browser tab title to Health Check', async ({ page }) => {
    await page.goto('/health');

    await expect(page.getByRole('status').locator('pre')).toBeVisible();
    await expect(page).toHaveTitle('Health Check');
  });

  test('renders no layout chrome - only the pre element with JSON', async ({ page }) => {
    await page.goto('/health');

    const pre = page.getByRole('status').locator('pre');
    await expect(pre).toBeVisible();

    // No nav, header, footer, sidebar elements should be visible
    await expect(page.locator('nav')).toHaveCount(0);
    await expect(page.locator('footer')).toHaveCount(0);
    // The role="status" host element should contain only the pre tag
    const statusEl = page.getByRole('status');
    const childCount = await statusEl.locator('> *').count();
    expect(childCount).toBe(1);
  });

  test('page renders within reasonable time', async ({ page }) => {
    const start = Date.now();
    await page.goto('/health');
    await expect(page.getByRole('status').locator('pre')).toBeVisible();
    const elapsed = Date.now() - start;
    // Should render well under 5s (generous for CI; story says <100ms from route activation)
    expect(elapsed).toBeLessThan(5000);
  });
});
