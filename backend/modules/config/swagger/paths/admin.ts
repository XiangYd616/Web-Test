/**
 * Swagger API 路径 - 管理后台模块
 */

export const adminPaths: Record<string, unknown> = {
  '/admin/users': {
    get: {
      tags: ['系统管理'],
      summary: '获取用户列表（管理员）',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
        { name: 'role', in: 'query', schema: { type: 'string' } },
        { name: 'search', in: 'query', schema: { type: 'string' } },
      ],
      responses: {
        200: {
          description: '成功',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { type: 'array', items: { $ref: '#/components/schemas/User' } },
                  pagination: { $ref: '#/components/schemas/PaginationMeta' },
                },
              },
            },
          },
        },
      },
    },
  },
  '/admin/users/{id}': {
    put: {
      tags: ['系统管理'],
      summary: '更新用户（管理员）',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                role: { type: 'string', enum: ['user', 'admin', 'superadmin'] },
                status: { type: 'string', enum: ['active', 'disabled'] },
              },
            },
          },
        },
      },
      responses: { 200: { description: '更新成功' } },
    },
    delete: {
      tags: ['系统管理'],
      summary: '删除用户（管理员）',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: { 200: { description: '删除成功' } },
    },
  },
  '/admin/stats': {
    get: {
      tags: ['系统管理'],
      summary: '获取系统统计（管理员）',
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: '成功',
          content: {
            'application/json': {
              schema: { type: 'object', properties: { data: { type: 'object' } } },
            },
          },
        },
      },
    },
  },
};
