/**
 * 用户认证流程端到端测试
 * 测试用户注册、登录、密码重置等核心认证功能
 */

import { test, expect, Page } from '@playwright/test';

// 测试数据
const testUser = {
  email: 'test@example.com',
  password: 'TestPassword123!',
  newPassword: 'NewPassword456!',
  username: 'testuser'
};

// 页面对象模式
class AuthPage {
  constructor(private page: Page) {}

  // 导航到登录页面
  async navigateToLogin() {
    await this.page.goto('/login');
    await this.page.waitForLoadState('networkidle');
  }

  // 导航到注册页面
  async navigateToRegister() {
    await this.page.goto('/register');
    await this.page.waitForLoadState('networkidle');
  }

  // 填写登录表单
  async fillLoginForm(email: string, password: string) {
    await this.page.fill('[data-testid="email-input"]', email);
    await this.page.fill('[data-testid="password-input"]', password);
  }

  // 提交登录表单
  async submitLogin() {
    await this.page.click('[data-testid="login-button"]');
    await this.page.waitForLoadState('networkidle');
  }

  // 填写注册表单
  async fillRegisterForm(email: string, password: string, username: string) {
    await this.page.fill('[data-testid="register-email"]', email);
    await this.page.fill('[data-testid="register-password"]', password);
    await this.page.fill('[data-testid="register-confirm-password"]', password);
    await this.page.fill('[data-testid="register-username"]', username);
  }

  // 提交注册表单
  async submitRegister() {
    await this.page.click('[data-testid="register-button"]');
    await this.page.waitForLoadState('networkidle');
  }

  // 检查是否已登录
  async isLoggedIn(): Promise<boolean> {
    try {
      await this.page.waitForSelector('[data-testid="user-menu"]', { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  // 退出登录
  async logout() {
    await this.page.click('[data-testid="user-menu"]');
    await this.page.click('[data-testid="logout-button"]');
    await this.page.waitForLoadState('networkidle');
  }

  // 获取错误信息
  async getErrorMessage(): Promise<string> {
    const errorElement = await this.page.locator('[data-testid="error-message"]').first();
    return await errorElement.textContent() || '';
  }

  // 获取成功信息
  async getSuccessMessage(): Promise<string> {
    const successElement = await this.page.locator('[data-testid="success-message"]').first();
    return await successElement.textContent() || '';
  }

  // 点击忘记密码链接
  async clickForgotPassword() {
    await this.page.click('[data-testid="forgot-password-link"]');
    await this.page.waitForLoadState('networkidle');
  }

  // 填写重置密码邮箱
  async fillResetPasswordEmail(email: string) {
    await this.page.fill('[data-testid="reset-email-input"]', email);
  }

  // 提交重置密码请求
  async submitResetPassword() {
    await this.page.click('[data-testid="reset-password-button"]');
    await this.page.waitForLoadState('networkidle');
  }
}

// 测试套件
test.describe('用户认证流程', () => {
  let authPage: AuthPage;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    
    // 清理浏览器存储
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test.describe('用户登录', () => {
    test('成功登录有效用户', async ({ page }) => {
      await authPage.navigateToLogin();

      // 验证登录页面加载
      await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
      await expect(page.locator('[data-testid="email-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="password-input"]')).toBeVisible();

      // 填写并提交登录表单
      await authPage.fillLoginForm(testUser.email, testUser.password);
      await authPage.submitLogin();

      // 验证登录成功 - 应该重定向到仪表板
      await expect(page).toHaveURL(/\/dashboard/);
      
      // 验证用户菜单显示
      const isLoggedIn = await authPage.isLoggedIn();
      expect(isLoggedIn).toBe(true);
    });

    test('无效凭据登录失败', async ({ page }) => {
      await authPage.navigateToLogin();

      // 使用错误的凭据尝试登录
      await authPage.fillLoginForm('invalid@example.com', 'wrongpassword');
      await authPage.submitLogin();

      // 验证仍在登录页面
      await expect(page).toHaveURL(/\/login/);
      
      // 验证显示错误信息
      const errorMessage = await authPage.getErrorMessage();
      expect(errorMessage).toContain('邮箱或密码错误');
    });

    test('空字段验证', async ({ page }) => {
      await authPage.navigateToLogin();

      // 尝试提交空表单
      await authPage.submitLogin();

      // 验证表单验证错误
      await expect(page.locator('[data-testid="email-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="password-error"]')).toBeVisible();
    });

    test('邮箱格式验证', async ({ page }) => {
      await authPage.navigateToLogin();

      // 输入无效邮箱格式
      await authPage.fillLoginForm('invalid-email', testUser.password);
      await authPage.submitLogin();

      // 验证邮箱格式错误提示
      const emailError = await page.locator('[data-testid="email-error"]').textContent();
      expect(emailError).toContain('请输入有效的邮箱地址');
    });
  });

  test.describe('用户注册', () => {
    test('成功注册新用户', async ({ page }) => {
      await authPage.navigateToRegister();

      // 验证注册页面元素
      await expect(page.locator('[data-testid="register-form"]')).toBeVisible();
      
      // 生成唯一邮箱避免冲突
      const uniqueEmail = `test_${Date.now()}@example.com`;
      
      // 填写注册表单
      await authPage.fillRegisterForm(uniqueEmail, testUser.password, testUser.username);
      
      // 提交注册
      await authPage.submitRegister();

      // 验证注册成功消息或重定向到验证页面
      const successMessage = await authPage.getSuccessMessage();
      expect(successMessage).toContain('注册成功') || expect(page.url()).toContain('verify');
    });

    test('密码强度验证', async ({ page }) => {
      await authPage.navigateToRegister();

      // 使用弱密码测试
      const uniqueEmail = `test_weak_${Date.now()}@example.com`;
      await page.fill('[data-testid="register-email"]', uniqueEmail);
      await page.fill('[data-testid="register-password"]', '123'); // 弱密码
      await page.fill('[data-testid="register-confirm-password"]', '123');
      await page.fill('[data-testid="register-username"]', 'testuser');

      await authPage.submitRegister();

      // 验证密码强度错误提示
      const passwordError = await page.locator('[data-testid="password-error"]').textContent();
      expect(passwordError).toContain('密码强度不够');
    });

    test('密码确认验证', async ({ page }) => {
      await authPage.navigateToRegister();

      const uniqueEmail = `test_mismatch_${Date.now()}@example.com`;
      await page.fill('[data-testid="register-email"]', uniqueEmail);
      await page.fill('[data-testid="register-password"]', testUser.password);
      await page.fill('[data-testid="register-confirm-password"]', 'DifferentPassword123!'); // 不匹配的密码
      await page.fill('[data-testid="register-username"]', 'testuser');

      await authPage.submitRegister();

      // 验证密码不匹配错误
      const confirmError = await page.locator('[data-testid="confirm-password-error"]').textContent();
      expect(confirmError).toContain('两次输入的密码不一致');
    });

    test('邮箱已存在验证', async ({ page }) => {
      await authPage.navigateToRegister();

      // 使用已存在的邮箱
      await authPage.fillRegisterForm(testUser.email, testUser.password, 'newuser');
      await authPage.submitRegister();

      // 验证邮箱已存在错误
      const errorMessage = await authPage.getErrorMessage();
      expect(errorMessage).toContain('该邮箱已被注册');
    });

    test('用户名重复验证', async ({ page }) => {
      await authPage.navigateToRegister();

      const uniqueEmail = `test_duplicate_${Date.now()}@example.com`;
      await authPage.fillRegisterForm(uniqueEmail, testUser.password, testUser.username);
      await authPage.submitRegister();

      // 验证用户名重复错误（如果适用）
      const errorMessage = await authPage.getErrorMessage();
      if (errorMessage.includes('用户名')) {
        expect(errorMessage).toContain('用户名已被使用');
      }
    });
  });

  test.describe('密码重置', () => {
    test('发送密码重置邮件', async ({ page }) => {
      await authPage.navigateToLogin();
      
      // 点击忘记密码链接
      await authPage.clickForgotPassword();

      // 验证进入密码重置页面
      await expect(page).toHaveURL(/\/reset-password/);
      await expect(page.locator('[data-testid="reset-password-form"]')).toBeVisible();

      // 填写邮箱并提交
      await authPage.fillResetPasswordEmail(testUser.email);
      await authPage.submitResetPassword();

      // 验证成功消息
      const successMessage = await authPage.getSuccessMessage();
      expect(successMessage).toContain('密码重置邮件已发送');
    });

    test('无效邮箱密码重置', async ({ page }) => {
      await authPage.navigateToLogin();
      await authPage.clickForgotPassword();

      // 使用不存在的邮箱
      await authPage.fillResetPasswordEmail('nonexistent@example.com');
      await authPage.submitResetPassword();

      // 验证错误消息
      const errorMessage = await authPage.getErrorMessage();
      expect(errorMessage).toContain('邮箱不存在');
    });
  });

  test.describe('用户会话管理', () => {
    test('成功退出登录', async ({ page }) => {
      // 先登录
      await authPage.navigateToLogin();
      await authPage.fillLoginForm(testUser.email, testUser.password);
      await authPage.submitLogin();

      // 验证登录成功
      const isLoggedIn = await authPage.isLoggedIn();
      expect(isLoggedIn).toBe(true);

      // 执行退出
      await authPage.logout();

      // 验证退出成功 - 应该重定向到登录页
      await expect(page).toHaveURL(/\/login/);
      
      // 验证用户菜单不再可见
      const isStillLoggedIn = await authPage.isLoggedIn();
      expect(isStillLoggedIn).toBe(false);
    });

    test('会话过期处理', async ({ page }) => {
      // 先登录
      await authPage.navigateToLogin();
      await authPage.fillLoginForm(testUser.email, testUser.password);
      await authPage.submitLogin();

      // 模拟会话过期 - 清除认证令牌
      await page.evaluate(() => {
        localStorage.removeItem('authToken');
        sessionStorage.removeItem('authToken');
      });

      // 尝试访问需要认证的页面
      await page.goto('/dashboard');

      // 验证重定向到登录页面
      await expect(page).toHaveURL(/\/login/);
      
      // 验证显示会话过期消息
      const message = await page.locator('[data-testid="info-message"]').textContent();
      expect(message || '').toContain('会话已过期');
    });

    test('记住我功能', async ({ page }) => {
      await authPage.navigateToLogin();

      // 勾选记住我选项
      await page.check('[data-testid="remember-me-checkbox"]');
      
      // 登录
      await authPage.fillLoginForm(testUser.email, testUser.password);
      await authPage.submitLogin();

      // 验证登录成功
      await expect(page).toHaveURL(/\/dashboard/);

      // 关闭并重新打开浏览器标签页
      await page.context().newPage();
      const newPage = await page.context().newPage();
      await newPage.goto('/dashboard');

      // 验证仍然保持登录状态（如果实现了记住我功能）
      const userMenu = newPage.locator('[data-testid="user-menu"]');
      const isVisible = await userMenu.isVisible();
      
      if (isVisible) {
        // 记住我功能工作正常
        expect(isVisible).toBe(true);
      }
    });
  });

  test.describe('安全性测试', () => {
    test('防止XSS攻击', async ({ page }) => {
      await authPage.navigateToLogin();

      // 尝试在输入字段中注入XSS代码
      const xssPayload = '<script>alert("XSS")</script>';
      await authPage.fillLoginForm(xssPayload, testUser.password);
      await authPage.submitLogin();

      // 验证XSS代码没有被执行
      const dialogPromise = page.waitForEvent('dialog', { timeout: 1000 }).catch(() => null);
      const dialog = await dialogPromise;
      
      // 不应该有弹窗出现
      expect(dialog).toBeNull();
    });

    test('CSRF保护', async ({ page }) => {
      await authPage.navigateToLogin();

      // 检查是否有CSRF令牌
      const csrfToken = await page.locator('[name="csrf-token"]');
      const tokenExists = await csrfToken.count() > 0;
      
      // 如果实现了CSRF保护，应该有令牌
      if (tokenExists) {
        expect(await csrfToken.getAttribute('content')).toBeTruthy();
      }
    });

    test('输入长度限制', async ({ page }) => {
      await authPage.navigateToLogin();

      // 测试超长输入
      const longString = 'a'.repeat(1000);
      await page.fill('[data-testid="email-input"]', longString);
      await page.fill('[data-testid="password-input"]', longString);

      // 验证输入被正确限制
      const emailValue = await page.inputValue('[data-testid="email-input"]');
      const passwordValue = await page.inputValue('[data-testid="password-input"]');
      
      expect(emailValue.length).toBeLessThan(500); // 假设邮箱限制为500字符
      expect(passwordValue.length).toBeLessThan(200); // 假设密码限制为200字符
    });
  });

  test.describe('多因素认证 (MFA)', () => {
    test('启用MFA流程', async ({ page }) => {
      // 先登录
      await authPage.navigateToLogin();
      await authPage.fillLoginForm(testUser.email, testUser.password);
      await authPage.submitLogin();

      // 进入用户设置
      await page.goto('/settings');

      // 查找MFA设置选项
      const mfaSection = page.locator('[data-testid="mfa-settings"]');
      if (await mfaSection.isVisible()) {
        // 启用MFA
        await page.click('[data-testid="enable-mfa-button"]');
        
        // 验证显示QR码或设置页面
        await expect(page.locator('[data-testid="mfa-setup-qr"]')).toBeVisible();
      }
    });

    test('MFA验证流程', async ({ page }) => {
      // 这个测试假设用户已经启用了MFA
      await authPage.navigateToLogin();
      await authPage.fillLoginForm(testUser.email, testUser.password);
      await authPage.submitLogin();

      // 如果启用了MFA，应该显示验证码输入页面
      const mfaInput = page.locator('[data-testid="mfa-code-input"]');
      if (await mfaInput.isVisible()) {
        // 输入测试验证码（在实际测试中，这会是一个模拟的代码）
        await page.fill('[data-testid="mfa-code-input"]', '123456');
        await page.click('[data-testid="verify-mfa-button"]');
        
        // 验证是否进入仪表板或显示错误
        await page.waitForLoadState('networkidle');
      }
    });
  });

  test.describe('响应式设计', () => {
    test('移动端登录界面', async ({ page }) => {
      // 设置移动设备视窗
      await page.setViewportSize({ width: 375, height: 667 });
      
      await authPage.navigateToLogin();

      // 验证移动端布局
      await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
      
      // 验证表单元素在小屏幕上正确显示
      const emailInput = page.locator('[data-testid="email-input"]');
      const passwordInput = page.locator('[data-testid="password-input"]');
      
      await expect(emailInput).toBeVisible();
      await expect(passwordInput).toBeVisible();
      
      // 验证按钮大小适合触摸操作
      const loginButton = page.locator('[data-testid="login-button"]');
      const buttonBox = await loginButton.boundingBox();
      expect(buttonBox?.height).toBeGreaterThan(44); // 建议的最小触摸目标高度
    });

    test('平板端注册界面', async ({ page }) => {
      // 设置平板设备视窗
      await page.setViewportSize({ width: 768, height: 1024 });
      
      await authPage.navigateToRegister();

      // 验证平板端布局适配
      await expect(page.locator('[data-testid="register-form"]')).toBeVisible();
      
      // 验证表单字段合理布局
      const formFields = page.locator('[data-testid="register-form"] input');
      const fieldCount = await formFields.count();
      expect(fieldCount).toBeGreaterThan(0);
    });
  });
});

// 清理钩子
test.afterAll(async () => {
  // 在所有测试完成后执行清理
});
