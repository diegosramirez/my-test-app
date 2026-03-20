import { test, expect } from '@playwright/test';

const TODO_URL = '/todo';
const STORAGE_KEY = 'todo_tasks';

test.beforeEach(async ({ page }) => {
  await page.goto(TODO_URL);
  await page.evaluate((key) => localStorage.removeItem(key), STORAGE_KEY);
  await page.goto(TODO_URL);
});

test.describe('Todo Feature', () => {

  test('shows empty state when no tasks exist', async ({ page }) => {
    await expect(page.getByText('No tasks yet — add one above!')).toBeVisible();
  });

  test('input is auto-focused on load', async ({ page }) => {
    const input = page.getByLabel('Task description');
    await expect(input).toBeFocused();
  });

  test('add a task via click', async ({ page }) => {
    const input = page.getByLabel('Task description');
    await input.fill('Buy groceries');
    await page.getByRole('button', { name: 'Add' }).click();

    // Task appears in list
    await expect(page.getByText('Buy groceries')).toBeVisible();
    // Input is cleared
    await expect(input).toHaveValue('');
    // Focus remains on input
    await expect(input).toBeFocused();
    // Empty state gone
    await expect(page.getByText('No tasks yet')).not.toBeVisible();
  });

  test('add a task via Enter key', async ({ page }) => {
    const input = page.getByLabel('Task description');
    await input.fill('Walk the dog');
    await input.press('Enter');

    await expect(page.getByText('Walk the dog')).toBeVisible();
    await expect(input).toHaveValue('');
    await expect(input).toBeFocused();
  });

  test('trims whitespace from task text', async ({ page }) => {
    const input = page.getByLabel('Task description');
    await input.fill('  Clean house  ');
    await input.press('Enter');

    await expect(page.getByText('Clean house')).toBeVisible();
  });

  test('blocks empty input with validation hint', async ({ page }) => {
    await page.getByRole('button', { name: 'Add' }).click();

    await expect(page.getByText('Enter a task description first.')).toBeVisible();
    // No task added
    await expect(page.getByText('No tasks yet — add one above!')).toBeVisible();
  });

  test('blocks whitespace-only input', async ({ page }) => {
    const input = page.getByLabel('Task description');
    await input.fill('   ');
    await input.press('Enter');

    await expect(page.getByText('Enter a task description first.')).toBeVisible();
  });

  test('validation hint clears on next keystroke', async ({ page }) => {
    await page.getByRole('button', { name: 'Add' }).click();
    await expect(page.getByText('Enter a task description first.')).toBeVisible();

    const input = page.getByLabel('Task description');
    await input.pressSequentially('a');

    await expect(page.getByText('Enter a task description first.')).not.toBeVisible();
  });

  test('toggle task complete and back', async ({ page }) => {
    const input = page.getByLabel('Task description');
    await input.fill('Test task');
    await input.press('Enter');

    const checkbox = page.getByRole('checkbox', { name: /Mark task: Test task/ });
    await expect(checkbox).not.toBeChecked();

    // Complete
    await checkbox.check();
    await expect(checkbox).toBeChecked();

    // The task row should have completed styling (strikethrough via class)
    const taskRow = page.locator('.task-row.completed');
    await expect(taskRow).toBeVisible();

    // Uncomplete
    await checkbox.uncheck();
    await expect(checkbox).not.toBeChecked();
    await expect(taskRow).not.toBeVisible();
  });

  test('delete task removes it and shows empty state', async ({ page }) => {
    const input = page.getByLabel('Task description');
    await input.fill('Delete me');
    await input.press('Enter');

    await page.getByRole('button', { name: 'Delete task: Delete me' }).click();

    await expect(page.getByText('Delete me')).not.toBeVisible();
    await expect(page.getByText('No tasks yet — add one above!')).toBeVisible();
    // Focus moves to input when list is empty
    await expect(input).toBeFocused();
  });

  test('delete task moves focus to next task', async ({ page }) => {
    const input = page.getByLabel('Task description');
    await input.fill('Task A');
    await input.press('Enter');
    await input.fill('Task B');
    await input.press('Enter');

    // Delete first task
    await page.getByRole('button', { name: 'Delete task: Task A' }).click();

    await expect(page.getByText('Task A')).not.toBeVisible();
    await expect(page.getByText('Task B')).toBeVisible();
    // Focus should be on remaining delete button
    await expect(page.getByRole('button', { name: 'Delete task: Task B' })).toBeFocused();
  });

  test('tasks persist across page refresh', async ({ page }) => {
    const input = page.getByLabel('Task description');
    await input.fill('Persistent task');
    await input.press('Enter');

    // Toggle complete
    await page.getByRole('checkbox', { name: /Mark task: Persistent task/ }).check();

    // Refresh
    await page.reload();

    // Task still there and completed
    await expect(page.getByText('Persistent task')).toBeVisible();
    await expect(page.getByRole('checkbox', { name: /Mark task: Persistent task/ })).toBeChecked();
  });

  test('corrupted localStorage gracefully falls back to empty list', async ({ page }) => {
    await page.evaluate((key) => {
      localStorage.setItem(key, 'not valid json{{{');
    }, STORAGE_KEY);

    await page.reload();

    await expect(page.getByText('No tasks yet — add one above!')).toBeVisible();
  });

  test('multiple tasks maintain order and do not re-sort on toggle', async ({ page }) => {
    const input = page.getByLabel('Task description');
    await input.fill('First');
    await input.press('Enter');
    await input.fill('Second');
    await input.press('Enter');
    await input.fill('Third');
    await input.press('Enter');

    // Complete the first task
    await page.getByRole('checkbox', { name: /Mark task: First/ }).check();

    // Verify order is preserved (First still before Second)
    const texts = await page.locator('.task-text').allTextContents();
    expect(texts).toEqual(['First', 'Second', 'Third']);
  });

  test('responsive layout stacks vertically at 480px', async ({ page }) => {
    await page.setViewportSize({ width: 480, height: 800 });
    await page.goto(TODO_URL);

    // The form should still be functional
    const input = page.getByLabel('Task description');
    await input.fill('Mobile task');
    await input.press('Enter');
    await expect(page.getByText('Mobile task')).toBeVisible();

    // No horizontal overflow
    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasOverflow).toBe(false);
  });

  test('responsive layout at 320px with no horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto(TODO_URL);

    const input = page.getByLabel('Task description');
    await input.fill('Narrow task');
    await input.press('Enter');
    await expect(page.getByText('Narrow task')).toBeVisible();

    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasOverflow).toBe(false);
  });

  test('keyboard accessibility: Tab to Add, Space on checkbox, Enter on delete', async ({ page }) => {
    const input = page.getByLabel('Task description');
    await input.fill('KB task');
    await input.press('Enter');

    // Tab from input to Add button
    await input.press('Tab');
    await expect(page.getByRole('button', { name: 'Add' })).toBeFocused();

    // Tab to checkbox
    await page.keyboard.press('Tab');
    const checkbox = page.getByRole('checkbox', { name: /Mark task: KB task/ });
    await expect(checkbox).toBeFocused();

    // Space toggles checkbox
    await page.keyboard.press('Space');
    await expect(checkbox).toBeChecked();

    // Tab to delete button
    await page.keyboard.press('Tab');
    const deleteBtn = page.getByRole('button', { name: 'Delete task: KB task' });
    await expect(deleteBtn).toBeFocused();

    // Enter activates delete
    await page.keyboard.press('Enter');
    await expect(page.getByText('KB task')).not.toBeVisible();
  });

  test('ARIA attributes are present', async ({ page }) => {
    // aria-live on empty state
    const emptyState = page.getByText('No tasks yet — add one above!');
    await expect(emptyState).toHaveAttribute('aria-live', 'polite');

    // role="list" on task container (empty list is hidden, so check it's attached)
    await expect(page.locator('[role="list"]')).toBeAttached();

    // Add a task and check delete button aria-label
    const input = page.getByLabel('Task description');
    await input.fill('ARIA test');
    await input.press('Enter');

    await expect(page.getByRole('button', { name: 'Delete task: ARIA test' })).toBeVisible();
  });

  test('long text wraps without overflow', async ({ page }) => {
    const input = page.getByLabel('Task description');
    const longText = 'A'.repeat(200);
    await input.fill(longText);
    await input.press('Enter');

    await expect(page.getByText(longText)).toBeVisible();

    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasOverflow).toBe(false);
  });
});
