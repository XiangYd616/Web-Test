/**
 * Playwright全局测试拆卸
 * 在所有测试运行后执行的清理
 */

import { chromium, FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
    console.log('🧹 开始E2E测试全局清理...');

    const { baseURL } = config.projects[0].use;

    // 启动浏览器进行清理
    const browser = await chromium.launch();
    const page = await browser.newPage();

    try {
        await page.goto(baseURL || 'http://localhost:5174');

        // 清理测试数据
        await cleanupTestData(page);

        // 清理测试文件
        await cleanupTestFiles();

        console.log('✅ 全局清理完成');

    } catch (error) {
        console.error('❌ 全局清理失败:', error);
    } finally {
        await browser.close();
    }
}

/**
 * 清理测试数据
 */
async function cleanupTestData(page: any) {
    try {
        console.log('🗑️ 清理测试数据...');

        const response = await page.request.post('/api/test/cleanup', {
            data: {
                testUser: 'test@example.com',
                cleanupAll: true,
            },
        });

        if (response.ok()) {
            console.log('✅ 测试数据清理完成');
        }
    } catch (error) {
        console.log('ℹ️ 跳过测试数据清理:', error.message);
    }
}

/**
 * 清理测试文件
 */
async function cleanupTestFiles() {
    try {
        console.log('📁 清理测试文件...');

        const fs = await import('fs/promises');
        const path = await import('path');

        // 清理下载的测试文件
        const downloadsDir = path.join(process.cwd(), 'test-results', 'downloads');

        try {
            await fs.rmdir(downloadsDir, { recursive: true });
            console.log('✅ 测试文件清理完成');
        } catch (error) {
            // 目录可能不存在，忽略错误
        }

    } catch (error) {
        console.log('ℹ️ 跳过测试文件清理:', error.message);
    }
}

export default globalTeardown;