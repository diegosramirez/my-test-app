import { test, expect } from '@playwright/test';

test.describe('Debug Search Application', () => {
  test('debug what content is actually rendered', async ({ page }) => {
    await page.goto('/');

    // Take a screenshot to see what's actually rendered
    await page.screenshot({ path: 'debug-initial.png' });

    const searchInput = page.getByLabel('Search');
    await expect(searchInput).toBeVisible();

    // Fill the search input
    await searchInput.fill('angular');

    // Wait a bit longer
    await page.waitForTimeout(2000);

    // Take another screenshot
    await page.screenshot({ path: 'debug-after-search.png' });

    // Log all text content on the page
    const bodyText = await page.locator('body').textContent();
    console.log('Full page content:', bodyText);

    // Check for specific elements
    const resultsContainer = page.locator('app-search-results');
    if (await resultsContainer.isVisible()) {
      console.log('Results container is visible');
      const resultsHTML = await resultsContainer.innerHTML();
      console.log('Results HTML:', resultsHTML);
    } else {
      console.log('Results container not visible');
    }

    // Check for loading state
    const loading = page.locator('.loading-container');
    if (await loading.isVisible()) {
      console.log('Loading container is visible');
    } else {
      console.log('Loading container not visible');
    }

    // Check for any error messages
    const errors = page.locator('[role="alert"]');
    const errorCount = await errors.count();
    if (errorCount > 0) {
      for (let i = 0; i < errorCount; i++) {
        const errorText = await errors.nth(i).textContent();
        console.log(`Error ${i + 1}:`, errorText);
      }
    }
  });
});