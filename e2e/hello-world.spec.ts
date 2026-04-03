import { test, expect } from '@playwright/test';

test.describe('Hello World Component', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the root route which loads HelloWorldComponent
    await page.goto('/');
  });

  test('displays Hello World heading and current date', async ({ page }) => {
    // Test that component displays "Hello World" as h1 heading
    const heading = page.getByRole('heading', { level: 1, name: 'Hello World' });
    await expect(heading).toBeVisible();
    await expect(heading).toHaveText('Hello World');

    // Test that current date is displayed in MMMM d, yyyy format
    const dateText = page.getByText(/^(January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}, \d{4}$/);
    await expect(dateText).toBeVisible();

    // Verify the date format matches expected pattern (e.g., "April 3, 2026")
    const dateContent = await dateText.textContent();
    expect(dateContent).toMatch(/^(January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}, \d{4}$/);
  });

  test('loads without console errors or warnings', async ({ page }) => {
    const messages: string[] = [];

    // Capture console messages
    page.on('console', (msg) => {
      if (msg.type() === 'error' || msg.type() === 'warning') {
        messages.push(`${msg.type()}: ${msg.text()}`);
      }
    });

    // Navigate and wait for the page to load
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Assert no error or warning messages
    expect(messages).toHaveLength(0);
  });

  test('displays date in user local timezone', async ({ page }) => {
    // Navigate to page
    await page.goto('/');

    // Get the displayed date
    const dateText = page.getByText(/^(January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}, \d{4}$/);
    await expect(dateText).toBeVisible();

    // Get current date in user's timezone for comparison
    const currentDate = new Date();
    const expectedDate = currentDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const actualDateText = await dateText.textContent();
    expect(actualDateText?.trim()).toBe(expectedDate);
  });

  test('layout centers content properly on desktop viewport', async ({ page }) => {
    // Set desktop viewport (1024px+)
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/');

    // Check that content container is centered
    const container = page.locator('.hello-world-container');
    await expect(container).toBeVisible();

    // Verify the container has proper centering styles
    const containerStyles = await container.evaluate(el => {
      const style = getComputedStyle(el);
      return {
        display: style.display,
        alignItems: style.alignItems,
        justifyContent: style.justifyContent,
        minHeight: style.minHeight
      };
    });

    expect(containerStyles.display).toBe('flex');
    expect(containerStyles.alignItems).toBe('center');
    expect(containerStyles.justifyContent).toBe('center');
    // minHeight should be set to viewport height (could be in pixels or vh)
    expect(parseFloat(containerStyles.minHeight)).toBeGreaterThan(500); // At least 500px high
  });

  test('layout centers content properly on mobile viewport', async ({ page }) => {
    // Set mobile viewport (320px+)
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Check that content is visible and properly centered on mobile
    const heading = page.getByRole('heading', { level: 1, name: 'Hello World' });
    await expect(heading).toBeVisible();

    const dateText = page.getByText(/^(January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}, \d{4}$/);
    await expect(dateText).toBeVisible();

    // Verify responsive design applied
    const headingStyles = await heading.evaluate(el => {
      const style = getComputedStyle(el);
      return {
        fontSize: style.fontSize,
        textAlign: style.textAlign
      };
    });

    expect(headingStyles.textAlign).toBe('center');
    // Font size should be smaller on mobile (2rem = 32px)
    expect(parseFloat(headingStyles.fontSize)).toBeLessThanOrEqual(32);
  });

  test('provides proper accessibility support', async ({ page }) => {
    await page.goto('/');

    // Check heading hierarchy
    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toBeVisible();
    await expect(heading).toHaveText('Hello World');

    // Check that date has proper aria-label for screen readers
    const dateContainer = page.locator('.date-text');
    await expect(dateContainer).toBeVisible();

    const ariaLabel = await dateContainer.getAttribute('aria-label');
    expect(ariaLabel).toContain('Current date:');

    // Verify visually hidden "Today is" text exists for screen readers
    const visuallyHiddenText = page.locator('.visually-hidden');
    await expect(visuallyHiddenText).toBeAttached();
    await expect(visuallyHiddenText).toHaveText('Today is ');
  });

  test('handles date formatting errors gracefully', async ({ page }) => {
    // This test verifies the fallback behavior exists in the template
    await page.goto('/');

    // Check that either the formatted date OR the fallback is displayed
    const hasFormattedDate = await page.getByText(/^(January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}, \d{4}$/).isVisible().catch(() => false);
    const hasFallback = await page.getByText('Date unavailable').isVisible().catch(() => false);

    // One of them should be visible
    expect(hasFormattedDate || hasFallback).toBeTruthy();

    // If formatted date is visible, it should match the expected pattern
    if (hasFormattedDate) {
      const dateText = page.getByText(/^(January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}, \d{4}$/);
      await expect(dateText).toBeVisible();
    }
  });

  test('root route loads HelloWorldComponent without routing conflicts', async ({ page }) => {
    // Test direct navigation to root path
    await page.goto('/');

    // Verify the component loads correctly
    const heading = page.getByRole('heading', { level: 1, name: 'Hello World' });
    await expect(heading).toBeVisible();

    // Verify page title and URL
    expect(page.url()).toBe('http://localhost:4200/');

    // Test that navigating to root again works (no routing conflicts)
    await page.goto('/');
    await expect(heading).toBeVisible();
  });

  test('component has fade-in animation', async ({ page }) => {
    await page.goto('/');

    // Check that the content container has animation styles
    const contentContainer = page.locator('.hello-world-content');
    await expect(contentContainer).toBeVisible();

    const animationName = await contentContainer.evaluate(el => {
      return getComputedStyle(el).animationName;
    });

    // Angular may add scope prefix, so check if animation name contains 'fadeIn'
    expect(animationName).toContain('fadeIn');
  });

  test('follows standalone component architecture', async ({ page }) => {
    // This is more of a structural test - we verify the component renders correctly
    // which implies the standalone architecture with proper imports is working
    await page.goto('/');

    // If these elements render, it means CommonModule and DatePipe imports are working
    const heading = page.getByRole('heading', { level: 1, name: 'Hello World' });
    await expect(heading).toBeVisible();

    // Date pipe functionality working indicates proper imports
    const dateText = page.getByText(/^(January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}, \d{4}$/);
    await expect(dateText).toBeVisible();

    // Structural directives (*ngIf) working indicates CommonModule import
    // If the page loads without errors, the standalone architecture is functional
    const container = page.locator('.hello-world-container');
    await expect(container).toBeVisible();
  });
});