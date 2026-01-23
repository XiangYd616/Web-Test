/**
 * system/errors 路由集成测试
 */

const request = require('supertest');
const express = require('express');

jest.mock('../../../services/data/DataManagementService', () => ({
  dataManagementService: {
    initialize: jest.fn(),
    queryData: jest.fn(),
  },
}));

jest.mock('../../../utils/ErrorMonitoringSystem', () => ({
  errorMonitoringSystem: {
    initialize: jest.fn(),
    recordError: jest.fn(),
    testAlertChannels: jest.fn().mockResolvedValue({ email: { success: true } }),
  },
}));

const { responseFormatter } = require('../../../middleware/responseFormatter');
const errorsRouter = require('../errors').default;

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use(responseFormatter);
  app.use('/api/system/errors', errorsRouter);
  return app;
};

describe('system errors 路由', () => {
  let app: any;

  beforeEach(() => {
    app = createApp();
  });

  test('GET /api/system/errors 返回分页列表', async () => {
    const { dataManagementService } = require('../../../services/data/DataManagementService');
    dataManagementService.queryData.mockResolvedValue({
      results: [{ id: 'err-1', data: { message: 'boom' } }],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });

    const response = await request(app).get('/api/system/errors');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  test('POST /api/system/errors/alerts/test 返回通道测试结果', async () => {
    const response = await request(app).post('/api/system/errors/alerts/test').send({});

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
