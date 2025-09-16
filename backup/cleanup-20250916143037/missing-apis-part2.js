/**
 * 缺失API端点实现 - 第二部分
 * 实现系统资源、认证、监控等API端点
 */

const express = require('express');
const router = express.Router();
const asyncHandler = require('../middleware/asyncHandler');
const auth = require('../middleware/auth');
const Logger = require('../middleware/logger');

// ================================
// 4. 系统资源API (System Resources)
// ================================

/**
 * 获取系统资源状态
 * GET /api/system/resources
 */
router.get('/system/resources', auth, asyncHandler(async (req, res) => {
  try {
    const os = require('os');
    const fs = require('fs');
    const { Pool } = require('pg');
    const pool = new Pool(require('../config/database').getConfig());
    
    // 获取系统基本信息
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsage = (usedMemory / totalMemory) * 100;
    
    // 获取CPU信息
    const cpus = os.cpus();
    const loadAverage = os.loadavg();
    
    // 获取磁盘使用情况
    let diskUsage = null;
    try {
      const stats = fs.statSync('.');
      diskUsage = {
        total: stats.size || 0,
        used: 0,
        free: 0,
        usage: 0
      };
    } catch (error) {
      Logger.warn('获取磁盘信息失败:', error);
    }
    
    // 获取数据库连接状态
    let dbStatus = 'unknown';
    let dbConnections = 0;
    try {
      const dbResult = await pool.query('SELECT COUNT(*) as connections FROM pg_stat_activity');
      dbConnections = parseInt(dbResult.rows[0].connections);
      dbStatus = 'connected';
    } catch (error) {
      dbStatus = 'disconnected';
      Logger.warn('获取数据库状态失败:', error);
    }
    
    // 获取测试引擎状态
    const engineStatus = await getTestEngineStatus();
    
    const resourceData = {
      timestamp: new Date().toISOString(),
      system: {
        platform: os.platform(),
        arch: os.arch(),
        hostname: os.hostname(),
        uptime: os.uptime()
      },
      memory: {
        total: totalMemory,
        used: usedMemory,
        free: freeMemory,
        usage: Math.round(memoryUsage * 100) / 100
      },
      cpu: {
        count: cpus.length,
        model: cpus[0]?.model || 'Unknown',
        loadAverage: loadAverage,
        usage: Math.round(loadAverage[0] * 100) / 100
      },
      disk: diskUsage,
      database: {
        status: dbStatus,
        connections: dbConnections
      },
      engines: engineStatus
    };
    
    res.json({
      success: true,
      data: resourceData
    });
    
  } catch (error) {
    Logger.error('获取系统资源状态失败:', error);
    res.status(500).json({
      success: false,
      message: '获取系统资源状态失败',
      error: error.message
    });
  }
}));

// ================================
// 5. 测试引擎状态API (Test Engine Status)
// ================================

/**
 * 获取压力测试引擎状态
 * GET /api/test/stress/engines
 */
router.get('/test/stress/engines', auth, asyncHandler(async (req, res) => {
  try {
    const engineStatus = await getEngineStatus('stress');
    res.json({
      success: true,
      data: engineStatus
    });
  } catch (error) {
    Logger.error('获取压力测试引擎状态失败:', error);
    res.status(500).json({
      success: false,
      message: '获取压力测试引擎状态失败',
      error: error.message
    });
  }
}));

/**
 * 获取兼容性测试引擎状态
 * GET /api/test/compatibility/engines
 */
router.get('/test/compatibility/engines', auth, asyncHandler(async (req, res) => {
  try {
    const engineStatus = await getEngineStatus('compatibility');
    res.json({
      success: true,
      data: engineStatus
    });
  } catch (error) {
    Logger.error('获取兼容性测试引擎状态失败:', error);
    res.status(500).json({
      success: false,
      message: '获取兼容性测试引擎状态失败',
      error: error.message
    });
  }
}));

/**
 * 获取API测试引擎状态
 * GET /api/test/api/engines
 */
router.get('/test/api/engines', auth, asyncHandler(async (req, res) => {
  try {
    const engineStatus = await getEngineStatus('api');
    res.json({
      success: true,
      data: engineStatus
    });
  } catch (error) {
    Logger.error('获取API测试引擎状态失败:', error);
    res.status(500).json({
      success: false,
      message: '获取API测试引擎状态失败',
      error: error.message
    });
  }
}));

/**
 * 获取安全测试引擎状态
 * GET /api/test/security/engines
 */
router.get('/test/security/engines', auth, asyncHandler(async (req, res) => {
  try {
    const engineStatus = await getEngineStatus('security');
    res.json({
      success: true,
      data: engineStatus
    });
  } catch (error) {
    Logger.error('获取安全测试引擎状态失败:', error);
    res.status(500).json({
      success: false,
      message: '获取安全测试引擎状态失败',
      error: error.message
    });
  }
}));

// ================================
// 6. 认证API (Authentication)
// ================================

/**
 * 验证令牌
 * POST /api/auth/validate
 */
router.post('/auth/validate', asyncHandler(async (req, res) => {
  const { token } = req.body;
  
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret');
    
    // 查询用户信息
    const { Pool } = require('pg');
    const pool = new Pool(require('../config/database').getConfig());
    
    const userQuery = 'SELECT id, username, email, role, status FROM users WHERE id = $1';
    const userResult = await pool.query(userQuery, [decoded.userId]);
    
    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    const user = userResult.rows[0];
    
    if (user.status !== 'active') {
      return res.status(401).json({
        success: false,
        message: '用户账户已被禁用'
      });
    }
    
    res.json({
      success: true,
      data: {
        valid: true,
        user: user,
        expiresAt: new Date(decoded.exp * 1000).toISOString()
      }
    });
    
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: '无效的令牌'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: '令牌已过期'
      });
    }
    
    Logger.error('验证令牌失败:', error);
    res.status(500).json({
      success: false,
      message: '验证令牌失败',
      error: error.message
    });
  }
}));

/**
 * 用户登录
 * POST /api/auth/login
 */
router.post('/auth/login', asyncHandler(async (req, res) => {
  const { username, password, email } = req.body;
  
  try {
    const { Pool } = require('pg');
    const pool = new Pool(require('../config/database').getConfig());
    const bcrypt = require('bcrypt');
    const jwt = require('jsonwebtoken');
    
    // 查询用户
    let userQuery;
    let queryParams;
    
    if (email) {
      userQuery = 'SELECT * FROM users WHERE email = $1';
      queryParams = [email];
    } else {
      userQuery = 'SELECT * FROM users WHERE username = $1';
      queryParams = [username];
    }
    
    const userResult = await pool.query(userQuery, queryParams);
    
    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误'
      });
    }
    
    const user = userResult.rows[0];
    
    // 验证密码
    const passwordValid = await bcrypt.compare(password, user.password_hash);
    
    if (!passwordValid) {
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误'
      });
    }
    
    // 检查用户状态
    if (user.status !== 'active') {
      return res.status(401).json({
        success: false,
        message: '用户账户已被禁用'
      });
    }
    
    // 生成JWT令牌
    const token = jwt.sign(
      { 
        userId: user.id, 
        username: user.username, 
        role: user.role 
      },
      process.env.JWT_SECRET || 'default-secret',
      { expiresIn: '24h' }
    );
    
    // 更新最后登录时间
    await pool.query(
      'UPDATE users SET last_login_at = NOW() WHERE id = $1',
      [user.id]
    );
    
    // 返回用户信息和令牌
    const { password_hash, ...userInfo } = user;
    
    res.json({
      success: true,
      data: {
        user: userInfo,
        token: token,
        expiresIn: '24h'
      },
      message: '登录成功'
    });
    
  } catch (error) {
    Logger.error('用户登录失败:', error);
    res.status(500).json({
      success: false,
      message: '登录失败',
      error: error.message
    });
  }
}));

/**
 * 用户注册
 * POST /api/auth/register
 */
router.post('/auth/register', asyncHandler(async (req, res) => {
  const { username, email, password, confirmPassword } = req.body;
  
  try {
    // 验证输入
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: '用户名、邮箱和密码不能为空'
      });
    }
    
    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: '两次输入的密码不一致'
      });
    }
    
    const { Pool } = require('pg');
    const pool = new Pool(require('../config/database').getConfig());
    const bcrypt = require('bcrypt');
    
    // 检查用户名和邮箱是否已存在
    const existingUserQuery = 'SELECT id FROM users WHERE username = $1 OR email = $2';
    const existingUserResult = await pool.query(existingUserQuery, [username, email]);
    
    if (existingUserResult.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: '用户名或邮箱已存在'
      });
    }
    
    // 加密密码
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // 创建用户
    const createUserQuery = `
      INSERT INTO users (username, email, password_hash, role, status, created_at, updated_at)
      VALUES ($1, $2, $3, 'user', 'active', NOW(), NOW())
      RETURNING id, username, email, role, status, created_at
    `;
    
    const createUserResult = await pool.query(createUserQuery, [
      username,
      email,
      passwordHash
    ]);
    
    const newUser = createUserResult.rows[0];
    
    res.status(201).json({
      success: true,
      data: newUser,
      message: '注册成功'
    });
    
  } catch (error) {
    Logger.error('用户注册失败:', error);
    res.status(500).json({
      success: false,
      message: '注册失败',
      error: error.message
    });
  }
}));

/**
 * 用户登出
 * POST /api/auth/logout
 */
router.post('/auth/logout', auth, asyncHandler(async (req, res) => {
  try {
    // 这里可以实现令牌黑名单逻辑
    // 目前简单返回成功
    
    res.json({
      success: true,
      message: '登出成功'
    });
    
  } catch (error) {
    Logger.error('用户登出失败:', error);
    res.status(500).json({
      success: false,
      message: '登出失败',
      error: error.message
    });
  }
}));

/**
 * 获取用户资料
 * GET /api/auth/profile
 */
router.get('/auth/profile', auth, asyncHandler(async (req, res) => {
  try {
    const { Pool } = require('pg');
    const pool = new Pool(require('../config/database').getConfig());
    
    const userQuery = `
      SELECT id, username, email, role, status, created_at, updated_at, last_login_at,
             profile_data
      FROM users 
      WHERE id = $1
    `;
    
    const userResult = await pool.query(userQuery, [req.user.id]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    res.json({
      success: true,
      data: userResult.rows[0]
    });
    
  } catch (error) {
    Logger.error('获取用户资料失败:', error);
    res.status(500).json({
      success: false,
      message: '获取用户资料失败',
      error: error.message
    });
  }
}));

/**
 * 修改密码
 * POST /api/auth/change-password
 */
router.post('/auth/change-password', auth, asyncHandler(async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  
  try {
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: '所有密码字段都不能为空'
      });
    }
    
    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: '新密码和确认密码不一致'
      });
    }
    
    const { Pool } = require('pg');
    const pool = new Pool(require('../config/database').getConfig());
    const bcrypt = require('bcrypt');
    
    // 获取当前用户信息
    const userQuery = 'SELECT password_hash FROM users WHERE id = $1';
    const userResult = await pool.query(userQuery, [req.user.id]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    const user = userResult.rows[0];
    
    // 验证当前密码
    const currentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
    
    if (!currentPasswordValid) {
      return res.status(401).json({
        success: false,
        message: '当前密码错误'
      });
    }
    
    // 加密新密码
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);
    
    // 更新密码
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [newPasswordHash, req.user.id]
    );
    
    res.json({
      success: true,
      message: '密码修改成功'
    });
    
  } catch (error) {
    Logger.error('修改密码失败:', error);
    res.status(500).json({
      success: false,
      message: '修改密码失败',
      error: error.message
    });
  }
}));

// 辅助函数：获取测试引擎状态
async function getTestEngineStatus() {
  try {
    const engines = {
      stress: await getEngineStatus('stress'),
      performance: await getEngineStatus('performance'),
      security: await getEngineStatus('security'),
      api: await getEngineStatus('api'),
      compatibility: await getEngineStatus('compatibility')
    };
    
    return engines;
  } catch (error) {
    Logger.error('获取测试引擎状态失败:', error);
    return {};
  }
}

// 辅助函数：获取单个引擎状态
async function getEngineStatus(engineType) {
  try {
    const { Pool } = require('pg');
    const pool = new Pool(require('../config/database').getConfig());
    
    // 查询引擎状态
    const statusQuery = `
      SELECT status, last_heartbeat, active_tests, total_tests_today
      FROM engine_status 
      WHERE engine_type = $1
    `;
    
    const statusResult = await pool.query(statusQuery, [engineType]);
    
    if (statusResult.rows.length === 0) {
      return {
        type: engineType,
        status: 'unknown',
        lastHeartbeat: null,
        activeTests: 0,
        totalTestsToday: 0
      };
    }
    
    const status = statusResult.rows[0];
    
    return {
      type: engineType,
      status: status.status,
      lastHeartbeat: status.last_heartbeat,
      activeTests: status.active_tests || 0,
      totalTestsToday: status.total_tests_today || 0
    };
    
  } catch (error) {
    Logger.error(`获取${engineType}引擎状态失败:`, error);
    return {
      type: engineType,
      status: 'error',
      lastHeartbeat: null,
      activeTests: 0,
      totalTestsToday: 0,
      error: error.message
    };
  }
}

module.exports = router;
