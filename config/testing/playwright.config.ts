/**
 * Playwright端到端测试配置
 */

import { defineConfig, devices } from '@playwright/test';

/**
 * 从环境变量读取配置
 */
const baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:5174';

export default defineConfig({
    // 测试目录
    testDir: '../../tools/e2e',

    // 全局测试超时
    timeout: 30 * 1000,

    // 期望超时
    expect: {
        timeout: 5000,
    },

    // 并行运行测试
    fullyParallel: true,

    // 在CI环境中失败时不重试，本地环境重试1次
    retries: process.env.CI ? 2 : 1,

    // 并行工作进程数
    workers: process.env.CI ? 1 : undefined,

    // 报告器配置
    reporter: [
        ['html'],
        ['json', { outputFile: 'test-results/results.json' }],
        ['junit', { outputFile: 'test-results/results.xml' }],
    ],

    // 全局设置
    use: {
        // 基础URL
        baseURL,

        // 浏览器上下文选项
        viewport: { width: 1280, height: 720 },

        // 忽略HTTPS错误
        ignoreHTTPSErrors: true,

        // 截图设置
        screenshot: 'only-on-failure',

        // 视频录制
        video: 'retain-on-failure',

        // 跟踪设置
        trace: 'retain-on-failure',

        // 用户代理
        userAgent: 'Test Web App E2E Tests',
    },

    // 项目配置 - 不同浏览器和设备
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },

        {
            name: 'firefox',
            use: { ...devices['Desktop Firefox'] },
        },

        {
            name: 'webkit',
            use: { ...devices['Desktop Safari'] },
        },

        // 移动端测试
        {
            name: 'Mobile Chrome',
            use: { ...devices['Pixel 5'] },
        },

        {
            name: 'Mobile Safari',
            use: { ...devices['iPhone 12'] },
        },

        // 平板测试
        {
            name: 'Tablet',
            use: { ...devices['iPad Pro'] },
        },
    ],

    // 开发服务器配置
    webServer: {
        command: 'npm run preview',
        port: 5174,
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
    },

    // 输出目录
    outputDir: 'test-results/',

    // 全局设置和拆卸
    globalSetup: require.resolve('../../tools/e2e/global-setup.ts'),
    globalTeardown: require.resolve('../../tools/e2e/global-teardown.ts'),
});