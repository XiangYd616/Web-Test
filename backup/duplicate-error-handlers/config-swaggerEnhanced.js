/**
 * 增强的Swagger API文档配置
 * @description 提供完整的API文档，包含详细的请求/响应示例
 */

const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// API文档基本信息
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Test Web App API',
    version: '1.0.0',
    description: `
# 🚀 Test Web App API 文档

企业级网站测试平台的完整API文档。

## 🌟 主要特性

- **RESTful API设计** - 遵循REST最佳实践
- **JWT认证** - 安全的身份验证机制
- **实时通信** - WebSocket支持实时数据推送
- **批量操作** - 支持批量测试和数据处理
- **错误处理** - 统一的错误响应格式
- **速率限制** - API调用频率控制

## 🔐 认证方式

API支持两种认证方式：

1. **Bearer Token (JWT)**
   - 在请求头中添加: \`Authorization: Bearer {token}\`
   - Token通过登录接口获取

2. **API Key**
   - 在请求头中添加: \`X-API-Key: {apiKey}\`
   - API Key可在用户设置中生成

## 📊 响应格式

所有API响应采用统一的JSON格式：

### 成功响应
\`\`\`json
{
  "success": true,
  "data": {...},
  "message": "操作成功",
  "timestamp": "2025-01-19T10:00:00.000Z"
}
\`\`\`

### 错误响应
\`\`\`json
{
  "success": false,
  "error": {
    "message": "错误描述",
    "type": "ERROR_TYPE",
    "errorId": "ERR-1234567890-ABCDEF",
    "timestamp": "2025-01-19T10:00:00.000Z"
  }
}
\`\`\`

## 🚦 状态码说明

- \`200\` - 成功
- \`201\` - 创建成功
- \`400\` - 请求参数错误
- \`401\` - 未认证
- \`403\` - 无权限
- \`404\` - 资源不存在
- \`409\` - 资源冲突
- \`429\` - 请求过于频繁
- \`500\` - 服务器错误

## 📝 分页参数

支持分页的接口使用以下参数：
- \`page\` - 页码（从1开始）
- \`limit\` - 每页数量（默认20，最大100）
- \`sort\` - 排序字段
- \`order\` - 排序方向（asc/desc）
    `,
    contact: {
      name: 'API Support',
      email: 'api@testweb.com',
      url: 'https://testweb.com/support'
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT'
    }
  },
  servers: [
    {
      url: 'http://${process.env.BACKEND_HOST || 'localhost'}:${process.env.BACKEND_PORT || 3001}/api',
      description: '开发环境'
    },
    {
      url: 'https://api.testweb.com/api',
      description: '生产环境'
    }
  ],
  tags: [
    {
      name: '认证',
      description: '用户认证相关接口'
    },
    {
      name: '测试执行',
      description: '各类测试执行接口'
    },
    {
      name: '测试历史',
      description: '测试历史和结果管理'
    },
    {
      name: '数据管理',
      description: '数据导入导出和管理'
    },
    {
      name: '用户管理',
      description: '用户信息和设置'
    },
    {
      name: '系统管理',
      description: '系统配置和监控'
    },
    {
      name: '报告分析',
      description: '测试报告和数据分析'
    },
    {
      name: '集成',
      description: '第三方集成和Webhook'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT认证令牌'
      },
      apiKey: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
        description: 'API密钥认证'
      }
    },
    schemas: {
      // 通用响应模型
      SuccessResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: { type: 'object' },
          message: { type: 'string', example: '操作成功' },
          timestamp: { type: 'string', format: 'date-time' }
        }
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              message: { type: 'string', example: '错误描述' },
              type: { type: 'string', example: 'VALIDATION_ERROR' },
              errorId: { type: 'string', example: 'ERR-1234567890-ABCDEF' },
              details: { type: 'object' },
              timestamp: { type: 'string', format: 'date-time' }
            }
          }
        }
      },
      PaginationMeta: {
        type: 'object',
        properties: {
          page: { type: 'integer', example: 1 },
          limit: { type: 'integer', example: 20 },
          total: { type: 'integer', example: 100 },
          totalPages: { type: 'integer', example: 5 }
        }
      },
      
      // 业务模型
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'user-123' },
          username: { type: 'string', example: 'john_doe' },
          email: { type: 'string', format: 'email', example: 'john@example.com' },
          role: { type: 'string', enum: ['user', 'admin', 'superadmin'], example: 'user' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { 
            type: 'string', 
            format: 'email',
            example: 'user@example.com',
            description: '用户邮箱'
          },
          password: { 
            type: 'string', 
            format: 'password',
            example: '********',
            description: '用户密码（至少8个字符，包含大小写字母、数字和特殊符号）'
          },
          rememberMe: {
            type: 'boolean',
            example: false,
            description: '是否记住登录状态'
          }
        }
      },
      
      LoginResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              user: { $ref: '#/components/schemas/User' },
              token: { 
                type: 'string', 
                example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                description: 'JWT认证令牌'
              },
              expiresIn: { 
                type: 'integer', 
                example: 3600,
                description: 'Token过期时间（秒）'
              }
            }
          }
        }
      },
      
      TestRequest: {
        type: 'object',
        required: ['url', 'testType'],
        properties: {
          url: {
            type: 'string',
            format: 'uri',
            example: 'https://example.com',
            description: '要测试的网站URL'
          },
          testType: {
            type: 'string',
            enum: ['performance', 'seo', 'security', 'api', 'stress', 'compatibility'],
            example: 'performance',
            description: '测试类型'
          },
          options: {
            type: 'object',
            description: '测试配置选项',
            properties: {
              timeout: { 
                type: 'integer', 
                example: 30000,
                description: '超时时间（毫秒）'
              },
              retries: { 
                type: 'integer', 
                example: 3,
                description: '重试次数'
              },
              concurrent: {
                type: 'integer',
                example: 10,
                description: '并发数（压力测试）'
              }
            }
          }
        }
      },
      
      TestResult: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'test-result-123' },
          url: { type: 'string', format: 'uri' },
          testType: { type: 'string' },
          status: { 
            type: 'string', 
            enum: ['pending', 'running', 'completed', 'failed'],
            example: 'completed'
          },
          score: { 
            type: 'number', 
            minimum: 0,
            maximum: 100,
            example: 85.5
          },
          metrics: {
            type: 'object',
            description: '测试指标',
            additionalProperties: true
          },
          issues: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                severity: { 
                  type: 'string',
                  enum: ['critical', 'major', 'minor', 'info']
                },
                category: { type: 'string' },
                message: { type: 'string' },
                suggestion: { type: 'string' }
              }
            }
          },
          createdAt: { type: 'string', format: 'date-time' },
          completedAt: { type: 'string', format: 'date-time' }
        }
      }
    }
  }
};

// API路径定义
const apiPaths = {
  '/auth/login': {
    post: {
      tags: ['认证'],
      summary: '用户登录',
      description: '使用邮箱和密码登录，获取JWT令牌',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/LoginRequest' },
            examples: {
              normal: {
                summary: '普通登录',
                value: {
                  email: 'user@example.com',
                  password: '********',
                  rememberMe: false
                }
              },
              rememberMe: {
                summary: '记住登录',
                value: {
                  email: 'admin@example.com',
                  password: '********',
                  rememberMe: true
                }
              }
            }
          }
        }
      },
      responses: {
        200: {
          description: '登录成功',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginResponse' }
            }
          }
        },
        400: {
          description: '请求参数错误',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' }
            }
          }
        },
        401: {
          description: '认证失败',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: {
                success: false,
                error: {
                  message: '邮箱或密码错误',
                  type: 'AUTHENTICATION_ERROR',
                  errorId: 'ERR-1234567890-ABCDEF',
                  timestamp: '2025-01-19T10:00:00.000Z'
                }
              }
            }
          }
        }
      }
    }
  },
  
  '/test/execute': {
    post: {
      tags: ['测试执行'],
      summary: '执行测试',
      description: '执行指定类型的网站测试',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/TestRequest' },
            examples: {
              performance: {
                summary: '性能测试',
                value: {
                  url: 'https://example.com',
                  testType: 'performance',
                  options: {
                    timeout: process.env.REQUEST_TIMEOUT || 30000,
                    retries: 3
                  }
                }
              },
              stress: {
                summary: '压力测试',
                value: {
                  url: 'https://example.com',
                  testType: 'stress',
                  options: {
                    concurrent: 100,
                    duration: 60000
                  }
                }
              }
            }
          }
        }
      },
      responses: {
        202: {
          description: '测试已开始',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: {
                    type: 'object',
                    properties: {
                      testId: { type: 'string' },
                      status: { type: 'string' },
                      estimatedDuration: { type: 'integer' }
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
  
  '/test/history': {
    get: {
      tags: ['测试历史'],
      summary: '获取测试历史',
      description: '获取用户的测试历史记录',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'page',
          in: 'query',
          schema: { type: 'integer', default: 1 },
          description: '页码'
        },
        {
          name: 'limit',
          in: 'query',
          schema: { type: 'integer', default: 20, maximum: 100 },
          description: '每页数量'
        },
        {
          name: 'testType',
          in: 'query',
          schema: { type: 'string' },
          description: '测试类型筛选'
        },
        {
          name: 'status',
          in: 'query',
          schema: { type: 'string', enum: ['completed', 'failed', 'running'] },
          description: '状态筛选'
        }
      ],
      responses: {
        200: {
          description: '成功获取测试历史',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/TestResult' }
                  },
                  pagination: { $ref: '#/components/schemas/PaginationMeta' }
                }
              }
            }
          }
        }
      }
    }
  }
};

// 合并路径定义
swaggerDefinition.paths = apiPaths;

// Swagger配置选项
const options = {
  definition: swaggerDefinition,
  apis: ['./routes/*.js', './backend/routes/*.js'], // API路由文件路径
};

// 生成Swagger规范
const swaggerSpec = swaggerJsdoc(options);

// 自定义UI配置
const swaggerUiOptions = {
  explorer: true,
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info { margin-bottom: 40px }
    .swagger-ui .scheme-container { margin: 20px 0 }
  `,
  customSiteTitle: 'Test Web App API Documentation',
  customfavIcon: '/favicon.ico'
};

/**
 * 设置Swagger文档路由
 */
function setupSwaggerDocs(app) {
  // Swagger UI
  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, swaggerUiOptions)
  );

  // JSON格式的API规范
  app.get('/api/docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

}

module.exports = {
  swaggerSpec,
  setupSwaggerDocs
};
