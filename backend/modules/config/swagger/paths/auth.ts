/**
 * Swagger API 路径 - 认证模块
 */

export const authPaths: Record<string, unknown> = {
  '/auth/login': {
    post: {
      tags: ['认证'],
      summary: '用户登录',
      description: '使用邮箱和密码登录，获取JWT令牌',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/LoginRequest' },
            examples: {
              normal: {
                summary: '普通登录',
                value: { email: 'user@example.com', password: '********', rememberMe: false },
              },
              rememberMe: {
                summary: '记住登录',
                value: { email: 'admin@example.com', password: '********', rememberMe: true },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: '登录成功',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginResponse' } } },
        },
        400: {
          description: '请求参数错误',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
        },
        401: {
          description: '认证失败',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: {
                success: false,
                error: {
                  message: '邮箱或密码错误',
                  type: 'AUTHENTICATION_ERROR',
                  errorId: 'ERR-1234567890-ABCDEF',
                  timestamp: '2025-01-19T10:00:00.000Z',
                },
              },
            },
          },
        },
      },
    },
  },

  '/auth/verify-email': {
    post: {
      tags: ['认证'],
      summary: '邮箱验证',
      description:
        '使用验证令牌完成邮箱验证。限流：默认 15 分钟内最多 10 次，可通过 EMAIL_VERIFICATION_WINDOW_MS 与 EMAIL_VERIFICATION_MAX_ATTEMPTS 配置。',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: { token: { type: 'string', example: 'verification-token' } },
              required: ['token'],
            },
          },
        },
      },
      responses: {
        200: {
          description: '验证成功',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } },
        },
        400: {
          description: '验证失败',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
        },
        429: {
          description: '请求过于频繁',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
        },
      },
    },
  },

  '/auth/resend-verification': {
    post: {
      tags: ['认证'],
      summary: '重发邮箱验证邮件',
      description:
        '重新发送邮箱验证邮件。限流：默认 1 小时内最多 5 次，可通过 RESEND_VERIFICATION_WINDOW_MS 与 RESEND_VERIFICATION_MAX_ATTEMPTS 配置。',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: { email: { type: 'string', format: 'email', example: 'user@example.com' } },
              required: ['email'],
            },
          },
        },
      },
      responses: {
        200: {
          description: '发送成功',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } },
        },
        400: {
          description: '请求无效',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
        },
        404: {
          description: '用户不存在',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
        },
        429: {
          description: '请求过于频繁',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
        },
      },
    },
  },
};
