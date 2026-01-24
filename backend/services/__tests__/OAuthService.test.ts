/**
 * OAuthService 单元测试
 */

jest.useFakeTimers();

jest.mock('../../config/database', () => ({
  query: jest.fn(),
}));

jest.mock('../../src/utils/securityLogger', () => ({
  logSecurityEvent: jest.fn(),
  SecurityEventType: {
    OAUTH_LOGIN: 'oauth_login',
    OAUTH_LOGIN_FAILED: 'oauth_login_failed',
  },
}));

const mockGenerateTokenPair = jest.fn();

jest.mock('../core/jwtService', () => {
  return jest.fn().mockImplementation(() => ({
    generateTokenPair: mockGenerateTokenPair,
  }));
});

jest.mock('axios', () => ({
  post: jest.fn(),
  get: jest.fn(),
}));

const axios = require('axios');
const { query } = require('../../config/database');
const OAuthService = require('../oauth/OAuthService').default;

const baseEnv = {
  GOOGLE_CLIENT_ID: 'google-client',
  GOOGLE_CLIENT_SECRET: 'google-secret',
  GOOGLE_REDIRECT_URI: 'http://localhost:3001/api/oauth/google/callback',
};

describe('OAuthService', () => {
  let service: any;

  beforeEach(() => {
    process.env.GOOGLE_CLIENT_ID = baseEnv.GOOGLE_CLIENT_ID;
    process.env.GOOGLE_CLIENT_SECRET = baseEnv.GOOGLE_CLIENT_SECRET;
    process.env.GOOGLE_REDIRECT_URI = baseEnv.GOOGLE_REDIRECT_URI;

    jest.clearAllMocks();
    service = new OAuthService();
  });

  test('generateAuthUrl 应返回授权地址并包含 state', () => {
    const url = service.generateAuthUrl('google');
    expect(url).toContain('https://accounts.google.com/o/oauth2/v2/auth');
    expect(url).toContain('state=');
  });

  test('handleCallback 成功返回 token 与用户信息', async () => {
    const authUrl = service.generateAuthUrl('google');
    const state = new URL(authUrl).searchParams.get('state');
    const code = 'auth-code';

    expect(state).toBeTruthy();

    axios.post.mockResolvedValue({
      data: { access_token: 'access-token', token_type: 'Bearer', expires_in: 3600 },
    });
    axios.get.mockResolvedValue({
      data: { id: 'oauth-id', email: 'user@example.com', name: 'OAuth User' },
    });

    query.mockResolvedValueOnce({ rows: [] });
    query.mockResolvedValueOnce({ rows: [{ id: 'user-1' }] });
    query.mockResolvedValueOnce({
      rows: [
        {
          id: 'user-1',
          email: 'user@example.com',
          username: 'oauth_user',
          provider: 'google',
          providerId: 'oauth-id',
          createdAt: new Date(),
        },
      ],
    });
    query.mockResolvedValueOnce({ rows: [] });

    mockGenerateTokenPair.mockResolvedValue({
      accessToken: 'jwt-access',
      refreshToken: 'jwt-refresh',
      expiresIn: 3600,
    });

    const result = await service.handleCallback('google', code, state as string);

    expect(result.success).toBe(true);
    expect(result.tokens?.accessToken).toBe('jwt-access');
    expect(mockGenerateTokenPair).toHaveBeenCalled();
  });

  test('handleCallback 状态不合法返回失败', async () => {
    const result = await service.handleCallback('google', 'code', 'invalid-state');

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid or expired OAuth state');
  });
});
