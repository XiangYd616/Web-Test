/**
 * 认证路由
 */

import bcrypt from 'bcryptjs';
import express from 'express';
import { query } from '../config/database';
import {
  authMiddleware,
  createUserSession,
  generateTokenPair,
  recordSecurityEvent,
  refreshToken,
} from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { securityLogger } from '../middleware/logger';
import { loginRateLimiter, registerRateLimiter } from '../middleware/rateLimiter';

const router = express.Router();

// MFA路由
const mfaRoutes = require('./mfa');
router.use('/mfa', mfaRoutes);

/**
 * 用户注册
 * POST /api/auth/register
 */
router.post(
  '/register',
  registerRateLimiter,
  asyncHandler(async (req: express.Request, res: express.Response) => {
    try {
      const { username, email, password } = req.body;

      // 验证输入
      if (!username || !email || !password) {
        return res.status(400).json({
          success: false,
          message: '用户名、邮箱和密码都是必填项',
        });
      }

      // 检查用户是否已存在
      const existingUser = await query('SELECT id FROM users WHERE username = ? OR email = ?', [
        username,
        email,
      ]);

      if (existingUser.length > 0) {
        return res.status(409).json({
          success: false,
          message: '用户名或邮箱已存在',
        });
      }

      // 加密密码
      const hashedPassword = await bcrypt.hash(password, 12);

      // 创建用户
      const result = await query(
        'INSERT INTO users (username, email, password, role, created_at) VALUES (?, ?, ?, ?, NOW())',
        [username, email, hashedPassword, 'user']
      );

      const userId = result.insertId;

      // 记录安全事件
      await recordSecurityEvent('USER_REGISTERED', {
        userId,
        username,
        email,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });

      // 生成令牌
      const tokens = await generateTokenPair(userId, username, 'user');

      // 创建会话
      await createUserSession(userId, tokens.refreshToken, req.ip, req.get('User-Agent'));

      res.status(201).json({
        success: true,
        message: '注册成功',
        data: {
          user: {
            id: userId,
            username,
            email,
            role: 'user',
          },
          tokens,
        },
      });
    } catch (error) {
      securityLogger.error('用户注册失败', {
        error: error instanceof Error ? error.message : String(error),
        body: req.body,
        ip: req.ip,
      });

      res.status(500).json({
        success: false,
        message: '注册失败，请稍后重试',
      });
    }
  })
);

/**
 * 用户登录
 * POST /api/auth/login
 */
router.post(
  '/login',
  loginRateLimiter,
  asyncHandler(async (req: express.Request, res: express.Response) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: '用户名和密码都是必填项',
        });
      }

      // 查找用户
      const users = await query(
        'SELECT id, username, email, password, role, two_factor_enabled FROM users WHERE username = ? OR email = ?',
        [username, username]
      );

      if (users.length === 0) {
        return res.status(401).json({
          success: false,
          message: '用户名或密码错误',
        });
      }

      const user = users[0];

      // 验证密码
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        await recordSecurityEvent('LOGIN_FAILED', {
          userId: user.id,
          username: user.username,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
        });

        return res.status(401).json({
          success: false,
          message: '用户名或密码错误',
        });
      }

      // 检查账户状态
      if (user.status === 'locked') {
        return res.status(423).json({
          success: false,
          message: '账户已被锁定，请联系管理员',
        });
      }

      // 生成令牌
      const tokens = await generateTokenPair(user.id, user.username, user.role);

      // 创建会话
      await createUserSession(user.id, tokens.refreshToken, req.ip, req.get('User-Agent'));

      // 更新最后登录时间
      await query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

      // 记录安全事件
      await recordSecurityEvent('LOGIN_SUCCESS', {
        userId: user.id,
        username: user.username,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });

      res.json({
        success: true,
        message: '登录成功',
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            twoFactorEnabled: user.two_factor_enabled,
          },
          tokens,
        },
      });
    } catch (error) {
      securityLogger.error('用户登录失败', {
        error: error instanceof Error ? error.message : String(error),
        body: req.body,
        ip: req.ip,
      });

      res.status(500).json({
        success: false,
        message: '登录失败，请稍后重试',
      });
    }
  })
);

/**
 * 刷新令牌
 * POST /api/auth/refresh
 */
router.post(
  '/refresh',
  asyncHandler(async (req: express.Request, res: express.Response) => {
    try {
      const { refreshToken: token } = req.body;

      if (!token) {
        return res.status(401).json({
          success: false,
          message: '刷新令牌缺失',
        });
      }

      const tokens = await refreshToken(token);

      res.json({
        success: true,
        message: '令牌刷新成功',
        data: { tokens },
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        message: error instanceof Error ? error.message : '令牌刷新失败',
      });
    }
  })
);

/**
 * 用户登出
 * POST /api/auth/logout
 */
router.post(
  '/logout',
  authMiddleware,
  asyncHandler(async (req: express.Request, res: express.Response) => {
    try {
      const userId = (req as any).user.id;
      const refreshToken = req.body.refreshToken;

      // 删除会话
      if (refreshToken) {
        await query('DELETE FROM user_sessions WHERE user_id = ? AND refresh_token = ?', [
          userId,
          refreshToken,
        ]);
      }

      // 记录安全事件
      await recordSecurityEvent('LOGOUT', {
        userId,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });

      res.json({
        success: true,
        message: '登出成功',
      });
    } catch (error) {
      securityLogger.error('用户登出失败', {
        error: error instanceof Error ? error.message : String(error),
        userId: (req as any).user?.id,
        ip: req.ip,
      });

      res.status(500).json({
        success: false,
        message: '登出失败',
      });
    }
  })
);

/**
 * 获取当前用户信息
 * GET /api/auth/me
 */
router.get(
  '/me',
  authMiddleware,
  asyncHandler(async (req: express.Request, res: express.Response) => {
    try {
      const user = (req as any).user;

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            twoFactorEnabled: user.two_factor_enabled,
            emailVerified: user.email_verified,
            createdAt: user.created_at,
            lastLogin: user.last_login,
          },
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '获取用户信息失败',
      });
    }
  })
);

export default router;
