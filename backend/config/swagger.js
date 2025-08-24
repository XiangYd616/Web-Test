/**
 * Swagger API文档配置
 * 自动生成API文档和交互式API测试界面
 */

const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const path = require('path');

// Swagger配置选项
const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Test-Web API',
      version: '1.0.0',
      description: '现代化Web测试平台API文档',
      contact: {
        name: 'Test-Web Team',
        email: 'support@testweb.com',
        url: 'https://testweb.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: '开发环境'
      },
      {
        url: 'https://api.testweb.com',
        description: '生产环境'
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
        apiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API密钥认证'
        }
      },
      schemas: {
        // 通用响应格式
        ApiResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: '操作是否成功'
            },
            data: {
              type: 'object',
              description: '响应数据'
            },
            message: {
              type: 'string',
              description: '响应消息'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: '响应时间戳'
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
                  description: '错误描述'
                },
                details: {
                  type: 'object',
                  description: '错误详情'
                }
              }
            },
            timestamp: {
              type: 'string',
              format: 'date-time'
            }
          }
        },

        // 用户相关
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
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
            role: {
              type: 'string',
              enum: ['admin', 'user', 'guest'],
              description: '用户角色'
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: '创建时间'
            },
            is_active: {
              type: 'boolean',
              description: '是否激活'
            }
          }
        },

        // 测试配置
        TestConfig: {
          type: 'object',
          properties: {
            testType: {
              type: 'string',
              enum: ['performance', 'security', 'api', 'compatibility', 'stress', 'seo', 'network', 'database', 'website', 'ux'],
              description: '测试类型'
            },
            url: {
              type: 'string',
              format: 'uri',
              description: '测试目标URL'
            },
            timeout: {
              type: 'integer',
              minimum: 1000,
              maximum: 300000,
              description: '超时时间(毫秒)'
            }
          },
          required: ['testType', 'url']
        },

        // 测试记录
        TestRecord: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: '记录ID'
            },
            test_id: {
              type: 'string',
              description: '测试ID'
            },
            test_type: {
              type: 'string',
              description: '测试类型'
            },
            url: {
              type: 'string',
              description: '测试URL'
            },
            status: {
              type: 'string',
              enum: ['pending', 'queued', 'starting', 'running', 'stopping', 'completed', 'cancelled', 'failed'],
              description: '测试状态'
            },
            score: {
              type: 'integer',
              minimum: 0,
              maximum: 100,
              description: '测试得分'
            },
            duration: {
              type: 'integer',
              description: '测试持续时间(毫秒)'
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: '创建时间'
            },
            completed_at: {
              type: 'string',
              format: 'date-time',
              description: '完成时间'
            }
          }
        },

        // 分页响应
        PaginatedResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean'
            },
            data: {
              type: 'object',
              properties: {
                items: {
                  type: 'array',
                  items: {}
                },
                total: {
                  type: 'integer',
                  description: '总数量'
                },
                page: {
                  type: 'integer',
                  description: '当前页码'
                },
                pageSize: {
                  type: 'integer',
                  description: '每页数量'
                },
                totalPages: {
                  type: 'integer',
                  description: '总页数'
                }
              }
            }
          }
        }
      },

      // 通用参数
      parameters: {
        PageParam: {
          name: 'page',
          in: 'query',
          description: '页码',
          schema: {
            type: 'integer',
            minimum: 1,
            default: 1
          }
        },
        PageSizeParam: {
          name: 'pageSize',
          in: 'query',
          description: '每页数量',
          schema: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 10
          }
        },
        TestIdParam: {
          name: 'testId',
          in: 'path',
          required: true,
          description: '测试ID',
          schema: {
            type: 'string'
          }
        }
      }
    },
    
    // 全局安全配置
    security: [
      {
        bearerAuth: []
      },
      {
        apiKeyAuth: []
      }
    ],

    // 标签分组
    tags: [
      {
        name: 'Authentication',
        description: '认证相关接口'
      },
      {
        name: 'Tests',
        description: '测试相关接口'
      },
      {
        name: 'Users',
        description: '用户管理接口'
      },
      {
        name: 'System',
        description: '系统管理接口'
      },
      {
        name: 'Reports',
        description: '报告相关接口'
      }
    ]
  },
  
  // API文件路径
  apis: [
    path.join(__dirname, '../routes/*.js'),
    path.join(__dirname, '../api/v1/*.js'),
    path.join(__dirname, '../controllers/*.js')
  ]
};

// 生成Swagger规范
const specs = swaggerJsdoc(options);

// Swagger UI配置
const swaggerUiOptions = {
  explorer: true,
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    docExpansion: 'none',
    defaultModelsExpandDepth: 2,
    defaultModelExpandDepth: 2
  },
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info { margin: 20px 0 }
    .swagger-ui .scheme-container { margin: 20px 0 }
  `,
  customSiteTitle: 'Test-Web API Documentation'
};

module.exports = {
  specs,
  swaggerUi,
  swaggerUiOptions,
  setupSwagger: (app) => {
    // API文档路由
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, swaggerUiOptions));
    
    // JSON格式的API规范
    app.get('/api-docs.json', (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(specs);
    });
    
    console.log('📚 Swagger API文档已启用:');
    console.log('   - 交互式文档: http://localhost:3001/api-docs');
    console.log('   - JSON规范: http://localhost:3001/api-docs.json');
  }
};
