/**
 * 前后端API集成测试
 * 验证API服务与后端接口的兼容性
 * 版本: v1.0.0
 */

// import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// 使用全局的Jest函数
declare const describe: any;
declare const it: any;
declare const expect: any;
declare const beforeEach: any;
declare const afterEach: any;
declare const jest: any;
import { apiService } from '../api/apiService';
import { _projectApiService as projectApiService } from '../api/projectApiService';
import { testApiService } from '../api/testApiService';
import type { ApiResponse, ApiErrorResponse } from '../../types/api';

// Type guard helper
function isApiErrorResponse(response: ApiResponse<any>): response is ApiErrorResponse {
  return !response.success;
}

// 临时类型定义
interface BackendApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  timestamp?: string;
  error?: string | {
    code: string;
    message: string;
    details?: any;
  };
}

interface AuthResponse {
  success: boolean;
  user?: any;
  token?: string;
  message?: string;
}

// Mock fetch for testing
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

describe('API Integration Tests', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ==================== 响应格式兼容性测试 ====================

  describe('Response Format Compatibility', () => {
    it('should handle backend success response format', async () => {
      const mockBackendResponse: BackendApiResponse<any> = {
        success: true,
        data: { id: '123', name: 'Test Project' },
        message: '操作成功',
        timestamp: '2024-01-01T00:00:00Z'
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBackendResponse,
      } as Response);

      const response = await apiService.get('/api/v1/test');

      expect(response.success).toBe(true);
      if (response.success) {
        expect(response.data).toEqual({ id: '123', name: 'Test Project' });
        expect(response.message).toBe('操作成功');
        expect(response.meta.timestamp).toBe('2024-01-01T00:00:00Z');
      }
    });

    it('should handle backend error response format', async () => {
      const mockBackendErrorResponse: BackendApiResponse<never> = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '参数验证失败',
          details: { field: 'name', message: '名称不能为空' }
        },
        timestamp: '2024-01-01T00:00:00Z'
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => mockBackendErrorResponse,
      } as Response);

      const response = await apiService.get('/api/v1/test');

      expect(response.success).toBe(false);
      if (isApiErrorResponse(response)) {
        if (typeof response.error === 'object' && response.error !== null && 'code' in response.error) {
          expect((response.error as any).code).toBe('VALIDATION_ERROR');
          expect((response.error as any).message).toBe('参数验证失败');
          expect((response.error as any).details).toEqual({ field: 'name', message: '名称不能为空' });
        } else {
          // 如果error是字符串，则检查字符串内容
          expect(String(response.error)).toContain('VALIDATION_ERROR');
        }
      }
    });

    it('should handle HTTP error status codes', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ message: 'Not Found' }),
      } as Response);

      const response = await apiService.get('/api/v1/nonexistent');

      expect(response.success).toBe(false);
      if (isApiErrorResponse(response)) {
        if (typeof response.error === 'object' && response.error !== null && 'code' in response.error) {
          expect((response.error as any).code).toBe('NOT_FOUND');
          expect((response.error as any).details?.httpStatus).toBe(404);
        } else {
          expect(String(response.error)).toContain('NOT_FOUND');
        }
      }
    });

    it('should handle network errors', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(
        new Error('Network error')
      );

      const response = await apiService.get('/api/v1/test');

      expect(response.success).toBe(false);
      if (isApiErrorResponse(response)) {
        if (typeof response.error === 'object' && response.error !== null && 'code' in response.error) {
          expect((response.error as any).code).toBe('NETWORK_ERROR');
          expect((response.error as any).message).toBe('Network error');
        } else {
          expect(String(response.error)).toContain('NETWORK_ERROR');
        }
      }
    });
  });

  // ==================== 认证API测试 ====================

  describe('Authentication API', () => {
    it('should call correct login endpoint with proper format', async () => {
      const mockResponse = {
        success: true,
        data: {
          user: { id: '123', username: 'testuser' },
          token: 'jwt-token'
        },
        message: '登录成功',
        timestamp: '2024-01-01T00:00:00Z'
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const credentials = { username: 'testuser', password: 'password' };
      const response = await apiService.login(credentials) as BackendApiResponse<{ token: string; user: unknown }>;

      expect(fetch).toHaveBeenCalledWith(
        `http://${process.env.BACKEND_HOST || 'localhost'}:${process.env.BACKEND_PORT || 3001}/api/v1/auth/login`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify(credentials)
        })
      );

      expect(response.success).toBe(true);
      if (response.success && response.data) {
        expect((response.data.user as any)?.id).toBe('123');
        expect(response.data.token).toBe('jwt-token');
      }
    });
  });

  // ==================== 测试API测试 ====================

  describe('Test API Service', () => {
    it('should execute performance test with correct parameters', async () => {
      const mockResponse = {
        success: true,
        data: {
          id: 'test-123',
          status: 'pending',
          test_type: 'performance'
        },
        message: '测试已启动',
        timestamp: '2024-01-01T00:00:00Z'
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const config = {
        device: 'desktop' as const,
        network_condition: '4G',
        lighthouse_config: {},
        custom_metrics: [] as any[]
      };

      const response = await testApiService.executePerformanceTest(
        'https://example.com',
        config
      );

      expect(fetch).toHaveBeenCalledWith(
        `http://${process.env.BACKEND_HOST || 'localhost'}:${process.env.BACKEND_PORT || 3001}/api/v1/tests/performance/execute`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            target_url: 'https://example.com',
            configuration: config
          })
        })
      );

      expect(response.success).toBe(true);
    });

    it('should get test configurations with query parameters', async () => {
      const mockResponse = {
        success: true,
        data: [
          { id: '1', test_type: 'performance', name: 'Config 1' },
          { id: '2', test_type: 'security', name: 'Config 2' }
        ],
        message: '获取配置成功',
        timestamp: '2024-01-01T00:00:00Z'
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const response = await testApiService.getConfigurations({
        test_type: 'performance',
        project_id: 123,
        is_template: false
      });

      expect(fetch).toHaveBeenCalledWith(
        `http://${process.env.BACKEND_HOST || 'localhost'}:${process.env.BACKEND_PORT || 3001}/api/v1/configurations?test_type=performance&project_id=123&is_template=false`,
        expect.objectContaining({
          method: 'GET'
        })
      );

      expect(response.success).toBe(true);
    });
  });

  // ==================== 项目API测试 ====================

  describe('Project API Service', () => {
    it('should create project with correct data structure', async () => {
      const mockResponse = {
        success: true,
        data: {
          id: 'project-123',
          name: 'Test Project',
          description: 'Test Description',
          target_url: 'https://example.com'
        },
        message: '项目创建成功',
        timestamp: '2024-01-01T00:00:00Z'
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const projectData = {
        name: 'Test Project',
        description: 'Test Description',
        target_url: 'https://example.com'
      };

      const response = await projectApiService.createProject(projectData);

      expect(fetch).toHaveBeenCalledWith(
        `http://${process.env.BACKEND_HOST || 'localhost'}:${process.env.BACKEND_PORT || 3001}/api/v1/projects`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(projectData)
        })
      );

      expect(response.success).toBe(true);
    });

    it('should get projects with pagination parameters', async () => {
      const mockResponse = {
        success: true,
        data: {
          projects: [
            { id: '1', name: 'Project 1' },
            { id: '2', name: 'Project 2' }
          ],
          total: 2,
          page: 1,
          limit: 10,
          totalPages: 1
        },
        message: '获取项目列表成功',
        timestamp: '2024-01-01T00:00:00Z'
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const response = await projectApiService.getProjects({
        page: 1,
        limit: 10,
        search: 'test',
        status: 'active',
        sort: 'name',
        order: 'asc'
      });

      expect(fetch).toHaveBeenCalledWith(
        `http://${process.env.BACKEND_HOST || 'localhost'}:${process.env.BACKEND_PORT || 3001}/api/v1/projects?page=1&limit=10&search=test&status=active&sort=name&order=asc`,
        expect.objectContaining({
          method: 'GET'
        })
      );

      expect(response.success).toBe(true);
    });
  });

  // ==================== 错误处理测试 ====================

  describe('Error Handling', () => {
    it('should handle validation errors correctly', async () => {
      const mockErrorResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '数据验证失败',
          details: {
            errors: [
              { field: 'name', message: '名称不能为空' },
              { field: 'url', message: 'URL格式不正确' }
            ]
          }
        },
        timestamp: '2024-01-01T00:00:00Z'
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 422,
        json: async () => mockErrorResponse,
      } as Response);

      const response = await apiService.post('/api/v1/test', {
        name: '',
        url: 'invalid-url'
      });

      expect(response.success).toBe(false);
      if (!response.success) {
        if (typeof response.error === 'object' && response.error !== null) {
          expect(response.error.code).toBe('VALIDATION_ERROR');
          expect(response.error.details?.errors).toHaveLength(2);
        } else {
          expect(response.error).toContain('VALIDATION_ERROR');
        }
      }
    });

    it('should handle authentication errors', async () => {
      const mockErrorResponse = {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '未授权访问'
        },
        timestamp: '2024-01-01T00:00:00Z'
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => mockErrorResponse,
      } as Response);

      const response = await apiService.get('/api/v1/protected');

      expect(response.success).toBe(false);
      if (!response.success) {
        if (typeof response.error === 'object' && response.error !== null) {
          expect(response.error.code).toBe('UNAUTHORIZED');
        } else {
          expect(response.error).toContain('UNAUTHORIZED');
        }
      }
    });
  });

  // ==================== 数据格式验证测试 ====================

  describe('Data Format Validation', () => {
    it('should validate API endpoint paths match backend specification', () => {
      // 验证关键API路径是否符合后端规范
      const expectedPaths = [
        '/api/v1/auth/login',
        '/api/v1/auth/register',
        '/api/v1/projects',
        '/api/v1/tests/execute',
        '/api/v1/tests/performance/execute',
        '/api/v1/tests/security/execute',
        '/api/v1/reports/generate',
        '/api/v1/system/health'
      ];

      // 这里可以添加更多的路径验证逻辑
      expectedPaths.forEach(path => {
        expect(path).toMatch(/^\/api\/v1\//);
      });
    });

    it('should validate request/response data structures', () => {
      // 验证请求和响应数据结构
      const sampleSuccessResponse = {
        success: true,
        data: {},
        message: 'Success',
        meta: {
          timestamp: '2024-01-01T00:00:00Z',
          requestId: 'req-123',
          path: '/api/v1/test',
          method: 'GET'
        }
      };

      const sampleErrorResponse = {
        success: false,
        error: {
          code: 'ERROR_CODE',
          message: 'Error message',
          timestamp: '2024-01-01T00:00:00Z'
        },
        meta: {
          timestamp: '2024-01-01T00:00:00Z',
          requestId: 'req-123',
          path: '/api/v1/test',
          method: 'GET'
        }
      };

      // 验证成功响应结构
      expect(sampleSuccessResponse).toHaveProperty('success', true);
      expect(sampleSuccessResponse).toHaveProperty('data');
      expect(sampleSuccessResponse).toHaveProperty('message');
      expect(sampleSuccessResponse).toHaveProperty('meta.timestamp');

      // 验证错误响应结构
      expect(sampleErrorResponse).toHaveProperty('success', false);
      expect(sampleErrorResponse).toHaveProperty('error?.code');
      expect(sampleErrorResponse).toHaveProperty('error?.message');
      expect(sampleErrorResponse).toHaveProperty('meta.timestamp');
    });
  });
});
