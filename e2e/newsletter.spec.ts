import { test, expect } from '@playwright/test';

const API_URL = '**/api/newsletter/subscribe';

test.beforeEach(async ({ page }) => {
  // Navigate first to get access to localStorage, then clear it
  await page.goto('/newsletter');
  await page.evaluate(() => localStorage.clear());
});

test.describe('Newsletter Subscription', () => {
  test('valid subscription shows success and sets localStorage', async ({ page }) => {
    await page.route(API_URL, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) })
    );
    await page.goto('/newsletter');

    await page.getByLabel('Email address').fill('user@example.com');
    await page.getByRole('button', { name: 'Subscribe' }).click();

    await expect(page.getByText("You're subscribed! Check your inbox for a welcome email.")).toBeVisible();
    await expect(page.getByLabel('Email address')).not.toBeVisible();

    const flag = await page.evaluate(() => localStorage.getItem('newsletter_subscribed'));
    expect(flag).toBe('true');
  });

  test('empty submission shows required error', async ({ page }) => {
    await page.goto('/newsletter');
    await page.getByRole('button', { name: 'Subscribe' }).click();

    await expect(page.getByText('Please enter your email address.')).toBeVisible();
  });

  test('invalid email shows validation error', async ({ page }) => {
    let apiCalled = false;
    await page.route(API_URL, (route) => {
      apiCalled = true;
      route.fulfill({ status: 200, body: '{}' });
    });

    await page.goto('/newsletter');
    await page.getByLabel('Email address').fill('not-an-email');
    await page.getByRole('button', { name: 'Subscribe' }).click();

    await expect(page.getByText('Please enter a valid email address.')).toBeVisible();
    expect(apiCalled).toBe(false);
  });

  test('duplicate email (409) shows inline error and preserves input', async ({ page }) => {
    await page.route(API_URL, (route) =>
      route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({}) })
    );
    await page.goto('/newsletter');

    await page.getByLabel('Email address').fill('dupe@example.com');
    await page.getByRole('button', { name: 'Subscribe' }).click();

    await expect(page.getByText('This email is already subscribed.')).toBeVisible();
    await expect(page.getByLabel('Email address')).toHaveValue('dupe@example.com');
  });

  test('network error shows error message and preserves input', async ({ page }) => {
    await page.route(API_URL, (route) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({}) })
    );
    await page.goto('/newsletter');

    await page.getByLabel('Email address').fill('user@example.com');
    await page.getByRole('button', { name: 'Subscribe' }).click();

    await expect(page.getByText('Something went wrong. Please try again.')).toBeVisible();
    await expect(page.getByLabel('Email address')).toHaveValue('user@example.com');
  });

  test('double-submit is prevented with disabled button showing Subscribing…', async ({ page }) => {
    await page.route(API_URL, async (route) => {
      await new Promise((r) => setTimeout(r, 3000));
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
    });
    await page.goto('/newsletter');

    await page.getByLabel('Email address').fill('user@example.com');
    await page.getByRole('button', { name: 'Subscribe' }).click();

    const button = page.getByRole('button', { name: /Subscribing/ });
    await expect(button).toBeDisabled();
  });

  test('accessibility: errors use aria-describedby and success uses aria-live', async ({ page }) => {
    await page.goto('/newsletter');

    // Trigger error
    await page.getByRole('button', { name: 'Subscribe' }).click();

    // Wait for error to appear
    await expect(page.getByText('Please enter your email address.')).toBeVisible();

    // Check aria-describedby links input to error
    const describedBy = await page.getByLabel('Email address').getAttribute('aria-describedby');
    expect(describedBy).toBe('email-error');

    // Check error element exists with role="alert"
    const errorEl = page.locator('#email-error');
    await expect(errorEl).toBeVisible();
    await expect(errorEl).toHaveAttribute('role', 'alert');

    // Now submit successfully and check aria-live
    await page.route(API_URL, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) })
    );
    await page.getByLabel('Email address').fill('user@example.com');
    await page.getByRole('button', { name: 'Subscribe' }).click();

    const successRegion = page.locator('[aria-live="polite"]').filter({ hasText: "You're subscribed!" });
    await expect(successRegion).toBeVisible();
  });

  test('returning subscriber sees "already subscribed" message instead of form', async ({ page }) => {
    await page.evaluate(() => localStorage.setItem('newsletter_subscribed', 'true'));
    await page.goto('/newsletter');

    await expect(page.getByText("You're already subscribed!")).toBeVisible();
    await expect(page.getByLabel('Email address')).not.toBeVisible();
  });
});
