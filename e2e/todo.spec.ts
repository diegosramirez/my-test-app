import { test, expect, Page } from '@playwright/test';

const STORAGE_KEY = 'todos_app_data';

async function seedStorage(page: Page, todos: Array<{ id: string; title: string; completed: boolean; createdAt: string }>) {
  await page.evaluate((data) => {
    localStorage.setItem('todos_app_data', JSON.stringify({ version: 1, todos: data }));
  }, todos);
}

function makeTodo(title: string, completed = false, id?: string): { id: string; title: string; completed: boolean; createdAt: string } {
  return {
    id: id ?? Math.random().toString(36).slice(2),
    title,
    completed,
    createdAt: new Date().toISOString(),
  };
}

test.beforeEach(async ({ page }) => {
  // Clear localStorage before each test by navigating and clearing
  await page.goto('/todo');
  await page.evaluate(() => localStorage.removeItem('todos_app_data'));
});

test.describe('Todo App - Add Todo', () => {
  test('adds a todo via Enter key, clears input, persists to localStorage', async ({ page }) => {
    await page.goto('/todo');

    const input = page.getByLabel('New todo title');
    await input.fill('Buy groceries');
    await input.press('Enter');

    // Todo appears in the list
    await expect(page.getByText('Buy groceries')).toBeVisible();
    // Input is cleared
    await expect(input).toHaveValue('');
    // Focus remains on input
    await expect(input).toBeFocused();

    // Persisted to localStorage with versioned schema
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('todos_app_data')!));
    expect(stored.version).toBe(1);
    expect(stored.todos).toHaveLength(1);
    expect(stored.todos[0].title).toBe('Buy groceries');
    expect(stored.todos[0].completed).toBe(false);
  });

  test('adds a todo via Add button click', async ({ page }) => {
    await page.goto('/todo');

    await page.getByLabel('New todo title').fill('Walk the dog');
    await page.getByRole('button', { name: 'Add' }).click();

    await expect(page.getByText('Walk the dog')).toBeVisible();
  });

  test('does not add empty or whitespace-only todos', async ({ page }) => {
    await page.goto('/todo');

    const input = page.getByLabel('New todo title');

    // Press Enter with empty input
    await input.press('Enter');
    await expect(page.getByText('No tasks yet. Add one above to get started.')).toBeVisible();

    // Whitespace only
    await input.fill('   ');
    await input.press('Enter');
    await expect(page.getByText('No tasks yet. Add one above to get started.')).toBeVisible();
  });

  test('newest todos appear at top of list', async ({ page }) => {
    await page.goto('/todo');

    const input = page.getByLabel('New todo title');
    await input.fill('First');
    await input.press('Enter');
    await input.fill('Second');
    await input.press('Enter');

    const items = page.getByRole('list').getByRole('listitem');
    // "Second" should be first (newest-first)
    await expect(items.first()).toContainText('Second');
  });
});

test.describe('Todo App - Toggle Complete', () => {
  test('toggles a todo between completed and active', async ({ page }) => {
    await seedStorage(page, [makeTodo('Task A', false, 'id-a')]);
    await page.goto('/todo');

    const checkbox = page.getByRole('checkbox', { name: 'Task A' });
    await expect(checkbox).not.toBeChecked();

    // Complete it
    await checkbox.check();
    await expect(checkbox).toBeChecked();

    // Verify localStorage updated
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('todos_app_data')!));
    expect(stored.todos[0].completed).toBe(true);

    // Toggle back
    await checkbox.uncheck();
    await expect(checkbox).not.toBeChecked();
  });
});

test.describe('Todo App - Delete with Undo', () => {
  test('deletes a todo and shows undo snackbar', async ({ page }) => {
    await seedStorage(page, [makeTodo('To delete', false, 'id-del')]);
    await page.goto('/todo');

    await expect(page.getByText('To delete')).toBeVisible();
    await page.getByRole('button', { name: 'Delete task: To delete' }).click();

    // Todo removed from list
    await expect(page.getByText('To delete')).not.toBeVisible();
    // Snackbar visible
    await expect(page.getByText('Task deleted.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Undo' })).toBeVisible();
  });

  test('undo restores the deleted todo', async ({ page }) => {
    await seedStorage(page, [makeTodo('Restore me', false, 'id-restore')]);
    await page.goto('/todo');

    await page.getByRole('button', { name: 'Delete task: Restore me' }).click();
    await expect(page.getByText('Restore me')).not.toBeVisible();

    await page.getByRole('button', { name: 'Undo' }).click();
    await expect(page.getByText('Restore me')).toBeVisible();
  });

  test('snackbar disappears after 4 seconds and deletion is finalized', async ({ page }) => {
    await seedStorage(page, [makeTodo('Gone soon', false, 'id-gone')]);
    await page.goto('/todo');

    await page.getByRole('button', { name: 'Delete task: Gone soon' }).click();
    await expect(page.getByText('Task deleted.')).toBeVisible();

    // Wait for snackbar to disappear (4s undo window)
    await expect(page.getByText('Task deleted.')).not.toBeVisible({ timeout: 6000 });

    // Verify finalized in localStorage
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('todos_app_data')!));
    expect(stored.todos).toHaveLength(0);
  });
});

test.describe('Todo App - Filters', () => {
  test('filters todos by All / Active / Completed', async ({ page }) => {
    await seedStorage(page, [
      makeTodo('Active task', false, 'id-1'),
      makeTodo('Done task', true, 'id-2'),
    ]);
    await page.goto('/todo');

    // All filter - both visible
    await expect(page.getByText('Active task')).toBeVisible();
    await expect(page.getByText('Done task')).toBeVisible();

    // Active filter
    await page.getByRole('radio', { name: 'Active' }).click();
    await expect(page.getByText('Active task')).toBeVisible();
    await expect(page.getByText('Done task')).not.toBeVisible();

    // Completed filter
    await page.getByRole('radio', { name: 'Completed' }).click();
    await expect(page.getByText('Done task')).toBeVisible();
    await expect(page.getByText('Active task')).not.toBeVisible();
  });

  test('shows contextual empty state messages per filter', async ({ page }) => {
    await seedStorage(page, [makeTodo('Only active', false, 'id-1')]);
    await page.goto('/todo');

    await page.getByRole('radio', { name: 'Completed' }).click();
    await expect(page.getByText('No completed tasks.')).toBeVisible();
  });

  test('adding a todo on Completed filter auto-switches to All', async ({ page }) => {
    await seedStorage(page, [makeTodo('Done one', true, 'id-1')]);
    await page.goto('/todo');

    await page.getByRole('radio', { name: 'Completed' }).click();
    await expect(page.getByRole('radio', { name: 'Completed' })).toHaveAttribute('aria-checked', 'true');

    const input = page.getByLabel('New todo title');
    await input.fill('New task');
    await input.press('Enter');

    // Filter should switch to All
    await expect(page.getByRole('radio', { name: 'All' })).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByText('New task')).toBeVisible();
  });
});

test.describe('Todo App - Persistence', () => {
  test('todos survive page refresh', async ({ page }) => {
    await page.goto('/todo');

    const input = page.getByLabel('New todo title');
    await input.fill('Persistent task');
    await input.press('Enter');
    await expect(page.getByText('Persistent task')).toBeVisible();

    // Refresh
    await page.reload();
    await expect(page.getByText('Persistent task')).toBeVisible();
  });

  test('corrupted localStorage falls back to empty list', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('todos_app_data', 'NOT VALID JSON{{{');
    });
    await page.goto('/todo');

    // Should show empty state, not crash
    await expect(page.getByText('No tasks yet. Add one above to get started.')).toBeVisible();
  });
});

test.describe('Todo App - Clear Completed', () => {
  test('clears all completed todos with undo', async ({ page }) => {
    await seedStorage(page, [
      makeTodo('Keep this task', false, 'id-1'),
      makeTodo('Done 1', true, 'id-2'),
      makeTodo('Done 2', true, 'id-3'),
    ]);
    await page.goto('/todo');

    await page.getByRole('button', { name: 'Clear completed' }).click();

    // Completed todos gone
    await expect(page.getByText('Done 1')).not.toBeVisible();
    await expect(page.getByText('Done 2')).not.toBeVisible();
    // Active todo remains
    await expect(page.getByText('Keep this task')).toBeVisible();

    // Undo restores them
    await page.getByRole('button', { name: 'Undo' }).click();
    await expect(page.getByText('Done 1')).toBeVisible();
    await expect(page.getByText('Done 2')).toBeVisible();
  });

  test('Clear completed button hidden when no completed todos', async ({ page }) => {
    await seedStorage(page, [makeTodo('Active only', false, 'id-1')]);
    await page.goto('/todo');

    await expect(page.getByRole('button', { name: 'Clear completed' })).not.toBeVisible();
  });
});

test.describe('Todo App - Accessibility', () => {
  test('has proper ARIA structure', async ({ page }) => {
    await seedStorage(page, [makeTodo('A11y task', false, 'id-a11y')]);
    await page.goto('/todo');

    // Semantic list
    await expect(page.getByRole('list')).toBeVisible();
    await expect(page.getByRole('listitem').first()).toBeVisible();

    // Checkbox with label
    await expect(page.getByRole('checkbox', { name: 'A11y task' })).toBeVisible();

    // Delete button with aria-label
    await expect(page.getByRole('button', { name: 'Delete task: A11y task' })).toBeAttached();

    // Filter radiogroup
    await expect(page.getByRole('radiogroup', { name: 'Filter todos' })).toBeVisible();
    await expect(page.getByRole('radio', { name: 'All' })).toBeVisible();
    await expect(page.getByRole('radio', { name: 'All' })).toHaveAttribute('aria-checked', 'true');

    // Items left with aria-live
    await expect(page.getByText('1 item left')).toBeVisible();
  });
});

test.describe('Todo App - Empty State', () => {
  test('shows empty state when no todos exist', async ({ page }) => {
    await page.goto('/todo');
    await expect(page.getByText('No tasks yet. Add one above to get started.')).toBeVisible();
  });
});

test.describe('Todo App - Items Left Count', () => {
  test('displays correct item count', async ({ page }) => {
    await seedStorage(page, [
      makeTodo('One', false, 'id-1'),
      makeTodo('Two', false, 'id-2'),
      makeTodo('Three', true, 'id-3'),
    ]);
    await page.goto('/todo');

    // 2 active items
    await expect(page.getByText('2 items left')).toBeVisible();
  });
});
