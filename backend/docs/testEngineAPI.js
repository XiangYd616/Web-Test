/**
 * 🔍 测试引擎API文档定义
 * 基于OpenAPI 3.0规范，为测试引擎提供完整的API文档
 */

/**
 * 测试引擎API文档配置
 */
const engineAPIDoc = {
  openapi: '3.0.0',
  info: {
    title: '测试引擎API',
    version: '1.0.0',
    description: '集成多种测试工具的测试执行和结果分析平台',
    contact: {
      name: 'Test-Web团队',
      email: 'support@test-web.com'
    }
  },
  servers: [
    {
      url: 'http://${process.env.BACKEND_HOST || 'localhost'}:${process.env.BACKEND_PORT || 3001}/api/engine',
      description: '开发环境'
    },
    {
      url: 'https://api.test-web.com/engine',
      description: '生产环境'
    }
  ],
  paths: {
    '/test-types': {
      get: {
        summary: '获取支持的测试类型',
        description: '返回测试引擎支持的所有测试类型及其配置信息',
        tags: ['测试类型'],
        responses: {
          200: {
            description: '成功获取测试类型列表',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        testTypes: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/TestType' }
                        },
                        engineVersion: { type: 'string', example: '1.0.0' },
                        totalTypes: { type: 'number', example: 10 }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/execute': {
      post: {
        summary: '执行测试',
        description: '根据配置执行指定类型的测试',
        tags: ['测试执行'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/TestExecutionRequest' }
            }
          }
        },
        responses: {
          200: {
            description: '测试执行成功启动',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        testId: { type: 'string', example: 'performance_1640995200000_abc123' },
                        message: { type: 'string', example: '测试已启动' },
                        estimatedDuration: { type: 'number', example: 30000 }
                      }
                    }
                  }
                }
              }
            }
          },
          400: {
            description: '请求验证失败',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ValidationError' }
              }
            }
          },
          429: {
            description: '请求频率限制',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RateLimitError' }
              }
            }
          }
        }
      }
    },
    '/status/{testId}': {
      get: {
        summary: '获取测试状态',
        description: '获取指定测试的实时状态信息',
        tags: ['测试状态'],
        parameters: [
          {
            name: 'testId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: '测试ID'
          }
        ],
        responses: {
          200: {
            description: '成功获取测试状态',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/TestStatus' }
                  }
                }
              }
            }
          },
          404: {
            description: '测试不存在',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/NotFoundError' }
              }
            }
          }
        }
      }
    },
    '/result/{testId}': {
      get: {
        summary: '获取测试结果',
        description: '获取指定测试的完整结果和分析报告',
        tags: ['测试结果'],
        parameters: [
          {
            name: 'testId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: '测试ID'
          }
        ],
        responses: {
          200: {
            description: '成功获取测试结果',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        result: { $ref: '#/components/schemas/TestResult' }
                      }
                    }
                  }
                }
              }
            }
          },
          404: {
            description: '测试结果不存在'
          }
        }
      }
    },
    '/cancel/{testId}': {
      post: {
        summary: '取消测试',
        description: '取消正在运行的测试',
        tags: ['测试控制'],
        parameters: [
          {
            name: 'testId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: '测试ID'
          }
        ],
        responses: {
          200: {
            description: '测试取消成功',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: '测试已取消' }
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  components: {
    schemas: {
      TestType: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'performance' },
          name: { type: 'string', example: '性能测试' },
          description: { type: 'string', example: '网站性能和Core Web Vitals测试' },
          core: { type: 'string', example: 'performance' },
          methods: {
            type: 'array',
            items: { type: 'string' },
            example: ['getCoreWebVitals', 'analyzePageSpeed']
          },
          dependencies: {
            type: 'array',
            items: { type: 'string' },
            example: ['lighthouse', 'puppeteer']
          }
        }
      },
      TestExecutionRequest: {
        type: 'object',
        required: ['testType', 'config'],
        properties: {
          testType: {
            type: 'string',
            enum: ['performance', 'security', 'api', 'stress', 'database', 'network', 'ux', 'seo', 'compatibility', 'website'],
            example: 'performance'
          },
          config: {
            type: 'object',
            description: '测试配置，根据测试类型而不同',
            example: {
              url: 'https://example.com',
              device: 'desktop',
              throttling: 'simulated3G'
            }
          },
          options: {
            type: 'object',
            properties: {
              testId: { type: 'string', description: '自定义测试ID' },
              priority: { type: 'string', enum: ['low', 'normal', 'high'], default: 'normal' },
              timeout: { type: 'number', minimum: 10000, maximum: 300000 },
              retries: { type: 'number', minimum: 0, maximum: 5, default: 0 },
              tags: {
                type: 'array',
                items: { type: 'string' }
              },
              metadata: { type: 'object' }
            }
          }
        }
      },
      TestStatus: {
        type: 'object',
        properties: {
          testId: { type: 'string', example: 'performance_1640995200000_abc123' },
          status: {
            type: 'string',
            enum: ['pending', 'running', 'completed', 'failed', 'cancelled'],
            example: 'running'
          },
          progress: { type: 'number', minimum: 0, maximum: 100, example: 65 },
          currentStep: { type: 'string', example: '分析页面加载速度...' },
          startTime: { type: 'number', example: 1640995200000 },
          lastUpdate: { type: 'number', example: 1640995230000 },
          error: { type: 'string', description: '错误信息（仅在失败时）' },
          estimatedTimeRemaining: { type: 'number', description: '预计剩余时间（毫秒）' }
        }
      },
      TestResult: {
        type: 'object',
        properties: {
          testId: { type: 'string', example: 'performance_1640995200000_abc123' },
          testType: { type: 'string', example: 'performance' },
          testName: { type: 'string', example: '性能测试' },
          duration: { type: 'number', example: 25000 },
          overallScore: { type: 'number', minimum: 0, maximum: 100, example: 85 },
          results: {
            type: 'object',
            description: '详细测试结果，根据测试类型而不同'
          },
          summary: {
            type: 'object',
            description: '测试结果摘要'
          },
          recommendations: {
            type: 'object',
            properties: {
              immediate: {
                type: 'array',
                items: { type: 'string' },
                description: '需要立即处理的问题'
              },
              shortTerm: {
                type: 'array',
                items: { type: 'string' },
                description: '短期优化建议'
              },
              longTerm: {
                type: 'array',
                items: { type: 'string' },
                description: '长期规划建议'
              },
              priority: {
                type: 'string',
                enum: ['low', 'medium', 'high'],
                example: 'medium'
              }
            }
          },
          timestamp: { type: 'string', format: 'date-time' }
        }
      },
      ValidationError: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: { type: 'string', example: '请求验证失败' },
          details: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: { type: 'string', example: 'config.url' },
                message: { type: 'string', example: '请输入有效的URL地址' },
                value: { type: 'string', example: 'invalid-url' },
                allowedValues: {
                  type: 'array',
                  items: { type: 'string' }
                }
              }
            }
          }
        }
      },
      RateLimitError: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: { type: 'string', example: '测试执行频率限制' },
          message: { type: 'string', example: '测试请求过于频繁，请稍后再试' },
          details: {
            type: 'object',
            properties: {
              userType: { type: 'string', example: 'standard' },
              testType: { type: 'string', example: 'performance' },
              currentUsage: { type: 'number', example: 15 },
              limit: { type: 'number', example: 20 },
              resetTime: { type: 'string', format: 'date-time' },
              retryAfter: { type: 'number', example: 180 }
            }
          },
          upgradeHint: { type: 'string', example: '升级到高级用户可获得更高的测试限额' }
        }
      },
      NotFoundError: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: { type: 'string', example: '测试不存在' },
          message: { type: 'string', example: '指定的测试ID不存在或已过期' }
        }
      }
    },
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    }
  },
  tags: [
    {
      name: '测试类型',
      description: '测试类型管理和查询'
    },
    {
      name: '测试执行',
      description: '测试执行和控制'
    },
    {
      name: '测试状态',
      description: '测试状态查询和监控'
    },
    {
      name: '测试结果',
      description: '测试结果获取和分析'
    },
    {
      name: '测试控制',
      description: '测试控制和管理'
    }
  ]
};

/**
 * 测试配置示例
 */
const configExamples = {
  performance: {
    url: 'https://example.com',
    device: 'desktop',
    locale: 'zh-CN',
    throttling: 'simulated3G',
    categories: ['performance', 'accessibility'],
    checkCoreWebVitals: true,
    checkPageSpeed: true,
    checkResources: true,
    checkCaching: true
  },
  security: {
    url: 'https://example.com',
    checkSSL: true,
    checkHeaders: true,
    checkVulnerabilities: true,
    checkCookies: true,
    scanDepth: 3,
    timeout: process.env.REQUEST_TIMEOUT || 30000
  },
  api: {
    baseUrl: 'https://api.example.com',
    endpoints: [
      {
        id: 'getUserInfo',
        name: '获取用户信息',
        method: 'GET',
        path: '/users/1',
        expectedStatus: [200],
        maxResponseTime: 1000
      }
    ],
    timeout: 10000,
    retries: 3,
    authentication: {
      type: 'bearer',
      token: 'your-jwt-token'
    }
  },
  stress: {
    url: 'https://example.com',
    users: 100,
    duration: 300,
    testType: 'load',
    rampUpTime: 10,
    timeout: 10000
  },
  database: {
    connectionString: 'mongodb://localhost:27017/testdb',
    testType: 'comprehensive',
    timeout: process.env.REQUEST_TIMEOUT || 30000,
    maxConnections: 10,
    includePerformanceTests: true,
    includeSecurityTests: true
  },
  network: {
    url: 'https://example.com',
    testType: 'comprehensive',
    timeout: 10000,
    checkDNS: true,
    checkCDN: true,
    checkLatency: true
  }
};

/**
 * WebSocket事件文档
 */
const webSocketEvents = {
  connection: {
    description: '客户端连接到统一测试引擎WebSocket',
    url: 'ws://${process.env.BACKEND_HOST || 'localhost'}:${process.env.BACKEND_PORT || 3001}/unified-engine',
    events: {
      engineStatus: {
        description: '引擎状态更新',
        data: {
          isOnline: true,
          version: '1.0.0',
          activeTests: 5,
          totalResults: 150,
          uptime: 86400000
        }
      },
      testProgress: {
        description: '测试进度更新',
        data: {
          testId: 'performance_1640995200000_abc123',
          progress: 65,
          currentStep: '分析页面加载速度...',
          lastUpdate: 1640995230000
        }
      },
      testCompleted: {
        description: '测试完成通知',
        data: {
          testId: 'performance_1640995200000_abc123',
          result: '完整的测试结果对象'
        }
      },
      testFailed: {
        description: '测试失败通知',
        data: {
          testId: 'performance_1640995200000_abc123',
          error: '测试执行失败的原因'
        }
      }
    },
    clientEvents: {
      subscribeTest: {
        description: '订阅测试更新',
        data: {
          testId: 'performance_1640995200000_abc123'
        }
      },
      unsubscribeTest: {
        description: '取消订阅测试更新',
        data: {
          testId: 'performance_1640995200000_abc123'
        }
      },
      getEngineStatus: {
        description: '请求引擎状态',
        data: {}
      },
      ping: {
        description: '心跳检测',
        data: {
          timestamp: 1640995200000
        }
      }
    }
  }
};

/**
 * 错误代码说明
 */
const errorCodes = {
  'VALIDATION_FAILED': '请求验证失败',
  'UNSUPPORTED_TEST_TYPE': '不支持的测试类型',
  'RATE_LIMIT_EXCEEDED': '请求频率超限',
  'TEST_NOT_FOUND': '测试不存在',
  'ENGINE_UNAVAILABLE': '测试引擎不可用',
  'INSUFFICIENT_PERMISSIONS': '权限不足',
  'CONFIGURATION_ERROR': '配置错误',
  'EXECUTION_TIMEOUT': '执行超时',
  'RESOURCE_EXHAUSTED': '资源耗尽'
};

/**
 * 使用示例
 */
const usageExamples = {
  javascript: {
    executeTest: `
// 执行性能测试
const response = await fetch('/api/unified-engine/execute', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-jwt-token'
  },
  body: JSON.stringify({
    testType: 'performance',
    config: {
      url: 'https://example.com',
      device: 'desktop',
      throttling: 'simulated3G'
    },
    options: {
      priority: 'normal',
      tags: ['performance', 'web']
    }
  })
});

const result = await response.json();
console.log('测试ID:', result.data.testId);
    `,
    webSocket: `
// WebSocket连接
const ws = new WebSocket('ws://${process.env.BACKEND_HOST || 'localhost'}:${process.env.BACKEND_PORT || 3001}/unified-engine');

ws.onopen = () => {
  console.log('连接到统一测试引擎');
  
  // 订阅测试更新
  ws.send(JSON.stringify({
    type: 'subscribeTest',
    testId: 'your-test-id'
  }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  switch (message.type) {
    case 'testProgress':
      console.log('测试进度:', message.data.progress + '%');
      break;
    case 'testCompleted':
      console.log('测试完成:', message.data.result);
      break;
    case 'testFailed':
      console.error('测试失败:', message.data.error);
      break;
  }
};
    `
  },
  curl: {
    executeTest: `
# 执行性能测试
curl -X POST http://${process.env.BACKEND_HOST || 'localhost'}:${process.env.BACKEND_PORT || 3001}/api/unified-engine/execute \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer your-jwt-token" \\
  -d '{
    "testType": "performance",
    "config": {
      "url": "https://example.com",
      "device": "desktop"
    }
  }'
    `,
    getStatus: `
# 获取测试状态
curl -X GET http://${process.env.BACKEND_HOST || 'localhost'}:${process.env.BACKEND_PORT || 3001}/api/engine/status/your-test-id \\
  -H "Authorization: Bearer your-jwt-token"
    `
  }
};

module.exports = {
  engineAPIDoc,
  configExamples,
  webSocketEvents,
  errorCodes,
  usageExamples
};
