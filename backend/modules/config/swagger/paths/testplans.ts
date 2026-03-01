/**
 * Swagger API 路径 - 测试计划模块
 */

export const testplansPaths: Record<string, unknown> = {
  '/test-plans': {
    get: {
      tags: ['测试计划'],
      summary: '获取测试计划列表',
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
                  data: { type: 'array', items: { $ref: '#/components/schemas/TestPlan' } },
                  pagination: { $ref: '#/components/schemas/PaginationMeta' },
                },
              },
            },
          },
        },
      },
    },
    post: {
      tags: ['测试计划'],
      summary: '创建测试计划',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                name: { type: 'string', example: '上线前检查' },
                description: { type: 'string' },
                steps: { type: 'array', items: { type: 'object' } },
                failure_strategy: { type: 'string', enum: ['continue', 'abort'], default: 'continue' },
                workspaceId: { type: 'string' },
              },
              required: ['name', 'steps'],
            },
          },
        },
      },
      responses: { 201: { description: '创建成功' } },
    },
  },
  '/test-plans/{id}': {
    get: {
      tags: ['测试计划'],
      summary: '获取测试计划详情',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: {
          description: '成功',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { data: { $ref: '#/components/schemas/TestPlan' } },
              },
            },
          },
        },
      },
    },
    put: {
      tags: ['测试计划'],
      summary: '更新测试计划',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { type: 'object' } } },
      },
      responses: { 200: { description: '更新成功' } },
    },
    delete: {
      tags: ['测试计划'],
      summary: '删除测试计划',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: { 200: { description: '删除成功' } },
    },
  },
  '/test-plans/{id}/execute': {
    post: {
      tags: ['测试计划'],
      summary: '执行测试计划',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: {
          description: '执行开始',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { data: { type: 'object', properties: { executionId: { type: 'string' } } } },
              },
            },
          },
        },
      },
    },
  },
  '/test-plans/executions/{executionId}': {
    get: {
      tags: ['测试计划'],
      summary: '获取执行状态',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'executionId', in: 'path', required: true, schema: { type: 'string' } }],
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
  '/test-plans/executions/{executionId}/cancel': {
    post: {
      tags: ['测试计划'],
      summary: '取消执行',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'executionId', in: 'path', required: true, schema: { type: 'string' } }],
      responses: { 200: { description: '取消成功' } },
    },
  },
};
