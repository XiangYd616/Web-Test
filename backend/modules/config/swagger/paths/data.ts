/**
 * Swagger API 路径 - 数据管理模块（导入+导出）
 */

export const dataPaths: Record<string, unknown> = {
  // ==================== 导入 ====================
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
                properties: { data: { $ref: '#/components/schemas/ImportTaskStatus' } },
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
                properties: { data: { $ref: '#/components/schemas/ImportTaskStatus' } },
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
          content: { 'application/octet-stream': { schema: { type: 'string', format: 'binary' } } },
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
                properties: { data: { type: 'array', items: { type: 'object' } } },
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
                properties: { data: { type: 'object' }, summary: { type: 'object' } },
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
                properties: { data: { $ref: '#/components/schemas/ImportTaskStatus' } },
              },
            },
          },
        },
      },
    },
  },

  // ==================== 导出 ====================
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
};
