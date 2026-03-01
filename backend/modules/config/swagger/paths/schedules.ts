/**
 * Swagger API 路径 - 定时任务模块
 */

export const schedulesPaths: Record<string, unknown> = {
  '/schedules': {
    get: {
      tags: ['定时任务'],
      summary: '获取定时任务列表',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'workspaceId', in: 'query', schema: { type: 'string' } },
        { name: 'status', in: 'query', schema: { type: 'string', enum: ['active', 'paused', 'disabled'] } },
      ],
      responses: {
        200: {
          description: '成功',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { type: 'array', items: { $ref: '#/components/schemas/ScheduledRun' } },
                  pagination: { $ref: '#/components/schemas/PaginationMeta' },
                },
              },
            },
          },
        },
      },
    },
    post: {
      tags: ['定时任务'],
      summary: '创建定时任务',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                name: { type: 'string', example: '每日性能检查' },
                cron: { type: 'string', example: '0 8 * * *' },
                test_config: { type: 'object' },
                workspaceId: { type: 'string' },
              },
              required: ['name', 'cron', 'test_config'],
            },
          },
        },
      },
      responses: { 201: { description: '创建成功' } },
    },
  },
  '/schedules/{id}': {
    get: {
      tags: ['定时任务'],
      summary: '获取定时任务详情',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: {
          description: '成功',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { data: { $ref: '#/components/schemas/ScheduledRun' } },
              },
            },
          },
        },
      },
    },
    put: {
      tags: ['定时任务'],
      summary: '更新定时任务',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { type: 'object' } } },
      },
      responses: { 200: { description: '更新成功' } },
    },
    delete: {
      tags: ['定时任务'],
      summary: '删除定时任务',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: { 200: { description: '删除成功' } },
    },
  },
  '/schedules/{id}/pause': {
    post: {
      tags: ['定时任务'],
      summary: '暂停定时任务',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: { 200: { description: '暂停成功' } },
    },
  },
  '/schedules/{id}/resume': {
    post: {
      tags: ['定时任务'],
      summary: '恢复定时任务',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: { 200: { description: '恢复成功' } },
    },
  },
  '/schedules/{id}/run': {
    post: {
      tags: ['定时任务'],
      summary: '手动执行定时任务',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: { 200: { description: '执行成功' } },
    },
  },
};
