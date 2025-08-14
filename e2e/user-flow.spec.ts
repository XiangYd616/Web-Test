import { test, expect } from '@playwright/test';

test.describe('User Flow Tests', () => {
  test('complete testing workflow', async ({ page }) => {
    // 1. Navigate to homepage
    await page.goto('/');
    await expect(page).toHaveTitle(/Test Web/);

    // 2. Navigate to API test
    await page.click('text=API测试');
    await expect(page).toHaveURL(/.*api-test/);

    // 3. Configure and run API test
    await page.fill('[data-testid="base-url-input"]', 'https://jsonplaceholder.typicode.com');
    await page.click('[data-testid="add-endpoint-button"]');
    await page.fill('[data-testid="endpoint-name-input"]', 'Get Posts');
    await page.fill('[data-testid="endpoint-path-input"]', '/posts');

    await page.click('[data-testid="start-test-button"]');

    // 4. Wait for test completion
    await page.waitForSelector('[data-testid="test-completed"]', { timeout: 30000 });

    // 5. View results
    await expect(page.locator('[data-testid="test-results"]')).toBeVisible();

    // 6. Check history
    await page.click('text=历史');
    await expect(page.locator('[data-testid="history-panel"]')).toBeVisible();

    // 7. Navigate to security test
    await page.click('text=安全测试');
    await expect(page).toHaveURL(/.*security-test/);

    // 8. Configure security test
    await page.fill('[data-testid="url-input"]', 'https://example.com');
    await page.check('[data-testid="ssl-checkbox"]');

    // 9. Start security test
    await page.click('[data-testid="start-test-button"]');

    // 10. Verify security test started
    await expect(page.locator('[data-testid="test-progress"]')).toBeVisible();
  });

  test('responsive design workflow', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/');

    // Should show mobile menu
    await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();

    // Open mobile menu
    await page.click('[data-testid="mobile-menu-button"]');
    await expect(page.locator('[data-testid="mobile-nav-menu"]')).toBeVisible();

    // Navigate via mobile menu
    await page.click('text=API测试');
    await expect(page).toHaveURL(/.*api-test/);

    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });

    // Should adapt to tablet layout
    await expect(page.locator('[data-testid="tablet-layout"]')).toBeVisible();
  });

  test('accessibility workflow', async ({ page }) => {
    await page.goto('/api-test');

    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');

    // Test screen reader announcements
    const liveRegion = page.locator('[aria-live="polite"]');
    await expect(liveRegion).toBeAttached();

    // Test focus management
    await page.click('[data-testid="start-test-button"]');
    await expect(page.locator('[data-testid="progress-panel"]')).toBeFocused();
  });

  test('error handling workflow', async ({ page }) => {
    await page.goto('/api-test');

    // Configure invalid test
    await page.fill('[data-testid="base-url-input"]', 'invalid-url');
    await page.click('[data-testid="add-endpoint-button"]');
    await page.fill('[data-testid="endpoint-path-input"]', '/test');

    // Start test
    await page.click('[data-testid="start-test-button"]');

    // Should show validation error
    await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();

    // Fix configuration
    await page.fill('[data-testid="base-url-input"]', 'https://jsonplaceholder.typicode.com');

    // Should clear error
    await expect(page.locator('[data-testid="validation-error"]')).not.toBeVisible();
  });

  test('performance workflow', async ({ page }) => {
    // Monitor performance
    await page.goto('/');

    // Measure page load time
    const startTime = Date.now();
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(3000); // Should load within 3 seconds

    // Test lazy loading
    await page.goto('/api-test');

    // Scroll to trigger lazy loading
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    // Should load additional content
    await expect(page.locator('[data-testid="lazy-content"]')).toBeVisible();
  });
});
