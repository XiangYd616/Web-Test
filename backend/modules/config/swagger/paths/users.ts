/**
 * Swagger API 路径 - 用户管理模块
 */

export const usersPaths: Record<string, unknown> = {
  '/users/profile': {
    get: {
      tags: ['用户管理'],
      summary: '获取当前用户信息',
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: '成功',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { data: { $ref: '#/components/schemas/User' } },
              },
            },
          },
        },
      },
    },
    put: {
      tags: ['用户管理'],
      summary: '更新当前用户信息',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                username: { type: 'string' },
                email: { type: 'string', format: 'email' },
                avatar: { type: 'string' },
              },
            },
          },
        },
      },
      responses: { 200: { description: '更新成功' } },
    },
  },
  '/users/password': {
    put: {
      tags: ['用户管理'],
      summary: '修改密码',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                currentPassword: { type: 'string', format: 'password' },
                newPassword: { type: 'string', format: 'password' },
              },
              required: ['currentPassword', 'newPassword'],
            },
          },
        },
      },
      responses: {
        200: { description: '修改成功' },
        400: {
          description: '当前密码错误',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
        },
      },
    },
  },
  '/users/settings': {
    get: {
      tags: ['用户管理'],
      summary: '获取用户设置',
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
    put: {
      tags: ['用户管理'],
      summary: '更新用户设置',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { type: 'object' } } },
      },
      responses: { 200: { description: '更新成功' } },
    },
  },
};
