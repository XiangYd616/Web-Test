/**
 * 压力测试完整流程端到端测试
 * 测试压力测试的配置、执行、结果分析等完整流程
 */

import { test, expect, Page } from '@playwright/test';

// 测试数据
const stressTestConfig = {
  url: 'https://httpbin.org/delay/1',
  concurrency: 5,
  duration: 10,
  rampUp: 2,
  rampDown: 2,
  timeout: 5000
};

// 页面对象模式
class StressTestPage {
  constructor(private page: Page) {}

  async navigateToStressTest() {
    await this.page.goto('/stress-test');
    await this.page.waitForLoadState('networkidle');
  }

  async fillBasicConfig(url: string, concurrency: number, duration: number) {
    await this.page.fill('[data-testid="stress-test-url"]', url);
    await this.page.fill('[data-testid="concurrency-input"]', concurrency.toString());
    await this.page.fill('[data-testid="duration-input"]', duration.toString());
  }

  async fillAdvancedConfig(rampUp: number, rampDown: number, timeout: number) {
    // 展开高级设置
    await this.page.click('[data-testid="advanced-settings-toggle"]');
    
    await this.page.fill('[data-testid="ramp-up-input"]', rampUp.toString());
    await this.page.fill('[data-testid="ramp-down-input"]', rampDown.toString());
    await this.page.fill('[data-testid="timeout-input"]', timeout.toString());
  }

  async setHttpMethod(method: 'GET' | 'POST' | 'PUT' | 'DELETE') {
    await this.page.selectOption('[data-testid="http-method-select"]', method);
  }

  async addCustomHeaders(headers: Record<string, string>) {
    for (const [key, value] of Object.entries(headers)) {
      await this.page.click('[data-testid="add-header-button"]');
      const headerRows = this.page.locator('[data-testid="header-row"]');
      const lastRow = headerRows.last();
      
      await lastRow.locator('[data-testid="header-name"]').fill(key);
      await lastRow.locator('[data-testid="header-value"]').fill(value);
    }
  }

  async startTest() {
    await this.page.click('[data-testid="start-stress-test-button"]');
    
    // 等待测试开始
    await expect(this.page.locator('[data-testid="test-status"]')).toHaveText('运行中', { timeout: 10000 });
  }

  async stopTest() {
    await this.page.click('[data-testid="stop-test-button"]');
    await this.page.waitForSelector('[data-testid="test-stopped"]', { timeout: 5000 });
  }

  async waitForTestCompletion(timeout: number = 60000) {
    await expect(this.page.locator('[data-testid="test-status"]')).toHaveText('已完成', { timeout });
  }

  async getTestResults() {
    await this.page.waitForSelector('[data-testid="test-results"]', { timeout: 10000 });
    
    const totalRequests = await this.page.textContent('[data-testid="total-requests"]');
    const successRate = await this.page.textContent('[data-testid="success-rate"]');
    const avgResponseTime = await this.page.textContent('[data-testid="avg-response-time"]');
    const rps = await this.page.textContent('[data-testid="requests-per-second"]');
    
    return {
      totalRequests: parseInt(totalRequests || '0'),
      successRate: parseFloat(successRate || '0'),
      avgResponseTime: parseFloat(avgResponseTime || '0'),
      requestsPerSecond: parseFloat(rps || '0')
    };
  }

  async getRealTimeMetrics() {
    const activeRequests = await this.page.textContent('[data-testid="active-requests"]');
    const currentRps = await this.page.textContent('[data-testid="current-rps"]');
    const errors = await this.page.textContent('[data-testid="error-count"]');
    
    return {
      activeRequests: parseInt(activeRequests || '0'),
      currentRps: parseFloat(currentRps || '0'),
      errors: parseInt(errors || '0')
    };
  }

  async getProgressInfo() {
    const progress = await this.page.getAttribute('[data-testid="test-progress-bar"]', 'aria-valuenow');
    const phase = await this.page.textContent('[data-testid="test-phase"]');
    const elapsed = await this.page.textContent('[data-testid="elapsed-time"]');
    
    return {
      progress: parseFloat(progress || '0'),
      phase: phase || '',
      elapsed: elapsed || ''
    };
  }

  async exportResults(format: 'json' | 'csv' | 'pdf') {
    await this.page.click('[data-testid="export-results-button"]');
    await this.page.selectOption('[data-testid="export-format-select"]', format);
    
    // 等待下载开始
    const downloadPromise = this.page.waitForEvent('download');
    await this.page.click('[data-testid="confirm-export-button"]');
    
    return await downloadPromise;
  }

  async saveTestConfiguration(name: string) {
    await this.page.click('[data-testid="save-config-button"]');
    await this.page.fill('[data-testid="config-name-input"]', name);
    await this.page.click('[data-testid="confirm-save-button"]');
    
    await expect(this.page.locator('[data-testid="config-saved-message"]')).toBeVisible();
  }

  async loadTestConfiguration(name: string) {
    await this.page.click('[data-testid="load-config-button"]');
    await this.page.click(`[data-testid="config-item"][data-name="${name}"]`);
    await this.page.click('[data-testid="load-selected-config"]');
    
    await this.page.waitForLoadState('networkidle');
  }

  async getErrorMessage(): Promise<string> {
    const errorElement = await this.page.locator('[data-testid="error-message"]').first();
    return await errorElement.textContent() || '';
  }

  async clearResults() {
    await this.page.click('[data-testid="clear-results-button"]');
    await expect(this.page.locator('[data-testid="test-results"]')).not.toBeVisible();
  }
}

// 登录辅助函数
async function loginUser(page: Page, email: string = 'test@example.com', password: string = 'TestPassword123!') {
  await page.goto('/login');
  await page.fill('[data-testid="email-input"]', email);
  await page.fill('[data-testid="password-input"]', password);
  await page.click('[data-testid="login-button"]');
  await page.waitForURL(/\/dashboard/, { timeout: 10000 });
}

// 主测试套件
test.describe('压力测试完整流程', () => {
  let stressTestPage: StressTestPage;

  test.beforeEach(async ({ page }) => {
    stressTestPage = new StressTestPage(page);
    
    // 确保用户已登录
    await loginUser(page);
    
    // 导航到压力测试页面
    await stressTestPage.navigateToStressTest();
  });

  test.describe('测试配置', () => {
    test('基本配置表单验证', async ({ page }) => {
      // 验证页面加载
      await expect(page.locator('[data-testid="stress-test-form"]')).toBeVisible();
      
      // 验证必填字段
      await expect(page.locator('[data-testid="stress-test-url"]')).toBeVisible();
      await expect(page.locator('[data-testid="concurrency-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="duration-input"]')).toBeVisible();
      
      // 尝试启动测试而不填写URL
      await stressTestPage.startTest();
      const errorMessage = await stressTestPage.getErrorMessage();
      expect(errorMessage).toContain('请输入有效的URL');
    });

    test('URL格式验证', async ({ page }) => {
      // 测试无效URL
      await stressTestPage.fillBasicConfig('invalid-url', 5, 10);
      await stressTestPage.startTest();
      
      const errorMessage = await stressTestPage.getErrorMessage();
      expect(errorMessage).toContain('URL格式不正确');
    });

    test('并发数限制验证', async ({ page }) => {
      // 测试超出限制的并发数
      await stressTestPage.fillBasicConfig(stressTestConfig.url, 1000, 10);
      await stressTestPage.startTest();
      
      const errorMessage = await stressTestPage.getErrorMessage();
      expect(errorMessage).toContain('并发数不能超过');
    });

    test('高级配置设置', async ({ page }) => {
      await stressTestPage.fillBasicConfig(stressTestConfig.url, stressTestConfig.concurrency, stressTestConfig.duration);
      await stressTestPage.fillAdvancedConfig(stressTestConfig.rampUp, stressTestConfig.rampDown, stressTestConfig.timeout);
      
      // 验证高级配置已正确设置
      const rampUpValue = await page.inputValue('[data-testid="ramp-up-input"]');
      const rampDownValue = await page.inputValue('[data-testid="ramp-down-input"]');
      const timeoutValue = await page.inputValue('[data-testid="timeout-input"]');
      
      expect(parseInt(rampUpValue)).toBe(stressTestConfig.rampUp);
      expect(parseInt(rampDownValue)).toBe(stressTestConfig.rampDown);
      expect(parseInt(timeoutValue)).toBe(stressTestConfig.timeout);
    });

    test('HTTP方法选择', async ({ page }) => {
      await stressTestPage.setHttpMethod('POST');
      
      const selectedMethod = await page.inputValue('[data-testid="http-method-select"]');
      expect(selectedMethod).toBe('POST');
    });

    test('自定义请求头配置', async ({ page }) => {
      const customHeaders = {
        'Authorization': 'Bearer token123',
        'Content-Type': 'application/json'
      };
      
      await stressTestPage.addCustomHeaders(customHeaders);
      
      // 验证头部已添加
      const headerRows = page.locator('[data-testid="header-row"]');
      const count = await headerRows.count();
      expect(count).toBe(2);
    });
  });

  test.describe('测试执行', () => {
    test('成功执行基本压力测试', async ({ page }) => {
      // 配置基本测试参数
      await stressTestPage.fillBasicConfig(stressTestConfig.url, stressTestConfig.concurrency, stressTestConfig.duration);
      
      // 启动测试
      await stressTestPage.startTest();
      
      // 验证测试开始
      await expect(page.locator('[data-testid="test-status"]')).toHaveText('运行中');
      
      // 等待测试完成
      await stressTestPage.waitForTestCompletion(30000);
      
      // 验证结果
      const results = await stressTestPage.getTestResults();
      expect(results.totalRequests).toBeGreaterThan(0);
      expect(results.successRate).toBeGreaterThanOrEqual(0);
      expect(results.avgResponseTime).toBeGreaterThan(0);
    });

    test('实时指标监控', async ({ page }) => {
      await stressTestPage.fillBasicConfig(stressTestConfig.url, stressTestConfig.concurrency, 15); // 延长测试时间以观察实时数据
      
      await stressTestPage.startTest();
      
      // 等待测试运行一段时间
      await page.waitForTimeout(3000);
      
      // 获取实时指标
      const metrics = await stressTestPage.getRealTimeMetrics();
      expect(metrics.activeRequests).toBeGreaterThanOrEqual(0);
      expect(metrics.currentRps).toBeGreaterThanOrEqual(0);
      
      // 获取进度信息
      const progress = await stressTestPage.getProgressInfo();
      expect(progress.progress).toBeGreaterThan(0);
      expect(progress.phase).toBeTruthy();
      expect(progress.elapsed).toBeTruthy();
      
      // 停止测试
      await stressTestPage.stopTest();
    });

    test('测试中途停止', async ({ page }) => {
      await stressTestPage.fillBasicConfig(stressTestConfig.url, stressTestConfig.concurrency, 30); // 较长时间的测试
      
      await stressTestPage.startTest();
      
      // 等待测试运行
      await page.waitForTimeout(5000);
      
      // 停止测试
      await stressTestPage.stopTest();
      
      // 验证测试已停止
      await expect(page.locator('[data-testid="test-status"]')).toHaveText('已停止');
      
      // 验证仍有部分结果
      const results = await stressTestPage.getTestResults();
      expect(results.totalRequests).toBeGreaterThan(0);
    });

    test('渐进加压测试验证', async ({ page }) => {
      await stressTestPage.fillBasicConfig(stressTestConfig.url, 10, 20);
      await stressTestPage.fillAdvancedConfig(5, 5, 10000); // 5秒加压，5秒减压
      
      await stressTestPage.startTest();
      
      // 在加压阶段检查
      await page.waitForTimeout(3000);
      let progress = await stressTestPage.getProgressInfo();
      expect(progress.phase).toContain('加压' || '启动');
      
      // 等待进入主测试阶段
      await page.waitForTimeout(8000);
      progress = await stressTestPage.getProgressInfo();
      expect(progress.phase).toContain('测试' || '稳定');
      
      await stressTestPage.waitForTestCompletion(40000);
    });
  });

  test.describe('结果分析', () => {
    test('详细测试结果展示', async ({ page }) => {
      await stressTestPage.fillBasicConfig(stressTestConfig.url, stressTestConfig.concurrency, stressTestConfig.duration);
      await stressTestPage.startTest();
      await stressTestPage.waitForTestCompletion();
      
      // 验证结果区域可见
      await expect(page.locator('[data-testid="test-results"]')).toBeVisible();
      
      // 验证关键指标存在
      await expect(page.locator('[data-testid="total-requests"]')).toBeVisible();
      await expect(page.locator('[data-testid="success-rate"]')).toBeVisible();
      await expect(page.locator('[data-testid="avg-response-time"]')).toBeVisible();
      await expect(page.locator('[data-testid="requests-per-second"]')).toBeVisible();
      
      // 验证图表显示
      await expect(page.locator('[data-testid="response-time-chart"]')).toBeVisible();
      await expect(page.locator('[data-testid="rps-chart"]')).toBeVisible();
    });

    test('错误统计和分析', async ({ page }) => {
      // 使用会产生错误的URL
      await stressTestPage.fillBasicConfig('https://httpbin.org/status/500', 5, 10);
      await stressTestPage.startTest();
      await stressTestPage.waitForTestCompletion();
      
      const results = await stressTestPage.getTestResults();
      
      // 验证错误被正确记录
      expect(results.successRate).toBeLessThan(100);
      
      // 验证错误详情显示
      await expect(page.locator('[data-testid="error-details"]')).toBeVisible();
    });

    test('性能指标图表', async ({ page }) => {
      await stressTestPage.fillBasicConfig(stressTestConfig.url, stressTestConfig.concurrency, stressTestConfig.duration);
      await stressTestPage.startTest();
      await stressTestPage.waitForTestCompletion();
      
      // 验证图表元素
      await expect(page.locator('[data-testid="response-time-chart"]')).toBeVisible();
      await expect(page.locator('[data-testid="throughput-chart"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-rate-chart"]')).toBeVisible();
      
      // 验证图表数据点
      const chartDataPoints = page.locator('[data-testid="chart-data-point"]');
      const dataPointCount = await chartDataPoints.count();
      expect(dataPointCount).toBeGreaterThan(0);
    });
  });

  test.describe('结果导出', () => {
    test('JSON格式导出', async ({ page }) => {
      await stressTestPage.fillBasicConfig(stressTestConfig.url, stressTestConfig.concurrency, stressTestConfig.duration);
      await stressTestPage.startTest();
      await stressTestPage.waitForTestCompletion();
      
      // 导出JSON格式
      const download = await stressTestPage.exportResults('json');
      
      expect(download.suggestedFilename()).toMatch(/\.json$/);
    });

    test('CSV格式导出', async ({ page }) => {
      await stressTestPage.fillBasicConfig(stressTestConfig.url, stressTestPage.concurrency, stressTestConfig.duration);
      await stressTestPage.startTest();
      await stressTestPage.waitForTestCompletion();
      
      // 导出CSV格式
      const download = await stressTestPage.exportResults('csv');
      
      expect(download.suggestedFilename()).toMatch(/\.csv$/);
    });

    test('PDF报告导出', async ({ page }) => {
      await stressTestPage.fillBasicConfig(stressTestConfig.url, stressTestConfig.concurrency, stressTestConfig.duration);
      await stressTestPage.startTest();
      await stressTestPage.waitForTestCompletion();
      
      // 导出PDF格式
      const download = await stressTestPage.exportResults('pdf');
      
      expect(download.suggestedFilename()).toMatch(/\.pdf$/);
    });
  });

  test.describe('配置管理', () => {
    test('保存测试配置', async ({ page }) => {
      await stressTestPage.fillBasicConfig(stressTestConfig.url, stressTestConfig.concurrency, stressTestConfig.duration);
      await stressTestPage.fillAdvancedConfig(stressTestConfig.rampUp, stressTestConfig.rampDown, stressTestConfig.timeout);
      
      const configName = `测试配置_${Date.now()}`;
      await stressTestPage.saveTestConfiguration(configName);
      
      // 验证保存成功消息
      await expect(page.locator('[data-testid="config-saved-message"]')).toBeVisible();
    });

    test('加载已保存配置', async ({ page }) => {
      // 先保存一个配置
      const configName = `加载测试配置_${Date.now()}`;
      await stressTestPage.fillBasicConfig(stressTestConfig.url, 20, 15);
      await stressTestPage.saveTestConfiguration(configName);
      
      // 清空当前配置
      await page.reload();
      await stressTestPage.navigateToStressTest();
      
      // 加载配置
      await stressTestPage.loadTestConfiguration(configName);
      
      // 验证配置已加载
      const urlValue = await page.inputValue('[data-testid="stress-test-url"]');
      const concurrencyValue = await page.inputValue('[data-testid="concurrency-input"]');
      const durationValue = await page.inputValue('[data-testid="duration-input"]');
      
      expect(urlValue).toBe(stressTestConfig.url);
      expect(parseInt(concurrencyValue)).toBe(20);
      expect(parseInt(durationValue)).toBe(15);
    });
  });

  test.describe('错误处理', () => {
    test('网络连接失败处理', async ({ page }) => {
      // 使用无法访问的URL
      await stressTestPage.fillBasicConfig('https://nonexistent-domain-12345.com', 5, 5);
      await stressTestPage.startTest();
      
      // 等待错误出现
      await page.waitForTimeout(10000);
      
      // 验证错误处理
      const errorMessage = await stressTestPage.getErrorMessage();
      expect(errorMessage).toContain('连接失败' || '网络错误');
    });

    test('超时处理', async ({ page }) => {
      // 使用延迟很长的URL和短超时
      await stressTestPage.fillBasicConfig('https://httpbin.org/delay/10', 2, 5);
      await stressTestPage.fillAdvancedConfig(0, 0, 1000); // 1秒超时
      
      await stressTestPage.startTest();
      await stressTestPage.waitForTestCompletion();
      
      const results = await stressTestPage.getTestResults();
      // 应该有超时错误
      expect(results.successRate).toBeLessThan(100);
    });

    test('服务器错误响应处理', async ({ page }) => {
      // 使用返回500错误的URL
      await stressTestPage.fillBasicConfig('https://httpbin.org/status/500', 3, 5);
      await stressTestPage.startTest();
      await stressTestPage.waitForTestCompletion();
      
      const results = await stressTestPage.getTestResults();
      expect(results.totalRequests).toBeGreaterThan(0);
      expect(results.successRate).toBe(0); // 全部应该失败
    });
  });

  test.describe('并发和性能', () => {
    test('高并发测试处理', async ({ page }) => {
      // 测试较高的并发数
      await stressTestPage.fillBasicConfig(stressTestConfig.url, 50, 10);
      await stressTestPage.startTest();
      
      // 监控实时指标
      await page.waitForTimeout(3000);
      const metrics = await stressTestPage.getRealTimeMetrics();
      
      expect(metrics.activeRequests).toBeGreaterThan(0);
      expect(metrics.currentRps).toBeGreaterThan(0);
      
      await stressTestPage.waitForTestCompletion();
      
      const results = await stressTestPage.getTestResults();
      expect(results.requestsPerSecond).toBeGreaterThan(5); // 预期的最小RPS
    });

    test('长时间测试稳定性', async ({ page }) => {
      // 较长时间的测试
      await stressTestPage.fillBasicConfig(stressTestConfig.url, 10, 60); // 1分钟测试
      await stressTestPage.startTest();
      
      // 在测试过程中多次检查状态
      for (let i = 0; i < 3; i++) {
        await page.waitForTimeout(15000);
        const progress = await stressTestPage.getProgressInfo();
        expect(progress.progress).toBeGreaterThan(0);
        
        const metrics = await stressTestPage.getRealTimeMetrics();
        expect(metrics.currentRps).toBeGreaterThan(0);
      }
      
      await stressTestPage.waitForTestCompletion(80000);
      
      const results = await stressTestPage.getTestResults();
      expect(results.totalRequests).toBeGreaterThan(500); // 预期大量请求
    });
  });

  test.describe('用户界面响应性', () => {
    test('实时数据更新', async ({ page }) => {
      await stressTestPage.fillBasicConfig(stressTestConfig.url, stressTestConfig.concurrency, 20);
      await stressTestPage.startTest();
      
      // 记录初始值
      await page.waitForTimeout(2000);
      const initialMetrics = await stressTestPage.getRealTimeMetrics();
      
      // 等待一段时间后再次检查
      await page.waitForTimeout(3000);
      const updatedMetrics = await stressTestPage.getRealTimeMetrics();
      
      // 验证数据有更新（除非测试已完成）
      const testStatus = await page.textContent('[data-testid="test-status"]');
      if (testStatus === '运行中') {
        expect(updatedMetrics.currentRps).not.toBe(initialMetrics.currentRps);
      }
      
      await stressTestPage.stopTest();
    });

    test('进度条更新', async ({ page }) => {
      await stressTestPage.fillBasicConfig(stressTestConfig.url, stressTestConfig.concurrency, 15);
      await stressTestPage.startTest();
      
      let lastProgress = 0;
      
      // 检查进度条是否在更新
      for (let i = 0; i < 3; i++) {
        await page.waitForTimeout(3000);
        const progressInfo = await stressTestPage.getProgressInfo();
        
        if (progressInfo.progress > lastProgress) {
          lastProgress = progressInfo.progress;
        }
      }
      
      expect(lastProgress).toBeGreaterThan(0);
      
      await stressTestPage.stopTest();
    });
  });
});

// 清理和钩子
test.afterEach(async ({ page }) => {
  // 确保测试停止（如果还在运行）
  try {
    const testStatus = await page.textContent('[data-testid="test-status"]');
    if (testStatus === '运行中') {
      await page.click('[data-testid="stop-test-button"]');
    }
  } catch {
    // 忽略错误
  }
});

test.afterAll(async () => {
  console.log('压力测试E2E测试套件完成');
});
