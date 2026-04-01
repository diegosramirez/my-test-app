import { test, expect } from '@playwright/test';

test.describe('Todo App', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('initial load shows only input with placeholder, no footer', async ({ page }) => {
    await expect(page.getByPlaceholder('What needs to be done?')).toBeVisible();
    await expect(page.getByTestId('active-count')).toBeHidden();
    await expect(page.getByTestId('filter-all')).toBeHidden();
    await expect(page.getByTestId('clear-completed')).toBeHidden();
  });

  test('add a task via Enter key — appears in list, counter shows singular', async ({ page }) => {
    const input = page.getByPlaceholder('What needs to be done?');
    await input.fill('Buy groceries');
    await input.press('Enter');

    // Task appears
    await expect(page.getByText('Buy groceries')).toBeVisible();
    // Counter shows singular
    await expect(page.getByTestId('active-count')).toHaveText('1 item left');
    // Input cleared and focused
    await expect(input).toHaveValue('');
    await expect(input).toBeFocused();
  });

  test('add a task via Add button click', async ({ page }) => {
    const input = page.getByPlaceholder('What needs to be done?');
    await input.fill('Read a book');
    await page.getByRole('button', { name: /add|\+/i }).click();

    await expect(page.getByText('Read a book')).toBeVisible();
    await expect(page.getByTestId('active-count')).toHaveText('1 item left');
  });

  test('counter shows plural for multiple tasks', async ({ page }) => {
    const input = page.getByPlaceholder('What needs to be done?');
    await input.fill('Task 1');
    await input.press('Enter');
    await input.fill('Task 2');
    await input.press('Enter');

    await expect(page.getByTestId('active-count')).toHaveText('2 items left');
  });

  test('empty/whitespace input does not create a task', async ({ page }) => {
    const input = page.getByPlaceholder('What needs to be done?');

    // Empty submit
    await input.press('Enter');
    await expect(page.getByTestId('active-count')).toBeHidden();

    // Whitespace submit
    await input.fill('   ');
    await input.press('Enter');
    await expect(page.getByTestId('active-count')).toBeHidden();
    await expect(input).toBeFocused();
  });

  test('complete a task — strikethrough, counter decrements', async ({ page }) => {
    const input = page.getByPlaceholder('What needs to be done?');
    await input.fill('My task');
    await input.press('Enter');

    // Click the checkbox via the label
    await page.getByText('My task').click();

    await expect(page.getByTestId('active-count')).toHaveText('0 items left');
    // The task item should have completed class (strikethrough)
    const taskItem = page.locator('[data-testid^="task-item-"]').first();
    await expect(taskItem).toHaveClass(/completed/);
  });

  test('delete a task removes it and updates counter', async ({ page }) => {
    const input = page.getByPlaceholder('What needs to be done?');
    await input.fill('Temp task');
    await input.press('Enter');

    // Hover to reveal delete button, then click
    const taskRow = page.locator('[data-testid^="task-item-"]').first();
    await taskRow.hover();
    await page.getByRole('button', { name: /delete task/i }).click();

    await expect(page.getByText('Temp task')).toBeHidden();
    // Footer should disappear since no tasks remain
    await expect(page.getByTestId('active-count')).toBeHidden();
  });

  test('filter tasks — All, Active, Completed', async ({ page }) => {
    const input = page.getByPlaceholder('What needs to be done?');
    await input.fill('Active task');
    await input.press('Enter');
    await input.fill('Done task');
    await input.press('Enter');

    // Complete the second task
    await page.getByText('Done task').click();

    // Filter: Active
    await page.getByTestId('filter-active').click();
    await expect(page.getByText('Active task')).toBeVisible();
    await expect(page.getByText('Done task')).toBeHidden();
    await expect(page.getByTestId('filter-active')).toHaveAttribute('aria-pressed', 'true');

    // Filter: Completed
    await page.getByTestId('filter-completed').click();
    await expect(page.getByText('Done task')).toBeVisible();
    await expect(page.getByText('Active task')).toBeHidden();
    await expect(page.getByTestId('filter-completed')).toHaveAttribute('aria-pressed', 'true');

    // Filter: All
    await page.getByTestId('filter-all').click();
    await expect(page.getByText('Active task')).toBeVisible();
    await expect(page.getByText('Done task')).toBeVisible();
    await expect(page.getByTestId('filter-all')).toHaveAttribute('aria-pressed', 'true');
  });

  test('contextual empty message when filtered list is empty', async ({ page }) => {
    const input = page.getByPlaceholder('What needs to be done?');
    await input.fill('Only active');
    await input.press('Enter');

    // Filter to Completed — no completed tasks exist
    await page.getByTestId('filter-completed').click();
    await expect(page.getByTestId('empty-message')).toHaveText('No completed tasks');

    // Complete the task, then filter to Active
    await page.getByTestId('filter-all').click();
    await page.getByText('Only active').click();
    await page.getByTestId('filter-active').click();
    await expect(page.getByTestId('empty-message')).toHaveText('No active tasks');
  });

  test('clear completed removes completed tasks, button hides', async ({ page }) => {
    const input = page.getByPlaceholder('What needs to be done?');
    await input.fill('Keep me');
    await input.press('Enter');
    await input.fill('Remove me');
    await input.press('Enter');

    // Complete second task
    await page.getByText('Remove me').click();
    await expect(page.getByTestId('clear-completed')).toBeVisible();

    await page.getByTestId('clear-completed').click();

    await expect(page.getByText('Remove me')).toBeHidden();
    await expect(page.getByText('Keep me')).toBeVisible();
    await expect(page.getByTestId('active-count')).toHaveText('1 item left');
    await expect(page.getByTestId('clear-completed')).toBeHidden();
  });

  test('deleting last task hides footer completely', async ({ page }) => {
    const input = page.getByPlaceholder('What needs to be done?');
    await input.fill('Solo task');
    await input.press('Enter');

    // Footer visible
    await expect(page.getByTestId('active-count')).toBeVisible();

    // Delete the task
    const taskRow = page.locator('[data-testid^="task-item-"]').first();
    await taskRow.hover();
    await page.getByRole('button', { name: /delete task/i }).click();

    // Footer hidden
    await expect(page.getByTestId('active-count')).toBeHidden();
    await expect(page.getByTestId('filter-all')).toBeHidden();
  });

  test('ARIA attributes are present on interactive elements', async ({ page }) => {
    const input = page.getByPlaceholder('What needs to be done?');
    await input.fill('Accessible task');
    await input.press('Enter');

    // aria-live on counter
    await expect(page.getByTestId('active-count')).toHaveAttribute('aria-live', 'polite');

    // aria-pressed on filter buttons
    await expect(page.getByTestId('filter-all')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('filter-active')).toHaveAttribute('aria-pressed', 'false');

    // aria-label on delete button (hidden until hover, so hover first)
    const taskRow = page.locator('[data-testid^="task-item-"]').first();
    await taskRow.hover();
    const deleteBtn = page.getByRole('button', { name: 'Delete task: Accessible task' });
    await expect(deleteBtn).toBeVisible();
  });
});
