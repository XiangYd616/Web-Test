/**
 * Swagger API 路径 - 集合模块
 */

export const collectionsPaths: Record<string, unknown> = {
  '/collections': {
    get: {
      tags: ['集合管理'],
      summary: '获取集合列表',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'workspaceId', in: 'query', schema: { type: 'string' } },
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
      ],
      responses: {
        200: {
          description: '成功',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { type: 'array', items: { $ref: '#/components/schemas/Collection' } },
                  pagination: { $ref: '#/components/schemas/PaginationMeta' },
                },
              },
            },
          },
        },
      },
    },
    post: {
      tags: ['集合管理'],
      summary: '创建集合',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                name: { type: 'string', example: 'API 集合' },
                description: { type: 'string' },
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
  '/collections/{id}': {
    get: {
      tags: ['集合管理'],
      summary: '获取集合详情',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: {
          description: '成功',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { data: { $ref: '#/components/schemas/Collection' } },
              },
            },
          },
        },
      },
    },
    put: {
      tags: ['集合管理'],
      summary: '更新集合',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { type: 'object' } } },
      },
      responses: { 200: { description: '更新成功' } },
    },
    delete: {
      tags: ['集合管理'],
      summary: '删除集合',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: { 200: { description: '删除成功' } },
    },
  },
  '/collections/{id}/requests': {
    get: {
      tags: ['集合管理'],
      summary: '获取集合内的请求列表',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: {
          description: '成功',
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
    post: {
      tags: ['集合管理'],
      summary: '添加请求到集合',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { type: 'object' } } },
      },
      responses: { 201: { description: '添加成功' } },
    },
  },
};
