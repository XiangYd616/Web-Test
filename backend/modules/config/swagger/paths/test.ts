/**
 * Swagger API 路径 - 测试执行模块
 */

import { REPORT_TYPES } from '../../../../../shared/types/testEngine.types';

export const testPaths: Record<string, unknown> = {
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
                  options: { timeout: 30000, retries: 3 },
                },
              },
              stress: {
                summary: '压力测试',
                value: {
                  url: 'https://example.com',
                  testType: 'stress',
                  options: { concurrent: 50, duration: 60000 },
                },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: '测试开始执行',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { $ref: '#/components/schemas/TestResult' },
                },
              },
            },
          },
        },
        400: {
          description: '请求参数错误',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
        },
      },
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
                properties: { data: { $ref: '#/components/schemas/QueueJob' } },
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
