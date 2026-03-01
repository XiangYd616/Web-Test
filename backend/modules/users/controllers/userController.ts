/**
 * 用户控制器
 * 职责: 处理用户相关的HTTP请求
 */

import bcrypt from 'bcrypt';
import type { NextFunction } from 'express';
import { StandardErrorCode } from '../../../../shared/types/standardApiResponse';
import { query } from '../../config/database';
import { storageService } from '../../storage/services/storageServiceSingleton';
import type { ApiResponse, AuthRequest } from '../../types';
import { toDate } from '../../utils/dateUtils';
import { getUploadMaxSize } from '../../utils/fileUploadConfig';
import {
  hasWorkspacePermission,
  resolveWorkspaceRole,
  type WorkspacePermission,
  type WorkspaceRole,
} from '../../utils/workspacePermissions';

const ensureWorkspacePermission = async (
  workspaceId: string,
  userId: string,
  action: WorkspacePermission
) => {
  const role = await resolveWorkspaceRole(workspaceId, userId, query);
  if (!role) {
    throw new Error('没有权限访问该工作空间');
  }
  if (!hasWorkspacePermission(role as WorkspaceRole, action)) {
    throw new Error('当前工作空间角色无此操作权限');
  }
  return role;
};

type UserProfile = {
  id: string;
  username: string;
  email: string;
  role: string;
  avatar_url?: string | null;
  created_at: Date;
  last_login?: Date | null;
};

type UserStats = {
  totalTests: number;
  completedTests: number;
  failedTests: number;
  averageScore: number | null;
};

class UserController {
  /**
   * 获取用户信息
   * GET /api/users/profile
   */
  async getProfile(req: AuthRequest, res: ApiResponse, next: NextFunction) {
    try {
      const userId = req.user.id;

      const sql =
        'SELECT id, username, email, role, avatar_url, created_at, last_login FROM users WHERE id = $1';
      const result = (await query(sql, [userId])) as { rows: UserProfile[] };
      const user = result.rows[0];

      if (!user) {
        return res.error(StandardErrorCode.NOT_FOUND, '用户不存在');
      }

      return res.success({
        ...user,
        created_at: toDate(user.created_at),
        last_login: user.last_login ? toDate(user.last_login) : null,
      });
    } catch (error) {
      next(error);
      return;
    }
  }

  /**
   * 更新用户信息
   * PUT /api/users/profile
   */
  async updateProfile(req: AuthRequest, res: ApiResponse, next: NextFunction) {
    try {
      const userId = req.user.id;
      const { username, email, avatarUrl, avatar_url } = req.body as {
        username?: string;
        email?: string;
        avatarUrl?: string;
        avatar_url?: string;
      };

      const updates: string[] = [];
      const values: unknown[] = [];

      if (username) {
        updates.push('username = $' + (values.length + 1));
        values.push(username);
      }

      if (email) {
        updates.push('email = $' + (values.length + 1));
        values.push(email);
      }

      const resolvedAvatar = avatarUrl ?? avatar_url;
      if (resolvedAvatar) {
        updates.push('avatar_url = $' + (values.length + 1));
        values.push(resolvedAvatar);
      }

      if (updates.length === 0) {
        return res.error(StandardErrorCode.INVALID_INPUT, '没有要更新的字段');
      }

      values.push(userId);
      const sql = `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $$${values.length}`;
      await query(sql, values);

      return res.success({ userId }, '用户信息更新成功');
    } catch (error) {
      next(error);
      return;
    }
  }

  /**
   * 修改密码
   * POST /api/users/change-password
   */
  async changePassword(req: AuthRequest, res: ApiResponse, next: NextFunction) {
    try {
      const userId = req.user.id;
      const { currentPassword, newPassword } = req.body as {
        currentPassword?: string;
        newPassword?: string;
      };

      if (!currentPassword || !newPassword) {
        return res.error(StandardErrorCode.INVALID_INPUT, '请提供当前密码和新密码');
      }

      if (newPassword.length < 6) {
        return res.error(StandardErrorCode.INVALID_INPUT, '新密码长度至少6位');
      }

      const [user] = (await query('SELECT password_hash FROM users WHERE id = $1', [
        userId,
      ])) as unknown as {
        password_hash: string;
      }[];
      if (!user) {
        return res.error(StandardErrorCode.NOT_FOUND, '用户不存在');
      }

      const isValid = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isValid) {
        return res.error(StandardErrorCode.UNAUTHORIZED, '当前密码错误');
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [
        hashedPassword,
        userId,
      ]);

      return res.success(null, '密码修改成功');
    } catch (error) {
      next(error);
      return;
    }
  }

  /**
   * 上传头像
   * POST /api/users/avatar
   */
  async uploadAvatar(req: AuthRequest, res: ApiResponse, next: NextFunction) {
    try {
      const userId = req.user.id;
      const file = (req as { file?: Express.Multer.File }).file;
      if (!file) {
        return res.error(StandardErrorCode.INVALID_INPUT, '未上传头像文件', undefined, 400);
      }
      if (!file.mimetype.startsWith('image/')) {
        return res.error(StandardErrorCode.INVALID_INPUT, '仅支持图片格式', undefined, 400);
      }
      if (file.size > getUploadMaxSize()) {
        return res.error(StandardErrorCode.INVALID_INPUT, '头像文件过大', undefined, 400);
      }

      const record = await storageService.uploadFile(
        {
          filename: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          buffer: file.buffer,
        },
        userId,
        {
          ownerType: 'user',
          ownerId: userId,
        }
      );

      const avatarUrl = `/api/users/avatar/${record.id}`;
      await query('UPDATE users SET avatar_url = $1, updated_at = NOW() WHERE id = $2', [
        avatarUrl,
        userId,
      ]);

      return res.success({ avatarUrl, fileId: record.id }, '头像上传成功');
    } catch (error) {
      next(error);
      return;
    }
  }

  /**
   * 获取头像
   * GET /api/users/avatar/:fileId
   */
  async getAvatar(req: AuthRequest, res: ApiResponse, next: NextFunction) {
    try {
      const { fileId } = req.params as { fileId: string };
      const userId = req.user.id;
      const ownership = await query(
        'SELECT id, user_id FROM uploaded_files WHERE id = $1 AND user_id = $2',
        [fileId, userId]
      );
      if (!ownership.rows.length) {
        return res.error(StandardErrorCode.FORBIDDEN, '无权访问该头像', undefined, 403);
      }

      const file = await storageService.downloadFile(fileId);
      res.setHeader('Content-Type', file.mimetype);
      res.setHeader('Content-Length', file.size);
      file.stream.pipe(res);
      return res;
    } catch (error) {
      next(error);
      return;
    }
  }

  /**
   * 获取用户统计
   * GET /api/users/stats
   */
  async getStats(req: AuthRequest, res: ApiResponse, next: NextFunction) {
    try {
      const userId = req.user.id;
      const { workspaceId } = req.query as { workspaceId?: string };
      if (workspaceId) {
        await ensureWorkspacePermission(workspaceId, userId, 'read');
      }

      const filters: string[] = [];
      const params: Array<string | number> = [];
      if (workspaceId) {
        params.push(workspaceId);
        filters.push(`te.workspace_id = $${params.length}`);
      } else {
        params.push(userId);
        filters.push(`te.user_id = $${params.length}`);
      }
      const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

      const sql = `
        SELECT 
          COUNT(*) as totalTests,
          SUM(CASE WHEN te.status = 'completed' THEN 1 ELSE 0 END) as completedTests,
          SUM(CASE WHEN te.status = 'failed' THEN 1 ELSE 0 END) as failedTests,
          AVG(tr.score) as averageScore
        FROM test_executions te
        LEFT JOIN test_results tr ON tr.execution_id = te.id
        ${whereClause}
      `;

      const [stats] = (await query(sql, params)) as unknown as UserStats[];

      return res.success({
        totalTests: Number(stats.totalTests) || 0,
        completedTests: Number(stats.completedTests) || 0,
        failedTests: Number(stats.failedTests) || 0,
        averageScore: stats.averageScore ? Number(stats.averageScore) : null,
      });
    } catch (error) {
      next(error);
      return;
    }
  }

  /**
   * 获取用户活动记录
   * GET /api/users/activity
   */
  async getActivity(req: AuthRequest, res: ApiResponse, next: NextFunction) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 20 } = req.query as {
        page?: string | number;
        limit?: string | number;
      };

      const pageNum = Math.max(parseInt(String(page), 10) || 1, 1);
      const limitNum = Math.min(Math.max(parseInt(String(limit), 10) || 20, 1), 100);
      const offset = (pageNum - 1) * limitNum;

      const sql = `
        SELECT 
          te.id,
          te.engine_type AS test_type,
          te.test_name,
          te.status,
          tr.score AS overall_score,
          te.created_at,
          te.updated_at
        FROM test_executions te
        LEFT JOIN test_results tr ON tr.execution_id = te.id
        WHERE te.user_id = $1
        ORDER BY te.created_at DESC
        LIMIT $2 OFFSET $3
      `;

      const activities = await query(sql, [userId, limitNum, offset]);

      const countSql = 'SELECT COUNT(*) as total FROM test_executions WHERE user_id = $1';
      const [countResult] = (await query(countSql, [userId])) as unknown as { total: number }[];

      return res.success({
        activities,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: Number(countResult.total) || 0,
          totalPages: Math.ceil((Number(countResult.total) || 0) / limitNum),
        },
      });
    } catch (error) {
      next(error);
      return;
    }
  }

  /**
   * 删除用户账户
   * DELETE /api/users/account
   */
  async deleteAccount(req: AuthRequest, res: ApiResponse, next: NextFunction) {
    try {
      const userId = req.user.id;
      const { password } = req.body as { password?: string };

      if (!password) {
        return res.error(StandardErrorCode.INVALID_INPUT, '请提供密码确认删除');
      }

      const [user] = (await query('SELECT password_hash FROM users WHERE id = $1', [
        userId,
      ])) as unknown as {
        password_hash: string;
      }[];
      if (!user) {
        return res.error(StandardErrorCode.NOT_FOUND, '用户不存在');
      }

      const isValid = await bcrypt.compare(password, user.password_hash);
      if (!isValid) {
        return res.error(StandardErrorCode.UNAUTHORIZED, '密码错误');
      }

      // 软删除用户相关的所有数据
      await query(
        "UPDATE users SET deleted_at = NOW(), status = 'inactive', is_active = false, updated_at = NOW() WHERE id = $1",
        [userId]
      );
      await query('DELETE FROM test_executions WHERE user_id = $1', [userId]);
      await query(
        "UPDATE workspace_members SET status = 'inactive', updated_at = NOW() WHERE user_id = $1",
        [userId]
      );
      await query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);
      await query('DELETE FROM user_sessions WHERE user_id = $1', [userId]);

      return res.success(null, '账户删除成功');
    } catch (error) {
      next(error);
      return;
    }
  }

  /**
   * 获取用户偏好设置
   * GET /api/users/preferences
   */
  async getPreferences(req: AuthRequest, res: ApiResponse, next: NextFunction) {
    try {
      const userId = req.user.id;

      const [preferences] = (await query('SELECT preferences FROM users WHERE id = $1', [
        userId,
      ])) as unknown as { preferences: string | null }[];

      const prefs =
        preferences && typeof preferences.preferences === 'string'
          ? JSON.parse(preferences.preferences)
          : {
              theme: 'light',
              language: 'zh-CN',
              notifications: true,
              autoSave: true,
            };

      return res.success(prefs);
    } catch (error) {
      next(error);
      return;
    }
  }

  /**
   * 更新用户偏好设置
   * PUT /api/users/preferences
   */
  async updatePreferences(req: AuthRequest, res: ApiResponse, next: NextFunction) {
    try {
      const userId = req.user.id;
      const preferences = req.body as Record<string, unknown>;

      if (typeof preferences !== 'object' || preferences === null) {
        return res.error(StandardErrorCode.INVALID_INPUT, '偏好设置必须是对象格式');
      }

      const preferencesJson = JSON.stringify(preferences);
      await query('UPDATE users SET preferences = $1, updated_at = NOW() WHERE id = $2', [
        preferencesJson,
        userId,
      ]);

      return res.success(preferences, '偏好设置更新成功');
    } catch (error) {
      next(error);
      return;
    }
  }
}

export default new UserController();
