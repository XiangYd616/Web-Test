/**
 * 端到端用户流程测试
 */

const { describe, it, expect, beforeAll, afterAll } = require('@jest/globals');
const puppeteer = require('puppeteer');

describe('用户流程测试', () => {
  let browser;
  let page;

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    page = await browser.newPage();
  });

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  describe('主要用户流程', () => {
    it('用户应该能够访问首页', async () => {
      await page.goto('http://localhost:3000');
      
      const title = await page.title();
      expect(title).toContain('Test-Web');
      
      // 检查主要元素是否存在
      const urlInput = await page.$('input[type="url"]');
      expect(urlInput).toBeTruthy();
      
      const testButton = await page.$('button[type="submit"]');
      expect(testButton).toBeTruthy();
    });

    it('用户应该能够输入URL并启动测试', async () => {
      await page.goto('http://localhost:3000');
      
      // 输入测试URL
      await page.type('input[type="url"]', 'https://example.com');
      
      // 点击测试按钮
      await page.click('button[type="submit"]');
      
      // 等待测试开始
      await page.waitForSelector('.test-progress', { timeout: 5000 });
      
      const progressElement = await page.$('.test-progress');
      expect(progressElement).toBeTruthy();
    });

    it('用户应该能够查看测试结果', async () => {
      await page.goto('http://localhost:3000');
      
      // 输入测试URL
      await page.type('input[type="url"]', 'https://example.com');
      
      // 启动测试
      await page.click('button[type="submit"]');
      
      // 等待测试完成（可能需要较长时间）
      await page.waitForSelector('.test-results', { timeout: 30000 });
      
      const resultsElement = await page.$('.test-results');
      expect(resultsElement).toBeTruthy();
      
      // 检查是否显示了分数
      const scoreElement = await page.$('.test-score');
      expect(scoreElement).toBeTruthy();
    });

    it('用户应该能够查看测试历史', async () => {
      await page.goto('http://localhost:3000/history');
      
      // 等待历史页面加载
      await page.waitForSelector('.test-history', { timeout: 5000 });
      
      const historyElement = await page.$('.test-history');
      expect(historyElement).toBeTruthy();
    });

    it('用户应该能够导出测试结果', async () => {
      await page.goto('http://localhost:3000');
      
      // 假设已经有测试结果
      await page.type('input[type="url"]', 'https://example.com');
      await page.click('button[type="submit"]');
      await page.waitForSelector('.test-results', { timeout: 30000 });
      
      // 点击导出按钮
      const exportButton = await page.$('.export-button');
      if (exportButton) {
        await exportButton.click();
        
        // 验证导出功能（这里可能需要检查下载或其他行为）
        await page.waitForTimeout(1000);
      }
    });
  });

  describe('错误处理', () => {
    it('应该处理无效的URL输入', async () => {
      await page.goto('http://localhost:3000');
      
      // 输入无效URL
      await page.type('input[type="url"]', 'invalid-url');
      await page.click('button[type="submit"]');
      
      // 等待错误消息
      await page.waitForSelector('.error-message', { timeout: 5000 });
      
      const errorElement = await page.$('.error-message');
      expect(errorElement).toBeTruthy();
    });

    it('应该处理网络错误', async () => {
      await page.goto('http://localhost:3000');
      
      // 输入无法访问的URL
      await page.type('input[type="url"]', 'https://nonexistent-domain-12345.com');
      await page.click('button[type="submit"]');
      
      // 等待错误处理
      await page.waitForSelector('.error-message', { timeout: 10000 });
      
      const errorElement = await page.$('.error-message');
      expect(errorElement).toBeTruthy();
    });
  });
});