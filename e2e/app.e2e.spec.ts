import { test, expect } from '@playwright/test';

test.describe('App', () => {
  test('should create the app and display title', async ({ page }) => {
    await page.goto('/');

    // Check that the page title contains the app name
    await expect(page).toHaveTitle(/my-test-app/);

    // Check that the main heading is displayed
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
    await expect(heading).toContainText('Hello, my-test-app');

    // Check that the congratulations message is displayed
    await expect(page.locator('text=Congratulations! Your app is running. 🎉')).toBeVisible();
  });

  test('should have navigation links', async ({ page }) => {
    await page.goto('/');

    // Check that the "Explore the Docs" link is present and clickable
    const docsLink = page.locator('a[href="https://angular.dev"]');
    await expect(docsLink).toBeVisible();
    await expect(docsLink).toContainText('Explore the Docs');
  });
});