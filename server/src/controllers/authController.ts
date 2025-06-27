import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/User';
import { ActivityLogModel } from '../models/ActivityLog';
import { logger } from '../utils/logger';
import { verifyToken } from '../middleware/auth';

// 扩展 Request 接口
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: string;
  };
}

export class AuthController {
  // 用户注册
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const { username, email, password, fullName } = req.body;

      // 创建用户
      const user = await UserModel.create({
        username,
        email,
        full_name: fullName,
        password,
        role: 'tester'
      });

      // 生成JWT令牌
      const token = jwt.sign(
        { userId: user.id, username: user.username, role: user.role },
        process.env.JWT_SECRET!,
        { expiresIn: '24h' }
      );

      // 记录注册活动
      await (ActivityLogModel as any).logUserAction(
        user.id,
        'user_register',
        'authentication',
        undefined,
        { username, email },
        req.ip,
        req.get('User-Agent')
      );

      res.status(201).json({
        success: true,
        message: '注册成功',
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            fullName: user.full_name,
            role: user.role,
            status: user.status
          },
          token
        }
      });
    } catch (error) {
      logger.error('用户注册失败', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : '注册失败'
      });
    }
  }

  // 用户登录
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      // 查找用户（通过邮箱）
      const user = await UserModel.findByEmail(email);
      if (!user) {
        res.status(401).json({
          success: false,
          error: '邮箱或密码错误'
        });
        return;
      }

      // 检查用户是否被锁定
      const isLocked = await UserModel.isLocked(user.id);
      if (isLocked) {
        res.status(423).json({
          success: false,
          error: '账户已被锁定，请稍后再试'
        });
        return;
      }

      // 验证密码
      const isValidPassword = await UserModel.validatePassword(user, password);
      if (!isValidPassword) {
        // 更新登录失败信息
        await UserModel.updateLoginInfo(user.id, false);
        
        res.status(401).json({
          success: false,
          error: '用户名或密码错误'
        });
        return;
      }

      // 检查用户状态
      if (user.status !== 'active') {
        res.status(403).json({
          success: false,
          error: '账户已被禁用'
        });
        return;
      }

      // 更新登录成功信息
      await UserModel.updateLoginInfo(user.id, true);

      // 生成JWT令牌
      const token = jwt.sign(
        { userId: user.id, username: user.username, role: user.role },
        process.env.JWT_SECRET!,
        { expiresIn: '24h' }
      );

      // 记录登录活动
      await (ActivityLogModel as any).logUserAction(
        user.id,
        'user_login',
        'authentication',
        undefined,
        { loginMethod: 'password' },
        req.ip,
        req.get('User-Agent')
      );

      res.json({
        success: true,
        message: '登录成功',
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            fullName: user.full_name,
            role: user.role,
            status: user.status,
            emailVerified: user.email_verified,
            preferences: user.preferences
          },
          token
        }
      });
    } catch (error) {
      logger.error('用户登录失败', error);
      res.status(500).json({
        success: false,
        error: '登录失败'
      });
    }
  }

  // 用户登出
  static async logout(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (req.user) {
        // 记录登出活动
        await (ActivityLogModel as any).logUserAction(
          req.user.id,
          'user_logout',
          'authentication',
          undefined,
          {},
          req.ip,
          req.get('User-Agent')
        );
      }

      res.json({
        success: true,
        message: '登出成功'
      });
    } catch (error) {
      logger.error('用户登出失败', error);
      res.status(500).json({
        success: false,
        error: '登出失败'
      });
    }
  }

  // 获取当前用户信息
  static async getCurrentUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: '未认证'
        });
        return;
      }

      const user = await UserModel.findById(req.user.id);
      if (!user) {
        res.status(404).json({
          success: false,
          error: '用户不存在'
        });
        return;
      }

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            fullName: user.full_name,
            role: user.role,
            status: user.status,
            emailVerified: user.email_verified,
            preferences: user.preferences,
            lastLoginAt: user.last_login_at
          }
        }
      });
    } catch (error) {
      logger.error('获取当前用户信息失败', error);
      res.status(500).json({
        success: false,
        error: '获取用户信息失败'
      });
    }
  }

  // 验证访问令牌
  static async verifyToken(req: Request, res: Response): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.split(' ')[1];

      if (!token) {
        res.status(401).json({
          success: false,
          error: 'NO_TOKEN',
          message: '未提供访问令牌'
        });
        return;
      }

      // 验证token
      let decoded;
      try {
        decoded = verifyToken(token);
      } catch (error) {
        res.status(401).json({
          success: false,
          error: 'INVALID_TOKEN',
          message: '无效的访问令牌'
        });
        return;
      }

      // 查找用户
      const user = await UserModel.findById(decoded.id);
      if (!user) {
        res.status(401).json({
          success: false,
          error: 'USER_NOT_FOUND',
          message: '用户不存在或已被禁用'
        });
        return;
      }

      // 检查用户状态
      if (user.status !== 'active') {
        res.status(401).json({
          success: false,
          error: 'USER_INACTIVE',
          message: '用户账户已被禁用'
        });
        return;
      }

      res.json({
        success: true,
        tokenValid: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.full_name,
          role: user.role,
          status: user.status,
          emailVerified: user.email_verified,
          preferences: user.preferences
        }
      });
    } catch (error) {
      logger.error('Token验证失败', error);
      res.status(500).json({
        success: false,
        error: 'VERIFICATION_ERROR',
        message: 'Token验证过程中发生错误'
      });
    }
  }

  // 刷新令牌
  static async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.body;

      if (!token) {
        res.status(400).json({
          success: false,
          error: '缺少令牌'
        });
        return;
      }

      // 验证令牌
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      
      // 查找用户
      const user = await UserModel.findById(decoded.userId);
      if (!user || user.status !== 'active') {
        res.status(401).json({
          success: false,
          error: '无效的令牌'
        });
        return;
      }

      // 生成新令牌
      const newToken = jwt.sign(
        { userId: user.id, username: user.username, role: user.role },
        process.env.JWT_SECRET!,
        { expiresIn: '24h' }
      );

      res.json({
        success: true,
        data: { token: newToken }
      });
    } catch (error) {
      logger.error('刷新令牌失败', error);
      res.status(401).json({
        success: false,
        error: '令牌刷新失败'
      });
    }
  }

  // 修改密码
  static async changePassword(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!req.user) {
        res.status(401).json({
          success: false,
          error: '未认证'
        });
        return;
      }

      const user = await UserModel.findById(req.user.id);
      if (!user) {
        res.status(404).json({
          success: false,
          error: '用户不存在'
        });
        return;
      }

      // 验证当前密码
      const isValidPassword = await UserModel.validatePassword(user, currentPassword);
      if (!isValidPassword) {
        res.status(400).json({
          success: false,
          error: '当前密码错误'
        });
        return;
      }

      // 更新密码
      const bcrypt = require('bcryptjs');
      const passwordHash = await bcrypt.hash(newPassword, 12);
      
      await UserModel.update(user.id, { password: passwordHash } as any);

      // 记录密码修改活动
      await (ActivityLogModel as any).logUserAction(
        user.id,
        'change_password',
        'security',
        undefined,
        {},
        req.ip,
        req.get('User-Agent')
      );

      res.json({
        success: true,
        message: '密码修改成功'
      });
    } catch (error) {
      logger.error('修改密码失败', error);
      res.status(500).json({
        success: false,
        error: '密码修改失败'
      });
    }
  }

  // 忘记密码
  static async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;

      const user = await UserModel.findByEmail(email);
      if (!user) {
        // 为了安全，即使用户不存在也返回成功
        res.json({
          success: true,
          message: '如果邮箱存在，重置链接已发送'
        });
        return;
      }

      // TODO: 实现邮件发送逻辑
      // 生成重置令牌并发送邮件

      res.json({
        success: true,
        message: '重置链接已发送到您的邮箱'
      });
    } catch (error) {
      logger.error('忘记密码处理失败', error);
      res.status(500).json({
        success: false,
        error: '处理失败'
      });
    }
  }

  // 重置密码
  static async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      // TODO: 实现密码重置逻辑
      res.json({
        success: true,
        message: '密码重置成功'
      });
    } catch (error) {
      logger.error('重置密码失败', error);
      res.status(500).json({
        success: false,
        error: '重置失败'
      });
    }
  }

  // 验证邮箱
  static async verifyEmail(req: Request, res: Response): Promise<void> {
    try {
      // TODO: 实现邮箱验证逻辑
      res.json({
        success: true,
        message: '邮箱验证成功'
      });
    } catch (error) {
      logger.error('邮箱验证失败', error);
      res.status(500).json({
        success: false,
        error: '验证失败'
      });
    }
  }

  // 重新发送验证邮件
  static async resendVerification(req: Request, res: Response): Promise<void> {
    try {
      // TODO: 实现重新发送验证邮件逻辑
      res.json({
        success: true,
        message: '验证邮件已重新发送'
      });
    } catch (error) {
      logger.error('重新发送验证邮件失败', error);
      res.status(500).json({
        success: false,
        error: '发送失败'
      });
    }
  }
}
