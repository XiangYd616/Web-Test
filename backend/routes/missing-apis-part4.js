/**
 * 缺失API端点实现 - 第四部分
 * 实现权限管理、测试管理、通知等API端点
 */

const express = require('express');
const router = express.Router();
const asyncHandler = require('../middleware/asyncHandler');
const auth = require('../middleware/auth');
const Logger = require('../middleware/logger');

// ================================
// 8. 权限管理API (Permissions)
// ================================

/**
 * 获取用户权限列表
 * GET /api/auth/permissions
 */
router.get('/auth/permissions', auth, asyncHandler(async (req, res) => {
  try {
    const { Pool } = require('pg');
    const pool = new Pool(require('../config/database').getConfig());
    
    const query = `
      SELECT p.* 
      FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      JOIN user_roles ur ON rp.role_id = ur.role_id
      WHERE ur.user_id = $1
    `;
    
    const result = await pool.query(query, [req.user.id]);
    
    res.json({
      success: true,
      data: result.rows
    });
    
  } catch (error) {
    Logger.error('获取用户权限失败:', error);
    res.status(500).json({
      success: false,
      message: '获取用户权限失败',
      error: error.message
    });
  }
}));

/**
 * 获取角色列表
 * GET /api/auth/roles
 */
router.get('/auth/roles', auth, asyncHandler(async (req, res) => {
  try {
    const { Pool } = require('pg');
    const pool = new Pool(require('../config/database').getConfig());
    
    const query = 'SELECT * FROM roles ORDER BY name';
    const result = await pool.query(query);
    
    res.json({
      success: true,
      data: result.rows
    });
    
  } catch (error) {
    Logger.error('获取角色列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取角色列表失败',
      error: error.message
    });
  }
}));

/**
 * 检查单个权限
 * POST /api/auth/check-permission
 */
router.post('/auth/check-permission', auth, asyncHandler(async (req, res) => {
  const { permission } = req.body;
  
  try {
    const hasPermission = await checkUserPermission(req.user.id, permission);
    
    res.json({
      success: true,
      data: {
        permission: permission,
        hasPermission: hasPermission
      }
    });
    
  } catch (error) {
    Logger.error('检查权限失败:', error);
    res.status(500).json({
      success: false,
      message: '检查权限失败',
      error: error.message
    });
  }
}));

/**
 * 批量检查权限
 * POST /api/auth/check-batch-permissions
 */
router.post('/auth/check-batch-permissions', auth, asyncHandler(async (req, res) => {
  const { permissions } = req.body;
  
  try {
    const results = {};
    
    for (const permission of permissions) {
      results[permission] = await checkUserPermission(req.user.id, permission);
    }
    
    res.json({
      success: true,
      data: results
    });
    
  } catch (error) {
    Logger.error('批量检查权限失败:', error);
    res.status(500).json({
      success: false,
      message: '批量检查权限失败',
      error: error.message
    });
  }
}));

// ================================
// 9. 测试管理API (Test Management)
// ================================

/**
 * 启动测试
 * POST /api/test/start
 */
router.post('/test/start', auth, asyncHandler(async (req, res) => {
  const { type, config, target } = req.body;
  const userId = req.user.id;
  
  try {
    const { Pool } = require('pg');
    const pool = new Pool(require('../config/database').getConfig());
    
    // 创建测试记录
    const testQuery = `
      INSERT INTO test_records (user_id, test_type, target_url, config, status, created_at)
      VALUES ($1, $2, $3, $4, 'pending', NOW())
      RETURNING *
    `;
    
    const testResult = await pool.query(testQuery, [
      userId,
      type,
      target,
      JSON.stringify(config)
    ]);
    
    const test = testResult.rows[0];
    
    // 异步启动测试
    setImmediate(() => {
      startTestExecution(test.id, type, target, config);
    });
    
    res.status(201).json({
      success: true,
      data: test,
      message: '测试启动成功'
    });
    
  } catch (error) {
    Logger.error('启动测试失败:', error);
    res.status(500).json({
      success: false,
      message: '启动测试失败',
      error: error.message
    });
  }
}));

/**
 * 取消测试
 * POST /api/test/:testId/cancel
 */
router.post('/test/:testId/cancel', auth, asyncHandler(async (req, res) => {
  const { testId } = req.params;
  const userId = req.user.id;
  
  try {
    const { Pool } = require('pg');
    const pool = new Pool(require('../config/database').getConfig());
    
    // 验证测试权限
    const testQuery = 'SELECT * FROM test_records WHERE id = $1 AND user_id = $2';
    const testResult = await pool.query(testQuery, [testId, userId]);
    
    if (testResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '测试不存在'
      });
    }
    
    const test = testResult.rows[0];
    
    if (test.status === 'completed' || test.status === 'failed' || test.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: '测试已完成，无法取消'
      });
    }
    
    // 更新测试状态
    await pool.query(
      'UPDATE test_records SET status = $1, cancelled_at = NOW() WHERE id = $2',
      ['cancelled', testId]
    );
    
    // 停止测试执行
    await stopTestExecution(testId);
    
    res.json({
      success: true,
      message: '测试取消成功'
    });
    
  } catch (error) {
    Logger.error('取消测试失败:', error);
    res.status(500).json({
      success: false,
      message: '取消测试失败',
      error: error.message
    });
  }
}));

/**
 * 获取测试配置列表
 * GET /api/test/configurations
 */
router.get('/test/configurations', auth, asyncHandler(async (req, res) => {
  const { type, page = 1, limit = 20 } = req.query;
  const userId = req.user.id;
  
  try {
    const { Pool } = require('pg');
    const pool = new Pool(require('../config/database').getConfig());
    
    let whereClause = 'WHERE user_id = $1';
    const params = [userId];
    
    if (type) {
      whereClause += ' AND test_type = $' + (params.length + 1);
      params.push(type);
    }
    
    const query = `
      SELECT * FROM test_configurations 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    
    params.push(parseInt(limit));
    params.push((parseInt(page) - 1) * parseInt(limit));
    
    const result = await pool.query(query, params);
    
    // 获取总数
    const countQuery = `SELECT COUNT(*) as total FROM test_configurations ${whereClause}`;
    const countResult = await pool.query(countQuery, params.slice(0, -2));
    
    res.json({
      success: true,
      data: {
        configurations: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(countResult.rows[0].total),
          pages: Math.ceil(countResult.rows[0].total / limit)
        }
      }
    });
    
  } catch (error) {
    Logger.error('获取测试配置列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取测试配置列表失败',
      error: error.message
    });
  }
}));

/**
 * 创建测试配置
 * POST /api/test/configurations
 */
router.post('/test/configurations', auth, asyncHandler(async (req, res) => {
  const { name, testType, config, description } = req.body;
  const userId = req.user.id;
  
  try {
    const { Pool } = require('pg');
    const pool = new Pool(require('../config/database').getConfig());
    
    const query = `
      INSERT INTO test_configurations (user_id, name, test_type, config, description, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      userId,
      name,
      testType,
      JSON.stringify(config),
      description
    ]);
    
    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: '测试配置创建成功'
    });
    
  } catch (error) {
    Logger.error('创建测试配置失败:', error);
    res.status(500).json({
      success: false,
      message: '创建测试配置失败',
      error: error.message
    });
  }
}));

/**
 * 获取单个测试配置
 * GET /api/test/configurations/:configId
 */
router.get('/test/configurations/:configId', auth, asyncHandler(async (req, res) => {
  const { configId } = req.params;
  const userId = req.user.id;
  
  try {
    const { Pool } = require('pg');
    const pool = new Pool(require('../config/database').getConfig());
    
    const query = 'SELECT * FROM test_configurations WHERE id = $1 AND user_id = $2';
    const result = await pool.query(query, [configId, userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '测试配置不存在'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
    
  } catch (error) {
    Logger.error('获取测试配置失败:', error);
    res.status(500).json({
      success: false,
      message: '获取测试配置失败',
      error: error.message
    });
  }
}));

/**
 * 获取单个测试详情
 * GET /api/test/:testId
 */
router.get('/test/:testId', auth, asyncHandler(async (req, res) => {
  const { testId } = req.params;
  const userId = req.user.id;
  
  try {
    const { Pool } = require('pg');
    const pool = new Pool(require('../config/database').getConfig());
    
    const query = `
      SELECT tr.*, u.username
      FROM test_records tr
      LEFT JOIN users u ON tr.user_id = u.id
      WHERE tr.id = $1 AND tr.user_id = $2
    `;
    
    const result = await pool.query(query, [testId, userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '测试不存在'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
    
  } catch (error) {
    Logger.error('获取测试详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取测试详情失败',
      error: error.message
    });
  }
}));

// ================================
// 10. 通知API (Notifications)
// ================================

/**
 * 获取用户通知
 * GET /api/user/notifications
 */
router.get('/user/notifications', auth, asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, unreadOnly = false } = req.query;
  const userId = req.user.id;
  
  try {
    const { Pool } = require('pg');
    const pool = new Pool(require('../config/database').getConfig());
    
    let whereClause = 'WHERE user_id = $1';
    const params = [userId];
    
    if (unreadOnly === 'true') {
      whereClause += ' AND read_at IS NULL';
    }
    
    const query = `
      SELECT * FROM user_notifications 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    
    params.push(parseInt(limit));
    params.push((parseInt(page) - 1) * parseInt(limit));
    
    const result = await pool.query(query, params);
    
    // 获取总数和未读数
    const countQuery = `SELECT COUNT(*) as total FROM user_notifications ${whereClause}`;
    const countResult = await pool.query(countQuery, params.slice(0, -2));
    
    const unreadQuery = 'SELECT COUNT(*) as unread FROM user_notifications WHERE user_id = $1 AND read_at IS NULL';
    const unreadResult = await pool.query(unreadQuery, [userId]);
    
    res.json({
      success: true,
      data: {
        notifications: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(countResult.rows[0].total),
          pages: Math.ceil(countResult.rows[0].total / limit)
        },
        unreadCount: parseInt(unreadResult.rows[0].unread)
      }
    });
    
  } catch (error) {
    Logger.error('获取用户通知失败:', error);
    res.status(500).json({
      success: false,
      message: '获取用户通知失败',
      error: error.message
    });
  }
}));

// 辅助函数：检查用户权限
async function checkUserPermission(userId, permission) {
  try {
    const { Pool } = require('pg');
    const pool = new Pool(require('../config/database').getConfig());
    
    const query = `
      SELECT COUNT(*) as count
      FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      JOIN user_roles ur ON rp.role_id = ur.role_id
      WHERE ur.user_id = $1 AND p.name = $2
    `;
    
    const result = await pool.query(query, [userId, permission]);
    return parseInt(result.rows[0].count) > 0;
    
  } catch (error) {
    Logger.error('检查用户权限失败:', error);
    return false;
  }
}

// 辅助函数：启动测试执行
async function startTestExecution(testId, type, target, config) {
  try {
    const { Pool } = require('pg');
    const pool = new Pool(require('../config/database').getConfig());
    
    // 更新测试状态为运行中
    await pool.query(
      'UPDATE test_records SET status = $1, started_at = NOW() WHERE id = $2',
      ['running', testId]
    );
    
    // 根据测试类型调用相应的测试引擎
    let result;
    switch (type) {
      case 'stress':
        const StressTestEngine = require('../engines/stress/StressTestEngine');
        const stressEngine = new StressTestEngine();
        result = await stressEngine.runTest(target, config);
        break;
        
      case 'performance':
        const PerformanceTestEngine = require('../engines/performance/PerformanceTestEngine');
        const perfEngine = new PerformanceTestEngine();
        result = await perfEngine.runTest(target, config);
        break;
        
      case 'security':
        const SecurityTestEngine = require('../engines/security/securityTestEngine');
        const secEngine = new SecurityTestEngine();
        result = await secEngine.runTest(target, config);
        break;
        
      case 'api':
        const ApiTestEngine = require('../engines/api/apiTestEngine');
        const apiEngine = new ApiTestEngine();
        result = await apiEngine.runTest(target, config);
        break;
        
      default:
        throw new Error(`不支持的测试类型: ${type}`);
    }
    
    // 更新测试结果
    await pool.query(
      'UPDATE test_records SET status = $1, completed_at = NOW(), results = $2 WHERE id = $3',
      ['completed', JSON.stringify(result), testId]
    );
    
    Logger.info(`测试完成: ${testId}`);
    
  } catch (error) {
    Logger.error(`测试执行失败: ${testId}`, error);
    
    // 更新测试状态为失败
    const { Pool } = require('pg');
    const pool = new Pool(require('../config/database').getConfig());
    await pool.query(
      'UPDATE test_records SET status = $1, error_message = $2, completed_at = NOW() WHERE id = $3',
      ['failed', error.message, testId]
    );
  }
}

// 辅助函数：停止测试执行
async function stopTestExecution(testId) {
  try {
    // 这里实现停止测试的逻辑
    // 可能需要向测试引擎发送停止信号
    Logger.info(`停止测试执行: ${testId}`);
    
  } catch (error) {
    Logger.error(`停止测试执行失败: ${testId}`, error);
  }
}

module.exports = router;
