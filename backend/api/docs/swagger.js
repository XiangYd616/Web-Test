/**
 * Swagger API文档配置
 * 自动生成API文档
 */

const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// Swagger配置选项
const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Test-Web Platform API',
      version: '1.0.0',
      description: '本地化优先的测试工具平台API文档',
      contact: {
        name: 'API Support',
        email: 'support@testweb.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production'
          ? 'https://api.testweb.com/api/v1'
          : 'http://localhost:3001/api/v1',
        description: process.env.NODE_ENV === 'production' ? '生产环境' : '开发环境'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT认证令牌'
        }
      },
      schemas: {
        // 通用响应格式
        ApiResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: '请求是否成功'
            },
            message: {
              type: 'string',
              description: '响应消息'
            },
            data: {
              description: '响应数据'
            },
            meta: {
              type: 'object',
              properties: {
                timestamp: {
                  type: 'string',
                  format: 'date-time',
                  description: '响应时间戳'
                },
                requestId: {
                  type: 'string',
                  description: '请求唯一标识'
                },
                path: {
                  type: 'string',
                  description: '请求路径'
                },
                method: {
                  type: 'string',
                  description: 'HTTP方法'
                }
              }
            }
          }
        },

        // 错误响应格式
        ErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  description: '错误代码'
                },
                message: {
                  type: 'string',
                  description: '错误消息'
                },
                details: {
                  description: '错误详情'
                }
              }
            },
            meta: {
              $ref: '#/components/schemas/ApiResponse/properties/meta'
            }
          }
        },

        // 分页响应格式
        PaginatedResponse: {
          allOf: [
            { $ref: '#/components/schemas/apiResponse' },
            {
              type: 'object',
              properties: {
                meta: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiResponse/properties/meta' },
                    {
                      type: 'object',
                      properties: {
                        pagination: {
                          type: 'object',
                          properties: {
                            current: {
                              type: 'integer',
                              description: '当前页码'
                            },
                            limit: {
                              type: 'integer',
                              description: '每页数量'
                            },
                            total: {
                              type: 'integer',
                              description: '总记录数'
                            },
                            totalPages: {
                              type: 'integer',
                              description: '总页数'
                            },
                            hasNext: {
                              type: 'boolean',
                              description: '是否有下一页'
                            },
                            hasPrev: {
                              type: 'boolean',
                              description: '是否有上一页'
                            }
                          }
                        }
                      }
                    }
                  ]
                }
              }
            }
          ]
        },

        // 用户模型
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: '用户ID'
            },
            username: {
              type: 'string',
              description: '用户名'
            },
            email: {
              type: 'string',
              format: 'email',
              description: '邮箱地址'
            },
            firstName: {
              type: 'string',
              description: '名字'
            },
            lastName: {
              type: 'string',
              description: '姓氏'
            },
            role: {
              type: 'string',
              enum: ['user', 'admin', 'moderator'],
              description: '用户角色'
            },
            plan: {
              type: 'string',
              enum: ['free', 'pro', 'enterprise'],
              description: '用户计划'
            },
            status: {
              type: 'string',
              enum: ['active', 'inactive', 'suspended'],
              description: '用户状态'
            },
            emailVerified: {
              type: 'boolean',
              description: '邮箱是否已验证'
            },
            lastLogin: {
              type: 'string',
              format: 'date-time',
              description: '最后登录时间'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: '创建时间'
            }
          }
        },

        // 测试结果模型
        TestResult: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: '测试ID'
            },
            testType: {
              type: 'string',
              enum: ['seo', 'performance', 'security', 'api', 'compatibility', 'accessibility', 'stress'],
              description: '测试类型'
            },
            testName: {
              type: 'string',
              description: '测试名称'
            },
            url: {
              type: 'string',
              format: 'uri',
              description: '测试URL'
            },
            status: {
              type: 'string',
              enum: ['pending', 'running', 'completed', 'failed', 'cancelled'],
              description: '测试状态'
            },
            overallScore: {
              type: 'number',
              minimum: 0,
              maximum: 100,
              description: '总体评分'
            },
            grade: {
              type: 'string',
              description: '评级'
            },
            startedAt: {
              type: 'string',
              format: 'date-time',
              description: '开始时间'
            },
            completedAt: {
              type: 'string',
              format: 'date-time',
              description: '完成时间'
            },
            durationMs: {
              type: 'integer',
              description: '执行时长（毫秒）'
            },
            totalChecks: {
              type: 'integer',
              description: '总检查项数'
            },
            passedChecks: {
              type: 'integer',
              description: '通过检查项数'
            },
            failedChecks: {
              type: 'integer',
              description: '失败检查项数'
            },
            warnings: {
              type: 'integer',
              description: '警告数'
            },
            tags: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: '标签'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: '创建时间'
            }
          }
        },

        // 登录请求
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: '邮箱地址'
            },
            password: {
              type: 'string',
              description: '密码'
            }
          }
        },

        // 注册请求
        RegisterRequest: {
          type: 'object',
          required: ['username', 'email', 'password'],
          properties: {
            username: {
              type: 'string',
              minLength: 3,
              maxLength: 30,
              pattern: '^[a-zA-Z0-9_]+$',
              description: '用户名'
            },
            email: {
              type: 'string',
              format: 'email',
              description: '邮箱地址'
            },
            password: {
              type: 'string',
              minLength: 8,
              pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*//d)',
              description: '密码（至少8位，包含大小写字母和数字）'
            },
            firstName: {
              type: 'string',
              maxLength: 50,
              description: '名字'
            },
            lastName: {
              type: 'string',
              maxLength: 50,
              description: '姓氏'
            }
          }
        },

        // 启动测试请求
        StartTestRequest: {
          type: 'object',
          required: ['url'],
          properties: {
            url: {
              type: 'string',
              format: 'uri',
              description: '要测试的URL'
            },
            testName: {
              type: 'string',
              maxLength: 255,
              description: '测试名称'
            },
            config: {
              type: 'object',
              description: '测试配置'
            },
            tags: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: '标签'
            },
            notes: {
              type: 'string',
              description: '备注'
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ],
    tags: [
      {
        name: 'Authentication',
        description: '认证相关API'
      },
      {
        name: 'Tests',
        description: '测试相关API'
      },
      {
        name: 'Users',
        description: '用户相关API'
      },
      {
        name: 'System',
        description: '系统管理API'
      }
    ]
  },
  apis: [
    './backend/api/v1/routes/*.js', // 路由文件路径
    './backend/api/v1/index.js',    // 主API文件
    './backend/routes/*.js',        // 主要路由文件
    './backend/api/docs/*.js'       // API文档定义
  ]
};

// 生成Swagger规范
const specs = swaggerJsdoc(options);

// Swagger UI配置
const swaggerUiOptions = {
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info .title { color: #3b82f6 }
  `,
  customSiteTitle: 'Test-Web Platform API Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    docExpansion: 'list',
    defaultModelsExpandDepth: 2,
    defaultModelExpandDepth: 2
  }
};

module.exports = {
  specs,
  swaggerUi,
  swaggerUiOptions
};
