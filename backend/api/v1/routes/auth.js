/**
 * 认证路由
 * 处理用户注册、登录、登出等认证相关操作
 */

const express = require('express');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');

const { getPool } = require('../../../config/database');
const {
  generateToken,
  generateRefreshToken,
  verifyToken,
  updateLastLogin,
  authMiddleware
} = require('./auth.js');
const { asyncHandler } = require('../../middleware/errorHandler.js');
const { formatValidationErrors, ERROR_CODES } = require('../../middleware/responseFormatter.js');

const router = express.Router();

// =====================================================
// 验证规则
// =====================================================

const registerValidation = [
  body('username')
    .isLength({ min: 3, max: 30 })
    .withMessage('用户名长度必须在3-30个字符之间')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('用户名只能包含字母、数字和下划线'),

  body('email')
    .isEmail()
    .withMessage('请输入有效的邮箱地址')
    .normalizeEmail(),

  body('password')
    .isLength({ min: 8 })
    .withMessage('密码长度至少8个字符')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*/d)/)
    .withMessage('密码必须包含至少一个小写字母、一个大写字母和一个数字'),

  body('firstName')
    .optional()
    .isLength({ max: 50 })
    .withMessage('名字长度不能超过50个字符'),

  body('lastName')
    .optional()
    .isLength({ max: 50 })
    .withMessage('姓氏长度不能超过50个字符')
];

const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('请输入有效的邮箱地址')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('密码不能为空')
];

const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('当前密码不能为空'),

  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('新密码长度至少8个字符')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*/d)/)
    .withMessage('新密码必须包含至少一个小写字母、一个大写字母和一个数字')
];

// =====================================================
// 辅助函数
// =====================================================

/**
 * 检查用户是否存在
 */
const checkUserExists = async (email, username = null) => {
  const pool = getPool();
  let query = 'SELECT id, email, username FROM users WHERE email = $1';
  let params = [email];

  if (username) {
    query += ' OR username = $2';
    params.push(username);
  }

  const result = await pool.query(query, params);
  return result.rows[0] || null;
};

/**
 * 创建新用户
 */
const createUser = async (userData) => {
  const pool = getPool();
  const { username, email, password, firstName, lastName } = userData;

  // 加密密码
  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  const result = await pool.query(
    `INSERT INTO users (username, email, password_hash, first_name, last_name)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, username, email, first_name, last_name, role, plan, status, created_at`,
    [username, email, passwordHash, firstName || null, lastName || null]
  );

  return result.rows[0];
};

/**
 * 验证用户密码
 */
const validatePassword = async (email, password) => {
  const pool = getPool();
  const result = await pool.query(
    `SELECT id, username, email, password_hash, first_name, last_name, role, plan, status, 
            email_verified, failed_login_attempts, locked_until
     FROM users 
     WHERE email = $1`,
    [email]
  );

  const user = result.rows[0];
  if (!user) {
    return null;
  }

  // 检查账户是否被锁定
  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    throw new Error('ACCOUNT_LOCKED');
  }

  // 验证密码
  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    // 增加失败登录次数
    await pool.query(
      `UPDATE users 
       SET failed_login_attempts = failed_login_attempts + 1,
           locked_until = CASE 
             WHEN failed_login_attempts >= 4 THEN NOW() + INTERVAL '15 minutes'
             ELSE locked_until
           END
       WHERE id = $1`,
      [user.id]
    );

    return null;
  }

  // 重置失败登录次数
  await pool.query(
    `UPDATE users 
     SET failed_login_attempts = 0, locked_until = NULL 
     WHERE id = $1`,
    [user.id]
  );

  // 移除密码哈希
  delete user.password_hash;
  return user;
};

// =====================================================
// 路由处理器
// =====================================================

/**
 * POST /api/v1/auth/register
 * 用户注册
 */
router.post('/register', registerValidation, asyncHandler(async (req, res) => {
  // 验证输入
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.validationError('注册信息验证失败', formatValidationErrors(errors));
  }

  const { username, email, password, firstName, lastName } = req.body;

  // 检查用户是否已存在
  const existingUser = await checkUserExists(email, username);
  if (existingUser) {
    if (existingUser.email === email) {
      return res.conflict('该邮箱地址已被注册');
    }
    if (existingUser.username === username) {
      return res.conflict('该用户名已被使用');
    }
  }

  // 创建新用户
  const newUser = await createUser({ username, email, password, firstName, lastName });

  // 生成JWT token
  const token = generateToken(newUser);
  const refreshToken = generateRefreshToken(newUser);

  // 更新最后登录时间
  await updateLastLogin(newUser.id);

  res.created({
    user: newUser,
    token,
    refreshToken
  }, '注册成功');
}));

/**
 * POST /api/v1/auth/login
 * 用户登录
 */
router.post('/login', loginValidation, asyncHandler(async (req, res) => {
  // 验证输入
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.validationError('登录信息验证失败', formatValidationErrors(errors));
  }

  const { email, password } = req.body;

  try {
    // 验证用户凭据
    const user = await validatePassword(email, password);

    if (!user) {
      return res.error(ERROR_CODES.INVALID_CREDENTIALS, '邮箱或密码错误', null, 401);
    }

    // 检查账户状态
    if (user.status !== 'active') {
      return res.error(ERROR_CODES.ACCOUNT_LOCKED, '账户已被禁用', { status: user.status }, 403);
    }

    // 生成JWT token
    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    // 更新最后登录时间
    await updateLastLogin(user.id);

    res.success({
      user,
      token,
      refreshToken
    }, '登录成功');

  } catch (error) {
    if (error.message === 'ACCOUNT_LOCKED') {
      return res.error(ERROR_CODES.ACCOUNT_LOCKED, '账户已被锁定，请15分钟后重试', null, 423);
    }
    throw error;
  }
}));

/**
 * POST /api/v1/auth/refresh
 * 刷新访问令牌
 */
router.post('/refresh', asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.badRequest('缺少刷新令牌');
  }

  try {
    // 验证刷新令牌
    const decoded = verifyToken(refreshToken);

    if (decoded.type !== 'refresh') {
      return res.error(ERROR_CODES.TOKEN_INVALID, '无效的刷新令牌', null, 401);
    }

    // 获取用户信息
    const pool = getPool();
    const result = await pool.query(
      `SELECT id, username, email, first_name, last_name, role, plan, status, email_verified
       FROM users 
       WHERE id = $1 AND status = 'active'`,
      [decoded.id]
    );

    const user = result.rows[0];
    if (!user) {
      return res.error(ERROR_CODES.USER_NOT_FOUND, '用户不存在或已被禁用', null, 401);
    }

    // 生成新的访问令牌
    const newToken = generateToken(user);
    const newRefreshToken = generateRefreshToken(user);

    res.success({
      token: newToken,
      refreshToken: newRefreshToken,
      user
    }, '令牌刷新成功');

  } catch (error) {
    if (error.message === 'TOKEN_EXPIRED') {
      return res.error(ERROR_CODES.TOKEN_EXPIRED, '刷新令牌已过期，请重新登录', null, 401);
    } else if (error.message === 'TOKEN_INVALID') {
      return res.error(ERROR_CODES.TOKEN_INVALID, '无效的刷新令牌', null, 401);
    }
    throw error;
  }
}));

/**
 * POST /api/v1/auth/logout
 * 用户登出
 */
router.post('/logout', authMiddleware, asyncHandler(async (req, res) => {
  // 在实际应用中，这里可以将token加入黑名单
  // 或者在Redis中记录已登出的token

  res.success(null, '登出成功');
}));

/**
 * GET /api/v1/auth/me
 * 获取当前用户信息
 */
router.get('/me', authMiddleware, asyncHandler(async (req, res) => {
  res.success(req.user, '获取用户信息成功');
}));

/**
 * PUT /api/v1/auth/change-password
 * 修改密码
 */
router.put('/change-password', authMiddleware, changePasswordValidation, asyncHandler(async (req, res) => {
  // 验证输入
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.validationError('密码验证失败', formatValidationErrors(errors));
  }

  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  // 验证当前密码
  const pool = getPool();
  const result = await pool.query(
    'SELECT password_hash FROM users WHERE id = $1',
    [userId]
  );

  const user = result.rows[0];
  const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);

  if (!isCurrentPasswordValid) {
    return res.badRequest('当前密码错误');
  }

  // 加密新密码
  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
  const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

  // 更新密码
  await pool.query(
    'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
    [newPasswordHash, userId]
  );

  res.success(null, '密码修改成功');
}));

/**
 * POST /api/v1/auth/verify-token
 * 验证令牌有效性
 */
router.post('/verify-token', asyncHandler(async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.badRequest('缺少令牌');
  }

  try {
    const decoded = verifyToken(token);

    // 检查用户是否仍然存在且活跃
    const pool = getPool();
    const result = await pool.query(
      'SELECT id, status FROM users WHERE id = $1',
      [decoded.id]
    );

    const user = result.rows[0];
    if (!user || user.status !== 'active') {
      return res.error(ERROR_CODES.TOKEN_INVALID, '令牌对应的用户不存在或已被禁用', null, 401);
    }

    res.success({
      valid: true,
      decoded: {
        id: decoded.id,
        username: decoded.username,
        email: decoded.email,
        role: decoded.role,
        plan: decoded.plan,
        exp: decoded.exp,
        iat: decoded.iat
      }
    }, '令牌验证成功');

  } catch (error) {
    if (error.message === 'TOKEN_EXPIRED') {
      return res.error(ERROR_CODES.TOKEN_EXPIRED, '令牌已过期', null, 401);
    } else if (error.message === 'TOKEN_INVALID') {
      return res.error(ERROR_CODES.TOKEN_INVALID, '无效的令牌', null, 401);
    }
    throw error;
  }
}));

module.exports = router;
