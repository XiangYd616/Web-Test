import { Page, Locator } from '@playwright/test';

export class SecurityTestPage {
  readonly page: Page;
  readonly pageTitle: Locator;
  readonly urlInput: Locator;
  readonly sslCheckbox: Locator;
  readonly headersCheckbox: Locator;
  readonly vulnerabilitiesCheckbox: Locator;
  readonly xssCheckbox: Locator;
  readonly sqlInjectionCheckbox: Locator;
  readonly scanDepthSelect: Locator;
  readonly startTestButton: Locator;
  readonly warningMessage: Locator;
  readonly securityScore: Locator;
  readonly sslResults: Locator;
  readonly headersResults: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageTitle = page.locator('[data-testid="page-title"]');
    this.urlInput = page.locator('[data-testid="url-input"]');
    this.sslCheckbox = page.locator('[data-testid="ssl-checkbox"]');
    this.headersCheckbox = page.locator('[data-testid="headers-checkbox"]');
    this.vulnerabilitiesCheckbox = page.locator('[data-testid="vulnerabilities-checkbox"]');
    this.xssCheckbox = page.locator('[data-testid="xss-checkbox"]');
    this.sqlInjectionCheckbox = page.locator('[data-testid="sql-injection-checkbox"]');
    this.scanDepthSelect = page.locator('[data-testid="scan-depth-select"]');
    this.startTestButton = page.locator('[data-testid="start-test-button"]');
    this.warningMessage = page.locator('[data-testid="warning-message"]');
    this.securityScore = page.locator('[data-testid="security-score"]');
    this.sslResults = page.locator('[data-testid="ssl-results"]');
    this.headersResults = page.locator('[data-testid="headers-results"]');
  }

  async goto() {
    await this.page.goto('/security-test');
  }

  async configureBasicSecurityTest(url: string) {
    await this.urlInput.fill(url);
    await this.sslCheckbox.check();
    await this.headersCheckbox.check();
  }

  async enableDangerousTests() {
    await this.xssCheckbox.check();
    await this.sqlInjectionCheckbox.check();
  }

  async startTest() {
    await this.startTestButton.click();
  }

  async waitForResults(timeout = 60000) {
    await this.page.waitForSelector('[data-testid="security-results"]', {
      timeout,
      state: 'visible'
    });
  }
}
