/**
 * JWT认证中间件
 * 统一的身份验证和权限控制
 */

const jwt = require('jsonwebtoken');
const { getPool } = require('../../config/database');
const { ERROR_CODES } = require('./responseFormatter');

/**
 * JWT配置
 */
const JWT_CONFIG = {
  secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
  expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  issuer: process.env.JWT_ISSUER || 'testweb-platform',
  audience: process.env.JWT_AUDIENCE || 'testweb-users'
};

/**
 * 生成JWT Token
 */
const generateToken = (user) => {
  const payload = {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    plan: user.plan,
    iat: Math.floor(Date.now() / 1000)
  };
  
  return jwt.sign(payload, JWT_CONFIG.secret, {
    expiresIn: JWT_CONFIG.expiresIn,
    issuer: JWT_CONFIG.issuer,
    audience: JWT_CONFIG.audience
  });
};

/**
 * 生成刷新Token
 */
const generateRefreshToken = (user) => {
  const payload = {
    id: user.id,
    type: 'refresh',
    iat: Math.floor(Date.now() / 1000)
  };
  
  return jwt.sign(payload, JWT_CONFIG.secret, {
    expiresIn: '7d', // 刷新token有效期7天
    issuer: JWT_CONFIG.issuer,
    audience: JWT_CONFIG.audience
  });
};

/**
 * 验证JWT Token
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_CONFIG.secret, {
      issuer: JWT_CONFIG.issuer,
      audience: JWT_CONFIG.audience
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('TOKEN_EXPIRED');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('TOKEN_INVALID');
    } else {
      throw new Error('TOKEN_VERIFICATION_FAILED');
    }
  }
};

/**
 * 从请求中提取Token
 */
const extractToken = (req) => {
  // 从Authorization头提取
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // 从Cookie提取（可选）
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }
  
  // 从查询参数提取（仅用于特殊情况，如WebSocket）
  if (req.query && req.query.token) {
    return req.query.token;
  }
  
  return null;
};

/**
 * 获取用户信息
 */
const getUserById = async (userId) => {
  const pool = getPool();
  const result = await pool.query(
    `SELECT id, username, email, role, plan, status, email_verified, 
            last_login, login_count, created_at, updated_at
     FROM users 
     WHERE id = $1 AND status = 'active'`,
    [userId]
  );
  
  return result.rows[0] || null;
};

/**
 * 主要认证中间件
 */
const authMiddleware = async (req, res, next) => {
  try {
    // 提取token
    const token = extractToken(req);
    
    if (!token) {
      return res.unauthorized('缺少认证令牌');
    }
    
    // 验证token
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (error) {
      if (error.message === 'TOKEN_EXPIRED') {
        return res.error(ERROR_CODES.TOKEN_EXPIRED, '认证令牌已过期', null, 401);
      } else if (error.message === 'TOKEN_INVALID') {
        return res.error(ERROR_CODES.TOKEN_INVALID, '无效的认证令牌', null, 401);
      } else {
        return res.unauthorized('令牌验证失败');
      }
    }
    
    // 获取用户信息
    const user = await getUserById(decoded.id);
    
    if (!user) {
      return res.error(ERROR_CODES.USER_NOT_FOUND, '用户不存在或已被禁用', null, 401);
    }
    
    // 检查邮箱验证状态
    if (!user.email_verified && process.env.REQUIRE_EMAIL_VERIFICATION === 'true') {
      return res.error(ERROR_CODES.EMAIL_NOT_VERIFIED, '请先验证邮箱', null, 401);
    }
    
    // 将用户信息添加到请求对象
    req.user = user;
    req.token = token;
    
    next();
  } catch (error) {
    console.error('认证中间件错误:', error);
    res.internalError('认证过程中发生错误');
  }
};

/**
 * 可选认证中间件（不强制要求认证）
 */
const optionalAuthMiddleware = async (req, res, next) => {
  try {
    const token = extractToken(req);
    
    if (token) {
      try {
        const decoded = verifyToken(token);
        const user = await getUserById(decoded.id);
        
        if (user && user.email_verified) {
          req.user = user;
          req.token = token;
        }
      } catch (error) {
        // 可选认证失败时不返回错误，继续处理请求
        console.warn('可选认证失败:', error.message);
      }
    }
    
    next();
  } catch (error) {
    console.error('可选认证中间件错误:', error);
    next(); // 继续处理请求
  }
};

/**
 * 角色权限检查中间件
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.unauthorized('需要认证');
    }
    
    if (!roles.includes(req.user.role)) {
      return res.error(
        ERROR_CODES.INSUFFICIENT_PERMISSIONS,
        '权限不足',
        { required: roles, current: req.user.role },
        403
      );
    }
    
    next();
  };
};

/**
 * 计划权限检查中间件
 */
const requirePlan = (...plans) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.unauthorized('需要认证');
    }
    
    if (!plans.includes(req.user.plan)) {
      return res.error(
        ERROR_CODES.PLAN_LIMIT_EXCEEDED,
        '当前计划不支持此功能',
        { required: plans, current: req.user.plan },
        403
      );
    }
    
    next();
  };
};

/**
 * 用户状态检查中间件
 */
const requireActiveUser = (req, res, next) => {
  if (!req.user) {
    return res.unauthorized('需要认证');
  }
  
  if (req.user.status !== 'active') {
    return res.error(
      ERROR_CODES.ACCOUNT_LOCKED,
      '账户已被锁定或禁用',
      { status: req.user.status },
      403
    );
  }
  
  next();
};

/**
 * 更新用户最后登录时间
 */
const updateLastLogin = async (userId) => {
  try {
    const pool = getPool();
    await pool.query(
      `UPDATE users 
       SET last_login = NOW(), login_count = login_count + 1 
       WHERE id = $1`,
      [userId]
    );
  } catch (error) {
    console.error('更新最后登录时间失败:', error);
  }
};

/**
 * 权限常量
 */
const ROLES = {
  USER: 'user',
  ADMIN: 'admin',
  MODERATOR: 'moderator'
};

const PLANS = {
  FREE: 'free',
  PRO: 'pro',
  ENTERPRISE: 'enterprise'
};

/**
 * 权限检查辅助函数
 */
const hasPermission = (user, requiredRole) => {
  const roleHierarchy = {
    user: 1,
    moderator: 2,
    admin: 3
  };
  
  return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
};

const hasPlanAccess = (user, requiredPlan) => {
  const planHierarchy = {
    free: 1,
    pro: 2,
    enterprise: 3
  };
  
  return planHierarchy[user.plan] >= planHierarchy[requiredPlan];
};

module.exports = {
  authMiddleware,
  optionalAuthMiddleware,
  requireRole,
  requirePlan,
  requireActiveUser,
  generateToken,
  generateRefreshToken,
  verifyToken,
  updateLastLogin,
  hasPermission,
  hasPlanAccess,
  ROLES,
  PLANS,
  JWT_CONFIG
};
