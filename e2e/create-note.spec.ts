import { test, expect } from '@playwright/test';

const API = 'http://localhost:3000/api';

test.beforeEach(async ({ request }) => {
  await request.post(`${API}/reset`);
});

test.describe('Create Note', () => {
  test('creates a note with valid data and shows it in the list', async ({ page }) => {
    await page.goto('/notes');
    await page.getByRole('button', { name: 'Create new note' }).click();

    // Title field should be auto-focused
    const titleInput = page.getByLabel('Title');
    await expect(titleInput).toBeFocused();

    // Character counters visible
    await expect(page.getByText('0/255')).toBeVisible();
    await expect(page.getByText('0/10000')).toBeVisible();

    // Fill form
    await titleInput.fill('My New Note');
    await page.getByLabel('Content').fill('This is the content of my new note.');

    // Save button should be enabled
    const saveBtn = page.getByRole('button', { name: 'Save Note' });
    await expect(saveBtn).toBeEnabled();
    await saveBtn.click();

    // Should navigate to detail view and show the new note
    await expect(page.getByRole('heading', { name: 'My New Note' })).toBeVisible();
    await expect(page.getByText('This is the content of my new note.')).toBeVisible();
  });

  test('shows validation errors for empty fields on blur', async ({ page }) => {
    await page.goto('/notes/new');

    const titleInput = page.getByLabel('Title');
    await titleInput.focus();
    await titleInput.blur();
    await expect(page.getByText('Title is required.')).toBeVisible();

    const contentInput = page.getByLabel('Content');
    await contentInput.focus();
    await contentInput.blur();
    await expect(page.getByText('Content is required.')).toBeVisible();

    // Save button should be disabled
    await expect(page.getByRole('button', { name: 'Save Note' })).toBeDisabled();
  });

  test('disables Save button while form is invalid', async ({ page }) => {
    await page.goto('/notes/new');
    await expect(page.getByRole('button', { name: 'Save Note' })).toBeDisabled();
  });
});
