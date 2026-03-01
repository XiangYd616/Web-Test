/**
 * 端到端用户流程测试
 */

import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import puppeteer, { type Browser, type Page } from 'puppeteer';

describe('用户流程测试', () => {
  let browser: Browser | null = null;
  let page: Page | null = null;

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
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
      if (!page) throw new Error('Page not initialized');

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
      if (!page) throw new Error('Page not initialized');

      await page.goto('http://localhost:3000');

      // 输入测试URL
      await page.type('input[type="url"]', 'https://example.com');

      // 点击测试按钮
      await page.click('button[type="submit"]');

      // 等待测试开始
      await page.waitForSelector('.test-loading', { timeout: 5000 });

      // 验证测试状态
      const loadingElement = await page.$('.test-loading');
      expect(loadingElement).toBeTruthy();
    });

    it('用户应该能够查看测试结果', async () => {
      if (!page) throw new Error('Page not initialized');

      await page.goto('http://localhost:3000');

      // 输入测试URL并启动测试
      await page.type('input[type="url"]', 'https://example.com');
      await page.click('button[type="submit"]');

      // 等待测试完成
      await page.waitForSelector('.test-results', { timeout: 30000 });

      // 验证结果显示
      const resultsElement = await page.$('.test-results');
      expect(resultsElement).toBeTruthy();

      // 检查分数显示
      const scoreElement = await page.$('.score-display');
      expect(scoreElement).toBeTruthy();

      const scoreText = await page.$eval('.score-display', el => el.textContent);
      expect(scoreText).toMatch(/\d+/); // 应该包含数字分数
    });

    it('用户应该能够导航到不同测试页面', async () => {
      if (!page) throw new Error('Page not initialized');

      await page.goto('http://localhost:3000');

      // 点击导航到API测试页面
      await page.click('a[href="/api-test"]');
      await page.waitForNavigation();

      expect(page.url()).toContain('/api-test');

      // 验证API测试页面元素
      const apiTestForm = await page.$('.api-test-form');
      expect(apiTestForm).toBeTruthy();

      // 导航到安全测试页面
      await page.click('a[href="/security-test"]');
      await page.waitForNavigation();

      expect(page.url()).toContain('/security-test');

      // 验证安全测试页面元素
      const securityTestForm = await page.$('.security-test-form');
      expect(securityTestForm).toBeTruthy();
    });

    it('用户应该能够使用响应式设计', async () => {
      if (!page) throw new Error('Page not initialized');

      // 测试桌面视图
      await page.setViewport({ width: 1200, height: 800 });
      await page.goto('http://localhost:3000');

      const desktopNav = await page.$('.desktop-navigation');
      expect(desktopNav).toBeTruthy();

      // 测试移动视图
      await page.setViewport({ width: 375, height: 667 });

      const mobileMenuButton = await page.$('.mobile-menu-button');
      expect(mobileMenuButton).toBeTruthy();

      // 点击移动菜单
      await page.click('.mobile-menu-button');
      const mobileMenu = await page.$('.mobile-menu');
      expect(mobileMenu).toBeTruthy();
    });
  });

  describe('测试功能流程', () => {
    it('应该能够执行完整的性能测试流程', async () => {
      if (!page) throw new Error('Page not initialized');

      await page.goto('http://localhost:3000');

      // 输入URL
      await page.type('input[type="url"]', 'https://example.com');

      // 选择性能测试
      await page.select('select[name="test-type"]', 'performance');

      // 启动测试
      await page.click('button[type="submit"]');

      // 等待测试完成
      await page.waitForSelector('.performance-results', { timeout: 30000 });

      // 验证性能指标
      const loadTime = await page.$eval('.load-time', el => el.textContent);
      const firstContentfulPaint = await page.$eval(
        '.first-contentful-paint',
        el => el.textContent
      );
      const performanceScore = await page.$eval('.performance-score', el => el.textContent);

      expect(loadTime).toMatch(/\d+\.?\d*s/); // 应该是时间格式
      expect(firstContentfulPaint).toMatch(/\d+\.?\d*s/);
      expect(performanceScore).toMatch(/\d+/); // 应该是数字
    });

    it('应该能够执行完整的SEO测试流程', async () => {
      if (!page) throw new Error('Page not initialized');

      await page.goto('http://localhost:3000');

      // 输入URL
      await page.type('input[type="url"]', 'https://example.com');

      // 选择SEO测试
      await page.select('select[name="test-type"]', 'seo');

      // 启动测试
      await page.click('button[type="submit"]');

      // 等待测试完成
      await page.waitForSelector('.seo-results', { timeout: 30000 });

      // 验证SEO指标
      const titleCheck = await page.$('.title-check');
      const metaDescriptionCheck = await page.$('.meta-description-check');
      const headingStructureCheck = await page.$('.heading-structure-check');
      const seoScore = await page.$eval('.seo-score', el => el.textContent);

      expect(titleCheck).toBeTruthy();
      expect(metaDescriptionCheck).toBeTruthy();
      expect(headingStructureCheck).toBeTruthy();
      expect(seoScore).toMatch(/\d+/); // 应该是数字
    });

    it('应该能够处理测试错误', async () => {
      if (!page) throw new Error('Page not initialized');

      await page.goto('http://localhost:3000');

      // 输入无效URL
      await page.type('input[type="url"]', 'invalid-url');

      // 启动测试
      await page.click('button[type="submit"]');

      // 等待错误消息
      await page.waitForSelector('.error-message', { timeout: 5000 });

      // 验证错误消息
      const errorMessage = await page.$eval('.error-message', el => el.textContent);
      expect(errorMessage).toBeTruthy();
      expect(errorMessage!.length).toBeGreaterThan(0);
    });
  });

  describe('用户交互流程', () => {
    it('应该能够保存和查看测试历史', async () => {
      if (!page) throw new Error('Page not initialized');

      await page.goto('http://localhost:3000');

      // 执行一个测试
      await page.type('input[type="url"]', 'https://example.com');
      await page.click('button[type="submit"]');

      await page.waitForSelector('.test-results', { timeout: 30000 });

      // 保存测试结果
      await page.click('.save-results-button');

      // 等待保存成功提示
      await page.waitForSelector('.save-success-message', { timeout: 5000 });

      // 导航到历史页面
      await page.click('a[href="/history"]');
      await page.waitForNavigation();

      // 验证历史记录
      const historyList = await page.$('.test-history-list');
      expect(historyList).toBeTruthy();

      const historyItems = await page.$$('.history-item');
      expect(historyItems.length).toBeGreaterThan(0);
    });

    it('应该能够导出测试报告', async () => {
      if (!page) throw new Error('Page not initialized');

      await page.goto('http://localhost:3000');

      // 执行测试
      await page.type('input[type="url"]', 'https://example.com');
      await page.click('button[type="submit"]');

      await page.waitForSelector('.test-results', { timeout: 30000 });

      // 点击导出按钮
      const exportButton = await page.$('.export-button');
      if (exportButton) {
        await page.click('.export-button');

        // 等待导出选项
        await page.waitForSelector('.export-options', { timeout: 5000 });

        // 选择PDF格式
        await page.click('.export-pdf');

        // 验证导出开始
        const exportProgress = await page.$('.export-progress');
        expect(exportProgress).toBeTruthy();
      }
    });

    it('应该能够使用深色模式', async () => {
      if (!page) throw new Error('Page not initialized');

      await page.goto('http://localhost:3000');

      // 点击主题切换按钮
      await page.click('.theme-toggle-button');

      // 验证深色模式样式
      const bodyBg = await page.$eval('body', el => {
        return getComputedStyle(el).backgroundColor;
      });

      expect(bodyBg).toBe('rgb(17, 24, 39)'); // 深色模式背景色

      // 再次点击切换回浅色模式
      await page.click('.theme-toggle-button');

      const lightBodyBg = await page.$eval('body', el => {
        return getComputedStyle(el).backgroundColor;
      });

      expect(lightBodyBg).toBe('rgb(255, 255, 255)'); // 浅色模式背景色
    });
  });

  describe('性能和可访问性', () => {
    it('页面加载时间应该在合理范围内', async () => {
      if (!page) throw new Error('Page not initialized');

      const startTime = Date.now();

      await page.goto('http://localhost:3000');
      await page.waitForSelector('input[type="url"]');

      const loadTime = Date.now() - startTime;

      // 页面应该在3秒内加载完成
      expect(loadTime).toBeLessThan(3000);
    });

    it('应该支持键盘导航', async () => {
      if (!page) throw new Error('Page not initialized');

      await page.goto('http://localhost:3000');

      // 使用Tab键导航
      await page.keyboard.press('Tab');

      let focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(['INPUT', 'BUTTON', 'A']).toContain(focusedElement);

      // 继续导航几次
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Tab');
        focusedElement = await page.evaluate(() => document.activeElement?.tagName);
        expect(['INPUT', 'BUTTON', 'A', 'SELECT']).toContain(focusedElement);
      }
    });

    it('应该有适当的ARIA标签', async () => {
      if (!page) throw new Error('Page not initialized');

      await page.goto('http://localhost:3000');

      // 检查主要表单的ARIA标签
      const mainForm = await page.$('form');
      if (mainForm) {
        const ariaLabel = await mainForm.evaluate(el =>
          (el as HTMLFormElement).getAttribute('aria-label')
        );
        const ariaLabelledBy = await mainForm.evaluate(el =>
          (el as HTMLFormElement).getAttribute('aria-labelledby')
        );

        expect(ariaLabel || ariaLabelledBy).toBeTruthy();
      }

      // 检查输入框的标签关联
      const urlInput = await page.$('input[type="url"]');
      if (urlInput) {
        const inputId = await urlInput.evaluate(el => (el as HTMLInputElement).getAttribute('id'));
        if (inputId) {
          const label = await page.$(`label[for="${inputId}"]`);
          expect(label).toBeTruthy();
        }
      }
    });
  });
});
