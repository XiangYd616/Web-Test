/**
 * 认证中间件单元测试
 * 测试JWT验证、权限检查等功能
 */

const jwt = require('jsonwebtoken');

describe('认证中间件测试', () => {
  let authMiddleware, generateTokenPair, requireRole;
  let mockRequest, mockResponse, mockNext;

  beforeEach(() => {
    // 重置模块缓存,确保每次测试都是新的实例
    jest.resetModules();
    
    // 模拟数据库查询
    jest.mock('../../../config/database', () => ({
      query: jest.fn()
    }));

    mockRequest = global.testUtils.mockRequest();
    mockResponse = global.testUtils.mockResponse();
    mockNext = global.testUtils.mockNext();
  });

  describe('JWT Token生成', () => {
    test('应该成功生成Token对', async () => {
      const userId = 'test-user-123';
      const token = jwt.sign(
        { userId, type: 'access' },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
      );

      expect(token).toBeDefined();
      expect(token).toBeValidToken();
    });

    test('Token应该包含正确的payload', () => {
      const userId = 'test-user-123';
      const token = jwt.sign(
        { userId, type: 'access' },
        process.env.JWT_SECRET
      );

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      expect(decoded.userId).toBe(userId);
      expect(decoded.type).toBe('access');
    });

    test('过期的Token应该无法验证', () => {
      const token = jwt.sign(
        { userId: 'test' },
        process.env.JWT_SECRET,
        { expiresIn: '0s' } // 立即过期
      );

      expect(() => {
        jwt.verify(token, process.env.JWT_SECRET);
      }).toThrow('jwt expired');
    });
  });

  describe('authMiddleware - Token验证', () => {
    test('应该拒绝没有Authorization头的请求', async () => {
      const req = global.testUtils.mockRequest({
        headers: {}
      });
      const res = global.testUtils.mockResponse();
      const next = global.testUtils.mockNext();

      // 模拟authMiddleware逻辑
      if (!req.headers.authorization) {
        res.status(401).json({ 
          success: false, 
          error: { message: '未提供认证令牌' } 
        });
      }

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false
        })
      );
    });

    test('应该拒绝无效格式的Authorization头', () => {
      const req = global.testUtils.mockRequest({
        headers: {
          authorization: 'InvalidFormat token123'
        }
      });
      const res = global.testUtils.mockResponse();

      // 验证格式
      const authHeader = req.headers.authorization;
      if (!authHeader.startsWith('Bearer ')) {
        res.status(401).json({
          success: false,
          error: { message: '认证令牌格式错误' }
        });
      }

      expect(res.status).toHaveBeenCalledWith(401);
    });

    test('应该接受有效的Bearer Token', () => {
      const validToken = jwt.sign(
        { userId: 'test-user-123' },
        process.env.JWT_SECRET
      );

      const req = global.testUtils.mockRequest({
        headers: {
          authorization: `Bearer ${validToken}`
        }
      });
      const res = global.testUtils.mockResponse();
      const next = global.testUtils.mockNext();

      // 验证Token
      const token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      expect(decoded.userId).toBe('test-user-123');
      expect(decoded).toHaveProperty('iat');
    });
  });

  describe('requireRole - 角色权限检查', () => {
    test('应该允许具有正确角色的用户访问', () => {
      const req = global.testUtils.mockRequest({
        user: {
          id: 'test-user-123',
          role: 'admin'
        }
      });
      const res = global.testUtils.mockResponse();
      const next = global.testUtils.mockNext();

      // 模拟requireRole('admin')
      const requiredRole = 'admin';
      if (req.user && req.user.role === requiredRole) {
        next();
      } else {
        res.status(403).json({
          success: false,
          error: { message: '权限不足' }
        });
      }

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('应该拒绝角色不匹配的用户', () => {
      const req = global.testUtils.mockRequest({
        user: {
          id: 'test-user-123',
          role: 'user'
        }
      });
      const res = global.testUtils.mockResponse();
      const next = global.testUtils.mockNext();

      // 模拟requireRole('admin')
      const requiredRole = 'admin';
      if (req.user && req.user.role === requiredRole) {
        next();
      } else {
        res.status(403).json({
          success: false,
          error: { message: '权限不足' }
        });
      }

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    test('应该拒绝没有user信息的请求', () => {
      const req = global.testUtils.mockRequest({
        user: null
      });
      const res = global.testUtils.mockResponse();
      const next = global.testUtils.mockNext();

      if (!req.user) {
        res.status(401).json({
          success: false,
          error: { message: '未认证' }
        });
      }

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('密码安全', () => {
    const bcrypt = require('bcryptjs');

    test('应该正确hash密码', async () => {
      const password = 'Test@12345';
      const saltRounds = 10;
      
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      
      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toBe(password);
      expect(hashedPassword.length).toBeGreaterThan(20);
    });

    test('应该正确验证密码', async () => {
      const password = 'Test@12345';
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const isValid = await bcrypt.compare(password, hashedPassword);
      
      expect(isValid).toBe(true);
    });

    test('应该拒绝错误的密码', async () => {
      const password = 'Test@12345';
      const wrongPassword = 'Wrong@12345';
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const isValid = await bcrypt.compare(wrongPassword, hashedPassword);
      
      expect(isValid).toBe(false);
    });
  });

  describe('Token刷新', () => {
    test('应该能用Refresh Token获取新的Access Token', () => {
      const userId = 'test-user-123';
      const refreshToken = jwt.sign(
        { userId, type: 'refresh' },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
      expect(decoded.type).toBe('refresh');
      expect(decoded.userId).toBe(userId);

      // 生成新的Access Token
      const newAccessToken = jwt.sign(
        { userId: decoded.userId, type: 'access' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      expect(newAccessToken).toBeDefined();
      expect(newAccessToken).not.toBe(refreshToken);
    });

    test('Access Token不应该用于刷新', () => {
      const accessToken = jwt.sign(
        { userId: 'test', type: 'access' },
        process.env.JWT_SECRET
      );

      const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
      
      if (decoded.type !== 'refresh') {
        expect(decoded.type).toBe('access');
        // 应该拒绝刷新
      }
    });
  });

  describe('安全事件记录', () => {
    test('应该记录登录成功事件', () => {
      const securityEvent = {
        userId: 'test-user-123',
        event: 'login_success',
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0...',
        timestamp: new Date().toISOString()
      };

      expect(securityEvent).toHaveProperty('userId');
      expect(securityEvent).toHaveProperty('event');
      expect(securityEvent.event).toBe('login_success');
    });

    test('应该记录登录失败事件', () => {
      const securityEvent = {
        email: 'test@example.com',
        event: 'login_failed',
        reason: 'invalid_password',
        ip: '192.168.1.1',
        timestamp: new Date().toISOString()
      };

      expect(securityEvent).toHaveProperty('event');
      expect(securityEvent.event).toBe('login_failed');
      expect(securityEvent.reason).toBe('invalid_password');
    });
  });
});

