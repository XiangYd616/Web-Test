/**
 * Swagger API 路径 - 系统管理模块（监控+告警+错误+报告）
 */

import { REPORT_TYPES } from '../../../../../shared/types/testEngine.types';

export const systemPaths: Record<string, unknown> = {
  // ==================== 监控 ====================
  '/system/monitoring/sites': {
    get: {
      tags: ['系统管理'],
      summary: '获取监控站点列表',
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
      summary: '添加监控站点',
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
                monitoring_type: { type: 'string' },
                check_interval: { type: 'integer' },
                timeout: { type: 'integer' },
                workspaceId: { type: 'string' },
              },
              required: ['name', 'url'],
            },
          },
        },
      },
      responses: { 201: { description: '创建成功' } },
    },
  },
  '/system/monitoring/sites/{id}': {
    get: {
      tags: ['系统管理'],
      summary: '获取监控站点详情',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: {
          description: '成功',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { data: { $ref: '#/components/schemas/MonitoringSite' } },
              },
            },
          },
        },
      },
    },
    put: {
      tags: ['系统管理'],
      summary: '更新监控站点',
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
      summary: '删除监控站点',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: { 200: { description: '删除成功' } },
    },
  },
  '/system/monitoring/summary': {
    get: {
      tags: ['系统管理'],
      summary: '获取监控总览',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'workspaceId', in: 'query', schema: { type: 'string' } }],
      responses: {
        200: {
          description: '成功',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { data: { type: 'object' }, summary: { type: 'object' } },
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
                properties: { data: { type: 'object' }, summary: { type: 'object' } },
              },
            },
          },
        },
      },
    },
  },

  // ==================== 告警 ====================
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
                properties: { data: { type: 'array', items: { type: 'string' } } },
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

  // ==================== 错误 ====================
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
                properties: { data: { type: 'object', properties: { id: { type: 'string' } } } },
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
                properties: { data: { type: 'object' }, summary: { type: 'object' } },
              },
            },
          },
        },
      },
    },
  },

  // ==================== 报告 ====================
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
};
