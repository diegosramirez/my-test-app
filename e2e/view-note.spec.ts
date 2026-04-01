import { test, expect } from '@playwright/test';

const API = 'http://localhost:3000/api';

test.beforeEach(async ({ request }) => {
  await request.post(`${API}/reset`);
});

test.describe('View Note Detail', () => {
  test('clicking a note shows its full detail with edit and delete buttons', async ({ page }) => {
    await page.goto('/notes');
    await page.getByText('Welcome to Notes').click();

    // Should show detail view
    await expect(page.getByRole('heading', { name: 'Welcome to Notes' })).toBeVisible();
    // Full content visible
    await expect(page.getByText(/This is your first sample note/)).toBeVisible();
    // Timestamps
    await expect(page.getByText(/Created/)).toBeVisible();
    // Edit and Delete buttons
    await expect(page.getByRole('button', { name: 'Edit' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Delete' })).toBeVisible();
  });

  test('active note is highlighted in list', async ({ page }) => {
    await page.goto('/notes');
    await page.getByText('Welcome to Notes').click();
    // The button containing the note should have aria-current
    const activeItem = page.locator('[aria-current="true"]');
    await expect(activeItem).toBeVisible();
  });
});
