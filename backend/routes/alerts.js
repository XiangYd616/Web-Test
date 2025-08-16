/**
 * 告警管理路由
 */

const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { validateRequest, validateQuery } = require('../middleware/validation');
const Joi = require('joi');

const router = express.Router();

// 告警服务实例 (将在app.js中初始化)
let alertService = null;

// 设置告警服务实例
router.setAlertService = (service) => {
    alertService = service;
};

// 验证规则
const alertQuerySchema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    severity: Joi.string().valid('low', 'medium', 'high', 'critical'),
    status: Joi.string().valid('active', 'acknowledged', 'resolved').default('active'),
    timeRange: Joi.string().valid('1h', '24h', '7d', '30d').default('24h')
});

const batchActionSchema = Joi.object({
    action: Joi.string().valid('acknowledge', 'resolve', 'delete').required(),
    alertIds: Joi.array().items(Joi.string()).min(1).required()
});

const testNotificationSchema = Joi.object({
    email: Joi.boolean().default(false),
    webhook: Joi.boolean().default(false),
    slack: Joi.boolean().default(false),
    webhook_url: Joi.string().uri().when('webhook', { is: true, then: Joi.required() }),
    slack_webhook: Joi.string().uri().when('slack', { is: true, then: Joi.required() })
});

/**
 * 获取告警列表
 * GET /api/alerts
 */
router.get('/', authMiddleware, validateQuery(alertQuerySchema), asyncHandler(async (req, res) => {
    if (!alertService) {
        
        return res.status(503).json({
            success: false,
            error: {
                code: 'SERVICE_UNAVAILABLE',
                message: '告警服务未启动'
      }
        });
    }

    const userId = req.user.id;
    const { page, limit, severity, status, timeRange } = req.query;

    // 从监控服务获取告警（因为告警数据存储在监控服务中）
    const monitoringService = global.monitoringService;
    if (!monitoringService) {
        
        return res.status(503).json({
            success: false,
            error: {
                code: 'SERVICE_UNAVAILABLE',
                message: '监控服务未启动'
      }
        });
    }

    const alerts = await monitoringService.getAlerts(userId, {
        page,
        limit,
        severity,
        status
    });

    res.success(alerts.data);
}));

/**
 * 获取告警统计
 * GET /api/alerts/stats
 */
router.get('/stats', authMiddleware, asyncHandler(async (req, res) => {
    if (!alertService) {
        
        return res.status(503).json({
            success: false,
            error: {
                code: 'SERVICE_UNAVAILABLE',
                message: '告警服务未启动'
      }
        });
    }

    const userId = req.user.id;
    const { timeRange = '24h' } = req.query;

    const stats = await alertService.getAlertStats(userId, timeRange);

    res.success(stats);
}));

/**
 * 标记告警为已确认
 * PUT /api/alerts/:id/acknowledge
 */
router.put('/:id/acknowledge', authMiddleware, asyncHandler(async (req, res) => {
    if (!alertService) {
        
        return res.status(503).json({
            success: false,
            error: {
                code: 'SERVICE_UNAVAILABLE',
                message: '告警服务未启动'
      }
        });
    }

    const alertId = req.params.id;
    const userId = req.user.id;

    const updated = await alertService.acknowledgeAlert(alertId, userId);

    if (!updated) {
        
        return res.status(404).json({
            success: false,
            error: {
                code: 'NOT_FOUND',
                message: '告警不存在'
      }
        });
    }

    res.success('告警已确认');
}));

/**
 * 标记告警为已解决
 * PUT /api/alerts/:id/resolve
 */
router.put('/:id/resolve', authMiddleware, asyncHandler(async (req, res) => {
    if (!alertService) {
        
        return res.status(503).json({
            success: false,
            error: {
                code: 'SERVICE_UNAVAILABLE',
                message: '告警服务未启动'
      }
        });
    }

    const alertId = req.params.id;
    const userId = req.user.id;

    const updated = await alertService.resolveAlert(alertId, userId);

    if (!updated) {
        
        return res.status(404).json({
            success: false,
            error: {
                code: 'NOT_FOUND',
                message: '告警不存在'
      }
        });
    }

    res.success('告警已解决');
}));

/**
 * 批量操作告警
 * POST /api/alerts/batch
 */
router.post('/batch', authMiddleware, validateRequest(batchActionSchema), asyncHandler(async (req, res) => {
    if (!alertService) {
        
        return res.status(503).json({
            success: false,
            error: {
                code: 'SERVICE_UNAVAILABLE',
                message: '告警服务未启动'
      }
        });
    }

    const { action, alertIds } = req.validatedData;
    const userId = req.user.id;

    let result;
    switch (action) {
        case 'acknowledge':
            result = await alertService.batchAcknowledgeAlerts(alertIds, userId);
            break;
        case 'resolve':
            result = await alertService.batchResolveAlerts(alertIds, userId);
            break;
        case 'delete':
            result = await alertService.batchDeleteAlerts(alertIds, userId);
            break;
        default:
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_ACTION',
                    message: '无效的批量操作'
                }
            });
    }

    res.json({
        success: true,
        data: result,
        message: `批量${action}操作完成`
    });
}));

/**
 * 获取告警详情
 * GET /api/alerts/:id
 */
router.get('/:id', authMiddleware, asyncHandler(async (req, res) => {
    if (!alertService) {
        
        return res.status(503).json({
            success: false,
            error: {
                code: 'SERVICE_UNAVAILABLE',
                message: '告警服务未启动'
      }
        });
    }

    const alertId = req.params.id;
    const userId = req.user.id;

    const alert = await alertService.getAlertDetails(alertId, userId);

    if (!alert) {
        
        return res.status(404).json({
            success: false,
            error: {
                code: 'NOT_FOUND',
                message: '告警不存在'
      }
        });
    }

    res.success(alert);
}));

/**
 * 删除告警
 * DELETE /api/alerts/:id
 */
router.delete('/:id', authMiddleware, asyncHandler(async (req, res) => {
    if (!alertService) {
        
        return res.status(503).json({
            success: false,
            error: {
                code: 'SERVICE_UNAVAILABLE',
                message: '告警服务未启动'
      }
        });
    }

    const alertId = req.params.id;
    const userId = req.user.id;

    const deleted = await alertService.deleteAlert(alertId, userId);

    if (!deleted) {
        
        return res.status(404).json({
            success: false,
            error: {
                code: 'NOT_FOUND',
                message: '告警不存在'
      }
        });
    }

    res.success('告警已删除');
}));

/**
 * 测试通知配置
 * POST /api/alerts/test-notification
 */
router.post('/test-notification', authMiddleware, validateRequest(testNotificationSchema), asyncHandler(async (req, res) => {
    if (!alertService) {
        
        return res.status(503).json({
            success: false,
            error: {
                code: 'SERVICE_UNAVAILABLE',
                message: '告警服务未启动'
      }
        });
    }

    const userId = req.user.id;
    const notificationSettings = req.validatedData;

    const result = await alertService.testNotificationConfig(userId, notificationSettings);

    res.json({
        success: result.success,
        message: result.message
    });
}));

/**
 * 获取告警规则配置
 * GET /api/alerts/rules
 */
router.get('/rules', authMiddleware, asyncHandler(async (req, res) => {
    if (!alertService) {
        
        return res.status(503).json({
            success: false,
            error: {
                code: 'SERVICE_UNAVAILABLE',
                message: '告警服务未启动'
      }
        });
    }

    const userId = req.user.id;

    const rules = await alertService.getAlertRules(userId);

    res.success(rules);
}));

/**
 * 更新告警规则配置
 * PUT /api/alerts/rules
 */
router.put('/rules', authMiddleware, asyncHandler(async (req, res) => {
    if (!alertService) {
        
        return res.status(503).json({
            success: false,
            error: {
                code: 'SERVICE_UNAVAILABLE',
                message: '告警服务未启动'
      }
        });
    }

    const userId = req.user.id;
    const rules = req.body;

    const updated = await alertService.updateAlertRules(userId, rules);

    res.success(updated);
}));

/**
 * 获取告警历史统计
 * GET /api/alerts/history/stats
 */
router.get('/history/stats', authMiddleware, asyncHandler(async (req, res) => {
    if (!alertService) {
        
        return res.status(503).json({
            success: false,
            error: {
                code: 'SERVICE_UNAVAILABLE',
                message: '告警服务未启动'
      }
        });
    }

    const userId = req.user.id;
    const { timeRange = '30d' } = req.query;

    const stats = await alertService.getAlertHistoryStats(userId, timeRange);

    res.success(stats);
}));

module.exports = router;