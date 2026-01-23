/**
 * OAuth 路由集成测试
 */

const request = require('supertest');
const express = require('express');

const mockService = {
  getSupportedProviders: jest.fn(),
  generateAuthUrl: jest.fn(),
  handleCallback: jest.fn(),
};

jest.mock('../services/oauth/OAuthService', () => {
  return jest.fn().mockImplementation(() => mockService);
});

const { responseFormatter } = require('../middleware/responseFormatter');
const oauthRouter = require('../routes/oauth').default;

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use(responseFormatter);
  app.use('/api/oauth', oauthRouter);
  return app;
};

describe('oauth 路由', () => {
  let app: any;

  beforeEach(() => {
    jest.clearAllMocks();
    app = createApp();
  });

  test('GET /api/oauth/providers 返回提供商列表', async () => {
    mockService.getSupportedProviders.mockReturnValue(['google', 'github']);

    const response = await request(app).get('/api/oauth/providers');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.providers).toEqual(['google', 'github']);
  });

  test('GET /api/oauth/:provider/url 返回授权地址', async () => {
    mockService.generateAuthUrl.mockReturnValue('http://oauth.url');

    const response = await request(app).get('/api/oauth/google/url');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.url).toBe('http://oauth.url');
  });

  test('POST /api/oauth/:provider/callback 返回 token', async () => {
    mockService.handleCallback.mockResolvedValue({
      success: true,
      tokens: { accessToken: 'token', refreshToken: 'refresh', expiresIn: 3600 },
      user: { id: 'user-1', email: 'user@example.com', username: 'oauth_user' },
    });

    const response = await request(app)
      .post('/api/oauth/google/callback')
      .send({ code: 'code', state: 'state' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.token).toBe('token');
  });
});
