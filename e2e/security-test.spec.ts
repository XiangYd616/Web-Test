import { test, expect } from '@playwright/test';
import { SecurityTestPage } from './page-objects/SecurityTestPage';

test.describe('Security Test Page', () => {
  let securityTestPage: SecurityTestPage;

  test.beforeEach(async ({ page }) => {
    securityTestPage = new SecurityTestPage(page);
    await securityTestPage.goto();
  });

  test('should display security test page correctly', async ({ page }) => {
    await expect(page).toHaveTitle(/安全测试/);
    await expect(securityTestPage.pageTitle).toHaveText('安全测试');
  });

  test('should show security check options', async () => {
    await expect(securityTestPage.sslCheckbox).toBeVisible();
    await expect(securityTestPage.headersCheckbox).toBeVisible();
    await expect(securityTestPage.vulnerabilitiesCheckbox).toBeVisible();
  });

  test('should configure security test settings', async () => {
    // Configure URL
    await securityTestPage.urlInput.fill('https://example.com');

    // Select security checks
    await securityTestPage.sslCheckbox.check();
    await securityTestPage.headersCheckbox.check();

    // Set scan depth
    await securityTestPage.scanDepthSelect.selectOption('standard');

    // Verify configuration
    await expect(securityTestPage.sslCheckbox).toBeChecked();
    await expect(securityTestPage.headersCheckbox).toBeChecked();
  });

  test('should show security warnings for dangerous tests', async () => {
    // Enable dangerous tests
    await securityTestPage.xssCheckbox.check();
    await securityTestPage.sqlInjectionCheckbox.check();

    // Should show warning
    await expect(securityTestPage.warningMessage).toBeVisible();
    await expect(securityTestPage.warningMessage).toContainText('注意事项');
  });

  test('should run security test and show results', async ({ page }) => {
    // Configure test
    await securityTestPage.urlInput.fill('https://example.com');
    await securityTestPage.sslCheckbox.check();
    await securityTestPage.headersCheckbox.check();

    // Start test
    await securityTestPage.startTestButton.click();

    // Wait for completion
    await page.waitForSelector('[data-testid="security-results"]', {
      timeout: 60000,
      state: 'visible'
    });

    // Should show security score
    await expect(securityTestPage.securityScore).toBeVisible();

    // Should show detailed results
    await expect(securityTestPage.sslResults).toBeVisible();
    await expect(securityTestPage.headersResults).toBeVisible();
  });
});
