import { test, expect, Page } from '@playwright/test';

/** Helper: hover over a card to reveal action buttons, then click */
async function hoverCardAndClick(page: Page, cardText: string, buttonName: string) {
  const card = page.locator('.card', { hasText: cardText });
  await card.hover();
  await card.getByRole('button', { name: buttonName }).click();
}

test.describe('Kanban Board', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for board to render
    await expect(page.getByRole('heading', { name: 'Todo' })).toBeVisible();
  });

  test('renders three columns with seed data', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Todo' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'In Progress' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Done' })).toBeVisible();

    await expect(page.getByText('Research project requirements')).toBeVisible();
    await expect(page.getByText('Set up development environment')).toBeVisible();
    await expect(page.getByText('Design database schema')).toBeVisible();
    await expect(page.getByText('Create project repository')).toBeVisible();
  });

  test('creates a task via Save button', async ({ page }) => {
    await page.getByRole('button', { name: 'Add task to Todo column' }).click();

    const titleInput = page.getByLabel('New task title');
    await expect(titleInput).toBeVisible();
    await expect(titleInput).toBeFocused();

    await titleInput.fill('My new task');
    await page.getByLabel('New task description').fill('A description');
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByText('My new task')).toBeVisible();
    await expect(page.getByText('A description')).toBeVisible();
    await expect(titleInput).not.toBeVisible();
  });

  test('creates a task via Enter key', async ({ page }) => {
    await page.getByRole('button', { name: 'Add task to In Progress column' }).click();
    const titleInput = page.getByLabel('New task title');
    await titleInput.fill('Enter task');
    await titleInput.press('Enter');

    await expect(page.getByText('Enter task')).toBeVisible();
    await expect(titleInput).not.toBeVisible();
  });

  test('shows validation error for empty title', async ({ page }) => {
    await page.getByRole('button', { name: 'Add task to Todo column' }).click();
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByText('Title is required')).toBeVisible();
  });

  test('cancels add form with Escape', async ({ page }) => {
    await page.getByRole('button', { name: 'Add task to Todo column' }).click();
    const titleInput = page.getByLabel('New task title');
    await expect(titleInput).toBeVisible();

    await titleInput.press('Escape');
    await expect(titleInput).not.toBeVisible();
  });

  test('only one add-task form open at a time', async ({ page }) => {
    await page.getByRole('button', { name: 'Add task to Todo column' }).click();
    await expect(page.getByLabel('New task title')).toBeVisible();

    await page.getByRole('button', { name: 'Add task to Done column' }).click();
    await expect(page.getByLabel('New task title')).toHaveCount(1);
  });

  test('edits a task inline', async ({ page }) => {
    await hoverCardAndClick(page, 'Research project requirements', /Edit task/);

    const titleInput = page.getByLabel('Task title');
    await expect(titleInput).toBeVisible();
    await expect(titleInput).toHaveValue('Research project requirements');

    await titleInput.fill('Updated requirement research');
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByText('Updated requirement research')).toBeVisible();
    await expect(page.getByText('Research project requirements')).not.toBeVisible();
  });

  test('cancel edit reverts changes', async ({ page }) => {
    await hoverCardAndClick(page, 'Research project requirements', /Edit task/);
    const titleInput = page.getByLabel('Task title');
    await titleInput.fill('Something else');
    await page.getByRole('button', { name: 'Cancel' }).click();

    await expect(page.getByText('Research project requirements')).toBeVisible();
    await expect(page.getByText('Something else')).not.toBeVisible();
  });

  test('edit prevents saving with empty title', async ({ page }) => {
    await hoverCardAndClick(page, 'Research project requirements', /Edit task/);
    const titleInput = page.getByLabel('Task title');
    await titleInput.fill('');
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByText('Title is required')).toBeVisible();
    await expect(titleInput).toBeVisible();
  });

  test('deletes a task and shows undo snackbar', async ({ page }) => {
    await hoverCardAndClick(page, 'Create project repository', /Delete task/);

    await expect(page.getByText('Create project repository')).not.toBeVisible();
    await expect(page.getByText('Task deleted.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Undo' })).toBeVisible();
  });

  test('undo restores deleted task', async ({ page }) => {
    await hoverCardAndClick(page, 'Create project repository', /Delete task/);
    await expect(page.getByText('Create project repository')).not.toBeVisible();

    await page.getByRole('button', { name: 'Undo' }).click();

    await expect(page.getByText('Create project repository')).toBeVisible();
    await expect(page.getByText('Task deleted.')).not.toBeVisible();
  });

  test('empty column shows placeholder text', async ({ page }) => {
    await hoverCardAndClick(page, 'Create project repository', /Delete task/);

    await expect(page.getByText('No tasks yet')).toBeVisible();
  });

  test('move-to-column buttons move task between columns', async ({ page }) => {
    // Hover "Design database schema" card to reveal move buttons
    const card = page.locator('.card', { hasText: 'Design database schema' });
    await card.hover();
    await card.getByRole('button', { name: 'Move task to Done' }).click();

    // Task still visible (moved, not deleted)
    await expect(page.getByText('Design database schema')).toBeVisible();

    // In Progress column should now show "No tasks yet"
    await expect(page.getByText('No tasks yet')).toBeVisible();
  });

  test('aria-labels on drop lists contain column name and task count', async ({ page }) => {
    // The drop list divs have aria-label attributes
    await expect(page.locator('[aria-label="Todo column, 2 tasks"]')).toBeVisible();
    await expect(page.locator('[aria-label="In Progress column, 1 task"]')).toBeVisible();
    await expect(page.locator('[aria-label="Done column, 1 task"]')).toBeVisible();
  });

  test('responsive layout stacks columns below 768px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'Todo' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'In Progress' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Done' })).toBeVisible();

    // On mobile, action buttons should be always visible (no hover needed)
    await expect(page.locator('.card__actions').first()).toBeVisible();
  });
});
