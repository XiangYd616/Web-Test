/**
 * Swagger API 路径 - CI/CD 集成模块
 */

export const ciPaths: Record<string, unknown> = {
  '/ci/pipelines': {
    get: {
      tags: ['集成'],
      summary: '获取 CI 流水线列表',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'workspaceId', in: 'query', schema: { type: 'string' } },
        { name: 'status', in: 'query', schema: { type: 'string', enum: ['active', 'inactive'] } },
      ],
      responses: {
        200: {
          description: '成功',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { type: 'array', items: { $ref: '#/components/schemas/CIPipeline' } },
                },
              },
            },
          },
        },
      },
    },
    post: {
      tags: ['集成'],
      summary: '创建 CI 流水线',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                provider: { type: 'string', enum: ['github', 'gitlab', 'jenkins'] },
                config: { type: 'object' },
                workspaceId: { type: 'string' },
              },
              required: ['name', 'provider', 'config'],
            },
          },
        },
      },
      responses: { 201: { description: '创建成功' } },
    },
  },
  '/ci/pipelines/{id}': {
    get: {
      tags: ['集成'],
      summary: '获取 CI 流水线详情',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: {
          description: '成功',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { data: { $ref: '#/components/schemas/CIPipeline' } },
              },
            },
          },
        },
      },
    },
    put: {
      tags: ['集成'],
      summary: '更新 CI 流水线',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { type: 'object' } } },
      },
      responses: { 200: { description: '更新成功' } },
    },
    delete: {
      tags: ['集成'],
      summary: '删除 CI 流水线',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: { 200: { description: '删除成功' } },
    },
  },
  '/ci/pipelines/{id}/trigger': {
    post: {
      tags: ['集成'],
      summary: '手动触发 CI 流水线',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: { 200: { description: '触发成功' } },
    },
  },
  '/ci/webhook': {
    post: {
      tags: ['集成'],
      summary: 'CI Webhook 回调',
      description: '接收来自 CI 平台的 Webhook 通知',
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { type: 'object' } } },
      },
      responses: { 200: { description: '处理成功' } },
    },
  },
};
