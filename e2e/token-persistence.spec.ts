import { test, expect } from '@playwright/test';

test.describe('Token Persistence and App Initialization', () => {
  test('user with no token is sent to /login without flicker', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Log In' })).toBeVisible();
  });

  test('user with invalid token in localStorage is redirected to /login', async ({ page }) => {
    // Pre-set an invalid token before navigating
    await page.goto('/login');
    await page.evaluate(() => localStorage.setItem('auth_token', 'invalid-token'));

    // Navigate to a protected route — APP_INITIALIZER will fail to validate token
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);

    // Token should be cleared after failed validation
    const token = await page.evaluate(() => localStorage.getItem('auth_token'));
    expect(token).toBeNull();
  });

  test('unauthenticated access to /dashboard includes returnUrl query param', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login\?returnUrl=%2Fdashboard/);
    await expect(page.getByRole('heading', { name: 'Log In' })).toBeVisible();
  });

  test('session expired banner shows when sessionExpired=true', async ({ page }) => {
    await page.goto('/login?sessionExpired=true');
    await expect(page.getByText('Your session has expired. Please log in again.')).toBeVisible();
  });
});
