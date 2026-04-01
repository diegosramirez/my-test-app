import { test, expect } from '@playwright/test';

async function fillAndBlur(page: import('@playwright/test').Page, label: string, value: string, exact = false) {
  const input = page.getByLabel(label, { exact });
  await input.fill(value);
  await input.blur();
}

test.describe('Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('displays login heading and form fields', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1, name: 'Log in' })).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Log in' })).toBeVisible();
  });

  test('submit button is disabled when form is empty', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Log in' })).toBeDisabled();
  });

  test('shows email required error when field is touched and left empty', async ({ page }) => {
    const emailInput = page.getByLabel('Email');
    await emailInput.focus();
    await emailInput.blur();
    await expect(page.getByRole('alert').filter({ hasText: 'required' })).toBeVisible();
  });

  test('shows invalid email error for bad format', async ({ page }) => {
    await fillAndBlur(page, 'Email', 'notanemail');
    await expect(page.getByRole('alert').filter({ hasText: 'valid email' })).toBeVisible();
  });

  test('shows password min length error', async ({ page }) => {
    await fillAndBlur(page, 'Password', 'short', true);
    await expect(page.getByRole('alert').filter({ hasText: '8 characters' })).toBeVisible();
  });

  test('submit button enables with valid input', async ({ page }) => {
    await fillAndBlur(page, 'Email', 'test@example.com');
    await fillAndBlur(page, 'Password', 'password1', true);
    await expect(page.getByRole('button', { name: 'Log in' })).toBeEnabled();
  });

  test('toggle password visibility', async ({ page }) => {
    const pwInput = page.getByLabel('Password', { exact: true });
    await pwInput.fill('password1');
    await expect(pwInput).toHaveAttribute('type', 'password');

    const toggleBtn = page.getByRole('button', { name: 'Show password' });
    await toggleBtn.click();
    await expect(pwInput).toHaveAttribute('type', 'text');
    await expect(page.getByRole('button', { name: 'Hide password' })).toBeVisible();
  });

  test('shows API error on failed login', async ({ page }) => {
    await page.route('**/api/auth/login', (route) =>
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'INVALID_CREDENTIALS', message: 'Invalid' }),
      })
    );

    await fillAndBlur(page, 'Email', 'test@example.com');
    await fillAndBlur(page, 'Password', 'password1', true);
    await page.getByRole('button', { name: 'Log in' }).click();

    await expect(page.getByRole('alert').filter({ hasText: 'Invalid email or password' })).toBeVisible();
  });

  test('navigates to dashboard on successful login', async ({ page }) => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const h = btoa(JSON.stringify({ alg: 'HS256' }));
    const b = btoa(JSON.stringify({ sub: 'u1', exp }));
    const token = `${h}.${b}.sig`;

    await page.route('**/api/auth/login', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          token,
          user: { id: 'u1', email: 'test@example.com', name: 'Test' },
        }),
      })
    );

    await fillAndBlur(page, 'Email', 'test@example.com');
    await fillAndBlur(page, 'Password', 'password1', true);
    await page.getByRole('button', { name: 'Log in' }).click();

    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('has link to register page', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Register' })).toBeVisible();
  });

  test('uses main landmark for auth page', async ({ page }) => {
    await expect(page.getByRole('main').filter({ hasText: 'Log in' })).toBeVisible();
  });
});
