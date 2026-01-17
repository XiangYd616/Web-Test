/**
 * 用户控制器
 * 职责: 处理用户相关的HTTP请求
 */

const { query } = require('../config/database');
const { successResponse, errorResponse } = require('../utils/response');
const bcrypt = require('bcrypt');

class UserController {
  /**
   * 获取用户信息
   * GET /api/users/profile
   */
  async getProfile(req, res, next) {
    try {
      const userId = req.user.id;

      const sql = 'SELECT id, username, email, role, created_at FROM users WHERE id = ?';
      const [user] = await query(sql, [userId]);

      if (!user) {
        return errorResponse(res, '用户不存在', 404);
      }

      return successResponse(res, user);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 更新用户信息
   * PUT /api/users/profile
   */
  async updateProfile(req, res, next) {
    try {
      const userId = req.user.id;
      const { username, email } = req.body;

      const updates = [];
      const values = [];

      if (username) {
        updates.push('username = ?');
        values.push(username);
      }

      if (email) {
        updates.push('email = ?');
        values.push(email);
      }

      if (updates.length === 0) {
        return errorResponse(res, '没有要更新的字段', 400);
      }

      values.push(userId);
      const sql = `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`;
      await query(sql, values);

      return successResponse(res, { userId }, '用户信息更新成功');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 修改密码
   * POST /api/users/change-password
   */
  async changePassword(req, res, next) {
    try {
      const userId = req.user.id;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return errorResponse(res, '请提供当前密码和新密码', 400);
      }

      if (newPassword.length < 6) {
        return errorResponse(res, '新密码长度至少6位', 400);
      }

      const [user] = await query('SELECT password FROM users WHERE id = ?', [userId]);
      if (!user) {
        return errorResponse(res, '用户不存在', 404);
      }

      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid) {
        return errorResponse(res, '当前密码错误', 401);
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await query('UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?', [
        hashedPassword,
        userId,
      ]);

      return successResponse(res, null, '密码修改成功');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取用户统计
   * GET /api/users/stats
   */
  async getStats(req, res, next) {
    try {
      const userId = req.user.id;

      const sql = `
        SELECT 
          COUNT(*) as totalTests,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completedTests,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failedTests,
          AVG(overall_score) as averageScore
        FROM test_history
        WHERE user_id = ?
      `;

      const [stats] = await query(sql, [userId]);
      return successResponse(res, stats);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取用户列表 (管理员)
   * GET /api/users
   */
  async getUsers(req, res, next) {
    try {
      const { page = 1, limit = 20, role, search } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      let sql = 'SELECT id, username, email, role, created_at FROM users WHERE 1=1';
      const params = [];

      if (role) {
        sql += ' AND role = ?';
        params.push(role);
      }

      if (search) {
        sql += ' AND (username LIKE ? OR email LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
      }

      sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params.push(parseInt(limit), offset);

      const users = await query(sql, params);

      const [{ total }] = await query('SELECT COUNT(*) as total FROM users');

      return successResponse(res, {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 删除用户 (管理员)
   * DELETE /api/users/:userId
   */
  async deleteUser(req, res, next) {
    try {
      const { userId } = req.params;

      if (userId === req.user.id.toString()) {
        return errorResponse(res, '不能删除自己的账户', 400);
      }

      await query('DELETE FROM users WHERE id = ?', [userId]);
      return successResponse(res, { userId }, '用户已删除');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 更新用户角色 (管理员)
   * PUT /api/users/:userId/role
   */
  async updateRole(req, res, next) {
    try {
      const { userId } = req.params;
      const { role } = req.body;

      const validRoles = ['free', 'premium', 'enterprise', 'admin'];
      if (!validRoles.includes(role)) {
        return errorResponse(res, '无效的角色', 400);
      }

      await query('UPDATE users SET role = ?, updated_at = NOW() WHERE id = ?', [role, userId]);
      return successResponse(res, { userId, role }, '用户角色更新成功');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new UserController();
