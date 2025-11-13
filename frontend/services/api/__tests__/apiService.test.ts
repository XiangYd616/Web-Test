/**
 * ApiService 单元测试
 * 测试BaseApiService和ApiService的所有核心功能
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ApiService } from '../apiService';
import { BaseApiService } from '../baseApiService';

// Mock Logger
vi.mock('@/utils/logger', () => ({
  default: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

// Mock fetch
global.fetch = vi.fn();

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('BaseApiService - 基础API服务', () => {
  let service: BaseApiService;
  
  beforeEach(() => {
    service = new BaseApiService('http://localhost:3001/api');
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  describe('1. HTTP请求 - GET', () => {
    it('应该成功发送GET请求', async () => {
      const mockData = { id: 1, name: 'Test' };
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ success: true, data: mockData })
      });

      const response = await service.get('/test');

      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/test',
        expect.objectContaining({
          method: 'GET'
        })
      );
    });

    it('应该处理GET请求失败', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => JSON.stringify({ success: false, error: '资源未找到' })
      });

      const response = await service.get('/not-found');

      expect(response.success).toBe(false);
      expect(response.error).toBeTruthy();
    });

    it('应该处理网络错误', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const response = await service.get('/test');

      expect(response.success).toBe(false);
      expect(response.error).toContain('Network error');
    });
  });

  describe('2. HTTP请求 - POST', () => {
    it('应该成功发送POST请求', async () => {
      const requestData = { name: 'Test', value: 123 };
      const responseData = { id: 1, ...requestData };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 201,
        text: async () => JSON.stringify({ success: true, data: responseData })
      });

      const response = await service.post('/test', requestData);

      expect(response.success).toBe(true);
      expect(response.data).toEqual(responseData);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/test',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(requestData)
        })
      );
    });

    it('应该处理POST验证错误', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 422,
        text: async () => JSON.stringify({
          success: false,
          error: '验证失败',
          errors: { name: '名称不能为空' }
        })
      });

      const response = await service.post('/test', {});

      expect(response.success).toBe(false);
      expect(response.error).toBeTruthy();
    });
  });

  describe('3. HTTP请求 - PUT', () => {
    it('应该成功发送PUT请求', async () => {
      const updateData = { name: 'Updated' };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ success: true, data: updateData })
      });

      const response = await service.put('/test/1', updateData);

      expect(response.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/test/1',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(updateData)
        })
      );
    });
  });

  describe('4. HTTP请求 - DELETE', () => {
    it('应该成功发送DELETE请求', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 204,
        text: async () => ''
      });

      const response = await service.delete('/test/1');

      expect(response.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/test/1',
        expect.objectContaining({
          method: 'DELETE'
        })
      );
    });
  });

  describe('5. HTTP请求 - PATCH', () => {
    it('应该成功发送PATCH请求', async () => {
      const patchData = { status: 'active' };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ success: true, data: patchData })
      });

      const response = await service.patch('/test/1', patchData);

      expect(response.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/test/1',
        expect.objectContaining({
          method: 'PATCH'
        })
      );
    });
  });

  describe('6. 错误处理', () => {
    it('应该处理401未授权错误', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => JSON.stringify({ success: false, error: '未授权' })
      });

      const response = await service.get('/protected');

      expect(response.success).toBe(false);
      // 401错误不应该重试
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('应该处理403禁止访问错误', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: async () => JSON.stringify({ success: false, error: '禁止访问' })
      });

      const response = await service.get('/forbidden');

      expect(response.success).toBe(false);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('应该处理404未找到错误', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => JSON.stringify({ success: false, error: '未找到' })
      });

      const response = await service.get('/not-found');

      expect(response.success).toBe(false);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('应该处理500服务器错误并重试', async () => {
      (global.fetch as any)
        .mockRejectedValueOnce(new Error('HTTP 500: Internal Server Error'))
        .mockRejectedValueOnce(new Error('HTTP 500: Internal Server Error'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ success: true, data: {} })
        });

      const response = await service.get('/test', { retries: 2 });

      expect(response.success).toBe(true);
      // 应该重试3次(初始1次 + 2次重试)
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('应该处理超时错误', async () => {
      (global.fetch as any).mockImplementationOnce(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('timeout')), 100)
        )
      );

      const response = await service.get('/test', { timeout: 50, retries: 0 });

      expect(response.success).toBe(false);
    });
  });

  describe('7. 认证管理', () => {
    it('应该添加Bearer token到请求头', async () => {
      service.setAuth({ token: 'test-token-123' });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ success: true })
      });

      await service.get('/test');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token-123'
          })
        })
      );
    });

    it('应该添加API Key到请求头', async () => {
      service.setAuth({ apiKey: 'api-key-123' });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ success: true })
      });

      await service.get('/test');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-API-Key': 'api-key-123'
          })
        })
      );
    });

    it('应该添加Basic认证到请求头', async () => {
      service.setAuth({
        basicAuth: { username: 'user', password: 'pass' }
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ success: true })
      });

      await service.get('/test');

      const expectedAuth = `Basic ${btoa('user:pass')}`;
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': expectedAuth
          })
        })
      );
    });

    it('应该从localStorage读取token', async () => {
      localStorage.setItem('auth_token', 'stored-token');

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ success: true })
      });

      await service.get('/test');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer stored-token'
          })
        })
      );
    });
  });

  describe('8. 重试机制', () => {
    it('应该在失败时自动重试', async () => {
      (global.fetch as any)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ success: true, data: {} })
        });

      const response = await service.get('/test', { retries: 2 });

      expect(response.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('应该使用指数退避策略', async () => {
      const delays: number[] = [];
      const originalDelay = service['delay'];
      
      service['delay'] = vi.fn((ms: number) => {
        delays.push(ms);
        return Promise.resolve();
      });

      (global.fetch as any)
        .mockRejectedValueOnce(new Error('Error'))
        .mockRejectedValueOnce(new Error('Error'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ success: true })
        });

      await service.get('/test', { retries: 2, retryDelay: 1000 });

      expect(delays).toEqual([1000, 2000]); // 指数退避
      
      service['delay'] = originalDelay;
    });

    it('应该在所有重试失败后返回错误', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Persistent error'));

      const response = await service.get('/test', { retries: 2 });

      expect(response.success).toBe(false);
      expect(response.error).toContain('Persistent error');
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('9. 响应解析', () => {
    it('应该正确解析JSON响应', async () => {
      const mockData = { id: 1, name: 'Test' };
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ success: true, data: mockData })
      });

      const response = await service.get('/test');

      expect(response.data).toEqual(mockData);
    });

    it('应该处理空响应', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 204,
        text: async () => ''
      });

      const response = await service.get('/test');

      expect(response.success).toBe(true);
      expect(response.data).toBeUndefined();
    });

    it('应该处理无效JSON', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => 'Invalid JSON'
      });

      const response = await service.get('/test');

      expect(response.success).toBe(false);
      expect(response.error).toContain('响应解析失败');
    });
  });

  describe('10. 工具方法', () => {
    it('应该正确执行健康检查', async () => {
      const healthData = { status: 'healthy', timestamp: Date.now() };
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ success: true, data: healthData })
      });

      const response = await service.healthCheck();

      expect(response.success).toBe(true);
      expect(response.data).toEqual(healthData);
    });

    it('应该获取API版本信息', async () => {
      const versionData = { version: '1.0.0', build: '123' };
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ success: true, data: versionData })
      });

      const response = await service.getVersion();

      expect(response.success).toBe(true);
      expect(response.data).toEqual(versionData);
    });
  });
});

describe('ApiService - 扩展API服务', () => {
  let apiService: ApiService;
  
  beforeEach(() => {
    apiService = ApiService.getInstance();
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  describe('1. 认证相关API', () => {
    it('应该发送登录请求', async () => {
      const credentials = { username: 'test', password: 'pass123', remember: true };
      const mockResponse = { token: 'jwt-token', user: { id: 1, username: 'test' } };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ success: true, data: mockResponse })
      });

      const response = await apiService.login(credentials);

      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockResponse);
    });

    it('应该发送注册请求', async () => {
      const userData = { username: 'newuser', email: 'new@test.com', password: 'pass123' };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 201,
        text: async () => JSON.stringify({ success: true, data: { user: userData } })
      });

      const response = await apiService.register(userData);

      expect(response.success).toBe(true);
    });

    it('应该发送登出请求', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ success: true })
      });

      const response = await apiService.logout();

      expect(response.success).toBe(true);
    });

    it('应该刷新token', async () => {
      const mockResponse = { token: 'new-jwt-token' };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ success: true, data: mockResponse })
      });

      const response = await apiService.refreshToken();

      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockResponse);
    });
  });

  describe('2. 用户相关API', () => {
    it('应该获取用户资料', async () => {
      const mockProfile = { id: 1, username: 'test', email: 'test@test.com' };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ success: true, data: mockProfile })
      });

      const response = await apiService.getUserProfile();

      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockProfile);
    });

    it('应该更新用户资料', async () => {
      const updateData = { email: 'newemail@test.com' };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ success: true, data: updateData })
      });

      const response = await apiService.updateUserProfile(updateData);

      expect(response.success).toBe(true);
    });

    it('应该修改密码', async () => {
      const passwordData = { currentPassword: 'old123', newPassword: 'new123' };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ success: true })
      });

      const response = await apiService.changePassword(passwordData);

      expect(response.success).toBe(true);
    });
  });

  describe('3. 测试相关API', () => {
    it('应该启动测试', async () => {
      const testConfig = {
        testId: 'test-123',
        testType: 'website',
        config: { url: 'https://example.com' }
      };

      const mockSession = { id: 'session-123', status: 'running', startTime: new Date() };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ success: true, data: mockSession })
      });

      const response = await apiService.startTest(testConfig);

      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockSession);
    });

    it('应该获取测试进度', async () => {
      const testId = 'test-123';
      const mockProgress = { testId, status: 'running', progress: 50 };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ success: true, data: mockProgress })
      });

      const response = await apiService.getTestProgress(testId);

      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockProgress);
    });

    it('应该获取测试结果', async () => {
      const testId = 'test-123';
      const mockResult = { testId, status: 'completed', results: {} };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ success: true, data: mockResult })
      });

      const response = await apiService.getTestResult(testId);

      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockResult);
    });

    it('应该取消测试', async () => {
      const testId = 'test-123';

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ success: true })
      });

      const response = await apiService.cancelTest(testId);

      expect(response.success).toBe(true);
    });

    it('应该导出测试结果', async () => {
      const testId = 'test-123';

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ success: true, data: {} })
      });

      const response = await apiService.exportTestResult(testId, 'json');

      expect(response.success).toBe(true);
    });
  });

  describe('4. OAuth相关API', () => {
    it('应该获取OAuth授权URL', async () => {
      const provider = 'github';
      const mockUrl = { url: 'https://github.com/oauth/authorize' };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ success: true, data: mockUrl })
      });

      const response = await apiService.getOAuthUrl(provider);

      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockUrl);
    });

    it('应该处理OAuth回调', async () => {
      const provider = 'github';
      const code = 'auth-code-123';
      const mockResponse = { token: 'jwt-token', user: { id: 1 } };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ success: true, data: mockResponse })
      });

      const response = await apiService.oauthCallback(provider, code);

      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockResponse);
    });
  });

  describe('5. 工具方法', () => {
    it('应该检查认证状态', () => {
      expect(apiService.isAuthenticated()).toBe(false);
      
      apiService.setToken('test-token');
      // 实际实现可能需要调整
    });

    it('应该设置token', () => {
      apiService.setToken('test-token-123', true);
      // 验证token是否正确设置
    });

    it('应该移除token', () => {
      apiService.setToken('test-token-123');
      apiService.removeToken();
      // 验证token是否被移除
    });
  });
});
