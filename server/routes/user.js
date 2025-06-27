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
