/**
 * API测试引擎单元测试
 * @description 测试API端点测试、性能分析等核心功能
 */

const ApiTestEngine = require('../apiTestEngine');
const http = require('http');
const https = require('https');

// Mock模块
jest.mock('http');
jest.mock('https');

describe('API测试引擎', () => {
  let apiEngine;

  beforeEach(() => {
    apiEngine = new ApiTestEngine();
    jest.clearAllMocks();
  });

  describe('引擎初始化', () => {
    test('应该正确初始化引擎属性', () => {
      expect(apiEngine.name).toBe('api');
      expect(apiEngine.version).toBe('2.0.0');
      expect(apiEngine.description).toBe('API端点测试引擎');
      expect(apiEngine.options.timeout).toBeDefined();
    });
  });

  describe('可用性检查', () => {
    test('应该返回引擎可用状态', () => {
      const availability = apiEngine.checkAvailability();
      
      expect(availability.available).toBe(true);
      expect(availability.version).toBe('2.0.0');
      expect(availability.features).toContain('api-testing');
      expect(availability.features).toContain('endpoint-analysis');
      expect(availability.features).toContain('performance-testing');
    });
  });

  describe('HTTP请求测试', () => {
    test('应该成功发送GET请求', async () => {
      const mockResponse = {
        statusCode: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ success: true })
      };

      // Mock HTTP请求
      const mockRequest = {
        on: jest.fn(),
        end: jest.fn()
      };

      https.request = jest.fn((options, callback) => {
        setTimeout(() => {
          const mockRes = {
            statusCode: 200,
            headers: { 'content-type': 'application/json' },
            on: jest.fn((event, handler) => {
              if (event === 'data') {
                handler(Buffer.from('{"success":true}'));
              } else if (event === 'end') {
                handler();
              }
            })
          };
          callback(mockRes);
        }, 0);
        return mockRequest;
      });

      const result = await apiEngine.testSingleEndpoint({
        url: 'https://api.example.com/users',
        method: 'GET'
      });

      expect(result).toBeDefined();
      expect(result.summary.success).toBe(true);
      expect(result.summary.statusCode).toBe(200);
      expect(result.responseTime).toBeDefined();
    });

    test('应该支持POST请求', async () => {
      const mockRequest = {
        on: jest.fn(),
        end: jest.fn(),
        write: jest.fn()
      };

      https.request = jest.fn((options, callback) => {
        setTimeout(() => {
          const mockRes = {
            statusCode: 201,
            headers: { 'content-type': 'application/json' },
            on: jest.fn((event, handler) => {
              if (event === 'data') {
                handler(Buffer.from('{"id":123}'));
              } else if (event === 'end') {
                handler();
              }
            })
          };
          callback(mockRes);
        }, 0);
        return mockRequest;
      });

      const result = await apiEngine.testSingleEndpoint({
        url: 'https://api.example.com/users',
        method: 'POST',
        body: { name: 'John' }
      });

      expect(result).toBeDefined();
      expect(result.method).toBe('POST');
      expect(result.summary.statusCode).toBe(201);
    });

    test('应该处理请求超时', async () => {
      const mockRequest = {
        on: jest.fn((event, handler) => {
          if (event === 'timeout') {
            setTimeout(() => handler(), 0);
          }
        }),
        end: jest.fn(),
        destroy: jest.fn()
      };

      https.request = jest.fn(() => mockRequest);

      const result = await apiEngine.testSingleEndpoint({
        url: 'https://api.example.com/slow',
        method: 'GET'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('响应分析', () => {
    test('应该分析JSON响应', () => {
      const response = {
        statusCode: 200,
        headers: { 'content-type': 'application/json' },
        body: '{"users":[{"id":1,"name":"John"}]}'
      };

      const analysis = apiEngine.analyzeResponse(response, 150);

      expect(analysis.contentType).toBe('application/json');
      expect(analysis.statusCode).toBe(200);
      expect(analysis.isJSON).toBe(true);
      expect(analysis.bodySize).toBeGreaterThan(0);
    });

    test('应该检测错误状态码', () => {
      const response = {
        statusCode: 404,
        headers: {},
        body: 'Not Found'
      };

      const analysis = apiEngine.analyzeResponse(response, 100);

      expect(analysis.statusCode).toBe(404);
      expect(analysis.success).toBe(false);
    });

    test('应该分析响应时间', () => {
      const response = {
        statusCode: 200,
        headers: {},
        body: '{}'
      };

      const analysis = apiEngine.analyzeResponse(response, 2500);

      expect(analysis.performance).toBeDefined();
      expect(analysis.performance.rating).toBe('slow');
    });
  });

  describe('多端点测试', () => {
    test('应该测试多个端点', async () => {
      // Mock所有请求成功
      const mockRequest = {
        on: jest.fn(),
        end: jest.fn()
      };

      https.request = jest.fn((options, callback) => {
        setTimeout(() => {
          const mockRes = {
            statusCode: 200,
            headers: { 'content-type': 'application/json' },
            on: jest.fn((event, handler) => {
              if (event === 'data') {
                handler(Buffer.from('{"ok":true}'));
              } else if (event === 'end') {
                handler();
              }
            })
          };
          callback(mockRes);
        }, 0);
        return mockRequest;
      });

      const endpoints = [
        { url: 'https://api.example.com/users', method: 'GET' },
        { url: 'https://api.example.com/posts', method: 'GET' },
        { url: 'https://api.example.com/comments', method: 'GET' }
      ];

      const result = await apiEngine.testMultipleEndpoints(endpoints);

      expect(result).toBeDefined();
      expect(result.totalEndpoints).toBe(3);
      expect(result.results).toHaveLength(3);
      expect(result.summary).toBeDefined();
      expect(result.totalTime).toBeDefined();
    });

    test('应该生成批量测试摘要', async () => {
      const mockResults = [
        { summary: { success: true, responseTime: '100ms' } },
        { summary: { success: true, responseTime: '150ms' } },
        { summary: { success: false, error: 'Timeout' } }
      ];

      const summary = apiEngine.calculateSummary(mockResults);

      expect(summary.total).toBe(3);
      expect(summary.successful).toBe(2);
      expect(summary.failed).toBe(1);
      expect(summary.successRate).toBeDefined();
    });
  });

  describe('性能指标', () => {
    test('应该测量响应时间', async () => {
      const mockRequest = {
        on: jest.fn(),
        end: jest.fn()
      };

      https.request = jest.fn((options, callback) => {
        setTimeout(() => {
          const mockRes = {
            statusCode: 200,
            headers: {},
            on: jest.fn((event, handler) => {
              if (event === 'data') {
                handler(Buffer.from('test'));
              } else if (event === 'end') {
                handler();
              }
            })
          };
          callback(mockRes);
        }, 100); // 模拟100ms延迟
        return mockRequest;
      });

      const result = await apiEngine.testSingleEndpoint({
        url: 'https://api.example.com/test',
        method: 'GET'
      });

      expect(result.responseTime).toBeGreaterThan(0);
      expect(result.responseTime).toBeLessThan(1000);
    });
  });

  describe('错误处理', () => {
    test('应该处理网络错误', async () => {
      const mockRequest = {
        on: jest.fn((event, handler) => {
          if (event === 'error') {
            setTimeout(() => handler(new Error('Network error')), 0);
          }
        }),
        end: jest.fn()
      };

      https.request = jest.fn(() => mockRequest);

      const result = await apiEngine.testSingleEndpoint({
        url: 'https://api.example.com/error',
        method: 'GET'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('应该处理DNS解析失败', async () => {
      const mockRequest = {
        on: jest.fn((event, handler) => {
          if (event === 'error') {
            setTimeout(() => handler(new Error('ENOTFOUND')), 0);
          }
        }),
        end: jest.fn()
      };

      https.request = jest.fn(() => mockRequest);

      const result = await apiEngine.testSingleEndpoint({
        url: 'https://nonexistent-domain-12345.com/api',
        method: 'GET'
      });

      expect(result.success).toBe(false);
      expect(result.recommendations).toBeDefined();
      expect(result.recommendations).toContain('检查URL是否正确');
    });
  });

  describe('HTTP方法支持', () => {
    test('应该支持DELETE方法', async () => {
      const mockRequest = {
        on: jest.fn(),
        end: jest.fn()
      };

      https.request = jest.fn((options, callback) => {
        expect(options.method).toBe('DELETE');
        setTimeout(() => {
          const mockRes = {
            statusCode: 204,
            headers: {},
            on: jest.fn((event, handler) => {
              if (event === 'end') {
                handler();
              }
            })
          };
          callback(mockRes);
        }, 0);
        return mockRequest;
      });

      const result = await apiEngine.testSingleEndpoint({
        url: 'https://api.example.com/users/123',
        method: 'DELETE'
      });

      expect(result.summary.statusCode).toBe(204);
    });

    test('应该支持PUT方法', async () => {
      const mockRequest = {
        on: jest.fn(),
        end: jest.fn(),
        write: jest.fn()
      };

      https.request = jest.fn((options, callback) => {
        expect(options.method).toBe('PUT');
        setTimeout(() => {
          const mockRes = {
            statusCode: 200,
            headers: {},
            on: jest.fn((event, handler) => {
              if (event === 'data') {
                handler(Buffer.from('{"updated":true}'));
              } else if (event === 'end') {
                handler();
              }
            })
          };
          callback(mockRes);
        }, 0);
        return mockRequest;
      });

      const result = await apiEngine.testSingleEndpoint({
        url: 'https://api.example.com/users/123',
        method: 'PUT',
        body: { name: 'Jane' }
      });

      expect(result.summary.statusCode).toBe(200);
    });
  });

  describe('请求头处理', () => {
    test('应该设置自定义请求头', async () => {
      const customHeaders = {
        'Authorization': 'Bearer token123',
        'X-Custom-Header': 'custom-value'
      };

      const mockRequest = {
        on: jest.fn(),
        end: jest.fn()
      };

      https.request = jest.fn((options, callback) => {
        expect(options.headers['Authorization']).toBe('Bearer token123');
        expect(options.headers['X-Custom-Header']).toBe('custom-value');
        
        setTimeout(() => {
          const mockRes = {
            statusCode: 200,
            headers: {},
            on: jest.fn((event, handler) => {
              if (event === 'end') {
                handler();
              }
            })
          };
          callback(mockRes);
        }, 0);
        return mockRequest;
      });

      await apiEngine.testSingleEndpoint({
        url: 'https://api.example.com/protected',
        method: 'GET',
        headers: customHeaders
      });
    });
  });

  describe('优化建议生成', () => {
    test('应该为慢速响应生成建议', () => {
      const analysis = {
        responseTime: 3000,
        statusCode: 200
      };

      const recommendations = apiEngine.generateRecommendations(analysis, 3000);

      expect(recommendations).toBeDefined();
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.some(r => r.includes('响应时间'))).toBe(true);
    });

    test('应该为错误状态码生成建议', () => {
      const analysis = {
        statusCode: 500,
        responseTime: 200
      };

      const recommendations = apiEngine.generateRecommendations(analysis, 200);

      expect(recommendations).toBeDefined();
      expect(recommendations.some(r => r.includes('500') || r.includes('服务器'))).toBe(true);
    });
  });

  describe('完整测试执行', () => {
    test('应该返回标准化的测试结果', async () => {
      const mockRequest = {
        on: jest.fn(),
        end: jest.fn()
      };

      https.request = jest.fn((options, callback) => {
        setTimeout(() => {
          const mockRes = {
            statusCode: 200,
            headers: { 'content-type': 'application/json' },
            on: jest.fn((event, handler) => {
              if (event === 'data') {
                handler(Buffer.from('{"ok":true}'));
              } else if (event === 'end') {
                handler();
              }
            })
          };
          callback(mockRes);
        }, 0);
        return mockRequest;
      });

      const result = await apiEngine.executeTest({
        url: 'https://api.example.com/test',
        method: 'GET'
      });

      expect(result.engine).toBe('api');
      expect(result.version).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.results).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });
  });
});

