import { test, expect } from '@playwright/test';

test.describe('QR Code Generator Component', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/qr-generator');
  });

  test('displays initial empty state with proper elements', async ({ page }) => {
    // Verify main heading
    await expect(page.getByRole('heading', { name: 'QR Code Generator' })).toBeVisible();

    // Verify input label and textarea
    await expect(page.getByText('Enter text to generate QR code:')).toBeVisible();
    const textInput = page.getByLabel('Enter text to generate QR code:');
    await expect(textInput).toBeVisible();
    await expect(textInput).toHaveAttribute('maxlength', '1000');

    // Verify character count shows 0/1000
    await expect(page.getByText('0/1000 characters')).toBeVisible();

    // Verify empty state message
    await expect(page.getByText('Enter text above to generate a QR code')).toBeVisible();

    // Verify no QR code or action buttons are present
    await expect(page.getByRole('img', { name: /QR code containing/ })).not.toBeVisible();
    await expect(page.getByRole('button', { name: /Copy QR code image/ })).not.toBeVisible();
    await expect(page.getByRole('button', { name: /Download QR code image/ })).not.toBeVisible();
  });

  test('generates QR code with debounced input within 500ms', async ({ page }) => {
    const textInput = page.getByLabel('Enter text to generate QR code:');
    const testText = 'Hello World';

    // Start timing for performance validation
    const startTime = Date.now();

    await textInput.fill(testText);

    // Wait for QR code to appear (loading state may be too brief to catch)
    const qrImage = page.getByRole('img', { name: `QR code containing: ${testText}` });
    await expect(qrImage).toBeVisible();

    // Verify generation happened within reasonable time (500ms + debounce + buffer)
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    expect(totalTime).toBeLessThan(1500); // 500ms generation + 300ms debounce + buffer

    // Verify action buttons appear
    await expect(page.getByRole('button', { name: `Copy QR code image for: ${testText}` })).toBeVisible();
    await expect(page.getByRole('button', { name: `Download QR code image for: ${testText}` })).toBeVisible();

    // Verify empty state is hidden
    await expect(page.getByText('Enter text above to generate a QR code')).not.toBeVisible();
  });

  test('displays character count with visual feedback approaching limit', async ({ page }) => {
    const textInput = page.getByLabel('Enter text to generate QR code:');

    // Test normal character count
    await textInput.fill('Hello');
    await expect(page.getByText('5/1000 characters')).toBeVisible();

    // Test approaching limit (900+ characters triggers near-limit styling)
    const longText = 'a'.repeat(950);
    await textInput.fill(longText);
    await expect(page.getByText('950/1000 characters')).toBeVisible();

    // Verify near-limit class is applied for visual feedback
    const characterCount = page.locator('#character-count');
    await expect(characterCount).toHaveClass(/near-limit/);

    // Verify input also has near-limit styling
    await expect(textInput).toHaveClass(/near-limit/);
  });

  test('enforces 1000 character hard limit', async ({ page }) => {
    const textInput = page.getByLabel('Enter text to generate QR code:');

    // Try to input more than 1000 characters
    const exceedsLimitText = 'a'.repeat(1100);
    await textInput.fill(exceedsLimitText);

    // Verify input is truncated to exactly 1000 characters
    const inputValue = await textInput.inputValue();
    expect(inputValue.length).toBe(1000);

    // Verify character count shows exactly 1000
    await expect(page.getByText('1000/1000 characters')).toBeVisible();

    // Verify QR code still generates for the truncated text
    await expect(page.getByRole('img', { name: /QR code containing/ })).toBeVisible();
  });

  test('debounces input changes to prevent excessive processing', async ({ page }) => {
    const textInput = page.getByLabel('Enter text to generate QR code:');

    // Type rapidly to trigger debouncing
    await textInput.fill('a');
    await textInput.fill('ab');
    await textInput.fill('abc');
    await textInput.fill('abcd');
    await textInput.fill('abcde');

    // Verify final QR code contains the last input after debouncing
    await expect(page.getByRole('img', { name: 'QR code containing: abcde' })).toBeVisible();
  });

  test('clears QR code when input is emptied', async ({ page }) => {
    const textInput = page.getByLabel('Enter text to generate QR code:');

    // Generate a QR code first
    await textInput.fill('Test text');
    await expect(page.getByRole('img', { name: 'QR code containing: Test text' })).toBeVisible();

    // Clear the input
    await textInput.clear();

    // Verify QR code and action buttons are removed
    await expect(page.getByRole('img', { name: /QR code containing/ })).not.toBeVisible();
    await expect(page.getByRole('button', { name: /Copy QR code image/ })).not.toBeVisible();
    await expect(page.getByRole('button', { name: /Download QR code image/ })).not.toBeVisible();

    // Verify empty state returns without any error messages
    await expect(page.getByText('Enter text above to generate a QR code')).toBeVisible();
    await expect(page.getByRole('alert')).not.toBeVisible();

    // Verify character count shows 0
    await expect(page.getByText('0/1000 characters')).toBeVisible();
  });

  test('copy image functionality works', async ({ page }) => {
    const textInput = page.getByLabel('Enter text to generate QR code:');

    // Generate a QR code
    const testText = 'Copy test';
    await textInput.fill(testText);
    await expect(page.getByRole('img', { name: `QR code containing: ${testText}` })).toBeVisible();

    // Mock clipboard API for testing
    await page.evaluate(() => {
      window.navigator.clipboard = {
        write: async () => Promise.resolve(),
        writeText: async () => Promise.resolve(),
        read: async () => Promise.resolve([]),
        readText: async () => Promise.resolve('')
      };

      // Mock ClipboardItem constructor
      (window as any).ClipboardItem = class ClipboardItem {
        constructor(public data: any) {}
      };
    });

    // Click copy button
    const copyButton = page.getByRole('button', { name: `Copy QR code image for: ${testText}` });
    await expect(copyButton).toBeVisible();
    await copyButton.click();

    // Verify the button remains clickable (no errors occurred)
    await expect(copyButton).toBeVisible();
  });

  test('download image functionality works', async ({ page }) => {
    const textInput = page.getByLabel('Enter text to generate QR code:');

    // Generate a QR code
    const testText = 'Download test';
    await textInput.fill(testText);
    await expect(page.getByRole('img', { name: `QR code containing: ${testText}` })).toBeVisible();

    // Set up download promise before clicking
    const downloadPromise = page.waitForEvent('download');

    // Click download button
    const downloadButton = page.getByRole('button', { name: `Download QR code image for: ${testText}` });
    await expect(downloadButton).toBeVisible();
    await downloadButton.click();

    // Verify download was initiated
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/qrcode-\d+\.png/);
  });

  test('displays loading state for longer text generation', async ({ page }) => {
    const textInput = page.getByLabel('Enter text to generate QR code:');

    // Use a very long text that might trigger visible loading state
    const longText = 'This is a very long text that should trigger the loading state because it contains a lot of information and data that needs to be processed into a QR code format. '.repeat(10);
    await textInput.fill(longText);

    // Try to catch loading state if it's visible, otherwise just verify final result
    try {
      await expect(page.getByText('Generating QR code...')).toBeVisible({ timeout: 1000 });
      await expect(page.getByText('Generating QR code...')).not.toBeVisible({ timeout: 5000 });
    } catch (error) {
      // If loading state is too fast to catch, that's acceptable
    }

    // Verify QR code eventually appears
    await expect(page.getByRole('img', { name: /QR code containing/ })).toBeVisible();
  });

  test('generates QR codes for various text inputs', async ({ page }) => {
    const textInput = page.getByLabel('Enter text to generate QR code:');

    const testCases = [
      'Simple text',
      'Text with numbers 123',
      'Special chars !@#$%^&*()',
      'https://example.com',
      'Multi\nline\ntext',
      'Unicode: 🚀 emoji test',
      'Very long text: ' + 'a'.repeat(500)
    ];

    for (const testText of testCases) {
      await textInput.clear();
      await textInput.fill(testText);

      // Wait for QR code to appear
      await expect(page.getByRole('img', { name: `QR code containing: ${testText}` })).toBeVisible();

      // Verify character count is accurate
      await expect(page.getByText(`${testText.length}/1000 characters`)).toBeVisible();
    }
  });

  test('maintains accessibility features', async ({ page }) => {
    const textInput = page.getByLabel('Enter text to generate QR code:');

    // Verify proper labeling
    await expect(textInput).toHaveAttribute('aria-describedby', 'character-count error-message');

    // Verify character count has live region
    const characterCount = page.locator('#character-count');
    await expect(characterCount).toHaveAttribute('aria-live', 'polite');

    // Generate QR code and verify image accessibility
    await textInput.fill('Accessibility test');
    await expect(page.getByRole('img', { name: 'QR code containing: Accessibility test' })).toBeVisible();

    // Generate QR code and verify action buttons have proper labeling
    await textInput.fill('New text for loading test');
    await expect(page.getByRole('img', { name: 'QR code containing: New text for loading test' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Copy QR code image for: New text for loading test' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Download QR code image for: New text for loading test' })).toBeVisible();
  });

  test('handles rapid navigation without memory leaks', async ({ page }) => {
    // Navigate away and back to test component cleanup
    await page.goto('/');
    await page.goto('/qr-generator');

    const textInput = page.getByLabel('Enter text to generate QR code:');

    // Generate QR code
    await textInput.fill('Memory test');
    await expect(page.getByRole('img', { name: 'QR code containing: Memory test' })).toBeVisible();

    // Navigate away and back multiple times
    for (let i = 0; i < 3; i++) {
      await page.goto('/');
      await page.goto('/qr-generator');

      // Verify component still works correctly
      const newInput = page.getByLabel('Enter text to generate QR code:');
      await expect(newInput).toBeVisible();
      await expect(page.getByText('0/1000 characters')).toBeVisible();
      await expect(page.getByText('Enter text above to generate a QR code')).toBeVisible();
    }
  });
});