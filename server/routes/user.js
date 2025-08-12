/**
 * 用户路由
 */

const express = require('express');
const { query } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

/**
 * 获取用户资料
 * GET /api/user/profile
 */
router.get('/profile', authMiddleware, asyncHandler(async (req, res) => {
  try {
    const result = await query(
      `SELECT id, username, email, role, is_active, created_at, last_login,
              avatar_url, bio, location, website
       FROM users WHERE id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    const user = result.rows[0];

    res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        isActive: user.is_active,
        createdAt: user.created_at,
        lastLogin: user.last_login,
        avatarUrl: user.avatar_url,
        bio: user.bio,
        location: user.location,
        website: user.website
      }
    });
  } catch (error) {
    console.error('获取用户资料失败:', error);
    res.status(500).json({
      success: false,
      message: '获取用户资料失败'
    });
  }
}));

/**
 * 更新用户资料
 * PUT /api/user/profile
 */
router.put('/profile', authMiddleware, asyncHandler(async (req, res) => {
  const { username, bio, location, website } = req.body;

  // 验证输入
  if (username && username.length < 3) {
    return res.status(400).json({
      success: false,
      message: '用户名长度至少3位'
    });
  }

  if (website && !isValidUrl(website)) {
    return res.status(400).json({
      success: false,
      message: '网站URL格式无效'
    });
  }

  try {
    // 检查用户名是否已被使用
    if (username) {
      const existingUser = await query(
        'SELECT id FROM users WHERE username = $1 AND id != $2',
        [username, req.user.id]
      );

      if (existingUser.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: '用户名已被使用'
        });
      }
    }

    // 构建更新字段
    const updates = {};
    const params = [req.user.id];
    let paramIndex = 2;

    if (username !== undefined) {
      updates.username = `username = $${paramIndex}`;
      params.push(username);
      paramIndex++;
    }

    if (bio !== undefined) {
      updates.bio = `bio = $${paramIndex}`;
      params.push(bio);
      paramIndex++;
    }

    if (location !== undefined) {
      updates.location = `location = $${paramIndex}`;
      params.push(location);
      paramIndex++;
    }

    if (website !== undefined) {
      updates.website = `website = $${paramIndex}`;
      params.push(website);
      paramIndex++;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: '没有提供要更新的字段'
      });
    }

    const setClause = Object.values(updates).join(', ');

    const result = await query(
      `UPDATE users SET ${setClause}, updated_at = NOW() 
       WHERE id = $1 
       RETURNING id, username, email, role, bio, location, website`,
      params
    );

    const user = result.rows[0];

    res.json({
      success: true,
      message: '资料更新成功',
      data: user
    });
  } catch (error) {
    console.error('更新用户资料失败:', error);
    res.status(500).json({
      success: false,
      message: '更新用户资料失败'
    });
  }
}));

/**
 * 获取用户偏好设置
 * GET /api/user/preferences
 */
router.get('/preferences', authMiddleware, asyncHandler(async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM user_preferences WHERE user_id = $1',
      [req.user.id]
    );

    const preferences = result.rows[0] || {
      theme: 'dark',
      language: 'zh-CN',
      notifications: true,
      email_notifications: true,
      auto_save: true
    };

    res.json({
      success: true,
      data: preferences
    });
  } catch (error) {
    console.error('获取用户偏好失败:', error);
    res.status(500).json({
      success: false,
      message: '获取用户偏好失败'
    });
  }
}));

/**
 * 更新用户偏好设置
 * PUT /api/user/preferences
 */
router.put('/preferences', authMiddleware, asyncHandler(async (req, res) => {
  const { theme, language, notifications, email_notifications, auto_save } = req.body;

  try {
    // 检查偏好设置是否存在
    const existingResult = await query(
      'SELECT id FROM user_preferences WHERE user_id = $1',
      [req.user.id]
    );

    const preferences = {
      theme: theme || 'dark',
      language: language || 'zh-CN',
      notifications: notifications !== undefined ? notifications : true,
      email_notifications: email_notifications !== undefined ? email_notifications : true,
      auto_save: auto_save !== undefined ? auto_save : true
    };

    let result;
    if (existingResult.rows.length > 0) {
      // 更新现有偏好
      result = await query(
        `UPDATE user_preferences 
         SET theme = $2, language = $3, notifications = $4, 
             email_notifications = $5, auto_save = $6, updated_at = NOW()
         WHERE user_id = $1
         RETURNING *`,
        [req.user.id, preferences.theme, preferences.language,
        preferences.notifications, preferences.email_notifications, preferences.auto_save]
      );
    } else {
      // 创建新偏好
      result = await query(
        `INSERT INTO user_preferences 
         (user_id, theme, language, notifications, email_notifications, auto_save, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
         RETURNING *`,
        [req.user.id, preferences.theme, preferences.language,
        preferences.notifications, preferences.email_notifications, preferences.auto_save]
      );
    }

    res.json({
      success: true,
      message: '偏好设置更新成功',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('更新用户偏好失败:', error);
    res.status(500).json({
      success: false,
      message: '更新用户偏好失败'
    });
  }
}));

/**
 * 获取用户活动日志
 * GET /api/user/activity
 */
router.get('/activity', authMiddleware, asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  try {
    const result = await query(
      `SELECT action, description, metadata, created_at
       FROM activity_logs 
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.id, parseInt(limit), offset]
    );

    const countResult = await query(
      'SELECT COUNT(*) as total FROM activity_logs WHERE user_id = $1',
      [req.user.id]
    );

    const total = parseInt(countResult.rows[0].total);

    res.json({
      success: true,
      data: {
        activities: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('获取用户活动日志失败:', error);
    res.status(500).json({
      success: false,
      message: '获取用户活动日志失败'
    });
  }
}));

/**
 * 删除用户账户
 * DELETE /api/user/account
 */
router.delete('/account', authMiddleware, asyncHandler(async (req, res) => {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({
      success: false,
      message: '需要提供密码确认'
    });
  }

  try {
    // 验证密码
    const userResult = await query(
      'SELECT password FROM users WHERE id = $1',
      [req.user.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    const bcrypt = require('bcryptjs');
    const isPasswordValid = await bcrypt.compare(password, userResult.rows[0].password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: '密码错误'
      });
    }

    // 软删除用户（标记为非活跃）
    await query(
      'UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1',
      [req.user.id]
    );

    res.json({
      success: true,
      message: '账户已删除'
    });
  } catch (error) {
    console.error('删除用户账户失败:', error);
    res.status(500).json({
      success: false,
      message: '删除用户账户失败'
    });
  }
}));

/**
 * 获取用户通知
 * GET /api/user/notifications
 */
router.get('/notifications', authMiddleware, asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, unread_only = false } = req.query;
  const offset = (page - 1) * limit;

  try {
    let whereClause = 'WHERE user_id = $1';
    let params = [req.user.id];

    if (unread_only === 'true') {
      whereClause += ' AND read_at IS NULL';
    }

    // 获取通知列表
    const result = await query(
      `SELECT id, type, title, message, priority, read_at, created_at, data
       FROM user_notifications
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    // 获取总数
    const countResult = await query(
      `SELECT COUNT(*) as total FROM user_notifications ${whereClause}`,
      params
    );

    const notifications = result.rows.map(row => ({
      id: row.id,
      type: row.type,
      title: row.title,
      message: row.message,
      priority: row.priority,
      read: !!row.read_at,
      createdAt: row.created_at,
      data: row.data
    }));

    res.json({
      success: true,
      data: notifications
    });

  } catch (error) {
    console.error('获取用户通知失败:', error);
    // 如果数据库表不存在，返回空数组
    res.json({
      success: true,
      data: []
    });
  }
}));

/**
 * 获取用户统计数据
 * GET /api/user/stats/:userId
 */
router.get('/stats/:userId', authMiddleware, asyncHandler(async (req, res) => {
  const { userId } = req.params;

  // 检查权限：只能查看自己的统计或管理员可以查看所有
  if (req.user.id !== userId && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: '无权访问此用户的统计数据'
    });
  }

  try {
    // 获取基础统计
    const basicStats = await query(
      `SELECT
         COUNT(*) as total_tests,
         COUNT(CASE WHEN DATE(created_at) = CURRENT_DATE THEN 1 END) as tests_today,
         COUNT(CASE WHEN created_at >= DATE_TRUNC('week', CURRENT_DATE) THEN 1 END) as tests_this_week,
         COUNT(CASE WHEN created_at >= DATE_TRUNC('month', CURRENT_DATE) THEN 1 END) as tests_this_month,
         COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_tests,
         COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_tests,
         AVG(CASE WHEN score IS NOT NULL THEN score END) as average_score,
         SUM(CASE WHEN duration IS NOT NULL THEN duration END) as total_test_time
       FROM test_results
       WHERE user_id = $1`,
      [userId]
    );

    // 获取按类型分组的测试数量
    const testsByType = await query(
      `SELECT test_type, COUNT(*) as count
       FROM test_results
       WHERE user_id = $1
       GROUP BY test_type
       ORDER BY count DESC`,
      [userId]
    );

    // 获取最近活动
    const recentActivity = await query(
      `SELECT test_type, status, score, created_at
       FROM test_results
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 10`,
      [userId]
    );

    // 获取最常用的测试类型
    const mostUsedType = testsByType.rows.length > 0 ? testsByType.rows[0].test_type : '压力测试';

    const stats = basicStats.rows[0];
    const testsByTypeObj = {};
    testsByType.rows.forEach(row => {
      testsByTypeObj[row.test_type] = parseInt(row.count);
    });

    res.json({
      success: true,
      data: {
        total_tests: parseInt(stats.total_tests) || 0,
        tests_today: parseInt(stats.tests_today) || 0,
        tests_this_week: parseInt(stats.tests_this_week) || 0,
        tests_this_month: parseInt(stats.tests_this_month) || 0,
        successful_tests: parseInt(stats.successful_tests) || 0,
        failed_tests: parseInt(stats.failed_tests) || 0,
        average_score: parseFloat(stats.average_score) || 0,
        total_test_time: parseInt(stats.total_test_time) || 0,
        most_used_test_type: mostUsedType,
        tests_by_type: testsByTypeObj,
        recent_activity: recentActivity.rows.map(row => ({
          test_type: row.test_type,
          status: row.status,
          score: row.score,
          created_at: row.created_at
        }))
      }
    });

  } catch (error) {
    console.error('获取用户统计失败:', error);
    res.status(500).json({
      success: false,
      error: '获取统计数据失败'
    });
  }
}));

/**
 * 验证URL格式
 */
function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

module.exports = router;
