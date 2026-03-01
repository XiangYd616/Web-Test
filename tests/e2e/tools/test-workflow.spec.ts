/**
 * 端到端测试 - 完整测试工作流程
 * 测试用户从登录到执行测试的完整流程
 */

import { expect, test } from '@playwright/test';

test.describe('完整测试工作流程', () => {
    test.beforeEach(async ({ page }) => {
        // 访问应用首页
        await page.goto('/');
    });

    test('用户登录并执行压力测试', async ({ page }) => {
        // 1. 用户登录
        await test.step('用户登录', async () => {
            await page.click('[data-testid=login-button]');
            await page.fill('[data-testid=email-input]', 'test@example.com');
            await page.fill('[data-testid=password-input]', 'password123');
            await page.click('[data-testid=submit-login]');

            // 验证登录成功
            await expect(page.locator('[data-testid=user-menu]')).toBeVisible();
        });

        // 2. 导航到压力测试页面
        await test.step('导航到压力测试', async () => {
            await page.click('[data-testid=nav-stress-test]');
            await expect(page).toHaveURL(/.*\/stress-test/);
            await expect(page.locator('h1')).toContainText('压力测试');
        });

        // 3. 配置测试参数
        await test.step('配置测试参数', async () => {
            await page.fill('[data-testid=target-url]', 'https://example.com');
            await page.fill('[data-testid=duration]', '60');
            await page.fill('[data-testid=concurrency]', '10');

            // 选择测试模板
            await page.selectOption('[data-testid=test-template]', 'light-load');
        });

        // 4. 启动测试
        await test.step('启动测试', async () => {
            await page.click('[data-testid=start-test]');

            // 验证测试开始
            await expect(page.locator('[data-testid=test-status]')).toContainText('运行中');
            await expect(page.locator('[data-testid=progress-bar]')).toBeVisible();
        });

        // 5. 等待测试完成
        await test.step('等待测试完成', async () => {
            // 等待测试状态变为完成（最多等待2分钟）
            await expect(page.locator('[data-testid=test-status]')).toContainText('已完成', {
                timeout: 120000,
            });
        });

        // 6. 查看测试结果
        await test.step('查看测试结果', async () => {
            // 验证结果显示
            await expect(page.locator('[data-testid=test-results]')).toBeVisible();
            await expect(page.locator('[data-testid=total-requests]')).toBeVisible();
            await expect(page.locator('[data-testid=success-rate]')).toBeVisible();
            await expect(page.locator('[data-testid=response-time]')).toBeVisible();

            // 验证图表显示
            await expect(page.locator('[data-testid=performance-chart]')).toBeVisible();
        });

        // 7. 导出测试结果
        await test.step('导出测试结果', async () => {
            await page.click('[data-testid=export-results]');
            await page.selectOption('[data-testid=export-format]', 'pdf');

            // 开始下载
            const downloadPromise = page.waitForEvent('download');
            await page.click('[data-testid=confirm-export]');
            const download = await downloadPromise;

            // 验证下载文件
            expect(download.suggestedFilename()).toMatch(/stress-test-results.*\.pdf/);
        });
    });

    test('用户执行SEO测试', async ({ page }) => {
        // 登录
        await page.click('[data-testid=login-button]');
        await page.fill('[data-testid=email-input]', 'test@example.com');
        await page.fill('[data-testid=password-input]', 'password123');
        await page.click('[data-testid=submit-login]');

        // 导航到SEO测试
        await page.click('[data-testid=nav-seo-test]');
        await expect(page).toHaveURL(/.*\/seo-test/);

        // 输入测试URL
        await page.fill('[data-testid=target-url]', 'https://example.com');

        // 启动SEO测试
        await page.click('[data-testid=start-seo-test]');

        // 等待测试完成
        await expect(page.locator('[data-testid=seo-results]')).toBeVisible({
            timeout: 60000,
        });

        // 验证SEO结果
        await expect(page.locator('[data-testid=seo-score]')).toBeVisible();
        await expect(page.locator('[data-testid=title-analysis]')).toBeVisible();
        await expect(page.locator('[data-testid=meta-analysis]')).toBeVisible();
        await expect(page.locator('[data-testid=heading-analysis]')).toBeVisible();
    });

    test('用户查看测试历史', async ({ page }) => {
        // 登录
        await page.click('[data-testid=login-button]');
        await page.fill('[data-testid=email-input]', 'test@example.com');
        await page.fill('[data-testid=password-input]', 'password123');
        await page.click('[data-testid=submit-login]');

        // 导航到测试历史
        await page.click('[data-testid=nav-test-history]');
        await expect(page).toHaveURL(/.*\/test-history/);

        // 验证历史记录表格
        await expect(page.locator('[data-testid=history-table]')).toBeVisible();

        // 测试筛选功能
        await page.selectOption('[data-testid=test-type-filter]', 'stress');
        await expect(page.locator('[data-testid=history-table] tbody tr')).toHaveCount(1);

        // 测试分页
        if (await page.locator('[data-testid=pagination]').isVisible()) {
            await page.click('[data-testid=next-page]');
            await expect(page.locator('[data-testid=current-page]')).toContainText('2');
        }

        // 查看详细结果
        await page.click('[data-testid=view-details]:first-child');
        await expect(page.locator('[data-testid=test-detail-modal]')).toBeVisible();

        // 关闭详情模态框
        await page.click('[data-testid=close-modal]');
        await expect(page.locator('[data-testid=test-detail-modal]')).not.toBeVisible();
    });

    test('用户管理监控目标', async ({ page }) => {
        // 登录
        await page.click('[data-testid=login-button]');
        await page.fill('[data-testid=email-input]', 'test@example.com');
        await page.fill('[data-testid=password-input]', 'password123');
        await page.click('[data-testid=submit-login]');

        // 导航到监控页面
        await page.click('[data-testid=nav-monitoring]');
        await expect(page).toHaveURL(/.*\/monitoring/);

        // 添加新的监控目标
        await page.click('[data-testid=add-monitor-target]');
        await page.fill('[data-testid=target-name]', '测试网站');
        await page.fill('[data-testid=target-url]', 'https://example.com');
        await page.fill('[data-testid=check-interval]', '300');
        await page.click('[data-testid=save-target]');

        // 验证目标已添加
        await expect(page.locator('[data-testid=monitor-targets-list]')).toContainText('测试网站');

        // 启用监控
        await page.click('[data-testid=enable-monitoring]:last-child');
        await expect(page.locator('[data-testid=monitor-status]:last-child')).toContainText('运行中');

        // 查看监控图表
        await expect(page.locator('[data-testid=monitoring-chart]')).toBeVisible();
    });

    test('错误处理和用户反馈', async ({ page }) => {
        // 测试无效URL的处理
        await page.goto('/stress-test');

        // 输入无效URL
        await page.fill('[data-testid=target-url]', 'invalid-url');
        await page.click('[data-testid=start-test]');

        // 验证错误提示
        await expect(page.locator('[data-testid=error-message]')).toContainText('请输入有效的URL');

        // 测试网络错误处理
        // 模拟网络断开
        await page.route('**/api/**', route => route.abort());

        await page.fill('[data-testid=target-url]', 'https://example.com');
        await page.click('[data-testid=start-test]');

        // 验证网络错误提示
        await expect(page.locator('[data-testid=network-error]')).toBeVisible();
        await expect(page.locator('[data-testid=retry-button]')).toBeVisible();
    });
});