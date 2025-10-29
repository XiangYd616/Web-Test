/**
 * 统一用户路由
 * 合并了 user.js 和 users.js 的所有功能
 * 提供完整的用户管理API
 */

const express = require('express');
const { body, validationResult } = require('express-validator');

// 数据库连接 - 支持两种方式
const { query, getPool } = require('../config/database');
const { authMiddleware, requireRole, ROLES } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { formatValidationErrors } = require('../middleware/responseFormatter');

const router = express.Router();

// =====================================================
// 验证规则
// =====================================================

const updateProfileValidation = [
  body('username')
    .optional()
    .isLength({ min: 3, max: 30 })
    .withMessage('用户名长度必须在3-30个字符之间')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('用户名只能包含字母、数字和下划线'),

  body('firstName')
    .optional()
    .isLength({ max: 50 })
    .withMessage('名字长度不能超过50个字符'),

  body('lastName')
    .optional()
    .isLength({ max: 50 })
    .withMessage('姓氏长度不能超过50个字符'),

  body('bio')
    .optional()
    .isLength({ max: 500 })
    .withMessage('个人简介不能超过500个字符'),

  body('location')
    .optional()
    .isLength({ max: 100 })
    .withMessage('位置信息不能超过100个字符'),

  body('website')
    .optional()
    .isURL()
    .withMessage('请输入有效的网站URL')
];

// =====================================================
// 工具函数
// =====================================================

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

/**
 * 获取数据库查询函数 - 兼容两种数据库连接方式
 */
function getDbQuery() {
  if (typeof query === 'function') {
    return query; // 使用旧的 query 函数
  } else {
    const pool = getPool();
    return (sql, params) => pool.query(sql, params); // 使用新的连接池
  }
}

// =====================================================
// 用户个人资料管理
// =====================================================

/**
 * GET /api/users/profile
 * 获取当前用户详细信息
 */
router.get('/profile', authMiddleware, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const dbQuery = getDbQuery();

  const result = await dbQuery(
    `SELECT 
      id, username, email, first_name, last_name, role, plan, status,
      email_verified, email_verified_at, last_login, login_count,
      preferences, created_at, updated_at, avatar_url, bio, location, website
    FROM users 
    WHERE id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({
      success: false,
      error: {
        message: '用户不存在',
        code: 'USER_NOT_FOUND'
      }
    });
  }

  const user = result.rows[0];

  res.json({
    success: true,
    data: {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      plan: user.plan,
      status: user.status,
      emailVerified: user.email_verified,
      emailVerifiedAt: user.email_verified_at,
      lastLogin: user.last_login,
      loginCount: user.login_count,
      preferences: user.preferences || {},
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      avatarUrl: user.avatar_url,
      bio: user.bio,
      location: user.location,
      website: user.website
    },
    message: '获取用户信息成功'
  });
}));

/**
 * PUT /api/users/profile
 * 更新用户资料
 */
router.put('/profile', authMiddleware, updateProfileValidation, asyncHandler(async (req, res) => {
  // 验证输入
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        message: '用户信息验证失败',
        code: 'VALIDATION_ERROR',
        details: formatValidationErrors ? formatValidationErrors(errors) : errors.array()
      }
    });
  }

  const userId = req.user.id;
  const { firstName, lastName, username, bio, location, website } = req.body;
  const dbQuery = getDbQuery();

  // 检查用户名是否已被使用
  if (username && username !== req.user.username) {
    const existingUser = await dbQuery(
      'SELECT id FROM users WHERE username = $1 AND id != $2',
      [username, userId]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: {
          message: '该用户名已被使用',
          code: 'USERNAME_CONFLICT'
        }
      });
    }
  }

  // 验证网站URL
  if (website && !isValidUrl(website)) {
    return res.status(400).json({
      success: false,
      error: {
        message: '网站URL格式无效',
        code: 'INVALID_URL'
      }
    });
  }

  // 构建更新字段
  const updates = [];
  const params = [userId];
  let paramIndex = 2;

  if (firstName !== undefined) {
    updates.push(`first_name = $${paramIndex}`);
    params.push(firstName);
    paramIndex++;
  }

  if (lastName !== undefined) {
    updates.push(`last_name = $${paramIndex}`);
    params.push(lastName);
    paramIndex++;
  }

  if (username !== undefined) {
    updates.push(`username = $${paramIndex}`);
    params.push(username);
    paramIndex++;
  }

  if (bio !== undefined) {
    updates.push(`bio = $${paramIndex}`);
    params.push(bio);
    paramIndex++;
  }

  if (location !== undefined) {
    updates.push(`location = $${paramIndex}`);
    params.push(location);
    paramIndex++;
  }

  if (website !== undefined) {
    updates.push(`website = $${paramIndex}`);
    params.push(website);
    paramIndex++;
  }

  if (updates.length === 0) {
    return res.status(400).json({
      success: false,
      error: {
        message: '没有提供要更新的字段',
        code: 'NO_FIELDS_TO_UPDATE'
      }
    });
  }

  // 执行更新
  const setClause = updates.join(', ');
  const result = await dbQuery(
    `UPDATE users 
     SET ${setClause}, updated_at = NOW()
     WHERE id = $1 
     RETURNING id, username, email, first_name, last_name, role, plan, bio, location, website, updated_at`,
    params
  );

  res.json({
    success: true,
    data: result.rows[0],
    message: '用户信息更新成功'
  });
}));

// =====================================================
// 用户偏好设置管理
// =====================================================

/**
 * GET /api/users/preferences
 * 获取用户偏好设置
 */
router.get('/preferences', authMiddleware, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const dbQuery = getDbQuery();

  // 尝试从用户表的preferences字段获取
  let result = await dbQuery(
    'SELECT preferences FROM users WHERE id = $1',
    [userId]
  );

  let preferences = result.rows[0]?.preferences;

  // 如果用户表中没有，尝试从user_preferences表获取
  if (!preferences) {
    result = await dbQuery(
      'SELECT * FROM user_preferences WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length > 0) {
      const pref = result.rows[0];
      preferences = {
        theme: pref.theme,
        language: pref.language,
        notifications: pref.notifications,
        email_notifications: pref.email_notifications,
        auto_save: pref.auto_save
      };
    }
  }

  // 设置默认偏好
  preferences = preferences || {
    theme: 'dark',
    language: 'zh-CN',
    notifications: true,
    email_notifications: true,
    auto_save: true
  };

  res.json({
    success: true,
    data: preferences,
    message: '获取用户偏好成功'
  });
}));

/**
 * PUT /api/users/preferences
 * 更新用户偏好设置
 */
router.put('/preferences', authMiddleware, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const preferences = req.body;
  const dbQuery = getDbQuery();

  // 验证偏好设置格式
  if (typeof preferences !== 'object' || preferences === null) {
    return res.status(400).json({
      success: false,
      error: {
        message: '偏好设置必须是有效的JSON对象',
        code: 'INVALID_PREFERENCES_FORMAT'
      }
    });
  }

  // 首先尝试更新用户表的preferences字段
  let result = await dbQuery(
    `UPDATE users 
     SET preferences = $1, updated_at = NOW()
     WHERE id = $2
     RETURNING preferences`,
    [JSON.stringify(preferences), userId]
  );

  if (result.rows.length > 0) {
    return res.json({
      success: true,
      data: result.rows[0].preferences,
      message: '用户偏好更新成功'
    });
  }

  // 如果用户表更新失败，尝试user_preferences表
  const { theme, language, notifications, email_notifications, auto_save } = preferences;

  // 检查偏好设置是否存在
  const existingResult = await dbQuery(
    'SELECT id FROM user_preferences WHERE user_id = $1',
    [userId]
  );

  const normalizedPreferences = {
    theme: theme || 'dark',
    language: language || 'zh-CN',
    notifications: notifications !== undefined ? notifications : true,
    email_notifications: email_notifications !== undefined ? email_notifications : true,
    auto_save: auto_save !== undefined ? auto_save : true
  };

  if (existingResult.rows.length > 0) {
    // 更新现有偏好
    result = await dbQuery(
      `UPDATE user_preferences 
       SET theme = $2, language = $3, notifications = $4, 
           email_notifications = $5, auto_save = $6, updated_at = NOW()
       WHERE user_id = $1
       RETURNING *`,
      [userId, normalizedPreferences.theme, normalizedPreferences.language,
       normalizedPreferences.notifications, normalizedPreferences.email_notifications, 
       normalizedPreferences.auto_save]
    );
  } else {
    // 创建新偏好
    result = await dbQuery(
      `INSERT INTO user_preferences 
       (user_id, theme, language, notifications, email_notifications, auto_save, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING *`,
      [userId, normalizedPreferences.theme, normalizedPreferences.language,
       normalizedPreferences.notifications, normalizedPreferences.email_notifications, 
       normalizedPreferences.auto_save]
    );
  }

  res.json({
    success: true,
    data: normalizedPreferences,
    message: '用户偏好更新成功'
  });
}));

// =====================================================
// 用户管理 (管理员专用)
// =====================================================

/**
 * GET /api/users
 * 获取用户列表 (管理员专用)
 */
router.get('/', requireRole(ROLES.ADMIN), asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    search,
    role,
    status
  } = req.query;

  const offset = (page - 1) * limit;
  const dbQuery = getDbQuery();

  // 构建查询条件
  const whereConditions = [];
  const queryParams = [];
  let paramIndex = 1;

  if (search) {
    whereConditions.push(`(username ILIKE $${paramIndex} OR email ILIKE $${paramIndex} OR first_name ILIKE $${paramIndex} OR last_name ILIKE $${paramIndex})`);
    queryParams.push(`%${search}%`);
    paramIndex++;
  }

  if (role) {
    whereConditions.push(`role = $${paramIndex}`);
    queryParams.push(role);
    paramIndex++;
  }

  if (status) {
    whereConditions.push(`status = $${paramIndex}`);
    queryParams.push(status);
    paramIndex++;
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  // 获取总数
  const countResult = await dbQuery(
    `SELECT COUNT(*) as total FROM users ${whereClause}`,
    queryParams
  );

  const total = parseInt(countResult.rows[0].total);

  // 获取用户列表
  const usersResult = await dbQuery(
    `SELECT 
      id, username, email, first_name, last_name, role, plan, status,
      email_verified, last_login, login_count, created_at, updated_at
    FROM users 
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...queryParams, limit, offset]
  );

  res.json({
    success: true,
    data: {
      users: usersResult.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    },
    message: '获取用户列表成功'
  });
}));

/**
 * GET /api/users/:userId
 * 获取指定用户信息 (管理员专用)
 */
router.get('/:userId', requireRole(ROLES.ADMIN), asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const dbQuery = getDbQuery();

  const result = await dbQuery(
    `SELECT 
      id, username, email, first_name, last_name, role, plan, status,
      email_verified, email_verified_at, last_login, login_count,
      preferences, created_at, updated_at, avatar_url, bio, location, website
    FROM users 
    WHERE id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({
      success: false,
      error: {
        message: '用户不存在',
        code: 'USER_NOT_FOUND'
      }
    });
  }

  res.json({
    success: true,
    data: result.rows[0],
    message: '获取用户信息成功'
  });
}));

/**
 * PUT /api/users/:userId/status
 * 更新用户状态 (管理员专用)
 */
router.put('/:userId/status', requireRole(ROLES.ADMIN), asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { status } = req.body;
  const dbQuery = getDbQuery();

  if (!['active', 'inactive', 'suspended', 'banned'].includes(status)) {
    return res.status(400).json({
      success: false,
      error: {
        message: '无效的用户状态',
        code: 'INVALID_STATUS'
      }
    });
  }

  const result = await dbQuery(
    `UPDATE users 
     SET status = $1, updated_at = NOW()
     WHERE id = $2
     RETURNING id, username, email, status, updated_at`,
    [status, userId]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({
      success: false,
      error: {
        message: '用户不存在',
        code: 'USER_NOT_FOUND'
      }
    });
  }

  res.json({
    success: true,
    data: result.rows[0],
    message: '用户状态更新成功'
  });
}));

module.exports = router;
