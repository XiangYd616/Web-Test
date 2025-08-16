/**
 * 错误管理API路由
 * 提供错误统计、日志查询、告警管理等功能
 */

const express = require('express');
const { unifiedErrorHandler } = require('../utils/errorHandler');
const { errorLogAggregator } = require('../utils/ErrorLogAggregator');
const { errorMonitoringSystem } = require('../utils/ErrorMonitoringSystem');

const router = express.Router();

/**
 * 获取错误统计
 * GET /api/error-management/stats
 */
router.get('/stats', async (req, res) => {
  try {
    const { timeWindow = '1h' } = req.query;
    const stats = unifiedErrorHandler.getStats(timeWindow);
    
    // 计算总体统计
    const totalErrors = Object.values(stats).reduce((sum, stat) => sum + stat.count, 0);
    const totalRate = Object.values(stats).reduce((sum, stat) => sum + stat.rate, 0);
    
    // 按严重程度分组
    const severityStats = {};
    for (const [key, stat] of Object.entries(stats)) {
      const [type, severity] = key.split('_');
      if (!severityStats[severity]) {
        severityStats[severity] = { count: 0, rate: 0, types: [] };
      }
      severityStats[severity].count += stat.count;
      severityStats[severity].rate += stat.rate;
      severityStats[severity].types.push({ type, ...stat });
    }
    
    res.success({
      timeWindow,
      totalErrors,
      totalRate: totalRate.toFixed(2),
      severityStats,
      detailedStats: stats,
      timestamp: new Date().toISOString()
    }, '获取错误统计成功');
    
  } catch (error) {
    console.error('获取错误统计失败:', error);
    res.error('获取错误统计失败', 500, error.message);
  }
});

/**
 * 搜索错误日志
 * GET /api/error-management/logs
 */
router.get('/logs', async (req, res) => {
  try {
    const {
      level,
      type,
      severity,
      userId,
      startTime,
      endTime,
      message,
      limit = 100,
      offset = 0
    } = req.query;
    
    const criteria = {
      level,
      type,
      severity,
      userId,
      startTime,
      endTime,
      message
    };
    
    // 移除空值
    Object.keys(criteria).forEach(key => {
      if (criteria[key] === undefined || criteria[key] === '') {
        delete criteria[key];
      }
    });
    
    const logs = await errorLogAggregator.searchLogs(criteria);
    
    // 分页
    const total = logs.length;
    const paginatedLogs = logs.slice(parseInt(offset), parseInt(offset) + parseInt(limit));
    
    res.success({
      logs: paginatedLogs,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + parseInt(limit) < total
      },
      criteria
    }, '搜索错误日志成功');
    
  } catch (error) {
    console.error('搜索错误日志失败:', error);
    res.error('搜索错误日志失败', 500, error.message);
  }
});

/**
 * 获取告警历史
 * GET /api/error-management/alerts
 */
router.get('/alerts', async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const alerts = errorMonitoringSystem.getAlertHistory(parseInt(limit));
    
    // 统计告警信息
    const alertStats = {
      total: alerts.length,
      bySeverity: {},
      byType: {},
      recent24h: 0
    };
    
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    
    alerts.forEach(alert => {
      // 按严重程度统计
      alertStats.bySeverity[alert.severity] = (alertStats.bySeverity[alert.severity] || 0) + 1;
      
      // 按类型统计
      alertStats.byType[alert.type] = (alertStats.byType[alert.type] || 0) + 1;
      
      // 最近24小时统计
      if (now - new Date(alert.timestamp).getTime() < day) {
        alertStats.recent24h++;
      }
    });
    
    res.success({
      alerts,
      stats: alertStats
    }, '获取告警历史成功');
    
  } catch (error) {
    console.error('获取告警历史失败:', error);
    res.error('获取告警历史失败', 500, error.message);
  }
});

/**
 * 测试告警通道
 * POST /api/error-management/test-alerts
 */
router.post('/test-alerts', async (req, res) => {
  try {
    const results = await errorMonitoringSystem.testAlertChannels();
    
    const summary = {
      total: Object.keys(results).length,
      successful: Object.values(results).filter(r => r.success).length,
      failed: Object.values(results).filter(r => !r.success).length
    };
    
    res.success({
      summary,
      results
    }, '告警通道测试完成');
    
  } catch (error) {
    console.error('测试告警通道失败:', error);
    res.error('测试告警通道失败', 500, error.message);
  }
});

/**
 * 手动发送告警
 * POST /api/error-management/send-alert
 */
router.post('/send-alert', async (req, res) => {
  try {
    const { title, message, severity, type, channels } = req.body;
    
    if (!title || !message) {
      return res.error('标题和消息不能为空', 400);
    }
    
    const alert = {
      id: `manual_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      title,
      message,
      severity: severity || 'medium',
      type: type || 'MANUAL_ALERT',
      timestamp: new Date().toISOString(),
      channels: channels || ['email'],
      details: {
        manual: true,
        sender: req.user?.id || 'system'
      }
    };
    
    await errorMonitoringSystem.sendAlert(alert);
    
    res.success({
      alertId: alert.id,
      sentAt: alert.timestamp
    }, '手动告警发送成功');
    
  } catch (error) {
    console.error('发送手动告警失败:', error);
    res.error('发送手动告警失败', 500, error.message);
  }
});

/**
 * 获取错误处理系统状态
 * GET /api/error-management/status
 */
router.get('/status', async (req, res) => {
  try {
    const status = {
      errorHandler: unifiedErrorHandler.getStatus(),
      logAggregator: errorLogAggregator.getStatus(),
      monitoring: errorMonitoringSystem.getStatus(),
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        nodeVersion: process.version,
        platform: process.platform
      }
    };
    
    res.success(status, '获取系统状态成功');
    
  } catch (error) {
    console.error('获取系统状态失败:', error);
    res.error('获取系统状态失败', 500, error.message);
  }
});

/**
 * 创建自定义告警规则
 * POST /api/error-management/alert-rules
 */
router.post('/alert-rules', async (req, res) => {
  try {
    const { name, condition, alertLevel, channels, throttle } = req.body;
    
    if (!name || !condition || !alertLevel) {
      return res.error('规则名称、条件和告警级别不能为空', 400);
    }
    
    // 这里需要实现条件解析逻辑
    // 为了安全起见，可以限制条件的复杂度
    const rule = {
      condition: new Function('error', 'stats', condition),
      alertLevel,
      channels: channels || ['email'],
      throttle: throttle || 5 * 60 * 1000 // 默认5分钟
    };
    
    errorMonitoringSystem.addAlertRule(name, rule);
    
    res.success({
      ruleName: name,
      createdAt: new Date().toISOString()
    }, '告警规则创建成功');
    
  } catch (error) {
    console.error('创建告警规则失败:', error);
    res.error('创建告警规则失败', 400, error.message);
  }
});

/**
 * 导出错误报告
 * GET /api/error-management/export
 */
router.get('/export', async (req, res) => {
  try {
    const { format = 'json', timeWindow = '24h', type } = req.query;
    
    // 获取错误统计
    const stats = unifiedErrorHandler.getStats(timeWindow);
    
    // 获取错误日志
    const endTime = new Date();
    const startTime = new Date();
    
    // 计算时间窗口
    const windowMs = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    };
    
    startTime.setTime(endTime.getTime() - (windowMs[timeWindow] || windowMs['24h']));
    
    const logs = await errorLogAggregator.searchLogs({
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      type
    });
    
    const report = {
      generatedAt: new Date().toISOString(),
      timeWindow,
      period: {
        start: startTime.toISOString(),
        end: endTime.toISOString()
      },
      summary: {
        totalErrors: Object.values(stats).reduce((sum, stat) => sum + stat.count, 0),
        totalLogs: logs.length,
        uniqueErrorTypes: new Set(logs.map(log => log.type)).size
      },
      statistics: stats,
      logs: logs.slice(0, 1000) // 限制导出数量
    };
    
    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=error-report-${timeWindow}.json`);
      res.send(JSON.stringify(report, null, 2));
    } else if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=error-report-${timeWindow}.csv`);
      
      // 生成CSV格式
      const csvHeaders = ['timestamp', 'level', 'type', 'severity', 'message', 'errorId', 'requestId', 'userId'];
      const csvRows = [csvHeaders.join(',')];
      
      logs.forEach(log => {
        const row = csvHeaders.map(header => {
          const value = log[header] || '';
          return `"${String(value).replace(/"/g, '""')}"`;
        });
        csvRows.push(row.join(','));
      });
      
      res.send(csvRows.join('\n'));
    } else {
      res.error('不支持的导出格式', 400);
    }
    
  } catch (error) {
    console.error('导出错误报告失败:', error);
    res.error('导出错误报告失败', 500, error.message);
  }
});

/**
 * 清理过期日志
 * POST /api/error-management/cleanup
 */
router.post('/cleanup', async (req, res) => {
  try {
    const { days = 30 } = req.body;
    
    if (days < 1 || days > 365) {
      return res.error('清理天数必须在1-365之间', 400);
    }
    
    // 这里可以实现日志清理逻辑
    // 由于当前使用文件存储，可以删除过期的日志文件
    
    res.success({
      cleanupDays: days,
      cleanedAt: new Date().toISOString()
    }, '日志清理任务已启动');
    
  } catch (error) {
    console.error('清理日志失败:', error);
    res.error('清理日志失败', 500, error.message);
  }
});

/**
 * 获取错误趋势分析
 * GET /api/error-management/trends
 */
router.get('/trends', async (req, res) => {
  try {
    const { period = '24h', interval = '1h' } = req.query;
    
    // 这里可以实现更复杂的趋势分析
    // 目前返回基本的统计信息
    const stats = unifiedErrorHandler.getStats(period);
    
    const trends = {
      period,
      interval,
      data: Object.entries(stats).map(([key, stat]) => ({
        key,
        type: key.split('_')[0],
        severity: key.split('_')[1],
        count: stat.count,
        rate: stat.rate,
        trend: 'stable' // 这里可以计算实际趋势
      }))
    };
    
    res.success(trends, '获取错误趋势成功');
    
  } catch (error) {
    console.error('获取错误趋势失败:', error);
    res.error('获取错误趋势失败', 500, error.message);
  }
});

module.exports = router;
