/**
 * Playwright全局测试设置
 * 在所有测试运行前执行的设置
 */

import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 开始E2E测试全局设置...');

  const { baseURL } = config.projects[0].use;

  // 启动浏览器进行预检查
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // 检查应用是否可访问
    await page.goto(baseURL || 'http://localhost:5174', {
      waitUntil: 'networkidle',
      timeout: process.env.REQUEST_TIMEOUT || 30000,
    });

    // 等待应用加载完成
    await page.waitForSelector('body', { timeout: 10000 });
    console.log('✅ 应用可访问');

    // 创建测试用户（如果需要）
    await setupTestUser(page);

    // 清理测试数据
    await cleanupTestData(page);

    console.log('✅ 全局设置完成');
  } catch (error) {
    console.error('❌ 全局设置失败:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

/**
 * 设置测试用户
 */
async function setupTestUser(page: any) {
  try {
    // 这里可以调用API创建测试用户
    // 或者确保测试用户存在
    const response = await page.request.post('/api/test/setup-user', {
      data: {
        email: 'test@example.com',
        password: 'password123',
        username: 'testuser',
      },
    });

    if (response.ok()) {
      console.log('✅ 测试用户设置完成');
    }
  } catch (error) {
    console.warn('⚠️ 测试用户设置失败:', error);
  }
}

/**
 * 清理测试数据
 */
async function cleanupTestData(page: any) {
  try {
    // 清理之前的测试数据
    const response = await page.request.post('/api/test/cleanup', {
      data: {
        testUser: 'test@example.com',
      },
    });

    if (response.ok()) {
      console.log('✅ 测试数据清理完成');
    }
  } catch (error) {
    console.warn('⚠️ 测试数据清理失败:', error);
  }
}

export default globalSetup;
