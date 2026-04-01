import { test, expect } from '@playwright/test';

const API = 'http://localhost:3000/api';

test.beforeEach(async ({ request }) => {
  await request.post(`${API}/reset`);
});

test.describe('Responsive Layout & Accessibility', () => {
  test('wide viewport shows sidebar and detail side by side', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto('/notes');
    const sidebar = page.locator('.sidebar');
    const detail = page.locator('.detail-area');
    await expect(sidebar).toBeVisible();
    await expect(detail).toBeVisible();
  });

  test('narrow viewport shows back button when viewing a note', async ({ page }) => {
    await page.setViewportSize({ width: 500, height: 800 });
    await page.goto('/notes');
    await page.getByText('Welcome to Notes').click();
    await expect(page.getByRole('button', { name: 'Back to notes list' })).toBeVisible();
  });

  test('back button returns to notes list on narrow viewport', async ({ page }) => {
    await page.setViewportSize({ width: 500, height: 800 });
    await page.goto('/notes');
    await page.getByText('Welcome to Notes').click();
    await page.getByRole('button', { name: 'Back to notes list' }).click();
    await expect(page.getByText('Notes')).toBeVisible();
  });

  test('delete confirmation dialog has role=alertdialog', async ({ page }) => {
    await page.goto('/notes');
    await page.getByText('Welcome to Notes').click();
    await page.getByRole('button', { name: 'Delete' }).click();
    const dialog = page.locator('[role="alertdialog"]');
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('aria-label', 'Confirm deletion');
  });

  test('notes sorted by updatedAt descending from API', async ({ request }) => {
    // Create a new note (will have latest updatedAt)
    await request.post(`${API}/notes`, {
      data: { title: 'Latest Note', content: 'Latest content' },
    });
    const resp = await request.get(`${API}/notes`);
    const notes = await resp.json();
    expect(notes[0].title).toBe('Latest Note');
  });
});
