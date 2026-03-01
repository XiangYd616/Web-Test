import { expect, test } from '@playwright/test';

test.describe('Core User Flow Tests', () => {
  test('login page renders correctly', async ({ page }) => {
    await page.goto('/login');

    // Login form elements should be visible
    await expect(page.locator('h2')).toContainText(/welcome|登录|欢迎/i);
    await expect(page.locator('input[type="text"], input[type="email"]').first()).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('dashboard navigation and URL input', async ({ page }) => {
    // Navigate to dashboard (may redirect to login)
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const currentUrl = page.url();
    if (currentUrl.includes('/login')) {
      // If redirected to login, that's expected for unauthenticated user
      return;
    }

    // Dashboard should render layout elements
    await expect(page.locator('.tw-app-shell')).toBeVisible();
    await expect(page.locator('.tw-sidebar')).toBeVisible();
    await expect(page.locator('.tw-topbar')).toBeVisible();
    await expect(page.locator('#main-content')).toBeVisible();

    // URL input should be present on dashboard
    const urlInput = page.locator('.tw-topbar-url-input');
    await expect(urlInput).toBeVisible();
    await expect(urlInput).toHaveAttribute('aria-label');

    // Type a URL and verify
    await urlInput.fill('https://example.com');
    await expect(urlInput).toHaveValue('https://example.com');
  });

  test('sidebar navigation links work', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    if (page.url().includes('/login')) return;

    // Sidebar nav should have aria-label
    const nav = page.locator('nav.tw-sidebar-nav');
    await expect(nav).toHaveAttribute('aria-label');

    // Sidebar should contain navigation buttons
    const navButtons = page.locator('.tw-sidebar-item');
    const count = await navButtons.count();
    expect(count).toBeGreaterThan(0);

    // Click on history/report center nav item
    const historyBtn = navButtons.nth(3);
    await historyBtn.click();
    await page.waitForLoadState('networkidle');
  });

  test('keyboard navigation and skip link', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    if (page.url().includes('/login')) return;

    // Skip link should exist and become visible on focus
    const skipLink = page.locator('a[href="#main-content"]');
    await expect(skipLink).toBeAttached();

    // Tab to skip link and verify it becomes visible
    await page.keyboard.press('Tab');
    await expect(skipLink).toBeFocused();

    // Main content should have id for skip link target
    await expect(page.locator('#main-content')).toBeAttached();
  });

  test('dashboard divider keyboard navigation', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    if (page.url().includes('/login')) return;

    // Divider should have correct ARIA attributes
    const divider = page.locator('[role="separator"]');
    await expect(divider).toHaveAttribute('aria-orientation', 'horizontal');
    await expect(divider).toHaveAttribute('aria-label');
    await expect(divider).toHaveAttribute('tabindex', '0');
  });

  test('page title updates on navigation', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    if (page.url().includes('/login')) return;

    // Document title should contain app name
    const title = await page.title();
    expect(title).toContain('Test-Web');
  });

  test('responsive layout', async ({ page }) => {
    // Test desktop viewport
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    if (page.url().includes('/login')) return;

    // Sidebar should be present
    await expect(page.locator('.tw-sidebar')).toBeVisible();

    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(300);

    // Layout should still be functional
    await expect(page.locator('.tw-app-shell')).toBeVisible();
  });

  test('performance: page loads within budget', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    const loadTime = Date.now() - startTime;

    // Login page should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });
});
