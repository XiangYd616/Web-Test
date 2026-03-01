/**
 * Swagger API 路径 - 对比分析模块
 */

export const comparisonPaths: Record<string, unknown> = {
  '/comparison/compare': {
    post: {
      tags: ['报告分析'],
      summary: '对比两个测试结果',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                currentTestId: { type: 'string' },
                previousTestId: { type: 'string' },
              },
              required: ['currentTestId', 'previousTestId'],
            },
          },
        },
      },
      responses: {
        200: {
          description: '对比完成',
          content: { 'application/json': { schema: { type: 'object' } } },
        },
      },
    },
  },
  '/comparison/trend': {
    post: {
      tags: ['报告分析'],
      summary: '趋势分析',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                testId: { type: 'string' },
                period: { type: 'string' },
                metrics: { type: 'array', items: { type: 'string' } },
              },
              required: ['testId', 'period'],
            },
          },
        },
      },
      responses: {
        200: {
          description: '趋势分析完成',
          content: { 'application/json': { schema: { type: 'object' } } },
        },
      },
    },
  },
  '/comparison/history': {
    get: {
      tags: ['报告分析'],
      summary: '获取对比记录列表',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
        { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } },
        { name: 'comparisonType', in: 'query', schema: { type: 'string', example: 'benchmark' } },
      ],
      responses: {
        200: {
          description: '成功',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  records: { type: 'array', items: { $ref: '#/components/schemas/ComparisonRecord' } },
                  total: { type: 'integer' },
                  pagination: { $ref: '#/components/schemas/PaginationMeta' },
                },
              },
            },
          },
        },
      },
    },
  },
  '/comparison/history/benchmark': {
    get: {
      tags: ['报告分析'],
      summary: '获取基准测试对比记录',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
        { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } },
      ],
      responses: {
        200: {
          description: '成功',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  records: { type: 'array', items: { $ref: '#/components/schemas/ComparisonRecord' } },
                  total: { type: 'integer' },
                  pagination: { $ref: '#/components/schemas/PaginationMeta' },
                },
              },
            },
          },
        },
      },
    },
  },
  '/comparison/benchmark': {
    post: {
      tags: ['报告分析'],
      summary: '基准测试对比',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                benchmarkType: { type: 'string' },
                testResult: { type: 'object' },
              },
              required: ['benchmarkType', 'testResult'],
            },
          },
        },
      },
      responses: {
        200: {
          description: '对比完成',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/BenchmarkComparisonResult' },
            },
          },
        },
      },
    },
  },
  '/comparison/benchmarks': {
    get: {
      tags: ['报告分析'],
      summary: '获取可用基准测试',
      parameters: [{ name: 'testType', in: 'query', schema: { type: 'string' } }],
      responses: { 200: { description: '成功' } },
    },
  },
  '/comparison/summary': {
    post: {
      tags: ['报告分析'],
      summary: '生成对比摘要',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                comparisons: { type: 'array', items: { type: 'object' } },
                groupBy: {
                  type: 'string',
                  enum: ['benchmark', 'category', 'environment'],
                  description: '默认按 benchmark 分组',
                },
              },
              required: ['comparisons'],
            },
          },
        },
      },
      responses: {
        200: {
          description: '成功',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ComparisonSummary' },
            },
          },
        },
      },
    },
  },
  '/comparison/metrics': {
    get: {
      tags: ['报告分析'],
      summary: '获取对比指标',
      parameters: [{ name: 'testType', in: 'query', schema: { type: 'string' } }],
      responses: { 200: { description: '成功' } },
    },
  },
  '/comparison/export': {
    post: {
      tags: ['报告分析'],
      summary: '导出对比报告',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                comparisonId: { type: 'string' },
                format: { type: 'string', enum: ['json', 'csv'], default: 'json' },
                options: { type: 'object' },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: '导出成功',
          content: { 'application/octet-stream': { schema: { type: 'string', format: 'binary' } } },
        },
      },
    },
  },
};
