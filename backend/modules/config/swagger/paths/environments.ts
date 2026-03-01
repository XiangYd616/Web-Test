/**
 * Swagger API 路径 - 环境变量模块
 */

export const environmentsPaths: Record<string, unknown> = {
  '/environments': {
    get: {
      tags: ['环境管理'],
      summary: '获取环境列表',
      security: [{ bearerAuth: [] }],
      parameters: [
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
                  data: { type: 'array', items: { $ref: '#/components/schemas/Environment' } },
                },
              },
            },
          },
        },
      },
    },
    post: {
      tags: ['环境管理'],
      summary: '创建环境',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                name: { type: 'string', example: '开发环境' },
                variables: { type: 'object', additionalProperties: { type: 'string' } },
                workspace_id: { type: 'string' },
              },
              required: ['name'],
            },
          },
        },
      },
      responses: { 201: { description: '创建成功' } },
    },
  },
  '/environments/{id}': {
    get: {
      tags: ['环境管理'],
      summary: '获取环境详情',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: {
          description: '成功',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { data: { $ref: '#/components/schemas/Environment' } },
              },
            },
          },
        },
      },
    },
    put: {
      tags: ['环境管理'],
      summary: '更新环境',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { type: 'object' } } },
      },
      responses: { 200: { description: '更新成功' } },
    },
    delete: {
      tags: ['环境管理'],
      summary: '删除环境',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: { 200: { description: '删除成功' } },
    },
  },
};
