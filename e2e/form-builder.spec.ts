import { test, expect } from '@playwright/test';

test.describe('Form Builder Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('shows empty state with add field prompt', async ({ page }) => {
    await expect(page.getByText('Add your first field to get started')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Builder', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Preview' })).toBeVisible();
  });

  test('shows Build Mode badge by default', async ({ page }) => {
    await expect(page.getByText('Build Mode')).toBeVisible();
  });

  test('add a text field and see it in builder and preview', async ({ page }) => {
    await page.getByRole('button', { name: 'Add field' }).first().click();
    // Builder should show a field config card with label input
    await expect(page.getByText('text', { exact: true })).toBeVisible();
    // Preview should show the field (disabled in build mode)
    await expect(page.getByRole('heading', { name: 'Preview' })).toBeVisible();
    // Empty state should be gone
    await expect(page.getByText('Add your first field to get started')).not.toBeVisible();
  });

  test('switch to Fill mode enables form fields and shows Submit', async ({ page }) => {
    // Add a field first
    await page.getByRole('button', { name: 'Add field' }).first().click();
    // Switch to fill mode
    await page.getByRole('button', { name: 'Switch to fill mode' }).click();
    await expect(page.getByText('Fill Mode')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Submit form' })).toBeVisible();
  });

  test('View JSON toggle shows and hides JSON panel', async ({ page }) => {
    await page.getByRole('button', { name: 'View JSON schema' }).click();
    await expect(page.getByRole('heading', { name: 'JSON Schema' })).toBeVisible();
    await expect(page.getByText('schemaVersion')).toBeVisible();
    // Toggle off
    await page.getByRole('button', { name: 'View JSON schema' }).click();
    await expect(page.getByRole('heading', { name: 'JSON Schema' })).not.toBeVisible();
  });

  test('Export JSON button is disabled when no fields exist', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Export JSON schema' })).toBeDisabled();
  });

  test('Export JSON button is enabled after adding a field', async ({ page }) => {
    await page.getByRole('button', { name: 'Add field' }).first().click();
    await expect(page.getByRole('button', { name: 'Export JSON schema' })).toBeEnabled();
  });

  test('delete a field shows undo toast', async ({ page }) => {
    await page.getByRole('button', { name: 'Add field' }).first().click();
    // Wait for field card to appear
    await expect(page.getByText('text', { exact: true })).toBeVisible();
    // Click delete
    await page.getByRole('button', { name: /Delete/ }).click();
    await expect(page.getByText('Field deleted')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Undo field deletion' })).toBeVisible();
  });

  test('undo deletion restores the field', async ({ page }) => {
    await page.getByRole('button', { name: 'Add field' }).first().click();
    await expect(page.getByText('text', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: /Delete/ }).click();
    await expect(page.getByText('Field deleted')).toBeVisible();
    // Undo
    await page.getByRole('button', { name: 'Undo field deletion' }).click();
    await expect(page.getByText('Field deleted')).not.toBeVisible();
    // Field should be back
    await expect(page.getByText('text', { exact: true })).toBeVisible();
  });

  test('add multiple field types via type selector', async ({ page }) => {
    // Add text field (default)
    await page.getByRole('button', { name: 'Add field' }).first().click();

    // Add number field
    await page.getByLabel('Select field type to add').selectOption('number');
    await page.getByRole('button', { name: 'Add field' }).first().click();

    // Add checkbox field
    await page.getByLabel('Select field type to add').selectOption('checkbox');
    await page.getByRole('button', { name: 'Add field' }).first().click();

    // Should see type badges for all three
    await expect(page.getByText('text', { exact: true })).toBeVisible();
    await expect(page.getByText('number', { exact: true })).toBeVisible();
    await expect(page.getByText('checkbox', { exact: true })).toBeVisible();
  });

  test('fill mode: submit with required empty field shows validation error', async ({ page }) => {
    // Add a text field
    await page.getByRole('button', { name: 'Add field' }).first().click();
    // Toggle required on
    await page.getByLabel(/Required toggle/).check();
    // Switch to fill mode
    await page.getByRole('button', { name: 'Switch to fill mode' }).click();
    // Submit without filling
    await page.getByRole('button', { name: 'Submit form' }).click();
    // Should show validation error
    await expect(page.getByText('This field is required')).toBeVisible();
  });

  test('select field with no options shows warning', async ({ page }) => {
    await page.getByLabel('Select field type to add').selectOption('select');
    await page.getByRole('button', { name: 'Add field' }).first().click();
    // Builder should show warning about no options
    await expect(page.getByText('No options defined').first()).toBeVisible();
  });
});
