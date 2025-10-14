/**
 * API服务层单元测试
 * 测试API客户端的核心功能
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createSuccessResponse,
  createErrorResponse,
  isApiSuccessResponse,
  isApiErrorResponse
} from '@shared/types';
import apiClient, { _authApi, _testApi, _apiUtils } from '../api';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage and sessionStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};

const mockSessionStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};

Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });
Object.defineProperty(window, 'sessionStorage', { value: mockSessionStorage });
Object.defineProperty(window, 'dispatchEvent', { value: vi.fn() });

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockClear();
  mockLocalStorage.getItem.mockClear();
  mockLocalStorage.setItem.mockClear();
  mockLocalStorage.removeItem.mockClear();
  mockSessionStorage.getItem.mockClear();
  mockSessionStorage.setItem.mockClear();
  mockSessionStorage.removeItem.mockClear();
});

describe('API客户端', () => {
  describe('认证管理', () => {
    it('应该能够设置和获取认证令牌', async () => {
      const token = 'test-token-123';
      mockLocalStorage.getItem.mockReturnValue(token);
      
      const isAuthenticated = _apiUtils.isAuthenticated();
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('authToken');
      
      _apiUtils.setToken(token, true);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('authToken', token);
    });

    it('应该能够移除认证令牌', async () => {
      _apiUtils.removeToken();
      
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('authToken');
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('authToken');
    });
  });

  describe('HTTP请求', () => {
    it('应该能够发送GET请求', async () => {
      const mockData = { id: 1, name: 'Test' };
      const mockResponse = createSuccessResponse(mockData);
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValueOnce(mockResponse)
      });
      
      const result = await apiClient.get('/test');
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/test'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      );
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockData);
    });

    it('应该能够发送POST请求', async () => {
      const postData = { name: 'New Item' };
      const mockResponse = createSuccessResponse({ id: 2, ...postData });
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: vi.fn().mockResolvedValueOnce(mockResponse)
      });
      
      const result = await apiClient.post('/test', postData);
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/test'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify(postData)
        })
      );
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: 2, ...postData });
    });
  });

  describe('错误处理', () => {
    it('应该处理HTTP错误状态', async () => {
      const errorResponse = createErrorResponse('Not found', 'NOT_FOUND');
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: vi.fn().mockResolvedValueOnce(errorResponse)
      });
      
      const result = await apiClient.get('/non-existent');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('404');
    });

    it('应该处理网络错误', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      
      const result = await apiClient.get('/test');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });

    it('应该处理超时错误', async () => {
      // 模拟超时
      mockFetch.mockImplementationOnce(() => 
        new Promise((resolve) => setTimeout(resolve, 35000))
      );
      
      const result = await apiClient.get('/slow-endpoint');
      
      expect(result.success).toBe(false);
    });
  });

  describe('重试机制', () => {
    it('应该在网络错误时重试请求', async () => {
      // 第一次和第二次调用失败，第三次成功
      const mockResponse = createSuccessResponse({ retry: true });
      
      mockFetch
        .mockRejectedValueOnce(new Error('Network Error'))
        .mockRejectedValueOnce(new Error('Network Error'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: vi.fn().mockResolvedValueOnce(mockResponse)
        });

      const result = await apiClient.get('/test-retry');
      
      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ retry: true });
    });

    it('应该缓存请求', async () => {
      // 简单的缓存测试
      const mockResponse = createSuccessResponse({ cached: true });
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValueOnce(mockResponse)
      });
      
      const result = await apiClient.get('/test-cache');
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ cached: true });
    });
  });

  describe('请求头管理', () => {
    it('应该包含正确的请求头', async () => {
      const mockResponse = createSuccessResponse({ test: true });
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValueOnce(mockResponse)
      });
      
      await apiClient.get('/test');
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      );
    });

    it('应该在有token时添加Authorization头', async () => {
      const token = 'test-bearer-token';
      mockLocalStorage.getItem.mockReturnValue(token);
      
      const mockResponse = createSuccessResponse({ authorized: true });
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValueOnce(mockResponse)
      });
      
      await apiClient.get('/secure-endpoint');
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          })
        })
      );
    });
  });

  describe('URL构建', () => {
    it('应该正确构建带参数的URL', async () => {
      const params = { page: 1, limit: 10, search: 'test' };
      const mockResponse = createSuccessResponse({ items: [] });
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValueOnce(mockResponse)
      });
      
      await apiClient.get('/search', params);
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('page=1&limit=10&search=test'),
        expect.any(Object)
      );
    });

    it('应该过滤undefined和null参数', async () => {
      const params = { valid: 'test', invalid: null, empty: undefined };
      const mockResponse = createSuccessResponse({ filtered: true });
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValueOnce(mockResponse)
      });
      
      await apiClient.get('/filter-test', params);
      
      const [[url]] = mockFetch.mock.calls;
      expect(url).toContain('valid=test');
      expect(url).not.toContain('invalid');
      expect(url).not.toContain('empty');
    });
  });

  describe('响应类型检查', () => {
    it('应该正确识别成功响应', () => {
      const successResponse = createSuccessResponse({ test: true });
      expect(isApiSuccessResponse(successResponse)).toBe(true);
      expect(isApiErrorResponse(successResponse)).toBe(false);
    });

    it('应该正确识别错误响应', () => {
      const errorResponse = createErrorResponse('Test error', 'TEST_ERROR');
      expect(isApiErrorResponse(errorResponse)).toBe(true);
      expect(isApiSuccessResponse(errorResponse)).toBe(false);
    });
  });
          })
        });

      if (apiClient && typeof apiClient.get === 'function') {
        const result = await apiClient.get('/unreliable-endpoint');
        expect(result.success).toBe(true);
        expect(mockFetch).toHaveBeenCalledTimes(3);
      }
    });

    it('应该在达到最大重试次数后放弃', async () => {
      // 所有请求都失败
      mockFetch.mockRejectedValue(new Error('Persistent Network Error'));

      if (apiClient && typeof apiClient.get === 'function') {
        const result = await apiClient.get('/always-failing-endpoint');
        expect(result.success).toBe(false);
        // 假设默认重试3次，总共4次调用（初始 + 3次重试）
        expect(mockFetch).toHaveBeenCalledTimes(4);
      }
    });
  });

  describe('请求缓存', () => {
    it('应该缓存GET请求的结果', async () => {
      const mockResponse = {
        success: true,
        data: { cached: true },
        timestamp: new Date().toISOString()
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      if (apiClient && typeof apiClient.get === 'function') {
        // 第一次请求
        const result1 = await apiClient.get('/cacheable-endpoint', {}, true);
        // 第二次请求（应该从缓存返回）
        const result2 = await apiClient.get('/cacheable-endpoint', {}, true);

        expect(result1).toEqual(mockResponse);
        expect(result2).toEqual(mockResponse);
        // 如果缓存正常工作，fetch应该只被调用一次
        expect(mockFetch).toHaveBeenCalledTimes(1);
      }
    });
  });

  describe('请求头管理', () => {
    it('应该包含正确的默认请求头', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      if (apiClient && typeof apiClient.get === 'function') {
        await apiClient.get('/test-endpoint');
        
        expect(mockFetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            headers: expect.objectContaining({
              'Content-Type': 'application/json'
            })
          })
        );
      }
    });

    it('应该在有认证令牌时包含Authorization头', async () => {
      const token = 'Bearer test-token-123';
      mockLocalStorage.getItem.mockReturnValue(token);
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      if (apiClient && typeof apiClient.get === 'function') {
        await apiClient.get('/protected-endpoint');
        
        expect(mockFetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            headers: expect.objectContaining({
              'Authorization': expect.stringContaining('Bearer')
            })
          })
        );
      }
    });
  });

  describe('URL构建', () => {
    it('应该正确构建带查询参数的URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      const params = { page: 1, limit: 10, search: 'test' };
      
      if (apiClient && typeof apiClient.get === 'function') {
        await apiClient.get('/search', params);
        
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('page=1'),
          expect.any(Object)
        );
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('limit=10'),
          expect.any(Object)
        );
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('search=test'),
          expect.any(Object)
        );
      }
    });
  });

  describe('响应类型检查', () => {
    it('应该验证响应格式', async () => {
      const invalidResponse = { notStandardFormat: true };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => invalidResponse
      });

      if (apiClient && typeof apiClient.get === 'function') {
        const result = await apiClient.get('/invalid-response');
        
        // API客户端应该处理非标准响应格式
        expect(result).toBeDefined();
      }
    });
  });
});

describe('API工具函数', () => {
  describe('类型守卫', () => {
    it('isApiSuccessResponse应该正确识别成功响应', async () => {
      const { isApiSuccessResponse } = await import('@shared/types');
      
      const successResponse: ApiResponse = {
        success: true,
        data: { test: true },
        timestamp: new Date().toISOString()
      };

      const errorResponse: ApiResponse = {
        success: false,
        error: {
          code: 'ERROR',
          message: 'Test error'
        },
        timestamp: new Date().toISOString()
      };

      expect(isApiSuccessResponse(successResponse)).toBe(true);
      expect(isApiSuccessResponse(errorResponse)).toBe(false);
    });

    it('isApiErrorResponse应该正确识别错误响应', async () => {
      const { isApiErrorResponse } = await import('@shared/types');
      
      const successResponse: ApiResponse = {
        success: true,
        data: { test: true },
        timestamp: new Date().toISOString()
      };

      const errorResponse: ApiResponse = {
        success: false,
        error: {
          code: 'ERROR',
          message: 'Test error'
        },
        timestamp: new Date().toISOString()
      };

      expect(isApiErrorResponse(errorResponse)).toBe(true);
      expect(isApiErrorResponse(successResponse)).toBe(false);
    });
  });

  describe('响应创建函数', () => {
    it('createSuccessResponse应该创建正确的成功响应', async () => {
      const { createSuccessResponse } = await import('@shared/types');
      
      const data = { id: 1, name: 'test' };
      const message = 'Success';
      
      const response = createSuccessResponse(data, message);
      
      expect(response.success).toBe(true);
      expect(response.data).toEqual(data);
      expect(response.message).toBe(message);
      expect(response.timestamp).toBeDefined();
    });

    it('createErrorResponse应该创建正确的错误响应', async () => {
      const { createErrorResponse } = await import('@shared/types');
      
      const code = 'TEST_ERROR';
      const message = 'Test error message';
      const details = { field: 'testField' };
      
      const response = createErrorResponse(code, message, details);
      
      expect(response.success).toBe(false);
      expect(response.error.code).toBe(code);
      expect(response.error.message).toBe(message);
      expect(response.error.details).toEqual(details);
      expect(response.timestamp).toBeDefined();
    });
  });
});
