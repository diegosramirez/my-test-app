import { test, expect } from '@playwright/test';

const API = 'http://localhost:3000/api';

test.beforeEach(async ({ request }) => {
  await request.post(`${API}/reset`);
});

test.describe('Delete Note', () => {
  test('shows inline delete confirmation and can cancel', async ({ page }) => {
    await page.goto('/notes');
    await page.getByText('Welcome to Notes').click();
    await page.getByRole('button', { name: 'Delete' }).click();

    // Inline confirmation appears (not window.confirm)
    await expect(page.getByText('Delete this note? This cannot be undone.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Confirm Delete' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();

    // Cancel delete
    await page.getByRole('button', { name: 'Cancel' }).click();
    // Should still show the note
    await expect(page.getByRole('heading', { name: 'Welcome to Notes' })).toBeVisible();
  });

  test('deletes a note when confirmed', async ({ page }) => {
    await page.goto('/notes');
    await page.getByText('Welcome to Notes').click();
    await page.getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('button', { name: 'Confirm Delete' }).click();

    // Should navigate away and note should be gone from list
    await expect(page.getByText('Select a note to view it, or create a new one.')).toBeVisible();
    await expect(page.getByText('Welcome to Notes')).not.toBeVisible();
    // Only one note remaining
    const items = page.getByRole('list').getByRole('listitem');
    await expect(items).toHaveCount(1);
  });
});
