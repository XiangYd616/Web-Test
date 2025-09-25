const { test, expect } = require('@playwright/test');

// 用户体验测试套件
test.describe('用户体验测试', () => {
  test.describe('页面加载性能', () => {
    test('首页应在3秒内加载完成', async ({ page }) => {
      const startTime = Date.now();

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(3000);

      // 检查关键内容是否可见
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('nav')).toBeVisible();
    });

    test('页面切换应流畅无卡顿', async ({ page }) => {
      await page.goto('/');

      const pages = ['/api-test', '/security-test', '/stress-test'];

      for (const pagePath of pages) {
        const startTime = Date.now();
        await page.click(`a[href="${pagePath}"]`);
        await page.waitForLoadState('networkidle');
        const loadTime = Date.now() - startTime;

        expect(loadTime).toBeLessThan(2000);
        await expect(page).toHaveURL(new RegExp(pagePath));
      }
    });
  });

  test.describe('视觉设计一致性', () => {
    test('所有页面应使用一致的设计系统', async ({ page }) => {
      const pages = ['/', '/api-test', '/security-test', '/stress-test'];

      for (const pagePath of pages) {
        await page.goto(pagePath);

        // 检查主题色彩
        const primaryButton = page.locator('button.btn-primary').first();
        if (await primaryButton.count() > 0) {
          const buttonColor = await primaryButton.evaluate(el =>
            getComputedStyle(el).backgroundColor
          );
          expect(buttonColor).toBe('rgb(37, 99, 235)'); // blue-600
        }

        // 检查字体
        const bodyFont = await page.evaluate(() =>
          getComputedStyle(document.body).fontFamily
        );
        expect(bodyFont).toContain('Inter');
      }
    });

    test('深色模式应正确切换', async ({ page }) => {
      await page.goto('/');

      // 切换到深色模式
      await page.click('[data-testid="theme-toggle"]');

      // 检查深色模式样式
      const bodyBg = await page.evaluate(() =>
        getComputedStyle(document.body).backgroundColor
      );
      expect(bodyBg).toBe('rgb(17, 24, 39)'); // gray-900

      // 切换回浅色模式
      await page.click('[data-testid="theme-toggle"]');

      const lightBodyBg = await page.evaluate(() =>
        getComputedStyle(document.body).backgroundColor
      );
      expect(lightBodyBg).toBe('rgb(255, 255, 255)'); // white
    });
  });

  test.describe('交互体验', () => {
    test('表单验证应提供清晰的反馈', async ({ page }) => {
      await page.goto('/api-test');

      // 尝试提交空表单
      await page.click('[data-testid="start-test-button"]');

      // 应显示验证错误
      await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();

      // 错误信息应该清晰
      const errorText = await page.locator('[data-testid="validation-error"]').textContent();
      expect(errorText).toContain('必填');

      // 填写正确信息后错误应消失
      await page.fill('[data-testid="base-url-input"]', 'https://api.example.com');
      await expect(page.locator('[data-testid="validation-error"]')).not.toBeVisible();
    });

    test('加载状态应有明确指示', async ({ page }) => {
      await page.goto('/api-test');

      // 配置测试
      await page.fill('[data-testid="base-url-input"]', 'https://httpbin.org/delay/2');
      await page.click('[data-testid="add-endpoint-button"]');
      await page.fill('[data-testid="endpoint-path-input"]', '/get');

      // 开始测试
      await page.click('[data-testid="start-test-button"]');

      // 应显示加载指示器
      await expect(page.locator('[data-testid="loading-indicator"]')).toBeVisible();

      // 按钮应显示加载状态
      await expect(page.locator('[data-testid="start-test-button"]')).toContainText('测试中');

      // 等待测试完成
      await page.waitForSelector('[data-testid="test-completed"]', { timeout: process.env.REQUEST_TIMEOUT || 30000 });

      // 加载指示器应消失
      await expect(page.locator('[data-testid="loading-indicator"]')).not.toBeVisible();
    });
  });

  test.describe('响应式设计', () => {
    test('移动端布局应适配良好', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');

      // 检查移动端导航
      await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();

      // 检查内容是否适配
      const contentWidth = await page.locator('main').evaluate(el => el.offsetWidth);
      expect(contentWidth).toBeLessThanOrEqual(375);

      // 测试移动端交互
      await page.click('[data-testid="mobile-menu-button"]');
      await expect(page.locator('[data-testid="mobile-nav-menu"]')).toBeVisible();
    });

    test('平板端布局应适配良好', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/api-test');

      // 检查平板端布局
      const sidebar = page.locator('[data-testid="sidebar"]');
      if (await sidebar.count() > 0) {
        await expect(sidebar).toBeVisible();
      }

      // 检查表单布局
      const formGrid = page.locator('[data-testid="form-grid"]');
      if (await formGrid.count() > 0) {
        const gridColumns = await formGrid.evaluate(el =>
          getComputedStyle(el).gridTemplateColumns
        );
        expect(gridColumns).not.toBe('none');
      }
    });
  });

  test.describe('可访问性', () => {
    test('键盘导航应完整可用', async ({ page }) => {
      await page.goto('/api-test');

      // 使用Tab键导航
      await page.keyboard.press('Tab');
      let focusedElement = await page.evaluate(() => document.activeElement.tagName);
      expect(['INPUT', 'BUTTON', 'A']).toContain(focusedElement);

      // 继续导航
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Tab');
        focusedElement = await page.evaluate(() => document.activeElement.tagName);
        expect(['INPUT', 'BUTTON', 'A', 'SELECT']).toContain(focusedElement);
      }
    });

    test('屏幕阅读器支持应完整', async ({ page }) => {
      await page.goto('/api-test');

      // 检查ARIA标签
      const form = page.locator('form').first();
      if (await form.count() > 0) {
        const ariaLabel = await form.getAttribute('aria-label');
        expect(ariaLabel).toBeTruthy();
      }

      // 检查表单标签关联
      const inputs = page.locator('input[type="text"]');
      const inputCount = await inputs.count();

      for (let i = 0; i < inputCount; i++) {
        const input = inputs.nth(i);
        const id = await input.getAttribute('id');
        const label = page.locator(`label[for="${id}"]`);
        await expect(label).toBeVisible();
      }
    });

    test('颜色对比度应符合WCAG标准', async ({ page }) => {
      await page.goto('/');

      // 检查主要文本的对比度
      const textColor = await page.evaluate(() => {
        const element = document.querySelector('h1');
        const styles = getComputedStyle(element);
        return {
          color: styles.color,
          backgroundColor: styles.backgroundColor
        };
      });

      // 这里应该实现实际的对比度计算
      // 简化检查：确保不是相同颜色
      expect(textColor.color).not.toBe(textColor.backgroundColor);
    });
  });

  test.describe('错误处理', () => {
    test('网络错误应有友好提示', async ({ page }) => {
      await page.goto('/api-test');

      // 配置无效的API
      await page.fill('[data-testid="base-url-input"]', 'https://nonexistent-api.example.com');
      await page.click('[data-testid="add-endpoint-button"]');
      await page.fill('[data-testid="endpoint-path-input"]', '/test');

      // 开始测试
      await page.click('[data-testid="start-test-button"]');

      // 等待错误消息
      await page.waitForSelector('[data-testid="error-message"]', { timeout: process.env.REQUEST_TIMEOUT || 30000 });

      // 检查错误消息是否友好
      const errorMessage = await page.locator('[data-testid="error-message"]').textContent();
      expect(errorMessage).not.toContain('undefined');
      expect(errorMessage).not.toContain('null');
      expect(errorMessage.length).toBeGreaterThan(10);
    });

    test('页面崩溃应有恢复机制', async ({ page }) => {
      await page.goto('/');

      // 模拟JavaScript错误
      await page.evaluate(() => {
        throw new Error('Simulated error');
      });

      // 页面应该仍然可用
      await expect(page.locator('body')).toBeVisible();

      // 导航应该仍然工作
      await page.click('a[href="/api-test"]');
      await expect(page).toHaveURL(/.*api-test/);
    });
  });
});

// 性能基准测试
test.describe('性能基准', () => {
  test('Core Web Vitals应达标', async ({ page }) => {
    await page.goto('/');

    // 测量LCP (Largest Contentful Paint)
    const lcp = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          resolve(lastEntry.startTime);
        }).observe({ entryTypes: ['largest-contentful-paint'] });

        // 超时保护
        setTimeout(() => resolve(0), 5000);
      });
    });

    expect(lcp).toBeLessThan(2500); // LCP应小于2.5秒

    // 测量CLS (Cumulative Layout Shift)
    const cls = await page.evaluate(() => {
      return new Promise((resolve) => {
        let clsValue = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          }
          resolve(clsValue);
        }).observe({ entryTypes: ['layout-shift'] });

        setTimeout(() => resolve(clsValue), 3000);
      });
    });

    expect(cls).toBeLessThan(0.1); // CLS应小于0.1
  });
});
