import { test, expect } from '@playwright/test';

test.describe('Foundation - Scaffold Cleanup & Clean Slate', () => {
  test('page loads with title "SAM1 Chat" and no Angular branding', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle('SAM1 Chat');

    // No Angular default branding text should be present
    await expect(page.getByText('Hello,')).not.toBeVisible();
    await expect(page.getByText('Congratulations')).not.toBeVisible();
    await expect(page.getByText('Resources')).not.toBeVisible();

    // No Angular logo images
    const images = page.locator('img');
    await expect(images).toHaveCount(0);
  });

  test('page is blank with only router-outlet rendered', async ({ page }) => {
    await page.goto('/');

    // The root component should contain a router-outlet element
    const routerOutlet = page.locator('router-outlet');
    await expect(routerOutlet).toBeAttached();

    // Body should have no visible text content (blank page)
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.trim()).toBe('');
  });

  test('browser console has no errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');
    // Wait a moment for any deferred console messages
    await page.waitForTimeout(1000);

    expect(errors).toEqual([]);
  });

  test('no favicon referencing Angular assets', async ({ page }) => {
    await page.goto('/');

    // Check there's no Angular-branded favicon
    const faviconLink = page.locator('link[rel="icon"][href*="angular"]');
    await expect(faviconLink).toHaveCount(0);
  });

  test('html lang attribute is set to en', async ({ page }) => {
    await page.goto('/');
    const lang = await page.locator('html').getAttribute('lang');
    expect(lang).toBe('en');
  });

  test('viewport meta tag is present', async ({ page }) => {
    await page.goto('/');
    const viewport = page.locator('meta[name="viewport"]');
    await expect(viewport).toHaveCount(1);
    const content = await viewport.getAttribute('content');
    expect(content).toContain('width=device-width');
  });

  test('global styles apply body margin zero', async ({ page }) => {
    await page.goto('/');
    const margin = await page.locator('body').evaluate(
      (el) => getComputedStyle(el).margin
    );
    expect(margin).toBe('0px');
  });
});

test.describe('Foundation - Proxy & Backend Health', () => {
  test('GET /api/health returns 200 with status ok via proxy', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/json');
    const body = await response.json();
    expect(body).toEqual({ status: 'ok' });
  });
});
