/**
 * Swagger 共享 Schema 定义
 * @description 所有模块共用的通用响应模型和业务模型
 */

import { REPORT_TYPES } from '../../../../shared/types/testEngine.types';

export const commonSchemas = {
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

  // 用户模型
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

  // 认证模型
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

  // 测试模型
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
          timeout: { type: 'integer', example: 30000, description: '超时时间（毫秒）' },
          retries: { type: 'integer', example: 3, description: '重试次数' },
          concurrent: { type: 'integer', example: 10, description: '并发数（压力测试）' },
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
      score: { type: 'number', minimum: 0, maximum: 100, example: 85.5 },
      metrics: { type: 'object', description: '测试指标', additionalProperties: true },
      issues: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            severity: { type: 'string', enum: ['critical', 'major', 'minor', 'info'] },
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

  // 对比模型
  ComparisonRecord: {
    type: 'object',
    properties: {
      id: { type: 'string', example: 'cmp-123' },
      name: { type: 'string', example: 'test-a vs test-b' },
      type: { type: 'string', example: 'benchmark' },
      createdAt: { type: 'string', format: 'date-time' },
    },
  },
  BenchmarkComparisonResult: {
    type: 'object',
    properties: {
      comparisonId: { type: 'string', nullable: true },
      hasBaseline: { type: 'boolean' },
      benchmark: { type: 'object' },
      current: { type: 'object' },
      comparison: { type: 'object', nullable: true },
    },
  },
  ComparisonSummary: {
    type: 'object',
    properties: {
      total: { type: 'integer' },
      improving: { type: 'integer' },
      degrading: { type: 'integer' },
      stable: { type: 'integer' },
      averageChangePercent: { type: 'number' },
      groups: { type: 'object' },
    },
  },

  // 监控模型
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

  // 导出/导入模型
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

  // 测试模板
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

  // 告警模型
  Alert: {
    type: 'object',
    properties: {
      id: { type: 'string', example: 'alert-123' },
      alert_type: { type: 'string', example: 'monitoring' },
      severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'], example: 'high' },
      status: { type: 'string', enum: ['active', 'acknowledged', 'resolved'], example: 'active' },
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

  // 错误模型
  ErrorReport: {
    type: 'object',
    properties: {
      id: { type: 'string', example: 'error-123' },
      type: { type: 'string', example: 'runtime' },
      severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'], example: 'high' },
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

  // 队列模型
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

  // 报告模板
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

  // 工作空间模型
  Workspace: {
    type: 'object',
    properties: {
      id: { type: 'string', example: 'ws-123' },
      name: { type: 'string', example: '我的工作空间' },
      description: { type: 'string' },
      owner_id: { type: 'string' },
      created_at: { type: 'string', format: 'date-time' },
      updated_at: { type: 'string', format: 'date-time' },
    },
  },

  // 集合模型
  Collection: {
    type: 'object',
    properties: {
      id: { type: 'string', example: 'col-123' },
      name: { type: 'string', example: 'API 集合' },
      description: { type: 'string' },
      workspace_id: { type: 'string' },
      created_at: { type: 'string', format: 'date-time' },
      updated_at: { type: 'string', format: 'date-time' },
    },
  },

  // 环境模型
  Environment: {
    type: 'object',
    properties: {
      id: { type: 'string', example: 'env-123' },
      name: { type: 'string', example: '开发环境' },
      variables: { type: 'object', additionalProperties: { type: 'string' } },
      workspace_id: { type: 'string' },
      created_at: { type: 'string', format: 'date-time' },
      updated_at: { type: 'string', format: 'date-time' },
    },
  },

  // 定时任务模型
  ScheduledRun: {
    type: 'object',
    properties: {
      id: { type: 'string', example: 'sched-123' },
      name: { type: 'string', example: '每日性能检查' },
      cron: { type: 'string', example: '0 8 * * *' },
      test_config: { type: 'object' },
      status: { type: 'string', enum: ['active', 'paused', 'disabled'] },
      last_run_at: { type: 'string', format: 'date-time', nullable: true },
      next_run_at: { type: 'string', format: 'date-time', nullable: true },
      created_at: { type: 'string', format: 'date-time' },
    },
  },

  // 测试计划模型
  TestPlan: {
    type: 'object',
    properties: {
      id: { type: 'string', example: 'plan-123' },
      name: { type: 'string', example: '上线前检查' },
      description: { type: 'string' },
      steps: { type: 'array', items: { type: 'object' } },
      failure_strategy: { type: 'string', enum: ['continue', 'abort'], default: 'continue' },
      workspace_id: { type: 'string' },
      created_at: { type: 'string', format: 'date-time' },
      updated_at: { type: 'string', format: 'date-time' },
    },
  },

  // CI 模型
  CIPipeline: {
    type: 'object',
    properties: {
      id: { type: 'string', example: 'ci-123' },
      name: { type: 'string', example: 'CI 流水线' },
      provider: { type: 'string', enum: ['github', 'gitlab', 'jenkins'] },
      config: { type: 'object' },
      status: { type: 'string', enum: ['active', 'inactive'] },
      created_at: { type: 'string', format: 'date-time' },
    },
  },
} as const;
