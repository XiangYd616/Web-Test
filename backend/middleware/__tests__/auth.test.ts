/**
 * 认证中间件单元测试
 * @description 测试JWT认证、权限验证等核心认证功能
 */

// Mock环境变量
process.env.JWT_SECRET = 'test-secret-key';
process.env.JWT_EXPIRES_IN = '1h';

// Mock数据库查询
jest.mock('../../config/database', () => ({
  query: jest.fn(),
}));

// Mock JWT 服务
const mockVerifyAccessToken = jest.fn();
jest.mock('../../services/core/jwtService', () => {
  return jest.fn().mockImplementation(() => ({
    verifyAccessToken: mockVerifyAccessToken,
  }));
});

const { authMiddleware, requireRole, require2FA } = require('../auth');
const { ErrorCode } = require('../errorHandler');
const { query: mockQuery } = require('../../config/database');

describe('认证中间件测试', () => {
  let req: any, res: any, next: jest.Mock;

  beforeEach(() => {
    req = {
      headers: {},
      header: jest.fn((key: string) => req.headers[key.toLowerCase()]),
      user: null,
      ip: '127.0.0.1',
      originalUrl: '/test',
      method: 'GET',
    };
    res = {
      unauthorized: jest.fn().mockReturnThis(),
      forbidden: jest.fn().mockReturnThis(),
      error: jest.fn().mockReturnThis(),
      serverError: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('authMiddleware', () => {
    test('缺少令牌时返回未授权', async () => {
      await authMiddleware(req, res, next);

      expect(res.unauthorized).toHaveBeenCalledWith('访问被拒绝，需要认证令牌');
      expect(next).not.toHaveBeenCalled();
    });

    test('令牌无效时返回错误', async () => {
      req.headers.authorization = 'Bearer invalid-token';
      mockVerifyAccessToken.mockImplementation(() => {
        throw { code: ErrorCode.INVALID_TOKEN };
      });

      await authMiddleware(req, res, next);

      expect(res.error).toHaveBeenCalledWith(ErrorCode.INVALID_TOKEN, '令牌无效');
    });

    test('令牌过期时返回错误', async () => {
      req.headers.authorization = 'Bearer expired-token';
      mockVerifyAccessToken.mockImplementation(() => {
        throw { code: ErrorCode.TOKEN_EXPIRED };
      });

      await authMiddleware(req, res, next);

      expect(res.error).toHaveBeenCalledWith(ErrorCode.TOKEN_EXPIRED, '令牌已过期，请重新登录');
    });

    test('用户不存在时返回未授权', async () => {
      req.headers.authorization = 'Bearer valid-token';
      mockVerifyAccessToken.mockReturnValue({ userId: 'user123' });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await authMiddleware(req, res, next);

      expect(res.unauthorized).toHaveBeenCalledWith('令牌无效，用户不存在');
    });

    test('用户被禁用时返回禁止', async () => {
      req.headers.authorization = 'Bearer valid-token';
      mockVerifyAccessToken.mockReturnValue({ userId: 'user123' });
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'user123',
            email: 'user@example.com',
            username: 'test',
            role: 'user',
            is_active: false,
          },
        ],
      });

      await authMiddleware(req, res, next);

      expect(res.forbidden).toHaveBeenCalledWith('用户账户已被禁用');
    });

    test('有效令牌时注入用户信息', async () => {
      req.headers.authorization = 'Bearer valid-token';
      mockVerifyAccessToken.mockReturnValue({ userId: 'user123' });
      mockQuery
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'user123',
              email: 'user@example.com',
              username: 'tester',
              role: 'user',
              is_active: true,
              last_login: null,
              email_verified: true,
              two_factor_enabled: false,
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [] });

      await authMiddleware(req, res, next);

      expect(req.user).toEqual({
        id: 'user123',
        email: 'user@example.com',
        username: 'tester',
        role: 'user',
        lastLogin: null,
        emailVerified: true,
        twoFactorEnabled: false,
      });
      expect(next).toHaveBeenCalled();
    });
  });

  describe('requireRole', () => {
    test('未登录时返回未授权', () => {
      const middleware = requireRole('admin');
      middleware(req, res, next);

      expect(res.unauthorized).toHaveBeenCalledWith('需要登录才能访问此资源');
    });

    test('角色不匹配时返回禁止', () => {
      req.user = { id: 'user123', role: 'user' };
      const middleware = requireRole('admin');
      middleware(req, res, next);

      expect(res.forbidden).toHaveBeenCalledWith('您的角色无权访问此资源');
    });

    test('角色匹配时放行', () => {
      req.user = { id: 'user123', role: 'admin' };
      const middleware = requireRole('admin');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('require2FA', () => {
    test('未登录时返回未授权', async () => {
      await require2FA(req, res, next);

      expect(res.unauthorized).toHaveBeenCalledWith('需要登录才能访问此资源');
    });

    test('启用2FA但未验证时返回禁止', async () => {
      req.user = { id: 'user123', role: 'user', twoFactorEnabled: true };
      await require2FA(req, res, next);

      expect(res.forbidden).toHaveBeenCalledWith('需要完成双因素认证');
    });

    test('启用2FA且验证通过时放行', async () => {
      req.user = { id: 'user123', role: 'user', twoFactorEnabled: true };
      req.headers['x-2fa-verified'] = 'true';
      await require2FA(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    test('未启用2FA时放行', async () => {
      req.user = { id: 'user123', role: 'user', twoFactorEnabled: false };
      await require2FA(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });
});
