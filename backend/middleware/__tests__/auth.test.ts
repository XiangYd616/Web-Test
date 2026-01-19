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

// 导入被测试的模块
const { authMiddleware, generateToken, verifyToken, requireRole } = require('../auth');

// Mock JWT
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
  verify: jest.fn(),
}));

const jwt = require('jsonwebtoken');

describe('认证中间件测试', () => {
  let req: any, res: any, next: jest.Mock;

  beforeEach(() => {
    // 重置mock对象
    req = {
      headers: {},
      body: {},
      user: null,
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
    next = jest.fn();

    // 重置所有mock
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('JWT令牌生成', () => {
    test('应该成功生成有效的JWT令牌', () => {
      const payload = {
        userId: 'user123',
        username: 'testuser',
        role: 'user',
      };

      const mockToken = 'mock-jwt-token';
      jwt.sign.mockReturnValue(mockToken);

      const token = generateToken(payload);

      expect(token).toBe(mockToken);
      expect(jwt.sign).toHaveBeenCalledWith(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN,
      });
    });

    test('应该处理令牌生成错误', () => {
      const payload = { userId: 'user123' };
      jwt.sign.mockImplementation(() => {
        throw new Error('Token generation failed');
      });

      expect(() => generateToken(payload)).toThrow('Token generation failed');
    });

    test('应该使用默认过期时间', () => {
      delete process.env.JWT_EXPIRES_IN;
      const payload = { userId: 'user123' };
      jwt.sign.mockReturnValue('token');

      generateToken(payload);

      expect(jwt.sign).toHaveBeenCalledWith(payload, process.env.JWT_SECRET, { expiresIn: '24h' });
    });
  });

  describe('JWT令牌验证', () => {
    test('应该成功验证有效的JWT令牌', () => {
      const token = 'valid-jwt-token';
      const decodedPayload = {
        userId: 'user123',
        username: 'testuser',
        role: 'user',
        iat: Date.now() / 1000,
        exp: Date.now() / 1000 + 3600,
      };

      jwt.verify.mockReturnValue(decodedPayload);

      const result = verifyToken(token);

      expect(result).toEqual(decodedPayload);
      expect(jwt.verify).toHaveBeenCalledWith(token, process.env.JWT_SECRET);
    });

    test('应该拒绝无效的JWT令牌', () => {
      const token = 'invalid-jwt-token';
      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      expect(() => verifyToken(token)).toThrow('Invalid token');
    });

    test('应该处理过期的令牌', () => {
      const token = 'expired-token';
      jwt.verify.mockImplementation(() => {
        const error = new Error('Token expired');
        (error as any).name = 'TokenExpiredError';
        throw error;
      });

      expect(() => verifyToken(token)).toThrow('Token expired');
    });

    test('应该处理缺少密钥的情况', () => {
      delete process.env.JWT_SECRET;
      const token = 'some-token';

      expect(() => verifyToken(token)).toThrow('JWT_SECRET environment variable is not set');
    });
  });

  describe('认证中间件', () => {
    test('应该成功验证有效的Authorization头', async () => {
      const token = 'valid-jwt-token';
      const decodedPayload = {
        userId: 'user123',
        username: 'testuser',
        role: 'user',
      };

      req.headers.authorization = `Bearer ${token}`;
      jwt.verify.mockReturnValue(decodedPayload);

      await authMiddleware(req, res, next);

      expect(req.user).toEqual(decodedPayload);
      expect(next).toHaveBeenCalledWith();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('应该拒绝缺少Authorization头的请求', async () => {
      await authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authorization header is required',
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('应该拒绝无效的Authorization头格式', async () => {
      req.headers.authorization = 'InvalidFormat token';

      await authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid authorization header format',
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('应该拒绝无效的JWT令牌', async () => {
      const token = 'invalid-token';
      req.headers.authorization = `Bearer ${token}`;
      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid token',
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('应该拒绝过期的令牌', async () => {
      const token = 'expired-token';
      req.headers.authorization = `Bearer ${token}`;
      jwt.verify.mockImplementation(() => {
        const error = new Error('Token expired');
        (error as any).name = 'TokenExpiredError';
        throw error;
      });

      await authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Token expired',
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('应该处理令牌验证中的其他错误', async () => {
      const token = 'some-token';
      req.headers.authorization = `Bearer ${token}`;
      jwt.verify.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      await authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication error',
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('角色权限验证', () => {
    test('应该允许具有正确角色的用户访问', async () => {
      const token = 'valid-token';
      const decodedPayload = {
        userId: 'user123',
        username: 'testuser',
        role: 'admin',
      };

      req.headers.authorization = `Bearer ${token}`;
      jwt.verify.mockReturnValue(decodedPayload);

      const adminMiddleware = requireRole('admin');
      await adminMiddleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('应该拒绝具有错误角色的用户访问', async () => {
      const token = 'valid-token';
      const decodedPayload = {
        userId: 'user123',
        username: 'testuser',
        role: 'user',
      };

      req.headers.authorization = `Bearer ${token}`;
      jwt.verify.mockReturnValue(decodedPayload);

      const adminMiddleware = requireRole('admin');
      await adminMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Insufficient permissions',
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('应该拒绝没有角色的用户访问', async () => {
      const token = 'valid-token';
      const decodedPayload = {
        userId: 'user123',
        username: 'testuser',
        // 没有role字段
      };

      req.headers.authorization = `Bearer ${token}`;
      jwt.verify.mockReturnValue(decodedPayload);

      const adminMiddleware = requireRole('admin');
      await adminMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Insufficient permissions',
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('应该支持多个角色验证', async () => {
      const token = 'valid-token';
      const decodedPayload = {
        userId: 'user123',
        username: 'testuser',
        role: 'moderator',
      };

      req.headers.authorization = `Bearer ${token}`;
      jwt.verify.mockReturnValue(decodedPayload);

      const multiRoleMiddleware = requireRole(['admin', 'moderator']);
      await multiRoleMiddleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('应该处理角色验证中的认证错误', async () => {
      const token = 'invalid-token';
      req.headers.authorization = `Bearer ${token}`;
      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const adminMiddleware = requireRole('admin');
      await adminMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid token',
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('令牌刷新', () => {
    test('应该成功刷新有效的令牌', async () => {
      const oldToken = 'valid-old-token';
      const decodedPayload = {
        userId: 'user123',
        username: 'testuser',
        role: 'user',
        iat: Date.now() / 1000 - 3600, // 1小时前
        exp: Date.now() / 1000 + 3600, // 1小时后
      };

      const newToken = 'new-jwt-token';
      jwt.verify.mockReturnValue(decodedPayload);
      jwt.sign.mockReturnValue(newToken);

      req.headers.authorization = `Bearer ${oldToken}`;
      req.body.refreshToken = true;

      await authMiddleware(req, res, next);

      expect(jwt.sign).toHaveBeenCalledWith(
        {
          userId: decodedPayload.userId,
          username: decodedPayload.username,
          role: decodedPayload.role,
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
      );
    });

    test('应该拒绝刷新过期的令牌', async () => {
      const expiredToken = 'expired-token';
      jwt.verify.mockImplementation(() => {
        const error = new Error('Token expired');
        (error as any).name = 'TokenExpiredError';
        throw error;
      });

      req.headers.authorization = `Bearer ${expiredToken}`;
      req.body.refreshToken = true;

      await authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Token expired',
      });
    });
  });

  describe('边界条件测试', () => {
    test('应该处理空的Authorization头', async () => {
      req.headers.authorization = '';

      await authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authorization header is required',
      });
    });

    test('应该处理只有Bearer前缀的Authorization头', async () => {
      req.headers.authorization = 'Bearer ';

      await authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Token is required',
      });
    });

    test('应该处理包含额外空格的Authorization头', async () => {
      const token = 'valid-token';
      const decodedPayload = { userId: 'user123', role: 'user' };

      req.headers.authorization = `Bearer  ${token}`; // 双空格
      jwt.verify.mockReturnValue(decodedPayload);

      await authMiddleware(req, res, next);

      expect(req.user).toEqual(decodedPayload);
      expect(next).toHaveBeenCalledWith();
    });

    test('应该处理大小写敏感的Bearer前缀', async () => {
      const token = 'valid-token';
      req.headers.authorization = `bearer ${token}`; // 小写bearer

      await authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid authorization header format',
      });
    });
  });

  describe('性能测试', () => {
    test('应该快速处理有效的令牌', async () => {
      const token = 'valid-token';
      const decodedPayload = { userId: 'user123', role: 'user' };

      req.headers.authorization = `Bearer ${token}`;
      jwt.verify.mockReturnValue(decodedPayload);

      const startTime = Date.now();
      await authMiddleware(req, res, next);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100); // 应该在100ms内完成
      expect(next).toHaveBeenCalledWith();
    });

    test('应该快速拒绝无效的令牌', async () => {
      const token = 'invalid-token';
      req.headers.authorization = `Bearer ${token}`;
      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const startTime = Date.now();
      await authMiddleware(req, res, next);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100); // 应该在100ms内完成
      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('安全性测试', () => {
    test('应该防止令牌注入攻击', async () => {
      const maliciousToken = 'Bearer<script>alert("xss")</script>';
      req.headers.authorization = maliciousToken;

      await authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid authorization header format',
      });
    });

    test('应该处理超长的令牌', async () => {
      const longToken = 'Bearer ' + 'a'.repeat(10000);
      req.headers.authorization = longToken;

      await authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Token is too long',
      });
    });
  });

  describe('集成测试', () => {
    test('应该完整处理认证和授权流程', async () => {
      const token = 'valid-admin-token';
      const decodedPayload = {
        userId: 'admin123',
        username: 'admin',
        role: 'admin',
      };

      req.headers.authorization = `Bearer ${token}`;
      jwt.verify.mockReturnValue(decodedPayload);

      // 先执行认证中间件
      await authMiddleware(req, res, next);

      expect(req.user).toEqual(decodedPayload);
      expect(next).toHaveBeenCalledWith();

      // 再执行角色验证中间件
      const adminMiddleware = requireRole('admin');
      await adminMiddleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(2); // 认证和授权都通过
    });

    test('应该处理认证失败后的授权检查', async () => {
      const token = 'invalid-token';
      req.headers.authorization = `Bearer ${token}`;
      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // 认证失败
      await authMiddleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);

      // 重置res mock
      res.status = jest.fn().mockReturnThis();
      res.json = jest.fn().mockReturnThis();

      // 尝试授权检查
      const adminMiddleware = requireRole('admin');
      await adminMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });
});
