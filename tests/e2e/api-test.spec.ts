import { test, expect } from '@playwright/test';
import { APITestPage } from './page-objects/APITestPage';

test.describe('API Test Page', () => {
  let apiTestPage: APITestPage;

  test.beforeEach(async ({ page }) => {
    apiTestPage = new APITestPage(page);
    await apiTestPage.goto();
  });

  test('should display API test page correctly', async ({ page }) => {
    await expect(page).toHaveTitle(/API测试/);
    await expect(apiTestPage.pageTitle).toBeVisible();
    await expect(apiTestPage.pageTitle).toHaveText('API测试');
  });

  test('should show all navigation tabs', async () => {
    await expect(apiTestPage.configTab).toBeVisible();
    await expect(apiTestPage.progressTab).toBeVisible();
    await expect(apiTestPage.resultsTab).toBeVisible();
    await expect(apiTestPage.historyTab).toBeVisible();
  });

  test('should switch between tabs correctly', async () => {
    // Default should be config tab
    await expect(apiTestPage.configTab).toHaveClass(/border-blue-500/);

    // Click progress tab
    await apiTestPage.progressTab.click();
    await expect(apiTestPage.progressTab).toHaveClass(/border-blue-500/);

    // Click results tab
    await apiTestPage.resultsTab.click();
    await expect(apiTestPage.resultsTab).toHaveClass(/border-blue-500/);

    // Click history tab
    await apiTestPage.historyTab.click();
    await expect(apiTestPage.historyTab).toHaveClass(/border-blue-500/);
  });

  test('should configure API test settings', async () => {
    // Fill in base URL
    await apiTestPage.baseUrlInput.fill('https://jsonplaceholder.typicode.com');
    await expect(apiTestPage.baseUrlInput).toHaveValue('https://jsonplaceholder.typicode.com');

    // Add an endpoint
    await apiTestPage.addEndpointButton.click();

    // Configure the endpoint
    await apiTestPage.endpointNameInput.first().fill('Get Posts');
    await apiTestPage.endpointPathInput.first().fill('/posts');
    await apiTestPage.endpointMethodSelect.first().selectOption('GET');

    // Verify configuration
    await expect(apiTestPage.endpointNameInput.first()).toHaveValue('Get Posts');
    await expect(apiTestPage.endpointPathInput.first()).toHaveValue('/posts');
  });

  test('should start and monitor API test', async ({ page }) => {
    // Configure test
    await apiTestPage.baseUrlInput.fill('https://jsonplaceholder.typicode.com');
    await apiTestPage.addEndpointButton.click();
    await apiTestPage.endpointNameInput.first().fill('Get Posts');
    await apiTestPage.endpointPathInput.first().fill('/posts');

    // Start test
    await apiTestPage.startTestButton.click();

    // Should switch to progress tab
    await expect(apiTestPage.progressTab).toHaveClass(/border-blue-500/);

    // Should show progress information
    await expect(apiTestPage.testStatusIndicator).toBeVisible();

    // Wait for test completion (with timeout)
    await page.waitForSelector('[data-testid="test-completed"]', {
      timeout: process.env.REQUEST_TIMEOUT || 30000,
      state: 'visible'
    });

    // Should switch to results tab
    await expect(apiTestPage.resultsTab).toHaveClass(/border-blue-500/);

    // Should show test results
    await expect(apiTestPage.testResults).toBeVisible();
  });

  test('should save and load test configuration', async () => {
    // Configure test
    await apiTestPage.baseUrlInput.fill('https://api.example.com');
    await apiTestPage.addEndpointButton.click();
    await apiTestPage.endpointNameInput.first().fill('Test Endpoint');

    // Save configuration
    await apiTestPage.saveConfigButton.click();
    await apiTestPage.configNameInput.fill('My API Config');
    await apiTestPage.confirmSaveButton.click();

    // Verify save success message
    await expect(apiTestPage.successMessage).toBeVisible();
    await expect(apiTestPage.successMessage).toContainText('配置保存成功');
  });

  test('should display test history', async () => {
    // Go to history tab
    await apiTestPage.historyTab.click();

    // Should show history panel
    await expect(apiTestPage.historyPanel).toBeVisible();

    // Should show filter options
    await expect(apiTestPage.historyFilterSelect).toBeVisible();
    await expect(apiTestPage.historySearchInput).toBeVisible();
  });

  test('should handle test errors gracefully', async ({ page }) => {
    // Configure invalid test
    await apiTestPage.baseUrlInput.fill('https://invalid-url-that-does-not-exist.com');
    await apiTestPage.addEndpointButton.click();
    await apiTestPage.endpointNameInput.first().fill('Invalid Test');
    await apiTestPage.endpointPathInput.first().fill('/test');

    // Start test
    await apiTestPage.startTestButton.click();

    // Wait for error
    await page.waitForSelector('[data-testid="test-error"]', {
      timeout: process.env.REQUEST_TIMEOUT || 30000,
      state: 'visible'
    });

    // Should show error message
    await expect(apiTestPage.errorMessage).toBeVisible();
    await expect(apiTestPage.errorMessage).toContainText('测试失败');
  });

  test('should be responsive on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Should show mobile-optimized layout
    await expect(apiTestPage.mobileMenuButton).toBeVisible();

    // Navigation should work on mobile
    await apiTestPage.mobileMenuButton.click();
    await expect(apiTestPage.mobileNavMenu).toBeVisible();
  });

  test('should support keyboard navigation', async ({ page }) => {
    // Focus on first interactive element
    await page.keyboard.press('Tab');

    // Should be able to navigate with keyboard
    await page.keyboard.press('Enter');

    // Should be able to navigate between tabs with arrow keys
    await apiTestPage.configTab.focus();
    await page.keyboard.press('ArrowRight');
    await expect(apiTestPage.progressTab).toBeFocused();
  });

  test('should announce changes to screen readers', async ({ page }) => {
    // Start test to trigger announcements
    await apiTestPage.baseUrlInput.fill('https://jsonplaceholder.typicode.com');
    await apiTestPage.addEndpointButton.click();
    await apiTestPage.endpointNameInput.first().fill('Test');
    await apiTestPage.endpointPathInput.first().fill('/posts');

    await apiTestPage.startTestButton.click();

    // Check for aria-live regions
    const liveRegion = page.locator('[aria-live="polite"]');
    await expect(liveRegion).toBeVisible();
  });
});
