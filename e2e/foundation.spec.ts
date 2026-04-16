import { test, expect } from '@playwright/test';

test.describe('Angular Foundation Setup', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('AC1: Clean build success - App loads without compilation errors', async ({ page }) => {
    // Verify app loads successfully with no console errors
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.waitForLoadState('networkidle');

    // Check that no compilation errors are present
    expect(errors.filter(error =>
      error.includes('ERROR') ||
      error.includes('compilation') ||
      error.includes('Cannot resolve')
    )).toHaveLength(0);

    // Verify the app shell loads
    await expect(page.locator('app-root')).toBeVisible();
  });

  test('AC2: Routing functionality - Navigation between login and announcements works', async ({ page }) => {
    // Verify default route redirects to announcements
    await expect(page).toHaveURL('/announcements');
    await expect(page.locator('app-announcements')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Announcements', exact: true })).toBeVisible();

    // Navigate to login via header navigation
    await page.getByRole('link', { name: 'Login' }).click();
    await expect(page).toHaveURL('/login');
    await expect(page.locator('app-login')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();

    // Navigate back to announcements
    await page.getByRole('link', { name: 'Announcements' }).click();
    await expect(page).toHaveURL('/announcements');
    await expect(page.locator('app-announcements')).toBeVisible();

    // Test direct URL navigation
    await page.goto('/login');
    await expect(page).toHaveURL('/login');
    await expect(page.locator('app-login')).toBeVisible();
  });

  test('AC3: Service stubs operational - No runtime errors from services', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Load both pages to ensure services are instantiated without errors
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await page.goto('/announcements');
    await page.waitForLoadState('networkidle');

    // Check no service-related runtime errors occurred
    expect(errors.filter(error =>
      error.includes('AuthService') ||
      error.includes('AnnouncementService') ||
      error.includes('Observable') ||
      error.includes('Injectable')
    )).toHaveLength(0);
  });

  test('AC4: TypeScript models defined - Models are properly exported and usable', async ({ page }) => {
    // This test verifies the build succeeds with models being imported
    // If models weren't properly exported, the app wouldn't compile

    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.waitForLoadState('networkidle');

    // Check no module resolution errors for models
    expect(errors.filter(error =>
      error.includes('Cannot find module') ||
      error.includes('user.interface') ||
      error.includes('announcement.interface') ||
      error.includes('models/index')
    )).toHaveLength(0);
  });

  test('AC5: Component boundaries established - App component contains only router-outlet and header', async ({ page }) => {
    // Verify app component structure
    const appRoot = page.locator('app-root');
    await expect(appRoot).toBeVisible();

    // Check that app component contains header and router-outlet only
    await expect(appRoot.locator('app-header')).toBeVisible();
    await expect(appRoot.locator('router-outlet')).toBeVisible();

    // Verify feature components handle specific functionality
    await page.goto('/login');
    await expect(appRoot.locator('app-login')).toBeVisible();
    await expect(page.getByText('Login functionality will be implemented here.')).toBeVisible();

    await page.goto('/announcements');
    await expect(appRoot.locator('app-announcements')).toBeVisible();
    await expect(page.getByText('Announcements functionality will be implemented here.')).toBeVisible();
  });

  test('AC6: Header navigation structure - Navigation displays consistently across routes', async ({ page }) => {
    // Test header presence on announcements page
    await page.goto('/announcements');
    const header = page.locator('app-header header');
    await expect(header).toBeVisible();
    await expect(header.getByRole('heading', { name: 'Team Announcements' })).toBeVisible();

    // Verify navigation links are present
    await expect(header.getByRole('link', { name: 'Login' })).toBeVisible();
    await expect(header.getByRole('link', { name: 'Announcements' })).toBeVisible();

    // Test header presence on login page
    await page.goto('/login');
    await expect(header).toBeVisible();
    await expect(header.getByRole('heading', { name: 'Team Announcements' })).toBeVisible();
    await expect(header.getByRole('link', { name: 'Login' })).toBeVisible();
    await expect(header.getByRole('link', { name: 'Announcements' })).toBeVisible();

    // Test header styling and layout
    await expect(header).toHaveCSS('display', 'flex');
    await expect(header).toHaveCSS('justify-content', 'space-between');
  });

  test('AC7: Clean project structure - File organization follows Angular best practices', async ({ page }) => {
    // This test verifies that the application structure works properly
    // which indicates proper file organization and imports

    const errors: string[] = [];
    const warnings: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      } else if (msg.type() === 'warning') {
        warnings.push(msg.text());
      }
    });

    // Navigate through all routes to test imports and structure
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await page.goto('/announcements');
    await page.waitForLoadState('networkidle');

    // Verify no structural/import errors
    expect(errors.filter(error =>
      error.includes('Cannot resolve') ||
      error.includes('Module not found') ||
      error.includes('Failed to import')
    )).toHaveLength(0);

    // Check components load properly indicating correct structure
    await expect(page.locator('app-root')).toBeVisible();
    await expect(page.locator('app-header')).toBeVisible();
    await expect(page.locator('app-announcements')).toBeVisible();
  });

  test('Integration: Complete user workflow works end-to-end', async ({ page }) => {
    // Test complete navigation flow
    await page.goto('/');

    // Should redirect to announcements
    await expect(page).toHaveURL('/announcements');
    await expect(page.getByRole('heading', { name: 'Team Announcements' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Announcements' })).toBeVisible();

    // Navigate to login
    await page.getByRole('link', { name: 'Login' }).click();
    await expect(page).toHaveURL('/login');
    await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();

    // Navigate back via header
    await page.getByRole('link', { name: 'Announcements' }).click();
    await expect(page).toHaveURL('/announcements');

    // Test invalid route handling
    await page.goto('/invalid-route');
    await expect(page).toHaveURL('/announcements'); // Should redirect to announcements
  });

  test('Standalone components architecture - All components work without NgModule', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Test all components load properly with standalone architecture
    await page.goto('/login');
    await expect(page.locator('app-login')).toBeVisible();

    await page.goto('/announcements');
    await expect(page.locator('app-announcements')).toBeVisible();

    // Verify no NgModule-related errors
    expect(errors.filter(error =>
      error.includes('NgModule') ||
      error.includes('declarations') ||
      error.includes('imports array')
    )).toHaveLength(0);
  });
});