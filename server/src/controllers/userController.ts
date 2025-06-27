import { Request, Response } from 'express';
import { UserModel } from '../models/User';
import { ActivityLogModel } from '../models/ActivityLog';
import { logger } from '../utils/logger';

// 扩展 Request 接口
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: string;
  };
}

export class UserController {
  // 获取用户个人资料
  static async getProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
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
            createdAt: user.created_at,
            lastLoginAt: user.last_login_at
          }
        }
      });
    } catch (error) {
      logger.error('获取用户资料失败', error);
      res.status(500).json({
        success: false,
        error: '获取用户资料失败'
      });
    }
  }

  // 更新用户个人资料
  static async updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: '未认证'
        });
        return;
      }

      const { fullName, email, preferences } = req.body;
      
      const updateData: any = {};
      if (fullName !== undefined) updateData.full_name = fullName;
      if (email !== undefined) updateData.email = email;
      if (preferences !== undefined) updateData.preferences = preferences;

      const updatedUser = await UserModel.update(req.user.id, updateData);

      // 记录活动
      await (ActivityLogModel as any).logUserAction(
        req.user.id,
        'update_profile',
        'user_management',
        undefined,
        { updatedFields: Object.keys(updateData) },
        req.ip,
        req.get('User-Agent')
      );

      res.json({
        success: true,
        message: '个人资料更新成功',
        data: {
          user: {
            id: updatedUser.id,
            username: updatedUser.username,
            email: updatedUser.email,
            fullName: updatedUser.full_name,
            preferences: updatedUser.preferences
          }
        }
      });
    } catch (error) {
      logger.error('更新用户资料失败', error);
      res.status(500).json({
        success: false,
        error: '更新用户资料失败'
      });
    }
  }

  // 获取用户设置
  static async getSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
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
          settings: user.preferences || {},
          notifications: {
            email: true,
            browser: true,
            testCompletion: true,
            securityAlerts: true
          }
        }
      });
    } catch (error) {
      logger.error('获取用户设置失败', error);
      res.status(500).json({
        success: false,
        error: '获取用户设置失败'
      });
    }
  }

  // 更新用户设置
  static async updateSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: '未认证'
        });
        return;
      }

      const { settings, notifications } = req.body;
      
      const updateData: any = {};
      if (settings) {
        updateData.preferences = {
          ...updateData.preferences,
          ...settings
        };
      }

      await UserModel.update(req.user.id, updateData);

      res.json({
        success: true,
        message: '设置更新成功'
      });
    } catch (error) {
      logger.error('更新用户设置失败', error);
      res.status(500).json({
        success: false,
        error: '更新用户设置失败'
      });
    }
  }

  // 获取用户的测试历史
  static async getUserTests(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: '未认证'
        });
        return;
      }

      // TODO: 实现测试历史查询
      res.json({
        success: true,
        data: {
          tests: [],
          total: 0,
          page: 1,
          limit: 20
        }
      });
    } catch (error) {
      logger.error('获取用户测试历史失败', error);
      res.status(500).json({
        success: false,
        error: '获取测试历史失败'
      });
    }
  }

  // 获取特定测试结果
  static async getTestResult(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: '未认证'
        });
        return;
      }

      const { id } = req.params;

      // TODO: 实现测试结果查询
      res.json({
        success: true,
        data: {
          test: {
            id,
            type: 'stress',
            status: 'completed',
            results: {}
          }
        }
      });
    } catch (error) {
      logger.error('获取测试结果失败', error);
      res.status(500).json({
        success: false,
        error: '获取测试结果失败'
      });
    }
  }

  // 删除测试结果
  static async deleteTestResult(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: '未认证'
        });
        return;
      }

      const { id } = req.params;

      // TODO: 实现测试结果删除
      res.json({
        success: true,
        message: '测试结果删除成功'
      });
    } catch (error) {
      logger.error('删除测试结果失败', error);
      res.status(500).json({
        success: false,
        error: '删除测试结果失败'
      });
    }
  }

  // 获取用户统计信息
  static async getUserStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: '未认证'
        });
        return;
      }

      // TODO: 实现用户统计查询
      res.json({
        success: true,
        data: {
          stats: {
            totalTests: 0,
            successfulTests: 0,
            failedTests: 0,
            averageResponseTime: 0,
            lastTestDate: null
          }
        }
      });
    } catch (error) {
      logger.error('获取用户统计失败', error);
      res.status(500).json({
        success: false,
        error: '获取用户统计失败'
      });
    }
  }

  // 上传用户头像
  static async uploadAvatar(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: '未认证'
        });
        return;
      }

      // TODO: 实现头像上传
      res.json({
        success: true,
        message: '头像上传成功',
        data: {
          avatarUrl: '/uploads/avatars/default.png'
        }
      });
    } catch (error) {
      logger.error('上传头像失败', error);
      res.status(500).json({
        success: false,
        error: '上传头像失败'
      });
    }
  }

  // 删除用户头像
  static async deleteAvatar(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: '未认证'
        });
        return;
      }

      // TODO: 实现头像删除
      res.json({
        success: true,
        message: '头像删除成功'
      });
    } catch (error) {
      logger.error('删除头像失败', error);
      res.status(500).json({
        success: false,
        error: '删除头像失败'
      });
    }
  }

  // 获取用户通知
  static async getNotifications(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: '未认证'
        });
        return;
      }

      // TODO: 实现通知查询
      res.json({
        success: true,
        data: {
          notifications: [],
          unreadCount: 0
        }
      });
    } catch (error) {
      logger.error('获取用户通知失败', error);
      res.status(500).json({
        success: false,
        error: '获取用户通知失败'
      });
    }
  }

  // 标记通知为已读
  static async markNotificationRead(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: '未认证'
        });
        return;
      }

      const { id } = req.params;

      // TODO: 实现通知标记已读
      res.json({
        success: true,
        message: '通知已标记为已读'
      });
    } catch (error) {
      logger.error('标记通知已读失败', error);
      res.status(500).json({
        success: false,
        error: '标记通知已读失败'
      });
    }
  }

  // 删除用户账户
  static async deleteAccount(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: '未认证'
        });
        return;
      }

      // TODO: 实现账户删除
      // 注意：这是一个危险操作，需要额外的验证

      res.json({
        success: true,
        message: '账户删除成功'
      });
    } catch (error) {
      logger.error('删除用户账户失败', error);
      res.status(500).json({
        success: false,
        error: '删除用户账户失败'
      });
    }
  }
}
