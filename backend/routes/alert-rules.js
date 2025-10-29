const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { AlertRuleEngine } = require('../services/alerting/AlertRuleEngine');
const { EmailAlerter } = require('../services/alerting/EmailAlerter');
const { WebhookAlerter } = require('../services/alerting/WebhookAlerter');
const logger = require('../utils/logger');

// 初始化服务
const alertEngine = AlertRuleEngine.getInstance();
const emailAlerter = EmailAlerter.getInstance();
const webhookAlerter = WebhookAlerter.getInstance();

// ==================== 告警规则管理 ====================

/**
 * 创建告警规则
 * POST /api/alert-rules
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      name,
      description,
      metricName,
      condition,
      severity,
      enabled,
      cooldownPeriod,
      notificationChannels,
      tags
    } = req.body;

    const userId = req.user.id;

    // 验证必填字段
    if (!name || !metricName || !condition) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, metricName, condition'
      });
    }

    // 创建规则
    const result = await db.query(
      `INSERT INTO alert_rules (
        name, description, metric_name, condition, severity,
        enabled, cooldown_period, notification_channels, tags, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        name,
        description,
        metricName,
        condition,
        severity || 'medium',
        enabled !== false,
        cooldownPeriod || 300,
        JSON.stringify(notificationChannels || ['email']),
        JSON.stringify(tags || []),
        userId
      ]
    );

    const rule = result.rows[0];

    // 添加到引擎
    await alertEngine.addRule(rule.id, {
      name: rule.name,
      metricName: rule.metric_name,
      condition: rule.condition,
      severity: rule.severity,
      enabled: rule.enabled,
      cooldownPeriod: rule.cooldown_period,
      notificationChannels: rule.notification_channels,
      tags: rule.tags
    });

    logger.info(`Alert rule created: ${rule.id} by user ${userId}`);

    res.status(201).json({
      success: true,
      data: rule
    });
  } catch (error) {
    logger.error('Error creating alert rule:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 获取告警规则列表
 * GET /api/alert-rules
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { enabled, severity, metricName, page = 1, limit = 20 } = req.query;
    const userId = req.user.id;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM alert_rules WHERE created_by = $1';
    const params = [userId];
    let paramIndex = 2;

    if (enabled !== undefined) {
      query += ` AND enabled = $${paramIndex}`;
      params.push(enabled === 'true');
      paramIndex++;
    }

    if (severity) {
      query += ` AND severity = $${paramIndex}`;
      params.push(severity);
      paramIndex++;
    }

    if (metricName) {
      query += ` AND metric_name ILIKE $${paramIndex}`;
      params.push(`%${metricName}%`);
      paramIndex++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await db.query(query, params);

    // 获取总数
    const countResult = await db.query(
      'SELECT COUNT(*) FROM alert_rules WHERE created_by = $1',
      [userId]
    );

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].count)
      }
    });
  } catch (error) {
    logger.error('Error fetching alert rules:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 获取单个告警规则
 * GET /api/alert-rules/:id
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await db.query(
      'SELECT * FROM alert_rules WHERE id = $1 AND created_by = $2',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Alert rule not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Error fetching alert rule:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 更新告警规则
 * PUT /api/alert-rules/:id
 */
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const {
      name,
      description,
      metricName,
      condition,
      severity,
      enabled,
      cooldownPeriod,
      notificationChannels,
      tags
    } = req.body;

    // 检查规则是否存在
    const checkResult = await db.query(
      'SELECT * FROM alert_rules WHERE id = $1 AND created_by = $2',
      [id, userId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Alert rule not found'
      });
    }

    // 构建更新语句
    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex}`);
      params.push(name);
      paramIndex++;
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex}`);
      params.push(description);
      paramIndex++;
    }
    if (metricName !== undefined) {
      updates.push(`metric_name = $${paramIndex}`);
      params.push(metricName);
      paramIndex++;
    }
    if (condition !== undefined) {
      updates.push(`condition = $${paramIndex}`);
      params.push(condition);
      paramIndex++;
    }
    if (severity !== undefined) {
      updates.push(`severity = $${paramIndex}`);
      params.push(severity);
      paramIndex++;
    }
    if (enabled !== undefined) {
      updates.push(`enabled = $${paramIndex}`);
      params.push(enabled);
      paramIndex++;
    }
    if (cooldownPeriod !== undefined) {
      updates.push(`cooldown_period = $${paramIndex}`);
      params.push(cooldownPeriod);
      paramIndex++;
    }
    if (notificationChannels !== undefined) {
      updates.push(`notification_channels = $${paramIndex}`);
      params.push(JSON.stringify(notificationChannels));
      paramIndex++;
    }
    if (tags !== undefined) {
      updates.push(`tags = $${paramIndex}`);
      params.push(JSON.stringify(tags));
      paramIndex++;
    }

    updates.push(`updated_at = NOW()`);

    params.push(id, userId);
    const query = `UPDATE alert_rules SET ${updates.join(', ')} 
                   WHERE id = $${paramIndex} AND created_by = $${paramIndex + 1}
                   RETURNING *`;

    const result = await db.query(query, params);
    const rule = result.rows[0];

    // 更新引擎中的规则
    await alertEngine.updateRule(id, {
      name: rule.name,
      metricName: rule.metric_name,
      condition: rule.condition,
      severity: rule.severity,
      enabled: rule.enabled,
      cooldownPeriod: rule.cooldown_period,
      notificationChannels: rule.notification_channels,
      tags: rule.tags
    });

    logger.info(`Alert rule updated: ${id} by user ${userId}`);

    res.json({
      success: true,
      data: rule
    });
  } catch (error) {
    logger.error('Error updating alert rule:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 删除告警规则
 * DELETE /api/alert-rules/:id
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await db.query(
      'DELETE FROM alert_rules WHERE id = $1 AND created_by = $2 RETURNING *',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Alert rule not found'
      });
    }

    // 从引擎移除
    alertEngine.removeRule(id);

    logger.info(`Alert rule deleted: ${id} by user ${userId}`);

    res.json({
      success: true,
      message: 'Alert rule deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting alert rule:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== 告警历史 ====================

/**
 * 获取告警历史
 * GET /api/alert-rules/history
 */
router.get('/history/list', authenticateToken, async (req, res) => {
  try {
    const {
      ruleId,
      severity,
      startDate,
      endDate,
      page = 1,
      limit = 20
    } = req.query;
    const userId = req.user.id;
    const offset = (page - 1) * limit;

    let query = `
      SELECT ah.*, ar.name as rule_name, ar.created_by
      FROM alert_history ah
      JOIN alert_rules ar ON ah.rule_id = ar.id
      WHERE ar.created_by = $1
    `;
    const params = [userId];
    let paramIndex = 2;

    if (ruleId) {
      query += ` AND ah.rule_id = $${paramIndex}`;
      params.push(ruleId);
      paramIndex++;
    }

    if (severity) {
      query += ` AND ah.severity = $${paramIndex}`;
      params.push(severity);
      paramIndex++;
    }

    if (startDate) {
      query += ` AND ah.triggered_at >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      query += ` AND ah.triggered_at <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    query += ` ORDER BY ah.triggered_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await db.query(query, params);

    // 获取统计
    const statsResult = await db.query(
      `SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical,
        COUNT(CASE WHEN severity = 'high' THEN 1 END) as high,
        COUNT(CASE WHEN severity = 'medium' THEN 1 END) as medium,
        COUNT(CASE WHEN severity = 'low' THEN 1 END) as low
       FROM alert_history ah
       JOIN alert_rules ar ON ah.rule_id = ar.id
       WHERE ar.created_by = $1`,
      [userId]
    );

    res.json({
      success: true,
      data: result.rows,
      stats: statsResult.rows[0],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(statsResult.rows[0].total)
      }
    });
  } catch (error) {
    logger.error('Error fetching alert history:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 获取单条告警历史详情
 * GET /api/alert-rules/history/:id
 */
router.get('/history/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await db.query(
      `SELECT ah.*, ar.name as rule_name, ar.created_by
       FROM alert_history ah
       JOIN alert_rules ar ON ah.rule_id = ar.id
       WHERE ah.id = $1 AND ar.created_by = $2`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Alert history not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Error fetching alert history:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== 告警测试和触发 ====================

/**
 * 测试告警规则
 * POST /api/alert-rules/:id/test
 */
router.post('/:id/test', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { testValue } = req.body;
    const userId = req.user.id;

    // 获取规则
    const ruleResult = await db.query(
      'SELECT * FROM alert_rules WHERE id = $1 AND created_by = $2',
      [id, userId]
    );

    if (ruleResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Alert rule not found'
      });
    }

    const rule = ruleResult.rows[0];

    // 评估规则
    const triggered = await alertEngine.evaluate(id, testValue);

    res.json({
      success: true,
      data: {
        triggered,
        rule: {
          id: rule.id,
          name: rule.name,
          condition: rule.condition,
          testValue
        }
      }
    });
  } catch (error) {
    logger.error('Error testing alert rule:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 手动触发告警测试邮件
 * POST /api/alert-rules/test/email
 */
router.post('/test/email', authenticateToken, async (req, res) => {
  try {
    const { recipient } = req.body;
    const userEmail = recipient || req.user.email;

    if (!userEmail) {
      return res.status(400).json({
        success: false,
        error: 'No recipient email provided'
      });
    }

    const result = await emailAlerter.sendTestEmail(userEmail);

    res.json({
      success: result.success,
      message: result.success ? 'Test email sent successfully' : 'Failed to send test email',
      data: result
    });
  } catch (error) {
    logger.error('Error sending test email:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 测试Webhook
 * POST /api/alert-rules/test/webhook
 */
router.post('/test/webhook', authenticateToken, async (req, res) => {
  try {
    const { webhookId } = req.body;

    if (!webhookId) {
      return res.status(400).json({
        success: false,
        error: 'webhookId is required'
      });
    }

    const result = await webhookAlerter.sendTestWebhook(webhookId);

    res.json({
      success: result.success,
      message: result.success ? 'Test webhook sent successfully' : 'Failed to send test webhook',
      data: result
    });
  } catch (error) {
    logger.error('Error sending test webhook:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== 告警统计 ====================

/**
 * 获取告警统计信息
 * GET /api/alert-rules/stats
 */
router.get('/stats/overview', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { period = '7d' } = req.query;

    // 计算时间范围
    const periodMap = {
      '24h': '1 day',
      '7d': '7 days',
      '30d': '30 days',
      '90d': '90 days'
    };
    const interval = periodMap[period] || '7 days';

    // 获取统计数据
    const statsQuery = `
      SELECT 
        COUNT(*) as total_alerts,
        COUNT(CASE WHEN ah.severity = 'critical' THEN 1 END) as critical_count,
        COUNT(CASE WHEN ah.severity = 'high' THEN 1 END) as high_count,
        COUNT(CASE WHEN ah.severity = 'medium' THEN 1 END) as medium_count,
        COUNT(CASE WHEN ah.severity = 'low' THEN 1 END) as low_count,
        COUNT(DISTINCT ah.rule_id) as triggered_rules
      FROM alert_history ah
      JOIN alert_rules ar ON ah.rule_id = ar.id
      WHERE ar.created_by = $1 
        AND ah.triggered_at >= NOW() - INTERVAL '${interval}'
    `;

    const statsResult = await db.query(statsQuery, [userId]);

    // 获取规则统计
    const rulesQuery = `
      SELECT 
        COUNT(*) as total_rules,
        COUNT(CASE WHEN enabled = true THEN 1 END) as enabled_rules,
        COUNT(CASE WHEN enabled = false THEN 1 END) as disabled_rules
      FROM alert_rules
      WHERE created_by = $1
    `;

    const rulesResult = await db.query(rulesQuery, [userId]);

    // 获取时间序列数据
    const timeSeriesQuery = `
      SELECT 
        DATE_TRUNC('hour', triggered_at) as hour,
        COUNT(*) as count,
        severity
      FROM alert_history ah
      JOIN alert_rules ar ON ah.rule_id = ar.id
      WHERE ar.created_by = $1 
        AND ah.triggered_at >= NOW() - INTERVAL '${interval}'
      GROUP BY hour, severity
      ORDER BY hour DESC
      LIMIT 168
    `;

    const timeSeriesResult = await db.query(timeSeriesQuery, [userId]);

    res.json({
      success: true,
      data: {
        period,
        alerts: statsResult.rows[0],
        rules: rulesResult.rows[0],
        timeSeries: timeSeriesResult.rows
      }
    });
  } catch (error) {
    logger.error('Error fetching alert stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== Webhook管理 ====================

/**
 * 注册Webhook
 * POST /api/alert-rules/webhooks
 */
router.post('/webhooks', authenticateToken, async (req, res) => {
  try {
    const { id, url, method, headers, secret, events, metadata } = req.body;

    if (!id || !url) {
      return res.status(400).json({
        success: false,
        error: 'id and url are required'
      });
    }

    webhookAlerter.registerWebhook(id, {
      url,
      method,
      headers,
      secret,
      events,
      metadata: {
        ...metadata,
        userId: req.user.id
      }
    });

    res.status(201).json({
      success: true,
      message: 'Webhook registered successfully',
      data: webhookAlerter.getWebhook(id)
    });
  } catch (error) {
    logger.error('Error registering webhook:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 获取Webhook列表
 * GET /api/alert-rules/webhooks
 */
router.get('/webhooks', authenticateToken, async (req, res) => {
  try {
    const webhooks = webhookAlerter.getAllWebhooks();
    const userWebhooks = webhooks.filter(w => w.metadata?.userId === req.user.id);

    res.json({
      success: true,
      data: userWebhooks
    });
  } catch (error) {
    logger.error('Error fetching webhooks:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 删除Webhook
 * DELETE /api/alert-rules/webhooks/:id
 */
router.delete('/webhooks/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const removed = webhookAlerter.unregisterWebhook(id);

    if (!removed) {
      return res.status(404).json({
        success: false,
        error: 'Webhook not found'
      });
    }

    res.json({
      success: true,
      message: 'Webhook deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting webhook:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;

