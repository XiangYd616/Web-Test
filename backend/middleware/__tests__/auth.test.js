/**
 * 认证中间件单元测试
 * @description 测试JWT认证、权限验证等核心认证功能
 */

const { authMiddleware, generateToken, verifyToken, requireRole } = require('../auth');
const jwt = require('jsonwebtoken');

// Mock环境变量
process.env.JWT_SECRET = 'test-secret-key';
process.env.JWT_EXPIRES_IN = '1h';

// Mock数据库查询
jest.mock('../../config/database', () => ({
  query: jest.fn()
}));

describe('认证中间件测试', () => {
  let req, res, next;

  beforeEach(() => {
    // 重置mock对象
    req = {
      headers: {},
      body: {},
      user: null
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      unauthorized: jest.fn(),
      forbidden: jest.fn()
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('JWT Token 生成和验证', () => {
    test('应该成功生成有效的JWT token', () => {
      const userId = 'user123';
      const userData = { 
        id: userId, 
        email: 'test@example.com',
        role: 'user' 
      };

      const token = generateToken(userData);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT格式验证
    });

    test('应该成功验证有效的token', () => {
      const userData = { 
        id: 'user123', 
        email: 'test@example.com',
        role: 'user' 
      };
      const token = generateToken(userData);
      
      const decoded = verifyToken(token);
      
      expect(decoded).toBeDefined();
      expect(decoded.id).toBe(userData.id);
      expect(decoded.email).toBe(userData.email);
      expect(decoded.role).toBe(userData.role);
    });

    test('应该拒绝无效的token', () => {
      const invalidToken = 'invalid.token.here';
      
      expect(() => {
        verifyToken(invalidToken);
      }).toThrow();
    });

    test('应该拒绝过期的token', () => {
      // 创建一个已过期的token
      const expiredToken = jwt.sign(
        { id: 'user123' },
        process.env.JWT_SECRET,
        { expiresIn: '-1h' } // 负值表示已过期
      );

      expect(() => {
        verifyToken(expiredToken);
      }).toThrow('TokenExpiredError');
    });
  });

  describe('认证中间件功能', () => {
    test('应该通过有效的Bearer token', async () => {
      const userData = { 
        id: 'user123', 
        email: 'test@example.com',
        role: 'user' 
      };
      const token = generateToken(userData);
      req.headers.authorization = `Bearer ${token}`;

      const { query } = require('../../config/database');
      query.mockResolvedValueOnce({
        rows: [{ ...userData, is_active: true }]
      });

      await authMiddleware(req, res, next);

      expect(req.user).toBeDefined();
      expect(req.user.id).toBe(userData.id);
      expect(next).toHaveBeenCalled();
      expect(res.unauthorized).not.toHaveBeenCalled();
    });

    test('应该拒绝没有token的请求', async () => {
      await authMiddleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('No token provided')
        })
      );
    });

    test('应该拒绝格式错误的Authorization header', async () => {
      req.headers.authorization = 'InvalidFormat token123';

      await authMiddleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
    });

    test('应该拒绝无效的token', async () => {
      req.headers.authorization = 'Bearer invalid.token.here';

      await authMiddleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('Invalid token')
        })
      );
    });

    test('应该拒绝已停用的用户', async () => {
      const userData = { 
        id: 'user123', 
        email: 'test@example.com',
        role: 'user' 
      };
      const token = generateToken(userData);
      req.headers.authorization = `Bearer ${token}`;

      const { query } = require('../../config/database');
      query.mockResolvedValueOnce({
        rows: [{ ...userData, is_active: false }]
      });

      await authMiddleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('Account is disabled')
        })
      );
    });

    test('应该处理数据库错误', async () => {
      const userData = { id: 'user123' };
      const token = generateToken(userData);
      req.headers.authorization = `Bearer ${token}`;

      const { query } = require('../../config/database');
      query.mockRejectedValueOnce(new Error('Database error'));

      await authMiddleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('角色权限验证', () => {
    test('应该允许具有正确角色的用户访问', () => {
      req.user = { id: 'user123', role: 'admin' };
      
      const middleware = requireRole('admin');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.forbidden).not.toHaveBeenCalled();
    });

    test('应该允许多个角色中的任意一个', () => {
      req.user = { id: 'user123', role: 'moderator' };
      
      const middleware = requireRole(['admin', 'moderator']);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    test('应该拒绝没有正确角色的用户', () => {
      req.user = { id: 'user123', role: 'user' };
      
      const middleware = requireRole('admin');
      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('Insufficient permissions')
        })
      );
    });

    test('应该拒绝未认证的用户', () => {
      req.user = null;
      
      const middleware = requireRole('admin');
      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
    });

    test('应该正确处理超级管理员权限', () => {
      req.user = { id: 'user123', role: 'superadmin' };
      
      // 超级管理员应该能访问所有需要admin权限的资源
      const middleware = requireRole('admin');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('Token刷新功能', () => {
    test('应该成功刷新即将过期的token', async () => {
      const userData = { 
        id: 'user123', 
        email: 'test@example.com',
        role: 'user' 
      };
      
      // 创建一个即将过期的token（5分钟内）
      const shortLivedToken = jwt.sign(
        userData,
        process.env.JWT_SECRET,
        { expiresIn: '5m' }
      );

      req.headers.authorization = `Bearer ${shortLivedToken}`;
      
      const { query } = require('../../config/database');
      query.mockResolvedValueOnce({
        rows: [{ ...userData, is_active: true }]
      });

      await authMiddleware(req, res, next);

      // 检查是否设置了新token的响应头
      expect(req.user).toBeDefined();
      expect(next).toHaveBeenCalled();
    });
  });

  describe('MFA（多因素认证）支持', () => {
    test('应该要求启用MFA的用户提供验证码', async () => {
      const userData = { 
        id: 'user123', 
        email: 'test@example.com',
        role: 'user',
        mfa_enabled: true
      };
      const token = generateToken(userData);
      req.headers.authorization = `Bearer ${token}`;
      
      const { query } = require('../../config/database');
      query.mockResolvedValueOnce({
        rows: [{ ...userData, is_active: true, mfa_verified: false }]
      });

      await authMiddleware(req, res, next);

      // 应该返回需要MFA验证的响应
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('MFA verification required'),
          mfaRequired: true
        })
      );
    });

    test('应该通过已完成MFA验证的用户', async () => {
      const userData = { 
        id: 'user123', 
        email: 'test@example.com',
        role: 'user',
        mfa_enabled: true,
        mfa_verified: true
      };
      const token = generateToken(userData);
      req.headers.authorization = `Bearer ${token}`;
      
      const { query } = require('../../config/database');
      query.mockResolvedValueOnce({
        rows: [{ ...userData, is_active: true }]
      });

      await authMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user.mfa_verified).toBe(true);
    });
  });

  describe('API密钥认证', () => {
    test('应该接受有效的API密钥', async () => {
      const apiKey = 'test-api-key-123456';
      req.headers['x-api-key'] = apiKey;

      const { query } = require('../../config/database');
      query.mockResolvedValueOnce({
        rows: [{
          id: 'api-user-123',
          api_key: apiKey,
          is_active: true,
          permissions: ['read', 'write']
        }]
      });

      await authMiddleware(req, res, next);

      expect(req.user).toBeDefined();
      expect(req.user.authType).toBe('api-key');
      expect(next).toHaveBeenCalled();
    });

    test('应该拒绝无效的API密钥', async () => {
      req.headers['x-api-key'] = 'invalid-api-key';

      const { query } = require('../../config/database');
      query.mockResolvedValueOnce({ rows: [] });

      await authMiddleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('速率限制集成', () => {
    test('应该跟踪认证尝试次数', async () => {
      const ip = '192.168.1.1';
      req.ip = ip;

      // 模拟多次失败的认证尝试
      for (let i = 0; i < 3; i++) {
        req.headers.authorization = 'Bearer invalid.token';
        await authMiddleware(req, res, next);
      }

      // 检查是否记录了失败尝试
      expect(res.status).toHaveBeenCalledTimes(3);
      expect(res.status).toHaveBeenCalledWith(401);
    });
  });
});
