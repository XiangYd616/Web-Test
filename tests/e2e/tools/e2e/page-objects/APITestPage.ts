import { Page, Locator } from '@playwright/test';

export class APITestPage {
  readonly page: Page;
  readonly pageTitle: Locator;
  readonly configTab: Locator;
  readonly progressTab: Locator;
  readonly resultsTab: Locator;
  readonly historyTab: Locator;
  readonly baseUrlInput: Locator;
  readonly addEndpointButton: Locator;
  readonly endpointNameInput: Locator;
  readonly endpointPathInput: Locator;
  readonly endpointMethodSelect: Locator;
  readonly startTestButton: Locator;
  readonly stopTestButton: Locator;
  readonly saveConfigButton: Locator;
  readonly configNameInput: Locator;
  readonly confirmSaveButton: Locator;
  readonly testStatusIndicator: Locator;
  readonly testResults: Locator;
  readonly historyPanel: Locator;
  readonly historyFilterSelect: Locator;
  readonly historySearchInput: Locator;
  readonly successMessage: Locator;
  readonly errorMessage: Locator;
  readonly mobileMenuButton: Locator;
  readonly mobileNavMenu: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageTitle = page.locator('[data-testid="page-title"]');
    this.configTab = page.locator('text=配置');
    this.progressTab = page.locator('text=进度');
    this.resultsTab = page.locator('text=结果');
    this.historyTab = page.locator('text=历史');
    this.baseUrlInput = page.locator('[data-testid="base-url-input"]');
    this.addEndpointButton = page.locator('[data-testid="add-endpoint-button"]');
    this.endpointNameInput = page.locator('[data-testid="endpoint-name-input"]');
    this.endpointPathInput = page.locator('[data-testid="endpoint-path-input"]');
    this.endpointMethodSelect = page.locator('[data-testid="endpoint-method-select"]');
    this.startTestButton = page.locator('[data-testid="start-test-button"]');
    this.stopTestButton = page.locator('[data-testid="stop-test-button"]');
    this.saveConfigButton = page.locator('[data-testid="save-config-button"]');
    this.configNameInput = page.locator('[data-testid="config-name-input"]');
    this.confirmSaveButton = page.locator('[data-testid="confirm-save-button"]');
    this.testStatusIndicator = page.locator('[data-testid="test-status"]');
    this.testResults = page.locator('[data-testid="test-results"]');
    this.historyPanel = page.locator('[data-testid="history-panel"]');
    this.historyFilterSelect = page.locator('[data-testid="history-filter-select"]');
    this.historySearchInput = page.locator('[data-testid="history-search-input"]');
    this.successMessage = page.locator('[data-testid="success-message"]');
    this.errorMessage = page.locator('[data-testid="error-message"]');
    this.mobileMenuButton = page.locator('[data-testid="mobile-menu-button"]');
    this.mobileNavMenu = page.locator('[data-testid="mobile-nav-menu"]');
  }

  async goto() {
    await this.page.goto('/api-test');
  }

  async configureBasicTest(baseUrl: string, endpointName: string, endpointPath: string) {
    await this.baseUrlInput.fill(baseUrl);
    await this.addEndpointButton.click();
    await this.endpointNameInput.first().fill(endpointName);
    await this.endpointPathInput.first().fill(endpointPath);
  }

  async startTest() {
    await this.startTestButton.click();
  }

  async waitForTestCompletion(timeout = 30000) {
    await this.page.waitForSelector('[data-testid="test-completed"]', {
      timeout,
      state: 'visible'
    });
  }

  async saveConfiguration(name: string) {
    await this.saveConfigButton.click();
    await this.configNameInput.fill(name);
    await this.confirmSaveButton.click();
  }

  async switchToTab(tab: 'config' | 'progress' | 'results' | 'history') {
    const tabMap = {
      config: this.configTab,
      progress: this.progressTab,
      results: this.resultsTab,
      history: this.historyTab
    };

    await tabMap[tab].click();
  }
}
