/**
 * 增强的Swagger API文档配置
 * @description 提供完整的API文档，包含详细的请求/响应示例
 */

const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const { REPORT_TYPES } = require('../../shared/types/testEngine.types');

type SwaggerDefinition = Record<string, unknown>;

type SwaggerOptions = {
  definition: SwaggerDefinition;
  apis: string[];
};

// API文档基本信息
const swaggerDefinition: SwaggerDefinition = {
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
      url: 'https://testweb.com/support',
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
  },
  servers: [
    {
      url: `http://${process.env.BACKEND_HOST || 'localhost'}:${process.env.BACKEND_PORT || 3001}/api`,
      description: '开发环境',
    },
    {
      url: 'https://api.testweb.com/api',
      description: '生产环境',
    },
  ],
  tags: [
    {
      name: '认证',
      description: '用户认证相关接口',
    },
    {
      name: '测试执行',
      description: '各类测试执行接口',
    },
    {
      name: '测试历史',
      description: '测试历史和结果管理',
    },
    {
      name: '数据管理',
      description: '数据导入导出和管理',
    },
    {
      name: '用户管理',
      description: '用户信息和设置',
    },
    {
      name: '系统管理',
      description: '系统配置和监控',
    },
    {
      name: '报告分析',
      description: '测试报告和数据分析',
    },
    {
      name: '集成',
      description: '第三方集成和Webhook',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT认证令牌',
      },
      apiKey: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
        description: 'API密钥认证',
      },
    },
    schemas: {
      // 通用响应模型
      SuccessResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: { type: 'object' },
          message: { type: 'string', example: '操作成功' },
          timestamp: { type: 'string', format: 'date-time' },
        },
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
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
      PaginationMeta: {
        type: 'object',
        properties: {
          page: { type: 'integer', example: 1 },
          limit: { type: 'integer', example: 20 },
          total: { type: 'integer', example: 100 },
          totalPages: { type: 'integer', example: 5 },
        },
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
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },

      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: {
            type: 'string',
            format: 'email',
            example: 'user@example.com',
            description: '用户邮箱',
          },
          password: {
            type: 'string',
            format: 'password',
            example: '********',
            description: '用户密码（至少8个字符，包含大小写字母、数字和特殊符号）',
          },
          rememberMe: {
            type: 'boolean',
            example: false,
            description: '是否记住登录状态',
          },
        },
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
                description: 'JWT认证令牌',
              },
              expiresIn: {
                type: 'integer',
                example: 3600,
                description: 'Token过期时间（秒）',
              },
            },
          },
        },
      },

      TestRequest: {
        type: 'object',
        required: ['url', 'testType'],
        properties: {
          url: {
            type: 'string',
            format: 'uri',
            example: 'https://example.com',
            description: '要测试的网站URL',
          },
          testType: {
            type: 'string',
            enum: ['performance', 'seo', 'security', 'api', 'stress', 'website', 'accessibility'],
            example: 'performance',
            description: '测试类型',
          },
          options: {
            type: 'object',
            description: '测试配置选项',
            properties: {
              timeout: {
                type: 'integer',
                example: 30000,
                description: '超时时间（毫秒）',
              },
              retries: {
                type: 'integer',
                example: 3,
                description: '重试次数',
              },
              concurrent: {
                type: 'integer',
                example: 10,
                description: '并发数（压力测试）',
              },
            },
          },
        },
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
            example: 'completed',
          },
          score: {
            type: 'number',
            minimum: 0,
            maximum: 100,
            example: 85.5,
          },
          metrics: {
            type: 'object',
            description: '测试指标',
            additionalProperties: true,
          },
          issues: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                severity: {
                  type: 'string',
                  enum: ['critical', 'major', 'minor', 'info'],
                },
                category: { type: 'string' },
                message: { type: 'string' },
                suggestion: { type: 'string' },
              },
            },
          },
          createdAt: { type: 'string', format: 'date-time' },
          completedAt: { type: 'string', format: 'date-time' },
        },
      },
      MonitoringSite: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'site-123' },
          name: { type: 'string', example: '主站点' },
          url: { type: 'string', format: 'uri', example: 'https://example.com' },
          monitoring_type: { type: 'string', example: 'uptime' },
          status: { type: 'string', example: 'active' },
          check_interval: { type: 'integer', example: 300 },
          timeout: { type: 'integer', example: 30 },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      MonitoringSummary: {
        type: 'object',
        properties: {
          total: { type: 'integer', example: 12 },
          active: { type: 'integer', example: 8 },
          inactive: { type: 'integer', example: 2 },
          paused: { type: 'integer', example: 2 },
          byType: { type: 'object' },
        },
      },
      ExportJobStatus: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'export_1700000000_abc' },
          userId: { type: 'string', example: 'user-123' },
          status: { type: 'string', example: 'completed' },
          createdAt: { type: 'string', format: 'date-time' },
          startedAt: { type: 'string', format: 'date-time' },
          completedAt: { type: 'string', format: 'date-time' },
          filePath: { type: 'string', example: 'exports/test_results.json' },
        },
      },
      TestTemplate: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'template-123' },
          template_name: { type: 'string', example: '性能测试默认模板' },
          engine_type: { type: 'string', enum: REPORT_TYPES, example: 'performance' },
          description: { type: 'string' },
          is_public: { type: 'boolean', example: true },
          is_default: { type: 'boolean', example: false },
          usage_count: { type: 'integer', example: 12 },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      Alert: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'alert-123' },
          alert_type: { type: 'string', example: 'monitoring' },
          severity: {
            type: 'string',
            enum: ['critical', 'high', 'medium', 'low'],
            example: 'high',
          },
          status: {
            type: 'string',
            enum: ['active', 'acknowledged', 'resolved'],
            example: 'active',
          },
          source: { type: 'string', example: 'monitoring-service' },
          message: { type: 'string', example: '站点响应超时' },
          data: { type: 'object' },
          timestamp: { type: 'string', format: 'date-time' },
          acknowledgedAt: { type: 'string', format: 'date-time', nullable: true },
          acknowledgedBy: { type: 'string', nullable: true },
          resolvedAt: { type: 'string', format: 'date-time', nullable: true },
          resolvedBy: { type: 'string', nullable: true },
        },
      },
      AlertSummary: {
        type: 'object',
        properties: {
          total: { type: 'integer' },
          active: { type: 'integer' },
          acknowledged: { type: 'integer' },
          resolved: { type: 'integer' },
          critical: { type: 'integer' },
          high: { type: 'integer' },
          medium: { type: 'integer' },
          low: { type: 'integer' },
        },
      },
      AlertRule: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'rule-123' },
          name: { type: 'string', example: '响应时间告警' },
          status: { type: 'string', example: 'active' },
          condition: { type: 'object' },
          severity: { type: 'string', example: 'high' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      TestAlert: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'test-alert-123' },
          type: { type: 'string', enum: REPORT_TYPES, example: 'performance' },
          severity: { type: 'string', example: 'high' },
          message: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          data: { type: 'object' },
        },
      },
      ErrorReport: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'error-123' },
          type: { type: 'string', example: 'runtime' },
          severity: {
            type: 'string',
            enum: ['low', 'medium', 'high', 'critical'],
            example: 'high',
          },
          message: { type: 'string', example: 'Uncaught TypeError' },
          details: { type: 'object' },
          code: { type: 'string', nullable: true },
          timestamp: { type: 'string', format: 'date-time' },
          context: { type: 'object' },
          stack: { type: 'string', nullable: true },
          source: { type: 'string', nullable: true },
          line: { type: 'integer', nullable: true },
          column: { type: 'integer', nullable: true },
          resolved: { type: 'boolean', nullable: true },
        },
      },
      ErrorStatistics: {
        type: 'object',
        properties: {
          total: { type: 'integer' },
          bySeverity: { type: 'object' },
          byType: { type: 'object' },
          byHour: { type: 'array', items: { type: 'object' } },
          trends: { type: 'object' },
          topErrors: { type: 'array', items: { type: 'object' } },
        },
      },
      ImportTaskStatus: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'import-123' },
          status: { type: 'string', example: 'running' },
          createdAt: { type: 'string', format: 'date-time' },
          createdBy: { type: 'string' },
          progress: {
            type: 'object',
            properties: {
              current: { type: 'integer' },
              total: { type: 'integer' },
              percentage: { type: 'number' },
            },
          },
          result: { type: 'object' },
          error: { type: 'string', nullable: true },
        },
      },
      ImportHistory: {
        type: 'object',
        properties: {
          data: { type: 'array', items: { $ref: '#/components/schemas/ImportTaskStatus' } },
          pagination: { $ref: '#/components/schemas/PaginationMeta' },
          summary: { type: 'object' },
        },
      },
      QueueJob: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          queue: { type: 'string' },
          status: { type: 'string' },
          attemptsMade: { type: 'integer' },
          processedOn: { type: 'string', format: 'date-time' },
          finishedOn: { type: 'string', format: 'date-time' },
          data: { type: 'object' },
          result: { type: 'object' },
          failedReason: { type: 'string', nullable: true },
        },
      },
      QueueStats: {
        type: 'object',
        properties: {
          data: { type: 'object' },
          pagination: { $ref: '#/components/schemas/PaginationMeta' },
          summary: { type: 'object' },
        },
      },
      ReportTemplate: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'tmpl-123' },
          name: { type: 'string', example: '性能报告模板' },
          type: { type: 'string', enum: REPORT_TYPES, example: 'performance' },
          description: { type: 'string' },
          template: { type: 'string' },
          variables: { type: 'array', items: { type: 'object' } },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          createdBy: { type: 'string' },
        },
      },
    },
  },
};

// API路径定义
const apiPaths: Record<string, unknown> = {
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
                  rememberMe: false,
                },
              },
              rememberMe: {
                summary: '记住登录',
                value: {
                  email: 'admin@example.com',
                  password: '********',
                  rememberMe: true,
                },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: '登录成功',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginResponse' },
            },
          },
        },
        400: {
          description: '请求参数错误',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
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
                  timestamp: '2025-01-19T10:00:00.000Z',
                },
              },
            },
          },
        },
      },
    },
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
                    retries: 3,
                  },
                },
              },
              stress: {
                summary: '压力测试',
                value: {
                  url: 'https://example.com',
                  testType: 'stress',
                  options: {
                    concurrent: 100,
                    duration: 60000,
                  },
                },
              },
            },
          },
        },
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
                      estimatedDuration: { type: 'integer' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
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
          description: '页码',
        },
        {
          name: 'limit',
          in: 'query',
          schema: { type: 'integer', default: 20, maximum: 100 },
          description: '每页数量',
        },
        {
          name: 'testType',
          in: 'query',
          schema: { type: 'string' },
          description: '测试类型筛选',
        },
        {
          name: 'status',
          in: 'query',
          schema: { type: 'string', enum: ['completed', 'failed', 'running'] },
          description: '状态筛选',
        },
      ],
      responses: {
        200: {
          description: '成功获取测试历史',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { type: 'array', items: { $ref: '#/components/schemas/TestResult' } },
                  pagination: { $ref: '#/components/schemas/PaginationMeta' },
                  summary: { type: 'object' },
                },
              },
            },
          },
        },
      },
    },
  },

  '/system/monitoring/sites': {
    get: {
      tags: ['系统管理'],
      summary: '获取监控站点列表',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
        { name: 'status', in: 'query', schema: { type: 'string' } },
        { name: 'monitoringType', in: 'query', schema: { type: 'string' } },
        { name: 'search', in: 'query', schema: { type: 'string' } },
        { name: 'workspaceId', in: 'query', schema: { type: 'string' } },
      ],
      responses: {
        200: {
          description: '获取监控站点列表成功',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { type: 'array', items: { $ref: '#/components/schemas/MonitoringSite' } },
                  pagination: { $ref: '#/components/schemas/PaginationMeta' },
                  summary: { $ref: '#/components/schemas/MonitoringSummary' },
                },
              },
            },
          },
        },
      },
    },
    post: {
      tags: ['系统管理'],
      summary: '新增监控站点',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                url: { type: 'string', format: 'uri' },
                monitoringType: { type: 'string' },
                workspaceId: { type: 'string' },
              },
              required: ['name', 'url'],
            },
          },
        },
      },
      responses: {
        201: {
          description: '监控站点添加成功',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/MonitoringSite' },
            },
          },
        },
      },
    },
  },
  '/system/monitoring/sites/{id}': {
    get: {
      tags: ['系统管理'],
      summary: '获取监控站点详情',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        { name: 'workspaceId', in: 'query', schema: { type: 'string' } },
      ],
      responses: {
        200: {
          description: '成功',
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/MonitoringSite' } },
          },
        },
      },
    },
    put: {
      tags: ['系统管理'],
      summary: '更新监控站点',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        { name: 'workspaceId', in: 'query', schema: { type: 'string' } },
      ],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { type: 'object' } } },
      },
      responses: { 200: { description: '更新成功' } },
    },
    delete: {
      tags: ['系统管理'],
      summary: '删除监控站点',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        { name: 'workspaceId', in: 'query', schema: { type: 'string' } },
      ],
      responses: { 200: { description: '删除成功' } },
    },
  },
  '/system/monitoring/sites/{id}/check': {
    post: {
      tags: ['系统管理'],
      summary: '手动触发站点检查',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        { name: 'workspaceId', in: 'query', schema: { type: 'string' } },
      ],
      responses: { 200: { description: '检查完成' } },
    },
  },
  '/system/monitoring/sites/{id}/pause': {
    post: {
      tags: ['系统管理'],
      summary: '暂停监控站点',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        { name: 'workspaceId', in: 'query', schema: { type: 'string' } },
      ],
      responses: { 200: { description: '暂停成功' } },
    },
  },
  '/system/monitoring/sites/{id}/resume': {
    post: {
      tags: ['系统管理'],
      summary: '恢复监控站点',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        { name: 'workspaceId', in: 'query', schema: { type: 'string' } },
      ],
      responses: { 200: { description: '恢复成功' } },
    },
  },
  '/system/monitoring/alerts': {
    get: {
      tags: ['系统管理'],
      summary: '获取监控告警列表',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
        { name: 'severity', in: 'query', schema: { type: 'string' } },
        { name: 'status', in: 'query', schema: { type: 'string' } },
        { name: 'source', in: 'query', schema: { type: 'string' } },
        { name: 'workspaceId', in: 'query', schema: { type: 'string' } },
      ],
      responses: {
        200: {
          description: '成功',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { type: 'array', items: { $ref: '#/components/schemas/Alert' } },
                  pagination: { $ref: '#/components/schemas/PaginationMeta' },
                  summary: { type: 'object' },
                },
              },
            },
          },
        },
      },
    },
  },
  '/system/monitoring/statistics': {
    get: {
      tags: ['系统管理'],
      summary: '获取监控统计',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'workspaceId', in: 'query', schema: { type: 'string' } }],
      responses: {
        200: {
          description: '成功',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { type: 'object' },
                  summary: { type: 'object' },
                },
              },
            },
          },
        },
      },
    },
  },
  '/system/monitoring/health': {
    get: {
      tags: ['系统管理'],
      summary: '监控服务健康检查',
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: '成功',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { type: 'object' },
                  summary: { type: 'object' },
                },
              },
            },
          },
        },
      },
    },
  },
  '/system/alerts': {
    get: {
      tags: ['系统管理'],
      summary: '获取告警列表',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
        { name: 'status', in: 'query', schema: { type: 'string' } },
        { name: 'severity', in: 'query', schema: { type: 'string' } },
        { name: 'type', in: 'query', schema: { type: 'string' } },
        { name: 'timeRange', in: 'query', schema: { type: 'string' } },
        { name: 'search', in: 'query', schema: { type: 'string' } },
        { name: 'workspaceId', in: 'query', schema: { type: 'string' } },
      ],
      responses: {
        200: {
          description: '成功',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { type: 'array', items: { $ref: '#/components/schemas/Alert' } },
                  pagination: { $ref: '#/components/schemas/PaginationMeta' },
                  summary: { $ref: '#/components/schemas/AlertSummary' },
                },
              },
            },
          },
        },
      },
    },
  },
  '/system/alerts/{id}': {
    get: {
      tags: ['系统管理'],
      summary: '获取告警详情',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: {
          description: '成功',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { data: { $ref: '#/components/schemas/Alert' } },
              },
            },
          },
        },
      },
    },
  },
  '/system/alerts/{id}/acknowledge': {
    post: {
      tags: ['系统管理'],
      summary: '确认告警',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: {
        required: false,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: { comment: { type: 'string' }, workspaceId: { type: 'string' } },
            },
          },
        },
      },
      responses: {
        200: {
          description: '确认成功',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { data: { $ref: '#/components/schemas/Alert' } },
              },
            },
          },
        },
      },
    },
  },
  '/system/alerts/{id}/resolve': {
    post: {
      tags: ['系统管理'],
      summary: '解决告警',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: {
        required: false,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: { comment: { type: 'string' }, workspaceId: { type: 'string' } },
            },
          },
        },
      },
      responses: {
        200: {
          description: '处理成功',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { data: { $ref: '#/components/schemas/Alert' } },
              },
            },
          },
        },
      },
    },
  },
  '/system/alerts/batch': {
    post: {
      tags: ['系统管理'],
      summary: '批量操作告警',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                action: { type: 'string', example: 'acknowledge' },
                ids: { type: 'array', items: { type: 'string' } },
                workspaceId: { type: 'string' },
              },
              required: ['action', 'ids'],
            },
          },
        },
      },
      responses: {
        200: {
          description: '批量处理成功',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { type: 'array', items: { type: 'string' } },
                },
              },
            },
          },
        },
      },
    },
  },
  '/system/alerts/rules': {
    get: {
      tags: ['系统管理'],
      summary: '获取告警规则列表',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
        { name: 'status', in: 'query', schema: { type: 'string' } },
        { name: 'workspaceId', in: 'query', schema: { type: 'string' } },
      ],
      responses: {
        200: {
          description: '成功',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { type: 'array', items: { $ref: '#/components/schemas/AlertRule' } },
                  pagination: { $ref: '#/components/schemas/PaginationMeta' },
                  summary: { type: 'object' },
                },
              },
            },
          },
        },
      },
    },
    post: {
      tags: ['系统管理'],
      summary: '创建告警规则',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { type: 'object' } } },
      },
      responses: { 201: { description: '创建成功' } },
    },
  },
  '/system/alerts/rules/{id}': {
    put: {
      tags: ['系统管理'],
      summary: '更新告警规则',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { type: 'object' } } },
      },
      responses: { 200: { description: '更新成功' } },
    },
    delete: {
      tags: ['系统管理'],
      summary: '删除告警规则',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: { 200: { description: '删除成功' } },
    },
  },
  '/system/alerts/statistics': {
    get: {
      tags: ['系统管理'],
      summary: '获取告警统计',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'workspaceId', in: 'query', schema: { type: 'string' } }],
      responses: {
        200: {
          description: '成功',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { data: { $ref: '#/components/schemas/AlertSummary' } },
              },
            },
          },
        },
      },
    },
  },
  '/system/errors/report': {
    post: {
      tags: ['系统管理'],
      summary: '上报错误',
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorReport' } } },
      },
      responses: {
        201: {
          description: '上报成功',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { type: 'object', properties: { id: { type: 'string' } } },
                },
              },
            },
          },
        },
      },
    },
  },
  '/system/errors': {
    get: {
      tags: ['系统管理'],
      summary: '获取错误列表',
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
        { name: 'status', in: 'query', schema: { type: 'string' } },
        { name: 'type', in: 'query', schema: { type: 'string' } },
        { name: 'timeRange', in: 'query', schema: { type: 'string' } },
        { name: 'search', in: 'query', schema: { type: 'string' } },
        { name: 'workspaceId', in: 'query', schema: { type: 'string' } },
      ],
      responses: {
        200: {
          description: '成功',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { type: 'array', items: { $ref: '#/components/schemas/ErrorReport' } },
                  pagination: { $ref: '#/components/schemas/PaginationMeta' },
                  summary: { type: 'object' },
                },
              },
            },
          },
        },
      },
    },
  },
  '/system/errors/{id}': {
    get: {
      tags: ['系统管理'],
      summary: '获取错误详情',
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: {
          description: '成功',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { data: { $ref: '#/components/schemas/ErrorReport' } },
              },
            },
          },
        },
      },
    },
    delete: {
      tags: ['系统管理'],
      summary: '删除错误报告',
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: { 200: { description: '删除成功' } },
    },
  },
  '/system/errors/statistics': {
    get: {
      tags: ['系统管理'],
      summary: '获取错误统计',
      parameters: [
        { name: 'timeRange', in: 'query', schema: { type: 'string', example: '24h' } },
        { name: 'workspaceId', in: 'query', schema: { type: 'string' } },
      ],
      responses: {
        200: {
          description: '成功',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { data: { $ref: '#/components/schemas/ErrorStatistics' } },
              },
            },
          },
        },
      },
    },
  },
  '/system/errors/{id}/resolve': {
    post: {
      tags: ['系统管理'],
      summary: '标记错误已解决',
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: {
        required: false,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: { comment: { type: 'string' }, resolvedBy: { type: 'string' } },
            },
          },
        },
      },
      responses: { 200: { description: '处理成功' } },
    },
  },
  '/system/errors/batch/resolve': {
    post: {
      tags: ['系统管理'],
      summary: '批量解决错误',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                errorIds: { type: 'array', items: { type: 'string' } },
                comment: { type: 'string' },
                resolvedBy: { type: 'string' },
              },
              required: ['errorIds'],
            },
          },
        },
      },
      responses: {
        200: {
          description: '批量处理成功',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { type: 'object', properties: { resolvedCount: { type: 'integer' } } },
                },
              },
            },
          },
        },
      },
    },
  },
  '/system/errors/types': {
    get: {
      tags: ['系统管理'],
      summary: '获取错误类型列表',
      parameters: [{ name: 'workspaceId', in: 'query', schema: { type: 'string' } }],
      responses: {
        200: {
          description: '成功',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { type: 'array', items: { type: 'string' } },
                  summary: { type: 'object' },
                },
              },
            },
          },
        },
      },
    },
  },
  '/system/errors/health': {
    get: {
      tags: ['系统管理'],
      summary: '错误监控健康检查',
      parameters: [{ name: 'workspaceId', in: 'query', schema: { type: 'string' } }],
      responses: {
        200: {
          description: '成功',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { type: 'object' },
                  summary: { type: 'object' },
                },
              },
            },
          },
        },
      },
    },
  },
  '/system/test-alerts': {
    get: {
      tags: ['系统管理'],
      summary: '获取测试告警',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
        { name: 'severity', in: 'query', schema: { type: 'string' } },
        { name: 'type', in: 'query', schema: { type: 'string' } },
        { name: 'search', in: 'query', schema: { type: 'string' } },
        { name: 'startTime', in: 'query', schema: { type: 'string' } },
        { name: 'endTime', in: 'query', schema: { type: 'string' } },
      ],
      responses: {
        200: {
          description: '成功',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { type: 'array', items: { $ref: '#/components/schemas/TestAlert' } },
                  pagination: { $ref: '#/components/schemas/PaginationMeta' },
                  summary: { type: 'object' },
                },
              },
            },
          },
        },
      },
    },
  },
  '/system/test-alerts/export': {
    get: {
      tags: ['系统管理'],
      summary: '导出测试告警',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'format', in: 'query', schema: { type: 'string', enum: ['json', 'csv'] } },
        { name: 'severity', in: 'query', schema: { type: 'string' } },
        { name: 'type', in: 'query', schema: { type: 'string' } },
        { name: 'search', in: 'query', schema: { type: 'string' } },
        { name: 'startTime', in: 'query', schema: { type: 'string' } },
        { name: 'endTime', in: 'query', schema: { type: 'string' } },
        { name: 'limit', in: 'query', schema: { type: 'integer' } },
        { name: 'offset', in: 'query', schema: { type: 'integer' } },
      ],
      responses: { 200: { description: '导出成功' } },
    },
  },
  '/system/reports/export': {
    get: {
      tags: ['系统管理'],
      summary: '导出报告数据',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'format', in: 'query', schema: { type: 'string', enum: ['json', 'csv'] } },
      ],
      responses: { 200: { description: '导出成功' } },
    },
  },
  '/system/reports/templates': {
    get: {
      tags: ['系统管理'],
      summary: '获取报告模板列表',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'type', in: 'query', schema: { type: 'string', enum: REPORT_TYPES } }],
      responses: {
        200: {
          description: '成功',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { type: 'array', items: { $ref: '#/components/schemas/ReportTemplate' } },
                  pagination: { $ref: '#/components/schemas/PaginationMeta' },
                  summary: { type: 'object' },
                },
              },
            },
          },
        },
      },
    },
    post: {
      tags: ['系统管理'],
      summary: '创建报告模板',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                type: { type: 'string', enum: REPORT_TYPES },
                description: { type: 'string' },
                template: { type: 'string' },
                variables: { type: 'array', items: { type: 'object' } },
              },
              required: ['name', 'type', 'template'],
            },
          },
        },
      },
      responses: { 201: { description: '创建成功' } },
    },
  },
  '/data/import': {
    post: {
      tags: ['数据管理'],
      summary: '数据导入',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              properties: {
                file: { type: 'string', format: 'binary' },
                workspaceId: { type: 'string' },
                options: { type: 'object' },
                type: { type: 'string' },
                format: { type: 'string' },
              },
              required: ['file'],
            },
          },
        },
      },
      responses: {
        200: {
          description: '导入任务创建成功',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { $ref: '#/components/schemas/ImportTaskStatus' },
                },
              },
            },
          },
        },
      },
    },
  },
  '/data/import/{jobId}/status': {
    get: {
      tags: ['数据管理'],
      summary: '获取导入任务状态',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'jobId', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: {
          description: '成功',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { $ref: '#/components/schemas/ImportTaskStatus' },
                },
              },
            },
          },
        },
      },
    },
  },
  '/data/import/{jobId}': {
    delete: {
      tags: ['数据管理'],
      summary: '取消导入任务',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'jobId', in: 'path', required: true, schema: { type: 'string' } }],
      responses: { 200: { description: '取消成功' } },
    },
  },
  '/data/import/history': {
    get: {
      tags: ['数据管理'],
      summary: '获取导入历史',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
        { name: 'status', in: 'query', schema: { type: 'string' } },
      ],
      responses: {
        200: {
          description: '成功',
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/ImportHistory' } },
          },
        },
      },
    },
  },
  '/data/import/template/{type}': {
    get: {
      tags: ['数据管理'],
      summary: '获取导入模板',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'type', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: {
          description: '成功',
          content: {
            'application/octet-stream': {
              schema: { type: 'string', format: 'binary' },
            },
          },
        },
      },
    },
  },
  '/data/import/validate': {
    post: {
      tags: ['数据管理'],
      summary: '验证导入文件',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              properties: {
                file: { type: 'string', format: 'binary' },
                workspaceId: { type: 'string' },
              },
              required: ['file'],
            },
          },
        },
      },
      responses: {
        200: {
          description: '验证完成',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { type: 'array', items: { type: 'object' } },
                },
              },
            },
          },
        },
      },
    },
  },
  '/data/import/formats': {
    get: {
      tags: ['数据管理'],
      summary: '获取支持的导入格式',
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: '成功',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'object',
                    properties: { formats: { type: 'array', items: { type: 'string' } } },
                  },
                  summary: { type: 'object' },
                },
              },
            },
          },
        },
      },
    },
  },
  '/data/import/stats': {
    get: {
      tags: ['数据管理'],
      summary: '获取导入统计',
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: '成功',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { type: 'object' },
                  summary: { type: 'object' },
                },
              },
            },
          },
        },
      },
    },
  },
  '/data/import/{jobId}/retry': {
    post: {
      tags: ['数据管理'],
      summary: '重试导入任务',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'jobId', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: {
          description: '重试成功',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { $ref: '#/components/schemas/ImportTaskStatus' },
                },
              },
            },
          },
        },
      },
    },
  },
  '/test/queue/stats': {
    get: {
      tags: ['测试执行'],
      summary: '获取测试队列状态',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'startTime', in: 'query', schema: { type: 'string' } },
        { name: 'endTime', in: 'query', schema: { type: 'string' } },
        { name: 'limit', in: 'query', schema: { type: 'integer' } },
        { name: 'offset', in: 'query', schema: { type: 'integer' } },
        { name: 'workspaceId', in: 'query', schema: { type: 'string' } },
      ],
      responses: {
        200: {
          description: '成功',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/QueueStats' } } },
        },
      },
    },
  },
  '/test/queue/dead': {
    get: {
      tags: ['测试执行'],
      summary: '获取死信队列详情',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'start', in: 'query', schema: { type: 'integer' } },
        { name: 'end', in: 'query', schema: { type: 'integer' } },
      ],
      responses: {
        200: {
          description: '成功',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { type: 'array', items: { $ref: '#/components/schemas/QueueJob' } },
                  pagination: { $ref: '#/components/schemas/PaginationMeta' },
                  summary: { type: 'object' },
                },
              },
            },
          },
        },
      },
    },
  },
  '/test/queue/trace/{traceId}': {
    get: {
      tags: ['测试执行'],
      summary: '按 traceId 查询队列任务',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'traceId', in: 'path', required: true, schema: { type: 'string' } },
        { name: 'start', in: 'query', schema: { type: 'integer' } },
        { name: 'end', in: 'query', schema: { type: 'integer' } },
        { name: 'userId', in: 'query', schema: { type: 'string' } },
      ],
      responses: {
        200: {
          description: '成功',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { type: 'array', items: { $ref: '#/components/schemas/QueueJob' } },
                  pagination: { $ref: '#/components/schemas/PaginationMeta' },
                  summary: { type: 'object' },
                },
              },
            },
          },
        },
      },
    },
  },
  '/test/queue/trace/{traceId}/logs': {
    get: {
      tags: ['测试执行'],
      summary: '按 traceId 导出任务日志',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'traceId', in: 'path', required: true, schema: { type: 'string' } },
        { name: 'format', in: 'query', schema: { type: 'string', enum: ['json', 'csv', 'zip'] } },
        { name: 'startTime', in: 'query', schema: { type: 'string' } },
        { name: 'endTime', in: 'query', schema: { type: 'string' } },
        { name: 'limit', in: 'query', schema: { type: 'integer' } },
        { name: 'offset', in: 'query', schema: { type: 'integer' } },
        { name: 'batchSize', in: 'query', schema: { type: 'integer' } },
        { name: 'all', in: 'query', schema: { type: 'boolean' } },
        { name: 'workspaceId', in: 'query', schema: { type: 'string' } },
      ],
      responses: {
        200: {
          description: '导出成功',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { type: 'array', items: { type: 'object' } },
                  pagination: { $ref: '#/components/schemas/PaginationMeta' },
                  summary: { type: 'object' },
                },
              },
            },
          },
        },
      },
    },
  },
  '/test/queue/{queueName}/jobs/{jobId}': {
    get: {
      tags: ['测试执行'],
      summary: '获取单个队列任务详情',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'queueName', in: 'path', required: true, schema: { type: 'string' } },
        { name: 'jobId', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: {
        200: {
          description: '成功',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { $ref: '#/components/schemas/QueueJob' },
                },
              },
            },
          },
        },
      },
    },
  },
  '/test/queue/dead/{jobId}/replay': {
    post: {
      tags: ['测试执行'],
      summary: '重放死信队列任务',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'jobId', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: {
        required: false,
        content: { 'application/json': { schema: { type: 'object' } } },
      },
      responses: { 200: { description: '重放成功' } },
    },
  },
  '/test/{testId}/export': {
    get: {
      tags: ['测试执行'],
      summary: '导出测试结果',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'testId', in: 'path', required: true, schema: { type: 'string' } },
        { name: 'format', in: 'query', schema: { type: 'string' } },
      ],
      responses: { 200: { description: '导出成功' } },
    },
  },
  '/data/export': {
    post: {
      tags: ['数据管理'],
      summary: '创建导出任务',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                format: { type: 'string', example: 'csv' },
                filters: { type: 'object' },
                options: { type: 'object' },
                workspaceId: { type: 'string' },
              },
            },
          },
        },
      },
      responses: { 200: { description: '导出任务创建成功' } },
    },
  },
  '/data/export/status/{jobId}': {
    get: {
      tags: ['数据管理'],
      summary: '获取导出状态',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'jobId', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: {
          description: '成功',
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/ExportJobStatus' } },
          },
        },
      },
    },
  },
  '/data/export/download/{jobId}': {
    get: {
      tags: ['数据管理'],
      summary: '下载导出文件',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'jobId', in: 'path', required: true, schema: { type: 'string' } }],
      responses: { 200: { description: '下载成功' } },
    },
  },
  '/data/export/{jobId}': {
    delete: {
      tags: ['数据管理'],
      summary: '取消导出任务',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'jobId', in: 'path', required: true, schema: { type: 'string' } }],
      responses: { 200: { description: '取消成功' } },
    },
  },
  '/data/export/history': {
    get: {
      tags: ['数据管理'],
      summary: '获取导出历史',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
        { name: 'status', in: 'query', schema: { type: 'string' } },
      ],
      responses: {
        200: {
          description: '成功',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { type: 'array', items: { type: 'object' } },
                  pagination: { $ref: '#/components/schemas/PaginationMeta' },
                  summary: { type: 'object' },
                },
              },
            },
          },
        },
      },
    },
  },
  '/data/export/formats': {
    get: {
      tags: ['数据管理'],
      summary: '获取支持的导出格式',
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: '成功',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { type: 'array', items: { type: 'string' } },
                  summary: { type: 'object' },
                },
              },
            },
          },
        },
      },
    },
  },
  '/data/export/cleanup': {
    delete: {
      tags: ['数据管理'],
      summary: '清理过期导出文件',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'olderThan', in: 'query', schema: { type: 'integer', default: 7 } }],
      responses: { 200: { description: '清理成功' } },
    },
  },
  '/test/templates': {
    get: {
      tags: ['测试执行'],
      summary: '获取测试模板列表',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'engineType', in: 'query', schema: { type: 'string', enum: REPORT_TYPES } },
        { name: 'workspaceId', in: 'query', schema: { type: 'string' } },
      ],
      responses: {
        200: {
          description: '成功',
          content: {
            'application/json': {
              schema: { type: 'array', items: { $ref: '#/components/schemas/TestTemplate' } },
            },
          },
        },
      },
    },
    post: {
      tags: ['测试执行'],
      summary: '创建测试模板',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                description: { type: 'string' },
                engineType: { type: 'string', enum: REPORT_TYPES },
                config: { type: 'object' },
                isPublic: { type: 'boolean' },
                isDefault: { type: 'boolean' },
                workspaceId: { type: 'string' },
              },
              required: ['name', 'engineType', 'config'],
            },
          },
        },
      },
      responses: { 201: { description: '创建成功' } },
    },
  },
  '/test/templates/{templateId}': {
    put: {
      tags: ['测试执行'],
      summary: '更新测试模板',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'templateId', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                description: { type: 'string' },
                engineType: { type: 'string', enum: REPORT_TYPES },
                config: { type: 'object' },
                isPublic: { type: 'boolean' },
                isDefault: { type: 'boolean' },
                workspaceId: { type: 'string' },
              },
            },
          },
        },
      },
      responses: { 200: { description: '更新成功' } },
    },
    delete: {
      tags: ['测试执行'],
      summary: '删除测试模板',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'templateId', in: 'path', required: true, schema: { type: 'string' } }],
      responses: { 200: { description: '删除成功' } },
    },
  },
};

// 合并路径定义（按模块分区与字母顺序排序）
const apiPathGroups = ['/auth', '/data', '/system', '/test'];
const resolveGroupIndex = (pathKey: string) => {
  const foundIndex = apiPathGroups.findIndex(prefix => pathKey.startsWith(prefix));
  return foundIndex === -1 ? apiPathGroups.length : foundIndex;
};
const orderedApiPaths = Object.keys(apiPaths)
  .sort((a, b) => {
    const groupA = resolveGroupIndex(a);
    const groupB = resolveGroupIndex(b);
    if (groupA !== groupB) {
      return groupA - groupB;
    }
    return a.localeCompare(b);
  })
  .reduce<Record<string, unknown>>((acc, key) => {
    acc[key] = apiPaths[key];
    return acc;
  }, {});

swaggerDefinition.paths = orderedApiPaths;

// Swagger配置选项
const options: SwaggerOptions = {
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
  customfavIcon: '/favicon.ico',
};

/**
 * 设置Swagger文档路由
 */
function setupSwaggerDocs(app: {
  use: (...args: unknown[]) => void;
  get: (...args: unknown[]) => void;
}) {
  // Swagger UI
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));

  // JSON格式的API规范
  app.get(
    '/api/docs.json',
    (
      req: unknown,
      res: { setHeader: (name: string, value: string) => void; send: (data: unknown) => void }
    ) => {
      void req;
      res.setHeader('Content-Type', 'application/json');
      res.send(swaggerSpec);
    }
  );
}

module.exports = {
  swaggerSpec,
  setupSwaggerDocs,
};
