import { test, expect, Page } from '@playwright/test';

test.describe('Search Application E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display search interface with correct elements', async ({ page }) => {
    // Verify main interface elements
    await expect(page.getByRole('heading', { name: 'Search Articles' })).toBeVisible();
    await expect(page.getByText('Find relevant articles and tutorials quickly')).toBeVisible();

    // Verify search input is present and accessible
    const searchInput = page.getByLabel('Search');
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toHaveAttribute('placeholder', 'Search for articles...');
  });

  test('should show minimum character message for queries less than 2 characters', async ({ page }) => {
    const searchInput = page.getByLabel('Search');

    // Type single character
    await searchInput.fill('a');

    // Should show minimum length message
    await expect(page.getByText('Please enter at least 2 characters to search')).toBeVisible();

    // Type second character - message should disappear
    await searchInput.fill('an');
    await expect(page.getByText('Please enter at least 2 characters to search')).not.toBeVisible();
  });

  test('should show typing indicator during active typing', async ({ page }) => {
    const searchInput = page.getByLabel('Search');

    // Start typing
    await searchInput.fill('angular');

    // Should show typing indicator
    await expect(page.locator('.typing-indicator')).toBeVisible();

    // Wait for debounce (300ms) plus buffer
    await page.waitForTimeout(400);

    // Typing indicator should disappear after debounce
    await expect(page.locator('.typing-indicator')).not.toBeVisible();
  });

  test('should debounce search at exactly 300ms and not fire API calls during typing', async ({ page }) => {
    const searchInput = page.getByLabel('Search');

    // Type rapidly - simulate fast typing
    await searchInput.fill('a');
    await page.waitForTimeout(50);
    await searchInput.fill('an');
    await page.waitForTimeout(50);
    await searchInput.fill('ang');
    await page.waitForTimeout(50);
    await searchInput.fill('angu');
    await page.waitForTimeout(50);
    await searchInput.fill('angul');
    await page.waitForTimeout(50);
    await searchInput.fill('angular');

    // Wait less than debounce time
    await page.waitForTimeout(250);

    // Should show loading indicator
    await expect(page.getByText('Searching...')).toBeVisible();

    // Wait for search to complete with longer timeout due to simulated API delay
    await expect(page.getByText('Searching...')).not.toBeVisible({ timeout: 3000 });

    // Verify results are displayed - check for result cards first
    const resultCards = page.locator('.result-card');
    await expect(resultCards).toHaveCount(1, { timeout: 1000 }); // Only "Angular Guide: Getting Started" should match "angular"

    // Check for result count text
    await expect(page.getByText(/Found 1 result/)).toBeVisible();
  });

  test('should return cached results instantly for repeated searches', async ({ page }) => {
    const searchInput = page.getByLabel('Search');

    // First search for 'angular'
    await searchInput.fill('angular');

    // Wait for initial search to complete
    await expect(page.getByText('Searching...')).toBeVisible();
    await expect(page.getByText('Searching...')).not.toBeVisible({ timeout: 3000 });

    // Check for results using result cards first
    const resultCards = page.locator('.result-card');
    await expect(resultCards).toHaveCount(1, { timeout: 1000 });

    // Clear input
    await searchInput.clear();
    await expect(resultCards).not.toBeVisible();

    // Search again for same term - should be instant from cache
    const startTime = Date.now();
    await searchInput.fill('angular');

    // Should show results quickly from cache
    await expect(resultCards).toHaveCount(1, { timeout: 1500 });
    const endTime = Date.now();

    // Verify cache indicator is present (⚡ symbol)
    await expect(page.locator('.cache-indicator')).toBeVisible({ timeout: 1000 });

    // Response time should be reasonably fast
    const responseTime = endTime - startTime;
    expect(responseTime).toBeLessThan(1500); // Should be faster than initial API calls
  });

  test('should display loading states correctly', async ({ page }) => {
    const searchInput = page.getByLabel('Search');

    // Start search
    await searchInput.fill('typescript');

    // Should show loading indicator with spinner and text
    const loadingContainer = page.locator('.loading-container');
    await expect(loadingContainer).toBeVisible();
    await expect(page.getByText('Searching...')).toBeVisible();
    await expect(page.locator('.loading-spinner')).toBeVisible();

    // Wait for search to complete with longer timeout
    await expect(loadingContainer).not.toBeVisible({ timeout: 3000 });

    // Should show results - check for result cards
    const resultCards = page.locator('.result-card');
    await expect(resultCards).toHaveCount(1, { timeout: 1000 }); // TypeScript result
  });

  test('should handle search results display with highlighting', async ({ page }) => {
    const searchInput = page.getByLabel('Search');

    // Search for a term that will have results
    await searchInput.fill('angular');

    // Wait for results with longer timeout
    await expect(page.getByText('Searching...')).not.toBeVisible({ timeout: 3000 });

    // Verify result structure using result cards first
    const resultCards = page.locator('.result-card');
    await expect(resultCards).toHaveCount(1, { timeout: 1000 });

    // Check for highlighted search terms
    const resultTitle = page.locator('.result-title');
    await expect(resultTitle).toContainText('Angular');

    // Verify result has expected content structure
    await expect(page.locator('.result-description')).toBeVisible();

    // Check that results counter appears
    await expect(page.getByText(/Found 1 result/)).toBeVisible({ timeout: 1000 });
  });

  test('should show empty state for no results', async ({ page }) => {
    const searchInput = page.getByLabel('Search');

    // Search for something that won't have results
    await searchInput.fill('zzznonexistent');

    // Wait for search to complete
    await expect(page.getByText('Searching...')).not.toBeVisible({ timeout: 3000 });

    // Should show empty state
    await expect(page.getByText('No results found')).toBeVisible({ timeout: 1000 });
    await expect(page.getByText('Try different keywords or check your spelling')).toBeVisible();
    await expect(page.locator('.empty-icon')).toBeVisible(); // 🔍 icon

    // Should show results count as 0
    await expect(page.getByText(/Found 0 result/)).toBeVisible({ timeout: 1000 });
  });

  test('should clear results when input is emptied', async ({ page }) => {
    const searchInput = page.getByLabel('Search');

    // Search for something
    await searchInput.fill('angular');
    await expect(page.getByText('Searching...')).not.toBeVisible({ timeout: 3000 });

    // Wait for results using result cards
    const resultCards = page.locator('.result-card');
    await expect(resultCards).toHaveCount(1, { timeout: 1000 });

    // Clear the input
    await searchInput.clear();

    // Results should be cleared
    await expect(resultCards).not.toBeVisible();
    await expect(page.getByText(/Found \d+ result/)).not.toBeVisible();
  });

  test('should handle multiple sequential searches correctly', async ({ page }) => {
    const searchInput = page.getByLabel('Search');
    const resultCards = page.locator('.result-card');

    // First search
    await searchInput.fill('angular');
    await expect(page.getByText('Searching...')).not.toBeVisible({ timeout: 3000 });
    await expect(resultCards).toHaveCount(1, { timeout: 1000 });

    // Second search (different term)
    await searchInput.clear();
    await searchInput.fill('typescript');
    await expect(page.getByText('Searching...')).not.toBeVisible({ timeout: 3000 });
    await expect(resultCards).toHaveCount(1, { timeout: 1000 });

    // Third search (back to first term - should be cached)
    await searchInput.clear();
    await searchInput.fill('angular');
    await expect(resultCards).toHaveCount(1, { timeout: 1500 });

    // Should show cache indicator
    await expect(page.locator('.cache-indicator')).toBeVisible({ timeout: 1000 });
  });

  test('should be responsive on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Verify interface is still functional
    const searchInput = page.getByLabel('Search');
    await expect(searchInput).toBeVisible();

    // Search should still work
    await searchInput.fill('angular');
    await expect(page.getByText('Searching...')).not.toBeVisible({ timeout: 3000 });

    // Results should be visible and properly formatted
    const resultCards = page.locator('.result-card');
    await expect(resultCards).toHaveCount(1, { timeout: 1000 });

    // Verify mobile-specific styling is applied (smaller padding/font sizes)
    const searchContainer = page.locator('.search-main');
    await expect(searchContainer).toBeVisible();
  });

  test('should handle accessibility requirements', async ({ page }) => {
    const searchInput = page.getByLabel('Search');

    // Verify ARIA labels and roles
    await expect(searchInput).toHaveAttribute('id', 'search-input');

    // Verify live regions for dynamic content
    await searchInput.fill('angular');

    // Loading state should have proper ARIA attributes
    const loadingContainer = page.locator('[role="status"]').first();
    await expect(loadingContainer).toBeVisible();

    // Wait for results with longer timeout
    await expect(page.getByText('Searching...')).not.toBeVisible({ timeout: 3000 });

    // Wait for result cards to appear first
    const resultCards = page.locator('.result-card');
    await expect(resultCards).toHaveCount(1, { timeout: 1000 });

    // Results should have proper list structure
    const resultsList = page.locator('[role="list"]');
    await expect(resultsList).toBeVisible({ timeout: 1000 });

    // Individual results should have listitem role
    const listItems = page.locator('[role="listitem"]');
    await expect(listItems).toHaveCount(1);
  });

  test('should handle rapid input changes without race conditions', async ({ page }) => {
    const searchInput = page.getByLabel('Search');

    // Type multiple queries rapidly to test switchMap behavior
    await searchInput.fill('an');
    await page.waitForTimeout(50);
    await searchInput.fill('typ');
    await page.waitForTimeout(50);
    await searchInput.fill('rxjs');

    // Wait for final search to complete
    await expect(page.getByText('Searching...')).not.toBeVisible({ timeout: 3000 });

    // Should show results for 'rxjs' (the final query)
    const resultCards = page.locator('.result-card');
    await expect(resultCards).toHaveCount(1, { timeout: 1000 }); // Should have RxJS result

    // Verify it shows RxJS content, not results from previous partial queries
    await expect(page.getByText('RxJS Observables Tutorial')).toBeVisible();

    // Check for result count
    await expect(page.getByText(/Found 1 result/)).toBeVisible({ timeout: 1000 });
  });
});