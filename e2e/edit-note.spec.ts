import { test, expect } from '@playwright/test';

const API = 'http://localhost:3000/api';

test.beforeEach(async ({ request }) => {
  await request.post(`${API}/reset`);
});

test.describe('Edit Note', () => {
  test('edits a note and sees updated content', async ({ page }) => {
    await page.goto('/notes');
    await page.getByText('Welcome to Notes').click();
    await page.getByRole('button', { name: 'Edit' }).click();

    // Form should be pre-populated
    const titleInput = page.getByLabel('Title');
    await expect(titleInput).toHaveValue('Welcome to Notes');

    // Edit title
    await titleInput.clear();
    await titleInput.fill('Updated Note Title');

    const updateBtn = page.getByRole('button', { name: 'Update Note' });
    await expect(updateBtn).toBeEnabled();
    await updateBtn.click();

    // Should show updated detail
    await expect(page.getByRole('heading', { name: 'Updated Note Title' })).toBeVisible();
  });

  test('shows unsaved changes confirmation when navigating away from dirty form', async ({ page }) => {
    await page.goto('/notes');
    await page.getByText('Welcome to Notes').click();
    await page.getByRole('button', { name: 'Edit' }).click();

    // Modify form to make it dirty
    await page.getByLabel('Title').fill('Changed title');

    // Try to navigate away by clicking Cancel
    await page.getByRole('button', { name: 'Cancel' }).click();

    // Should show discard confirmation
    await expect(page.getByText('You have unsaved changes. Discard?')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Discard' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Keep Editing' })).toBeVisible();
  });

  test('can discard unsaved changes', async ({ page }) => {
    await page.goto('/notes');
    await page.getByText('Welcome to Notes').click();
    await page.getByRole('button', { name: 'Edit' }).click();
    await page.getByLabel('Title').fill('Changed title');
    await page.getByRole('button', { name: 'Cancel' }).click();

    // Discard
    await page.getByRole('button', { name: 'Discard' }).click();

    // Should navigate back to list/placeholder
    await expect(page.getByText('Select a note to view it, or create a new one.')).toBeVisible();
  });
});
