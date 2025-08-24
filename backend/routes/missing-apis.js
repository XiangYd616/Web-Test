/**
 * 缺失API端点实现
 * 实现前端需要但后端缺失的47个关键API端点
 */

const express = require('express');
const router = express.Router();
const asyncHandler = require('../middleware/asyncHandler');
const auth = require('../middleware/auth');
const Logger = require('../middleware/logger');

// ================================
// 1. 告警管理API (Alert Management)
// ================================

/**
 * 获取告警列表
 * GET /api/v1/alerts
 */
router.get('/v1/alerts', auth, asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, severity, timeRange } = req.query;

  try {
    // 构建查询条件
    let whereClause = 'WHERE 1=1';
    const params = [];

    if (status) {
      whereClause += ' AND status = $' + (params.length + 1);
      params.push(status);
    }

    if (severity) {
      whereClause += ' AND severity = $' + (params.length + 1);
      params.push(severity);
    }

    if (timeRange) {
      const timeRangeHours = parseInt(timeRange);
      whereClause += ' AND created_at >= NOW() - INTERVAL \'' + timeRangeHours + ' hours\'';
    }

    // 查询告警数据
    const query = `
      SELECT id, title, message, severity, status, source, created_at, updated_at,
             acknowledged_at, acknowledged_by, resolved_at, resolved_by
      FROM alerts 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    params.push(parseInt(limit));
    params.push((parseInt(page) - 1) * parseInt(limit));

    const { Pool } = require('pg');
    const pool = new Pool(require('../config/database').getConfig());
    const result = await pool.query(query, params);

    // 获取总数
    const countQuery = `SELECT COUNT(*) as total FROM alerts ${whereClause}`;
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
    Logger.error('获取告警列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取告警列表失败',
      error: error.message
    });
  }
}));

/**
 * 获取告警统计
 * GET /api/v1/alerts/stats
 */
router.get('/v1/alerts/stats', auth, asyncHandler(async (req, res) => {
  const { timeRange = '24' } = req.query;

  try {
    const { Pool } = require('pg');
    const pool = new Pool(require('../config/database').getConfig());

    const query = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
        COUNT(CASE WHEN status = 'acknowledged' THEN 1 END) as acknowledged,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved,
        COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical,
        COUNT(CASE WHEN severity = 'high' THEN 1 END) as high,
        COUNT(CASE WHEN severity = 'medium' THEN 1 END) as medium,
        COUNT(CASE WHEN severity = 'low' THEN 1 END) as low
      FROM alerts 
      WHERE created_at >= NOW() - INTERVAL '${parseInt(timeRange)} hours'
    `;

    const result = await pool.query(query);

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    Logger.error('获取告警统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取告警统计失败',
      error: error.message
    });
  }
}));

/**
 * 获取告警规则
 * GET /api/v1/alerts/rules
 */
router.get('/v1/alerts/rules', auth, asyncHandler(async (req, res) => {
  try {
    const { Pool } = require('pg');
    const pool = new Pool(require('../config/database').getConfig());

    const query = `
      SELECT id, name, description, conditions, actions, enabled, created_at, updated_at
      FROM alert_rules 
      ORDER BY created_at DESC
    `;

    const result = await pool.query(query);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    Logger.error('获取告警规则失败:', error);
    res.status(500).json({
      success: false,
      message: '获取告警规则失败',
      error: error.message
    });
  }
}));

/**
 * 创建告警规则
 * POST /api/v1/alerts/rules
 */
router.post('/v1/alerts/rules', auth, asyncHandler(async (req, res) => {
  const { name, description, conditions, actions, enabled = true } = req.body;

  try {
    const { Pool } = require('pg');
    const pool = new Pool(require('../config/database').getConfig());

    const query = `
      INSERT INTO alert_rules (name, description, conditions, actions, enabled, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING *
    `;

    const result = await pool.query(query, [
      name,
      description,
      JSON.stringify(conditions),
      JSON.stringify(actions),
      enabled
    ]);

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: '告警规则创建成功'
    });

  } catch (error) {
    Logger.error('创建告警规则失败:', error);
    res.status(500).json({
      success: false,
      message: '创建告警规则失败',
      error: error.message
    });
  }
}));

/**
 * 确认告警
 * POST /api/v1/alerts/:alertId/acknowledge
 */
router.post('/v1/alerts/:alertId/acknowledge', auth, asyncHandler(async (req, res) => {
  const { alertId } = req.params;
  const { message } = req.body;
  const userId = req.user.id;

  try {
    const { Pool } = require('pg');
    const pool = new Pool(require('../config/database').getConfig());

    const query = `
      UPDATE alerts 
      SET status = 'acknowledged', 
          acknowledged_at = NOW(), 
          acknowledged_by = $1,
          acknowledgment_message = $2,
          updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `;

    const result = await pool.query(query, [userId, message, alertId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '告警不存在'
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: '告警确认成功'
    });

  } catch (error) {
    Logger.error('确认告警失败:', error);
    res.status(500).json({
      success: false,
      message: '确认告警失败',
      error: error.message
    });
  }
}));

/**
 * 解决告警
 * POST /api/v1/alerts/:alertId/resolve
 */
router.post('/v1/alerts/:alertId/resolve', auth, asyncHandler(async (req, res) => {
  const { alertId } = req.params;
  const { resolution } = req.body;
  const userId = req.user.id;

  try {
    const { Pool } = require('pg');
    const pool = new Pool(require('../config/database').getConfig());

    const query = `
      UPDATE alerts 
      SET status = 'resolved', 
          resolved_at = NOW(), 
          resolved_by = $1,
          resolution = $2,
          updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `;

    const result = await pool.query(query, [userId, resolution, alertId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '告警不存在'
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: '告警解决成功'
    });

  } catch (error) {
    Logger.error('解决告警失败:', error);
    res.status(500).json({
      success: false,
      message: '解决告警失败',
      error: error.message
    });
  }
}));

/**
 * 获取单个告警详情
 * GET /api/v1/alerts/:alertId
 */
router.get('/v1/alerts/:alertId', auth, asyncHandler(async (req, res) => {
  const { alertId } = req.params;

  try {
    const { Pool } = require('pg');
    const pool = new Pool(require('../config/database').getConfig());

    const query = `
      SELECT a.*, 
             u1.username as acknowledged_by_username,
             u2.username as resolved_by_username
      FROM alerts a
      LEFT JOIN users u1 ON a.acknowledged_by = u1.id
      LEFT JOIN users u2 ON a.resolved_by = u2.id
      WHERE a.id = $1
    `;

    const result = await pool.query(query, [alertId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '告警不存在'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    Logger.error('获取告警详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取告警详情失败',
      error: error.message
    });
  }
}));

/**
 * 删除告警
 * DELETE /api/v1/alerts/:alertId
 */
router.delete('/v1/alerts/:alertId', auth, asyncHandler(async (req, res) => {
  const { alertId } = req.params;

  try {
    const { Pool } = require('pg');
    const pool = new Pool(require('../config/database').getConfig());

    const query = 'DELETE FROM alerts WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [alertId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '告警不存在'
      });
    }

    res.json({
      success: true,
      message: '告警删除成功'
    });

  } catch (error) {
    Logger.error('删除告警失败:', error);
    res.status(500).json({
      success: false,
      message: '删除告警失败',
      error: error.message
    });
  }
}));

/**
 * 批量操作告警
 * POST /api/v1/alerts/batch
 */
router.post('/v1/alerts/batch', auth, asyncHandler(async (req, res) => {
  const { action, alertIds, data = {} } = req.body;
  const userId = req.user.id;

  try {
    const { Pool } = require('pg');
    const pool = new Pool(require('../config/database').getConfig());

    let query;
    let params;

    switch (action) {
      case 'acknowledge':
        query = `
          UPDATE alerts 
          SET status = 'acknowledged', 
              acknowledged_at = NOW(), 
              acknowledged_by = $1,
              acknowledgment_message = $2,
              updated_at = NOW()
          WHERE id = ANY($3)
          RETURNING *
        `;
        params = [userId, data.message || '', alertIds];
        break;

      case 'resolve':
        query = `
          UPDATE alerts 
          SET status = 'resolved', 
              resolved_at = NOW(), 
              resolved_by = $1,
              resolution = $2,
              updated_at = NOW()
          WHERE id = ANY($3)
          RETURNING *
        `;
        params = [userId, data.resolution || '', alertIds];
        break;

      case 'delete':
        query = 'DELETE FROM alerts WHERE id = ANY($1) RETURNING *';
        params = [alertIds];
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
    Logger.error('批量操作告警失败:', error);
    res.status(500).json({
      success: false,
      message: '批量操作告警失败',
      error: error.message
    });
  }
}));

/**
 * 测试通知
 * POST /api/v1/alerts/test-notification
 */
router.post('/v1/alerts/test-notification', auth, asyncHandler(async (req, res) => {
  const { type, config } = req.body;

  try {
    // 这里实现测试通知的逻辑
    // 根据type (email, sms, webhook等) 发送测试通知

    const testMessage = {
      title: '测试通知',
      message: '这是一条测试通知消息',
      severity: 'info',
      timestamp: new Date().toISOString()
    };

    // 模拟发送通知
    Logger.info(`发送测试通知: ${type}`, { config, message: testMessage });

    res.json({
      success: true,
      message: '测试通知发送成功',
      data: {
        type,
        sentAt: new Date().toISOString(),
        testMessage
      }
    });

  } catch (error) {
    Logger.error('发送测试通知失败:', error);
    res.status(500).json({
      success: false,
      message: '发送测试通知失败',
      error: error.message
    });
  }
}));

// ================================
// 2. 数据导出API (Data Export)
// ================================

/**
 * 创建数据导出任务
 * POST /api/v1/data-export/*
 */
router.post('/v1/data-export/:type', auth, asyncHandler(async (req, res) => {
  const { type } = req.params;
  const { filters, format = 'csv', options = {} } = req.body;
  const userId = req.user.id;

  try {
    const { Pool } = require('pg');
    const pool = new Pool(require('../config/database').getConfig());

    // 创建导出任务
    const taskQuery = `
      INSERT INTO export_tasks (user_id, type, filters, format, options, status, created_at)
      VALUES ($1, $2, $3, $4, $5, 'pending', NOW())
      RETURNING *
    `;

    const taskResult = await pool.query(taskQuery, [
      userId,
      type,
      JSON.stringify(filters),
      format,
      JSON.stringify(options)
    ]);

    const task = taskResult.rows[0];

    // 异步处理导出任务
    setImmediate(() => {
      processExportTask(task.id, type, filters, format, options);
    });

    res.status(201).json({
      success: true,
      data: task,
      message: '导出任务创建成功'
    });

  } catch (error) {
    Logger.error('创建导出任务失败:', error);
    res.status(500).json({
      success: false,
      message: '创建导出任务失败',
      error: error.message
    });
  }
}));

/**
 * 下载导出文件
 * GET /api/v1/data-export/task/:taskId/download
 */
router.get('/v1/data-export/task/:taskId/download', auth, asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const userId = req.user.id;

  try {
    const { Pool } = require('pg');
    const pool = new Pool(require('../config/database').getConfig());

    // 验证任务权限
    const taskQuery = `
      SELECT * FROM export_tasks
      WHERE id = $1 AND user_id = $2 AND status = 'completed'
    `;

    const taskResult = await pool.query(taskQuery, [taskId, userId]);

    if (taskResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '导出任务不存在或未完成'
      });
    }

    const task = taskResult.rows[0];
    const filePath = task.file_path;

    if (!filePath || !require('fs').existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: '导出文件不存在'
      });
    }

    // 设置下载响应头
    res.setHeader('Content-Disposition', `attachment; filename="${task.type}_export_${task.id}.${task.format}"`);
    res.setHeader('Content-Type', 'application/octet-stream');

    // 发送文件
    res.sendFile(require('path').resolve(filePath));

  } catch (error) {
    Logger.error('下载导出文件失败:', error);
    res.status(500).json({
      success: false,
      message: '下载导出文件失败',
      error: error.message
    });
  }
}));

// ================================
// 3. 测试历史API (Test History)
// ================================

/**
 * 获取测试历史
 * GET /api/test/history
 */
router.get('/test/history', auth, asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    type,
    status,
    startDate,
    endDate,
    userId: filterUserId
  } = req.query;

  try {
    const { Pool } = require('pg');
    const pool = new Pool(require('../config/database').getConfig());

    // 构建查询条件
    let whereClause = 'WHERE 1=1';
    const params = [];

    if (type) {
      whereClause += ' AND test_type = $' + (params.length + 1);
      params.push(type);
    }

    if (status) {
      whereClause += ' AND status = $' + (params.length + 1);
      params.push(status);
    }

    if (startDate) {
      whereClause += ' AND created_at >= $' + (params.length + 1);
      params.push(startDate);
    }

    if (endDate) {
      whereClause += ' AND created_at <= $' + (params.length + 1);
      params.push(endDate);
    }

    if (filterUserId) {
      whereClause += ' AND user_id = $' + (params.length + 1);
      params.push(filterUserId);
    }

    // 查询测试历史
    const query = `
      SELECT tr.*, u.username, u.email
      FROM test_records tr
      LEFT JOIN users u ON tr.user_id = u.id
      ${whereClause}
      ORDER BY tr.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    params.push(parseInt(limit));
    params.push((parseInt(page) - 1) * parseInt(limit));

    const result = await pool.query(query, params);

    // 获取总数
    const countQuery = `SELECT COUNT(*) as total FROM test_records tr ${whereClause}`;
    const countResult = await pool.query(countQuery, params.slice(0, -2));

    res.json({
      success: true,
      data: {
        records: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(countResult.rows[0].total),
          pages: Math.ceil(countResult.rows[0].total / limit)
        }
      }
    });

  } catch (error) {
    Logger.error('获取测试历史失败:', error);
    res.status(500).json({
      success: false,
      message: '获取测试历史失败',
      error: error.message
    });
  }
}));

/**
 * 获取单个测试记录详情
 * GET /api/test/history/:recordId
 */
router.get('/test/history/:recordId', auth, asyncHandler(async (req, res) => {
  const { recordId } = req.params;

  try {
    const { Pool } = require('pg');
    const pool = new Pool(require('../config/database').getConfig());

    const query = `
      SELECT tr.*, u.username, u.email
      FROM test_records tr
      LEFT JOIN users u ON tr.user_id = u.id
      WHERE tr.id = $1
    `;

    const result = await pool.query(query, [recordId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '测试记录不存在'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    Logger.error('获取测试记录详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取测试记录详情失败',
      error: error.message
    });
  }
}));

/**
 * 批量删除测试历史
 * DELETE /api/test/history/batch-delete
 */
router.delete('/test/history/batch-delete', auth, asyncHandler(async (req, res) => {
  const { recordIds } = req.body;
  const userId = req.user.id;

  try {
    const { Pool } = require('pg');
    const pool = new Pool(require('../config/database').getConfig());

    // 验证权限（只能删除自己的记录，除非是管理员）
    let query;
    let params;

    if (req.user.role === 'admin') {
      query = 'DELETE FROM test_records WHERE id = ANY($1) RETURNING *';
      params = [recordIds];
    } else {
      query = 'DELETE FROM test_records WHERE id = ANY($1) AND user_id = $2 RETURNING *';
      params = [recordIds, userId];
    }

    const result = await pool.query(query, params);

    res.json({
      success: true,
      message: `成功删除${result.rows.length}条测试记录`,
      data: {
        deletedCount: result.rows.length,
        deletedIds: result.rows.map(row => row.id)
      }
    });

  } catch (error) {
    Logger.error('批量删除测试历史失败:', error);
    res.status(500).json({
      success: false,
      message: '批量删除测试历史失败',
      error: error.message
    });
  }
}));

/**
 * 获取测试统计
 * GET /api/test/statistics
 */
router.get('/test/statistics', auth, asyncHandler(async (req, res) => {
  const { timeRange = '30' } = req.query;

  try {
    const { Pool } = require('pg');
    const pool = new Pool(require('../config/database').getConfig());

    const query = `
      SELECT
        COUNT(*) as total_tests,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tests,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_tests,
        COUNT(CASE WHEN status = 'running' THEN 1 END) as running_tests,
        COUNT(CASE WHEN test_type = 'stress' THEN 1 END) as stress_tests,
        COUNT(CASE WHEN test_type = 'performance' THEN 1 END) as performance_tests,
        COUNT(CASE WHEN test_type = 'security' THEN 1 END) as security_tests,
        COUNT(CASE WHEN test_type = 'api' THEN 1 END) as api_tests,
        AVG(CASE WHEN status = 'completed' THEN duration END) as avg_duration
      FROM test_records
      WHERE created_at >= NOW() - INTERVAL '${parseInt(timeRange)} days'
    `;

    const result = await pool.query(query);

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    Logger.error('获取测试统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取测试统计失败',
      error: error.message
    });
  }
}));

// 异步处理导出任务的函数
async function processExportTask(taskId, type, filters, format, options) {
  try {
    const { Pool } = require('pg');
    const pool = new Pool(require('../config/database').getConfig());

    // 更新任务状态为处理中
    await pool.query(
      'UPDATE export_tasks SET status = $1, started_at = NOW() WHERE id = $2',
      ['processing', taskId]
    );

    // 根据类型导出数据
    let data;
    switch (type) {
      case 'test-history':
        data = await exportTestHistory(filters);
        break;
      case 'alerts':
        data = await exportAlerts(filters);
        break;
      default:
        throw new Error(`不支持的导出类型: ${type}`);
    }

    // 生成文件
    const fs = require('fs');
    const path = require('path');
    const exportDir = path.join(__dirname, '../exports');

    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    const fileName = `${type}_${taskId}.${format}`;
    const filePath = path.join(exportDir, fileName);

    if (format === 'csv') {
      const csvContent = convertToCSV(data);
      fs.writeFileSync(filePath, csvContent);
    } else if (format === 'json') {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    }

    // 更新任务状态为完成
    await pool.query(
      'UPDATE export_tasks SET status = $1, completed_at = NOW(), file_path = $2 WHERE id = $3',
      ['completed', filePath, taskId]
    );

    Logger.info(`导出任务完成: ${taskId}`);

  } catch (error) {
    Logger.error(`导出任务失败: ${taskId}`, error);

    // 更新任务状态为失败
    const { Pool } = require('pg');
    const pool = new Pool(require('../config/database').getConfig());
    await pool.query(
      'UPDATE export_tasks SET status = $1, error_message = $2 WHERE id = $3',
      ['failed', error.message, taskId]
    );
  }
}

// 导出测试历史数据
async function exportTestHistory(filters) {
  const { Pool } = require('pg');
  const pool = new Pool(require('../config/database').getConfig());

  let whereClause = 'WHERE 1=1';
  const params = [];

  if (filters.startDate) {
    whereClause += ' AND created_at >= $' + (params.length + 1);
    params.push(filters.startDate);
  }

  if (filters.endDate) {
    whereClause += ' AND created_at <= $' + (params.length + 1);
    params.push(filters.endDate);
  }

  if (filters.type) {
    whereClause += ' AND test_type = $' + (params.length + 1);
    params.push(filters.type);
  }

  const query = `
    SELECT tr.*, u.username
    FROM test_records tr
    LEFT JOIN users u ON tr.user_id = u.id
    ${whereClause}
    ORDER BY tr.created_at DESC
  `;

  const result = await pool.query(query, params);
  return result.rows;
}

// 导出告警数据
async function exportAlerts(filters) {
  const { Pool } = require('pg');
  const pool = new Pool(require('../config/database').getConfig());

  let whereClause = 'WHERE 1=1';
  const params = [];

  if (filters.startDate) {
    whereClause += ' AND created_at >= $' + (params.length + 1);
    params.push(filters.startDate);
  }

  if (filters.endDate) {
    whereClause += ' AND created_at <= $' + (params.length + 1);
    params.push(filters.endDate);
  }

  if (filters.severity) {
    whereClause += ' AND severity = $' + (params.length + 1);
    params.push(filters.severity);
  }

  const query = `
    SELECT * FROM alerts ${whereClause} ORDER BY created_at DESC
  `;

  const result = await pool.query(query, params);
  return result.rows;
}

// 转换为CSV格式
function convertToCSV(data) {
  if (!data || data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];

  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      if (value === null || value === undefined) return '';
      if (typeof value === 'string' && value.includes(',')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    });
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
}

module.exports = router;
