import { test, expect } from '@playwright/test';

test.describe('User Registration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByRole('heading', { name: 'Register' })).toBeVisible();
  });

  test('shows the registration form with all fields', async ({ page }) => {
    await expect(page.getByLabel('Username')).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Confirm Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Register' })).toBeVisible();
  });

  test('successful registration redirects to login with success banner', async ({ page }) => {
    await page.getByLabel('Username').fill('testuser');
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Password', { exact: true }).fill('password123');
    await page.getByLabel('Confirm Password').fill('password123');
    await page.getByRole('button', { name: 'Register' }).click();

    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByText('Account created. Please log in.')).toBeVisible();
  });

  test('success banner auto-dismisses after 5 seconds', async ({ page }) => {
    await page.getByLabel('Username').fill('autouser');
    await page.getByLabel('Email').fill('auto@example.com');
    await page.getByLabel('Password', { exact: true }).fill('password123');
    await page.getByLabel('Confirm Password').fill('password123');
    await page.getByRole('button', { name: 'Register' }).click();

    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByText('Account created. Please log in.')).toBeVisible();

    await page.waitForTimeout(5500);
    await expect(page.getByText('Account created. Please log in.')).not.toBeVisible();
  });

  test('shows validation errors on submit with empty fields', async ({ page }) => {
    // Touch all fields by clicking into them and then submit
    await page.getByRole('button', { name: 'Register' }).click();

    // After submit, markAllAsTouched is called, so errors should show
    await expect(page.getByText(/Username is required/)).toBeVisible();
    await expect(page.getByText(/Email is required/)).toBeVisible();
    await expect(page.getByText(/Password is required/)).toBeVisible();
    await expect(page.getByText(/Confirm password is required/)).toBeVisible();
  });

  test('shows minimum length error for short password', async ({ page }) => {
    await page.getByLabel('Password', { exact: true }).fill('short');
    await page.getByLabel('Password', { exact: true }).blur();

    await expect(page.getByText('Must be at least 8 characters.')).toBeVisible();
  });

  test('shows password mismatch error when passwords differ', async ({ page }) => {
    await page.getByLabel('Password', { exact: true }).fill('password123');
    await page.getByLabel('Password', { exact: true }).blur();
    await page.getByLabel('Confirm Password').fill('differentpassword');
    await page.getByLabel('Confirm Password').blur();

    await expect(page.getByText('Passwords do not match.')).toBeVisible();
  });

  test('shows duplicate email error with link to login on 409', async ({ page }) => {
    // Register first user
    await page.getByLabel('Username').fill('firstuser');
    await page.getByLabel('Email').fill('dupe@example.com');
    await page.getByLabel('Password', { exact: true }).fill('password123');
    await page.getByLabel('Confirm Password').fill('password123');
    await page.getByRole('button', { name: 'Register' }).click();
    await expect(page).toHaveURL(/\/login/);

    // Navigate back to register via link (stays in same SPA, preserves mock state)
    await page.getByRole('link', { name: 'Register' }).click();
    await expect(page.getByRole('heading', { name: 'Register' })).toBeVisible();

    // Try to register with same email
    await page.getByLabel('Username').fill('seconduser');
    await page.getByLabel('Email').fill('dupe@example.com');
    await page.getByLabel('Password', { exact: true }).fill('password123');
    await page.getByLabel('Confirm Password').fill('password123');
    await page.getByRole('button', { name: 'Register' }).click();

    await expect(page.getByText('This email is already registered')).toBeVisible();
    await expect(page.getByRole('link', { name: 'logging in' })).toBeVisible();
  });

  test('has link to login page', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Log In' })).toBeVisible();
    await page.getByRole('link', { name: 'Log In' }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});
