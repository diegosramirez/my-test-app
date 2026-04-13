import { test, expect } from '@playwright/test';

test.describe('Basic UI Functionality', () => {
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
    await expect(searchInput).toHaveAttribute('id', 'search-input');
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

  test('should show loading state when search is triggered', async ({ page }) => {
    const searchInput = page.getByLabel('Search');

    // Start search
    await searchInput.fill('angular');

    // Should show loading indicator with spinner and text
    await expect(page.locator('.loading-container')).toBeVisible({ timeout: 1000 });
    await expect(page.getByText('Searching...')).toBeVisible();
    await expect(page.locator('.loading-spinner')).toBeVisible();
  });

  test('should be responsive on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Verify interface is still functional
    const searchInput = page.getByLabel('Search');
    await expect(searchInput).toBeVisible();

    // Verify main container is visible
    const searchContainer = page.locator('.search-main');
    await expect(searchContainer).toBeVisible();

    // Test typing indicator on mobile
    await searchInput.fill('test');
    await expect(page.locator('.typing-indicator')).toBeVisible();
  });

  test('should handle accessibility requirements for input', async ({ page }) => {
    const searchInput = page.getByLabel('Search');

    // Verify ARIA labels and roles
    await expect(searchInput).toHaveAttribute('id', 'search-input');
    await expect(searchInput).toHaveAttribute('autocomplete', 'off');

    // Verify screen reader label exists (it has sr-only class, so check for presence)
    const label = page.locator('label[for="search-input"]');
    await expect(label).toHaveClass(/sr-only/);
  });

  test('should show proper input validation states', async ({ page }) => {
    const searchInput = page.getByLabel('Search');

    // Test empty state
    await expect(searchInput).toHaveValue('');

    // Test input focus
    await searchInput.focus();
    await expect(searchInput).toBeFocused();

    // Test input with content
    await searchInput.fill('test query');
    await expect(searchInput).toHaveValue('test query');

    // Test clear functionality
    await searchInput.clear();
    await expect(searchInput).toHaveValue('');
  });

  test('should debounce input correctly', async ({ page }) => {
    const searchInput = page.getByLabel('Search');

    // Type rapidly
    await searchInput.fill('a');
    await page.waitForTimeout(50);
    await searchInput.fill('an');
    await page.waitForTimeout(50);
    await searchInput.fill('angular');

    // Should show typing indicator immediately
    await expect(page.locator('.typing-indicator')).toBeVisible();

    // Wait for less than debounce time
    await page.waitForTimeout(200);
    await expect(page.locator('.typing-indicator')).toBeVisible();

    // Wait for debounce to complete
    await page.waitForTimeout(200);
    await expect(page.locator('.typing-indicator')).not.toBeVisible();

    // Loading should be triggered after debounce
    await expect(page.getByText('Searching...')).toBeVisible({ timeout: 500 });
  });
});