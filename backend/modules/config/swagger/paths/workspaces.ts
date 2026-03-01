/**
 * Swagger API 路径 - 工作空间模块
 */

export const workspacesPaths: Record<string, unknown> = {
  '/workspaces': {
    get: {
      tags: ['工作空间'],
      summary: '获取工作空间列表',
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: '成功',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { type: 'array', items: { $ref: '#/components/schemas/Workspace' } },
                },
              },
            },
          },
        },
      },
    },
    post: {
      tags: ['工作空间'],
      summary: '创建工作空间',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                name: { type: 'string', example: '我的工作空间' },
                description: { type: 'string' },
              },
              required: ['name'],
            },
          },
        },
      },
      responses: { 201: { description: '创建成功' } },
    },
  },
  '/workspaces/{id}': {
    get: {
      tags: ['工作空间'],
      summary: '获取工作空间详情',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: {
          description: '成功',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { data: { $ref: '#/components/schemas/Workspace' } },
              },
            },
          },
        },
      },
    },
    put: {
      tags: ['工作空间'],
      summary: '更新工作空间',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { type: 'object' } } },
      },
      responses: { 200: { description: '更新成功' } },
    },
    delete: {
      tags: ['工作空间'],
      summary: '删除工作空间',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: { 200: { description: '删除成功' } },
    },
  },
  '/workspaces/{id}/members': {
    get: {
      tags: ['工作空间'],
      summary: '获取工作空间成员',
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
      tags: ['工作空间'],
      summary: '添加工作空间成员',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                userId: { type: 'string' },
                role: { type: 'string', enum: ['viewer', 'editor', 'admin', 'owner'] },
              },
              required: ['userId', 'role'],
            },
          },
        },
      },
      responses: { 201: { description: '添加成功' } },
    },
  },
};
