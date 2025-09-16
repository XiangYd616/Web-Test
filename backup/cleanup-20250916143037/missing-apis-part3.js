/**
 * 缺失API端点实现 - 第三部分
 * 实现监控、权限、测试管理等API端点
 */

const express = require('express');
const router = express.Router();
const asyncHandler = require('../middleware/asyncHandler');
const auth = require('../middleware/auth');
const Logger = require('../middleware/logger');

// ================================
// 7. 监控API (Monitoring)
// ================================

/**
 * 启动监控
 * POST /api/monitoring/start
 */
router.post('/monitoring/start', auth, asyncHandler(async (req, res) => {
  const { targets, config = {} } = req.body;
  const userId = req.user.id;
  
  try {
    const { Pool } = require('pg');
    const pool = new Pool(require('../config/database').getConfig());
    
    // 创建监控任务
    const monitoringQuery = `
      INSERT INTO monitoring_tasks (user_id, targets, config, status, created_at)
      VALUES ($1, $2, $3, 'active', NOW())
      RETURNING *
    `;
    
    const result = await pool.query(monitoringQuery, [
      userId,
      JSON.stringify(targets),
      JSON.stringify(config)
    ]);
    
    const task = result.rows[0];
    
    // 启动监控服务
    await startMonitoringService(task.id, targets, config);
    
    res.status(201).json({
      success: true,
      data: task,
      message: '监控启动成功'
    });
    
  } catch (error) {
    Logger.error('启动监控失败:', error);
    res.status(500).json({
      success: false,
      message: '启动监控失败',
      error: error.message
    });
  }
}));

/**
 * 停止监控
 * POST /api/monitoring/stop
 */
router.post('/monitoring/stop', auth, asyncHandler(async (req, res) => {
  const { taskId } = req.body;
  const userId = req.user.id;
  
  try {
    const { Pool } = require('pg');
    const pool = new Pool(require('../config/database').getConfig());
    
    // 验证任务权限
    const taskQuery = 'SELECT * FROM monitoring_tasks WHERE id = $1 AND user_id = $2';
    const taskResult = await pool.query(taskQuery, [taskId, userId]);
    
    if (taskResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '监控任务不存在'
      });
    }
    
    // 停止监控任务
    await pool.query(
      'UPDATE monitoring_tasks SET status = $1, stopped_at = NOW() WHERE id = $2',
      ['stopped', taskId]
    );
    
    // 停止监控服务
    await stopMonitoringService(taskId);
    
    res.json({
      success: true,
      message: '监控停止成功'
    });
    
  } catch (error) {
    Logger.error('停止监控失败:', error);
    res.status(500).json({
      success: false,
      message: '停止监控失败',
      error: error.message
    });
  }
}));

/**
 * 获取监控目标列表
 * GET /api/monitoring/targets
 */
router.get('/monitoring/targets', auth, asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status } = req.query;
  const userId = req.user.id;
  
  try {
    const { Pool } = require('pg');
    const pool = new Pool(require('../config/database').getConfig());
    
    let whereClause = 'WHERE user_id = $1';
    const params = [userId];
    
    if (status) {
      whereClause += ' AND status = $' + (params.length + 1);
      params.push(status);
    }
    
    const query = `
      SELECT * FROM monitoring_targets 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    
    params.push(parseInt(limit));
    params.push((parseInt(page) - 1) * parseInt(limit));
    
    const result = await pool.query(query, params);
    
    // 获取总数
    const countQuery = `SELECT COUNT(*) as total FROM monitoring_targets ${whereClause}`;
    const countResult = await pool.query(countQuery, params.slice(0, -2));
    
    res.json({
      success: true,
      data: {
        targets: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(countResult.rows[0].total),
          pages: Math.ceil(countResult.rows[0].total / limit)
        }
      }
    });
    
  } catch (error) {
    Logger.error('获取监控目标列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取监控目标列表失败',
      error: error.message
    });
  }
}));

/**
 * 创建监控目标
 * POST /api/monitoring/targets
 */
router.post('/monitoring/targets', auth, asyncHandler(async (req, res) => {
  const { name, url, type, config = {} } = req.body;
  const userId = req.user.id;
  
  try {
    const { Pool } = require('pg');
    const pool = new Pool(require('../config/database').getConfig());
    
    const query = `
      INSERT INTO monitoring_targets (user_id, name, url, type, config, status, created_at)
      VALUES ($1, $2, $3, $4, $5, 'active', NOW())
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      userId,
      name,
      url,
      type,
      JSON.stringify(config)
    ]);
    
    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: '监控目标创建成功'
    });
    
  } catch (error) {
    Logger.error('创建监控目标失败:', error);
    res.status(500).json({
      success: false,
      message: '创建监控目标失败',
      error: error.message
    });
  }
}));

/**
 * 获取单个监控目标
 * GET /api/monitoring/targets/:targetId
 */
router.get('/monitoring/targets/:targetId', auth, asyncHandler(async (req, res) => {
  const { targetId } = req.params;
  const userId = req.user.id;
  
  try {
    const { Pool } = require('pg');
    const pool = new Pool(require('../config/database').getConfig());
    
    const query = 'SELECT * FROM monitoring_targets WHERE id = $1 AND user_id = $2';
    const result = await pool.query(query, [targetId, userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '监控目标不存在'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
    
  } catch (error) {
    Logger.error('获取监控目标失败:', error);
    res.status(500).json({
      success: false,
      message: '获取监控目标失败',
      error: error.message
    });
  }
}));

/**
 * 更新监控目标
 * PUT /api/monitoring/targets/:targetId
 */
router.put('/monitoring/targets/:targetId', auth, asyncHandler(async (req, res) => {
  const { targetId } = req.params;
  const { name, url, type, config, status } = req.body;
  const userId = req.user.id;
  
  try {
    const { Pool } = require('pg');
    const pool = new Pool(require('../config/database').getConfig());
    
    // 验证目标存在
    const existQuery = 'SELECT id FROM monitoring_targets WHERE id = $1 AND user_id = $2';
    const existResult = await pool.query(existQuery, [targetId, userId]);
    
    if (existResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '监控目标不存在'
      });
    }
    
    const updateQuery = `
      UPDATE monitoring_targets 
      SET name = $1, url = $2, type = $3, config = $4, status = $5, updated_at = NOW()
      WHERE id = $6 AND user_id = $7
      RETURNING *
    `;
    
    const result = await pool.query(updateQuery, [
      name,
      url,
      type,
      JSON.stringify(config),
      status,
      targetId,
      userId
    ]);
    
    res.json({
      success: true,
      data: result.rows[0],
      message: '监控目标更新成功'
    });
    
  } catch (error) {
    Logger.error('更新监控目标失败:', error);
    res.status(500).json({
      success: false,
      message: '更新监控目标失败',
      error: error.message
    });
  }
}));

/**
 * 删除监控目标
 * DELETE /api/monitoring/targets/:targetId
 */
router.delete('/monitoring/targets/:targetId', auth, asyncHandler(async (req, res) => {
  const { targetId } = req.params;
  const userId = req.user.id;
  
  try {
    const { Pool } = require('pg');
    const pool = new Pool(require('../config/database').getConfig());
    
    const query = 'DELETE FROM monitoring_targets WHERE id = $1 AND user_id = $2 RETURNING *';
    const result = await pool.query(query, [targetId, userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '监控目标不存在'
      });
    }
    
    res.json({
      success: true,
      message: '监控目标删除成功'
    });
    
  } catch (error) {
    Logger.error('删除监控目标失败:', error);
    res.status(500).json({
      success: false,
      message: '删除监控目标失败',
      error: error.message
    });
  }
}));

/**
 * 检查监控目标
 * POST /api/monitoring/targets/:targetId/check
 */
router.post('/monitoring/targets/:targetId/check', auth, asyncHandler(async (req, res) => {
  const { targetId } = req.params;
  const userId = req.user.id;
  
  try {
    const { Pool } = require('pg');
    const pool = new Pool(require('../config/database').getConfig());
    
    // 获取监控目标
    const targetQuery = 'SELECT * FROM monitoring_targets WHERE id = $1 AND user_id = $2';
    const targetResult = await pool.query(targetQuery, [targetId, userId]);
    
    if (targetResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '监控目标不存在'
      });
    }
    
    const target = targetResult.rows[0];
    
    // 执行检查
    const checkResult = await performTargetCheck(target);
    
    // 保存检查结果
    const saveQuery = `
      INSERT INTO monitoring_checks (target_id, status, response_time, error_message, checked_at)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING *
    `;
    
    const saveResult = await pool.query(saveQuery, [
      targetId,
      checkResult.status,
      checkResult.responseTime,
      checkResult.error
    ]);
    
    res.json({
      success: true,
      data: {
        target: target,
        check: saveResult.rows[0],
        result: checkResult
      }
    });
    
  } catch (error) {
    Logger.error('检查监控目标失败:', error);
    res.status(500).json({
      success: false,
      message: '检查监控目标失败',
      error: error.message
    });
  }
}));

/**
 * 获取监控告警
 * GET /api/monitoring/alerts
 */
router.get('/monitoring/alerts', auth, asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, severity } = req.query;
  const userId = req.user.id;
  
  try {
    const { Pool } = require('pg');
    const pool = new Pool(require('../config/database').getConfig());
    
    let whereClause = 'WHERE ma.user_id = $1';
    const params = [userId];
    
    if (status) {
      whereClause += ' AND ma.status = $' + (params.length + 1);
      params.push(status);
    }
    
    if (severity) {
      whereClause += ' AND ma.severity = $' + (params.length + 1);
      params.push(severity);
    }
    
    const query = `
      SELECT ma.*, mt.name as target_name, mt.url as target_url
      FROM monitoring_alerts ma
      LEFT JOIN monitoring_targets mt ON ma.target_id = mt.id
      ${whereClause}
      ORDER BY ma.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    
    params.push(parseInt(limit));
    params.push((parseInt(page) - 1) * parseInt(limit));
    
    const result = await pool.query(query, params);
    
    // 获取总数
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM monitoring_alerts ma
      LEFT JOIN monitoring_targets mt ON ma.target_id = mt.id
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, params.slice(0, -2));
    
    res.json({
      success: true,
      data: {
        alerts: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(countResult.rows[0].total),
          pages: Math.ceil(countResult.rows[0].total / limit)
        }
      }
    });
    
  } catch (error) {
    Logger.error('获取监控告警失败:', error);
    res.status(500).json({
      success: false,
      message: '获取监控告警失败',
      error: error.message
    });
  }
}));

/**
 * 解决监控告警
 * POST /api/monitoring/alerts/:alertId/resolve
 */
router.post('/monitoring/alerts/:alertId/resolve', auth, asyncHandler(async (req, res) => {
  const { alertId } = req.params;
  const { resolution } = req.body;
  const userId = req.user.id;
  
  try {
    const { Pool } = require('pg');
    const pool = new Pool(require('../config/database').getConfig());
    
    const query = `
      UPDATE monitoring_alerts 
      SET status = 'resolved', 
          resolved_at = NOW(), 
          resolved_by = $1,
          resolution = $2
      WHERE id = $3 AND user_id = $4
      RETURNING *
    `;
    
    const result = await pool.query(query, [userId, resolution, alertId, userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '监控告警不存在'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0],
      message: '告警解决成功'
    });
    
  } catch (error) {
    Logger.error('解决监控告警失败:', error);
    res.status(500).json({
      success: false,
      message: '解决监控告警失败',
      error: error.message
    });
  }
}));

/**
 * 获取监控统计
 * GET /api/monitoring/stats
 */
router.get('/monitoring/stats', auth, asyncHandler(async (req, res) => {
  const { timeRange = '24' } = req.query;
  const userId = req.user.id;
  
  try {
    const { Pool } = require('pg');
    const pool = new Pool(require('../config/database').getConfig());
    
    const query = `
      SELECT 
        COUNT(DISTINCT mt.id) as total_targets,
        COUNT(DISTINCT CASE WHEN mt.status = 'active' THEN mt.id END) as active_targets,
        COUNT(ma.id) as total_alerts,
        COUNT(CASE WHEN ma.status = 'active' THEN ma.id END) as active_alerts,
        COUNT(CASE WHEN ma.severity = 'critical' THEN ma.id END) as critical_alerts,
        AVG(mc.response_time) as avg_response_time
      FROM monitoring_targets mt
      LEFT JOIN monitoring_alerts ma ON mt.id = ma.target_id 
        AND ma.created_at >= NOW() - INTERVAL '${parseInt(timeRange)} hours'
      LEFT JOIN monitoring_checks mc ON mt.id = mc.target_id 
        AND mc.checked_at >= NOW() - INTERVAL '${parseInt(timeRange)} hours'
      WHERE mt.user_id = $1
    `;
    
    const result = await pool.query(query, [userId]);
    
    res.json({
      success: true,
      data: result.rows[0]
    });
    
  } catch (error) {
    Logger.error('获取监控统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取监控统计失败',
      error: error.message
    });
  }
}));

/**
 * 批量操作监控目标
 * POST /api/monitoring/targets/batch
 */
router.post('/monitoring/targets/batch', auth, asyncHandler(async (req, res) => {
  const { action, targetIds, data = {} } = req.body;
  const userId = req.user.id;
  
  try {
    const { Pool } = require('pg');
    const pool = new Pool(require('../config/database').getConfig());
    
    let query;
    let params;
    
    switch (action) {
      case 'activate':
        query = `
          UPDATE monitoring_targets 
          SET status = 'active', updated_at = NOW()
          WHERE id = ANY($1) AND user_id = $2
          RETURNING *
        `;
        params = [targetIds, userId];
        break;
        
      case 'deactivate':
        query = `
          UPDATE monitoring_targets 
          SET status = 'inactive', updated_at = NOW()
          WHERE id = ANY($1) AND user_id = $2
          RETURNING *
        `;
        params = [targetIds, userId];
        break;
        
      case 'delete':
        query = 'DELETE FROM monitoring_targets WHERE id = ANY($1) AND user_id = $2 RETURNING *';
        params = [targetIds, userId];
        break;
        
      default:
        return res.status(400).json({
          success: false,
          message: '不支持的批量操作'
        });
    }
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      data: result.rows,
      message: `批量${action}操作成功，影响${result.rows.length}条记录`
    });
    
  } catch (error) {
    Logger.error('批量操作监控目标失败:', error);
    res.status(500).json({
      success: false,
      message: '批量操作监控目标失败',
      error: error.message
    });
  }
}));

// 辅助函数：启动监控服务
async function startMonitoringService(taskId, targets, config) {
  // 这里实现监控服务启动逻辑
  Logger.info(`启动监控服务: ${taskId}`, { targets, config });
}

// 辅助函数：停止监控服务
async function stopMonitoringService(taskId) {
  // 这里实现监控服务停止逻辑
  Logger.info(`停止监控服务: ${taskId}`);
}

// 辅助函数：执行目标检查
async function performTargetCheck(target) {
  const startTime = Date.now();
  
  try {
    const axios = require('axios');
    const response = await axios.get(target.url, {
      timeout: 10000,
      validateStatus: () => true // 接受所有状态码
    });
    
    const responseTime = Date.now() - startTime;
    
    return {
      status: response.status < 400 ? 'success' : 'error',
      responseTime: responseTime,
      statusCode: response.status,
      error: response.status >= 400 ? `HTTP ${response.status}` : null
    };
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    return {
      status: 'error',
      responseTime: responseTime,
      statusCode: null,
      error: error.message
    };
  }
}

module.exports = router;
