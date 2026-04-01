import { test, expect } from '@playwright/test';

test.describe('App Shell & Routing', () => {
  test('root path redirects to /login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL('/login');
    await expect(page.getByRole('heading', { level: 1, name: 'Login' })).toBeVisible();
  });

  test('login page renders h1 with darkblue color', async ({ page }) => {
    await page.goto('/login');
    const heading = page.getByRole('heading', { level: 1, name: 'Login' });
    await expect(heading).toBeVisible();
    await expect(heading).toHaveCSS('color', 'rgb(0, 0, 139)'); // darkblue
  });

  test('register page renders h1 with darkgreen color', async ({ page }) => {
    await page.goto('/register');
    await expect(page).toHaveURL('/register');
    const heading = page.getByRole('heading', { level: 1, name: 'Register' });
    await expect(heading).toBeVisible();
    await expect(heading).toHaveCSS('color', 'rgb(0, 100, 0)'); // darkgreen
  });

  test('tasks page renders h1 with darkred color', async ({ page }) => {
    await page.goto('/tasks');
    await expect(page).toHaveURL('/tasks');
    const heading = page.getByRole('heading', { level: 1, name: 'Tasks' });
    await expect(heading).toBeVisible();
    await expect(heading).toHaveCSS('color', 'rgb(139, 0, 0)'); // darkred
  });

  test('unknown route /foo redirects to /login', async ({ page }) => {
    await page.goto('/foo');
    await expect(page).toHaveURL('/login');
    await expect(page.getByRole('heading', { level: 1, name: 'Login' })).toBeVisible();
  });

  test('deep unknown route /tasks/999/edit redirects to /login', async ({ page }) => {
    await page.goto('/tasks/999/edit');
    await expect(page).toHaveURL('/login');
    await expect(page.getByRole('heading', { level: 1, name: 'Login' })).toBeVisible();
  });

  test('each page has exactly one h1 element', async ({ page }) => {
    for (const path of ['/login', '/register', '/tasks']) {
      await page.goto(path);
      const h1Count = await page.locator('h1').count();
      expect(h1Count, `Expected exactly 1 h1 on ${path}`).toBe(1);
    }
  });

  test('no console errors on route navigation', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/');
    await page.goto('/register');
    await page.goto('/tasks');
    await page.goto('/unknown-route');

    expect(errors).toEqual([]);
  });

  test('router-outlet is present in the app root', async ({ page }) => {
    await page.goto('/login');
    const outlet = page.locator('router-outlet');
    await expect(outlet).toBeAttached();
  });
});
