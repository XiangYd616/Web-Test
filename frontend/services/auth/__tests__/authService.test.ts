/**
 * authService 单元测试
 * 测试AuthService的所有核心功能
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LoginCredentials, RegisterData } from '../../../types/auth.types';
import { UserRole, UserStatus } from '../../../types/enums';
import { AuthService } from '../authService';

// Mock dependencies
vi.mock('@/utils/logger', () => ({
  default: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../utils/browserJwt', () => ({
  browserJwt: {
    isTokenValid: vi.fn(() => true),
    createToken: vi.fn(payload => `mock.jwt.${JSON.stringify(payload)}`),
    decodeToken: vi.fn(token => {
      const parts = token.split('.');
      return parts.length >= 2 ? JSON.parse(parts[2]) : null;
    }),
  },
}));

vi.mock('../../utils/environment', () => ({
  canUseDatabase: false,
}));

vi.mock('jwt-decode', () => ({
  jwtDecode: vi.fn((token: string) => {
    const parts = token.split('.');
    return parts.length >= 2 ? JSON.parse(parts[2]) : null;
  }),
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });
Object.defineProperty(window, 'sessionStorage', { value: localStorageMock });

// Mock fetch
global.fetch = vi.fn();

describe('AuthService - 认证服务', () => {
  let authService: AuthService;

  beforeEach(() => {
    // 清理localStorage
    localStorageMock.clear();

    // 重置fetch mock
    vi.clearAllMocks();

    // 创建新的authService实例
    authService = new AuthService({
      enableDeviceFingerprinting: false,
      enableSecureStorage: false,
      enableSessionTracking: false,
    });
  });

  afterEach(() => {
    // 清理
    authService.destroy();
  });

  describe('1. 登录功能', () => {
    const validCredentials: LoginCredentials = {
      email: 'test@example.com',
      password: 'password123',
      rememberMe: false,
    };

    it('应该成功登录系统管理员', async () => {
      const credentials: LoginCredentials = {
        email: 'admin',
        password: 'password123',
        rememberMe: false,
      };

      const response = await authService.login(credentials);

      expect(response.success).toBe(true);
      expect(response.user).toBeDefined();
      expect(response.user?.username).toBe('admin');
      expect(response.user?.role).toBe(UserRole.ADMIN);
      expect(response.token).toBeDefined();
      expect(response.refreshToken).toBeDefined();
    });

    it('应该通过API成功登录普通用户', async () => {
      const mockUser = {
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        role: UserRole.TESTER,
        status: UserStatus.ACTIVE,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            user: mockUser,
            token: 'server.jwt.token',
          },
        }),
      });

      const response = await authService.login(validCredentials);

      expect(response.success).toBe(true);
      expect(response.user).toEqual(mockUser);
      expect(response.token).toBe('server.jwt.token');
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/auth/login',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            email: validCredentials.email,
            identifier: validCredentials.email,
            password: validCredentials.password,
          }),
        })
      );
    });

    it('应该拒绝错误的凭证', async () => {
      const invalidCredentials: LoginCredentials = {
        email: 'wrong@example.com',
        password: 'wrongpassword',
        rememberMe: false,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: '用户名或密码错误',
        }),
      });

      const response = await authService.login(invalidCredentials);

      expect(response.success).toBe(false);
      expect(response.message).toBeTruthy();
      expect(response.errors).toBeDefined();
    });

    it('应该拒绝被禁用的账户', async () => {
      const mockUser = {
        id: 'user-123',
        username: 'disabled',
        email: 'disabled@example.com',
        role: UserRole.TESTER,
        status: 'inactive', // 被禁用的状态
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            user: mockUser,
            token: 'server.jwt.token',
          },
        }),
      });

      const response = await authService.login(validCredentials);

      expect(response.success).toBe(false);
      expect(response.message).toContain('禁用');
    });

    it('应该处理网络错误', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      // 系统用户应该成功（fallback机制）
      const credentials: LoginCredentials = {
        email: 'admin',
        password: 'password123',
        rememberMe: false,
      };

      const response = await authService.login(credentials);
      expect(response.success).toBe(true);
    });

    it('应该正确保存rememberMe状态', async () => {
      const credentials: LoginCredentials = {
        email: 'admin',
        password: 'password123',
        rememberMe: true,
      };

      await authService.login(credentials);

      expect(localStorage.getItem('test_web_app_token')).toBeTruthy();
      expect(localStorage.getItem('test_web_app_user')).toBeTruthy();
    });
  });

  describe('2. 注册功能', () => {
    const validRegisterData: RegisterData = {
      username: 'newuser',
      email: 'newuser@example.com',
      fullName: 'New User',
      password: 'password123',
      confirmPassword: 'password123',
      acceptTerms: true,
    };

    it('应该成功注册新用户', async () => {
      const mockUser = {
        id: 'user-new',
        username: validRegisterData.username,
        email: validRegisterData.email,
        role: UserRole.TESTER,
        status: UserStatus.ACTIVE,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            user: mockUser,
            token: 'new.jwt.token',
          },
        }),
      });

      const response = await authService.register(validRegisterData);

      expect(response.success).toBe(true);
      expect(response.user).toEqual(mockUser);
      expect(response.token).toBe('new.jwt.token');
    });

    it('应该验证用户名长度', async () => {
      const invalidData: RegisterData = {
        ...validRegisterData,
        username: 'ab', // 少于3个字符
      };

      const response = await authService.register(invalidData);

      expect(response.success).toBe(false);
      expect(response.errors?.username).toContain('至少需要3个字符');
    });

    it('应该验证邮箱格式', async () => {
      const invalidData: RegisterData = {
        ...validRegisterData,
        email: 'invalid-email',
      };

      const response = await authService.register(invalidData);

      expect(response.success).toBe(false);
      expect(response.errors?.email).toContain('有效的邮箱地址');
    });

    it('应该验证密码长度', async () => {
      const invalidData: RegisterData = {
        ...validRegisterData,
        password: '12345', // 少于6个字符
        confirmPassword: '12345',
      };

      const response = await authService.register(invalidData);

      expect(response.success).toBe(false);
      expect(response.errors?.password).toContain('至少需要6个字符');
    });

    it('应该验证密码确认匹配', async () => {
      const invalidData: RegisterData = {
        ...validRegisterData,
        password: 'password123',
        confirmPassword: 'different',
      };

      const response = await authService.register(invalidData);

      expect(response.success).toBe(false);
      expect(response.errors?.confirmPassword).toContain('密码不一致');
    });

    it('应该处理重复用户', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: '用户已存在',
        }),
      });

      const response = await authService.register(validRegisterData);

      expect(response.success).toBe(false);
      expect(response.message).toContain('用户已存在');
    });
  });

  describe('3. Token管理', () => {
    beforeEach(async () => {
      // 先登录获取token
      const credentials: LoginCredentials = {
        email: 'admin',
        password: 'password123',
        rememberMe: true,
      };
      await authService.login(credentials);
    });

    it('应该正确存储token', () => {
      const token = localStorage.getItem('test_web_app_token');
      const refreshToken = localStorage.getItem('test_web_app_refresh_token');

      expect(token).toBeTruthy();
      expect(refreshToken).toBeTruthy();
    });

    it('应该获取当前访问token', () => {
      const token = authService.getAccessToken();
      expect(token).toBeTruthy();
    });

    it('应该获取刷新token', () => {
      const refreshToken = authService.getRefreshTokenFromPair();
      expect(refreshToken).toBeTruthy();
    });

    it('应该检测token是否过期', () => {
      const token = authService.getAccessToken();
      if (token) {
        const isExpired = authService.isTokenExpired(token);
        expect(typeof isExpired).toBe('boolean');
      }
    });

    it('应该从token中获取用户信息', () => {
      const userInfo = authService.getUserFromToken();

      if (userInfo) {
        expect(userInfo.username).toBe('admin');
        expect(userInfo.email).toBe('admin@testweb.com');
        expect(userInfo.role).toBe(UserRole.ADMIN);
      }
    });

    it('应该清除token', async () => {
      await authService.clearTokenPair();

      expect(localStorage.getItem('auth_token_pair')).toBeNull();
    });
  });

  describe('4. 用户状态管理', () => {
    it('应该获取当前用户', async () => {
      await authService.login({
        email: 'admin',
        password: 'password123',
        rememberMe: false,
      });

      const currentUser = authService.getCurrentUser();
      expect(currentUser).toBeDefined();
      expect(currentUser?.username).toBe('admin');
    });

    it('应该检查认证状态', async () => {
      expect(authService.isAuthenticated()).toBe(false);

      await authService.login({
        email: 'admin',
        password: 'password123',
        rememberMe: false,
      });

      expect(authService.isAuthenticated()).toBe(true);
    });

    it('应该检查用户角色', async () => {
      await authService.login({
        email: 'admin',
        password: 'password123',
        rememberMe: false,
      });

      expect(authService.hasRole(UserRole.ADMIN)).toBe(true);
      expect(authService.hasRole(UserRole.TESTER)).toBe(false);
    });
  });

  describe('5. 登出功能', () => {
    beforeEach(async () => {
      await authService.login({
        email: 'admin',
        password: 'password123',
        rememberMe: true,
      });
    });

    it('应该成功登出', async () => {
      await authService.logout();

      expect(authService.isAuthenticated()).toBe(false);
      expect(authService.getCurrentUser()).toBeNull();
      expect(localStorage.getItem('test_web_app_token')).toBeNull();
      expect(localStorage.getItem('test_web_app_user')).toBeNull();
    });

    it('应该清除所有存储的认证数据', async () => {
      await authService.logout();

      expect(localStorage.getItem('test_web_app_token')).toBeNull();
      expect(localStorage.getItem('test_web_app_refresh_token')).toBeNull();
      expect(sessionStorage.getItem('test_web_app_token')).toBeNull();
    });
  });

  describe('6. 认证状态监听', () => {
    it('应该触发认证状态变化回调', async () => {
      const listener = vi.fn();
      const unsubscribe = authService.onAuthStateChange(listener);

      await authService.login({
        email: 'admin',
        password: 'password123',
        rememberMe: false,
      });

      expect(listener).toHaveBeenCalled();
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({ username: 'admin' }));

      unsubscribe();
    });

    it('应该正确取消监听', async () => {
      const listener = vi.fn();
      const unsubscribe = authService.onAuthStateChange(listener);

      unsubscribe();

      await authService.login({
        email: 'admin',
        password: 'password123',
        rememberMe: false,
      });

      // 取消监听后不应该被调用
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('7. 密码管理', () => {
    beforeEach(async () => {
      // 先登录
      await authService.login({
        email: 'admin',
        password: 'password123',
        rememberMe: false,
      });
    });

    it('应该验证密码强度', () => {
      const weakPassword = '123456';
      const strongPassword = 'StrongP@ss123!';

      const weakResult = authService.validatePasswordStrength(weakPassword);
      const strongResult = authService.validatePasswordStrength(strongPassword);

      expect(weakResult.isValid).toBe(false);
      expect(strongResult.score).toBeGreaterThan(weakResult.score);
    });

    it('应该生成强密码建议', () => {
      const password = authService.generatePasswordSuggestion(16);

      expect(password).toBeTruthy();
      expect(password.length).toBe(16);
    });

    it('应该检测常见密码', () => {
      expect(authService.isCommonPassword('password')).toBe(true);
      expect(authService.isCommonPassword('123456')).toBe(true);
      expect(authService.isCommonPassword('ComplexP@ss789!')).toBe(false);
    });
  });

  describe('8. 环境检测', () => {
    it('应该返回正确的环境信息', () => {
      const envInfo = authService.getEnvironmentInfo();

      expect(envInfo).toHaveProperty('isElectron');
      expect(envInfo).toHaveProperty('isBrowser');
      expect(envInfo).toHaveProperty('isNode');
      expect(envInfo).toHaveProperty('hasDatabase');
      expect(typeof envInfo.isBrowser).toBe('boolean');
    });
  });

  describe('9. 企业级功能', () => {
    it('应该获取增强配置', () => {
      const config = authService.getServiceConfig();

      expect(config).toHaveProperty('enableDeviceFingerprinting');
      expect(config).toHaveProperty('enableSecureStorage');
      expect(config).toHaveProperty('accessTokenExpiry');
    });

    it('应该更新增强配置', () => {
      authService.updateServiceConfig({
        accessTokenExpiry: 1800,
      });

      const config = authService.getServiceConfig();
      expect(config.accessTokenExpiry).toBe(1800);
    });
  });

  describe('10. 错误处理', () => {
    it('应该处理网络超时', async () => {
      (global.fetch as any).mockImplementationOnce(
        () => new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 100))
      );

      // 系统用户fallback应该工作
      const response = await authService.login({
        email: 'admin',
        password: 'password123',
        rememberMe: false,
      });

      expect(response.success).toBe(true);
    });

    it('应该处理API错误响应', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          success: false,
          error: '服务器错误',
        }),
      });

      const response = await authService.login({
        email: 'test@example.com',
        password: 'password123',
        rememberMe: false,
      });

      expect(response.success).toBe(false);
    });
  });

  describe('11. 资源清理', () => {
    it('应该正确清理资源', async () => {
      await authService.destroy();

      // 验证清理后的状态
      expect(() => authService.destroy()).not.toThrow();
    });
  });
});
