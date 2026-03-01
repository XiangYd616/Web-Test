/**
 * Swagger API 路径 - 测试历史模块
 */

export const historyPaths: Record<string, unknown> = {
  '/test/history': {
    get: {
      tags: ['测试历史'],
      summary: '获取测试历史',
      description: '获取用户的测试历史记录',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 }, description: '页码' },
        {
          name: 'limit',
          in: 'query',
          schema: { type: 'integer', default: 20, maximum: 100 },
          description: '每页数量',
        },
        { name: 'testType', in: 'query', schema: { type: 'string' }, description: '测试类型筛选' },
        {
          name: 'status',
          in: 'query',
          schema: { type: 'string', enum: ['completed', 'failed', 'running'] },
          description: '状态筛选',
        },
      ],
      responses: {
        200: {
          description: '成功获取测试历史',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { type: 'array', items: { $ref: '#/components/schemas/TestResult' } },
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
};
