/**
 * 用户路由
 * 处理用户相关的API请求
 */

const express = require('express');
const { body, validationResult } = require('express-validator');

const { getPool } = require('../../../config/database');
const { requireRole, ROLES } = require('../../middleware/auth.js');
const { asyncHandler } = require('../../middleware/errorHandler.js');
const { formatValidationErrors } = require('../../middleware/responseFormatter.js');

const router = express.Router();

// =====================================================
// 验证规则
// =====================================================

const updateProfileValidation = [
  body('firstName')
    .optional()
    .isLength({ max: 50 })
    .withMessage('名字长度不能超过50个字符'),

  body('lastName')
    .optional()
    .isLength({ max: 50 })
    .withMessage('姓氏长度不能超过50个字符'),

  body('username')
    .optional()
    .isLength({ min: 3, max: 30 })
    .withMessage('用户名长度必须在3-30个字符之间')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('用户名只能包含字母、数字和下划线')
];

// =====================================================
// 路由处理器
// =====================================================

/**
 * GET /api/v1/users/profile
 * 获取当前用户详细信息
 */
router.get('/profile', asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const pool = getPool();

  const result = await pool.query(
    `SELECT 
      id, username, email, first_name, last_name, role, plan, status,
      email_verified, email_verified_at, last_login, login_count,
      preferences, created_at, updated_at
    FROM users 
    WHERE id = $1`,
    [userId]
  );

  const user = result.rows[0];

  res.success(user, '获取用户信息成功');
}));

/**
 * PUT /api/v1/users/profile
 * 更新用户资料
 */
router.put('/profile', updateProfileValidation, asyncHandler(async (req, res) => {
  // 验证输入
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.validationError('用户信息验证失败', formatValidationErrors(errors));
  }

  const userId = req.user.id;
  const { firstName, lastName, username } = req.body;
  const pool = getPool();

  // 检查用户名是否已被使用
  if (username && username !== req.user.username) {
    
        const existingUser = await pool.query(
      'SELECT id FROM users WHERE username = $1 AND id != $2',
      [username, userId]
    );

    if (existingUser.rows.length > 0) {
      return res.conflict('该用户名已被使用');
      }
  }

  // 更新用户信息
  const result = await pool.query(
    `UPDATE users 
     SET first_name = COALESCE($1, first_name),
         last_name = COALESCE($2, last_name),
         username = COALESCE($3, username),
         updated_at = NOW()
     WHERE id = $4
     RETURNING id, username, email, first_name, last_name, role, plan, updated_at`,
    [firstName, lastName, username, userId]
  );

  res.success(result.rows[0], '用户信息更新成功');
}));

/**
 * GET /api/v1/users/preferences
 * 获取用户偏好设置
 */
router.get('/preferences', asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const pool = getPool();

  const result = await pool.query(
    'SELECT preferences FROM users WHERE id = $1',
    [userId]
  );

  const preferences = result.rows[0]?.preferences || {};

  res.success(preferences, '获取用户偏好成功');
}));

/**
 * PUT /api/v1/users/preferences
 * 更新用户偏好设置
 */
router.put('/preferences', asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const preferences = req.body;
  const pool = getPool();

  // 验证偏好设置格式
  if (typeof preferences !== 'object' || preferences === null) {
    
        return res.badRequest('偏好设置必须是有效的JSON对象');
      }

  // 更新偏好设置
  const result = await pool.query(
    `UPDATE users 
     SET preferences = $1, updated_at = NOW()
     WHERE id = $2
     RETURNING preferences`,
    [JSON.stringify(preferences), userId]
  );

  res.success(result.rows[0].preferences, '用户偏好更新成功');
}));

/**
 * GET /api/v1/users (管理员专用)
 * 获取用户列表
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
  const pool = getPool();

  // 构建查询条件
  let whereConditions = [];
  let queryParams = [];
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
  const countResult = await pool.query(
    `SELECT COUNT(*) as total FROM users ${whereClause}`,
    queryParams
  );

  const total = parseInt(countResult.rows[0].total);

  // 获取用户列表
  const usersResult = await pool.query(
    `SELECT 
      id, username, email, first_name, last_name, role, plan, status,
      email_verified, last_login, login_count, created_at
    FROM users 
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...queryParams, limit, offset]
  );

  const pagination = {
    current: parseInt(page),
    limit: parseInt(limit),
    total,
    totalPages: Math.ceil(total / limit)
  };

  res.paginated(usersResult.rows, pagination, '获取用户列表成功');
}));

/**
 * PUT /api/v1/users/:id/status (管理员专用)
 * 更新用户状态
 */
router.put('/:id/status', requireRole(ROLES.ADMIN), asyncHandler(async (req, res) => {
  const targetUserId = req.params.id;
  const { status } = req.body;
  const pool = getPool();

  // 验证状态值
  const validStatuses = ['active', 'inactive', 'suspended'];
  if (!validStatuses.includes(status)) {
    return res.badRequest('无效的用户状态');
  }

  // 检查目标用户是否存在
  const userResult = await pool.query(
    'SELECT id, username, role FROM users WHERE id = $1',
    [targetUserId]
  );

  if (userResult.rows.length === 0) {
    
        return res.notFound('用户不存在');
      }

  const targetUser = userResult.rows[0];

  // 防止管理员禁用自己
  if (targetUserId === req.user.id) {
    
        return res.badRequest('不能修改自己的状态');
      }

  // 防止普通管理员修改超级管理员状态
  if (targetUser.role === ROLES.ADMIN && req.user.role !== ROLES.ADMIN) {
    
        return res.forbidden('权限不足');
      }

  // 更新用户状态
  const result = await pool.query(
    `UPDATE users 
     SET status = $1, updated_at = NOW()
     WHERE id = $2
     RETURNING id, username, status`,
    [status, targetUserId]
  );

  res.success(result.rows[0], '用户状态更新成功');
}));

/**
 * DELETE /api/v1/users/:id (管理员专用)
 * 删除用户
 */
router.delete('/:id', requireRole(ROLES.ADMIN), asyncHandler(async (req, res) => {
  const targetUserId = req.params.id;
  const pool = getPool();

  // 检查目标用户是否存在
  const userResult = await pool.query(
    'SELECT id, username, role FROM users WHERE id = $1',
    [targetUserId]
  );

  if (userResult.rows.length === 0) {
    
        return res.notFound('用户不存在');
      }

  const targetUser = userResult.rows[0];

  // 防止管理员删除自己
  if (targetUserId === req.user.id) {
    
        return res.badRequest('不能删除自己的账户');
      }

  // 防止删除其他管理员
  if (targetUser.role === ROLES.ADMIN) {
    
        return res.forbidden('不能删除管理员账户');
      }

  // 删除用户（级联删除相关数据）
  await pool.query('DELETE FROM users WHERE id = $1', [targetUserId]);

  res.success(null, '用户删除成功');
}));

module.exports = router;
