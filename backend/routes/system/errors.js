/**
 * 错误报告路由
 * 处理前端错误报告和错误统计
 */

const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const Logger = require('../utils/logger');
const { errorMonitoringManager, ERROR_LEVELS, ERROR_TYPES } = require('../src/ErrorMonitoringManager.js');

// 初始化错误监控管理器
errorMonitoringManager.initialize().catch(console.error);

/**
 * 前端错误报告
 */
router.post('/report', asyncHandler(async (req, res) => {
  const {
    id,
    type,
    severity,
    message,
    details,
    code,
    timestamp,
    context,
    stack,
    userAgent,
    url: errorUrl
  } = req.body;

  // 验证必要字段
  if (!id || !type || !message) {
    
        return res.validationError([], '缺少必要的错误信息字段');
  }

  // 记录前端错误
  const errorReport = {
    id,
    type,
    severity,
    message,
    details,
    code,
    timestamp: timestamp || new Date().toISOString(),
    context,
    stack,
    userAgent: userAgent || req.get('User-Agent'),
    errorUrl,
    reportedBy: req.ip,
    userId: req.user?.id || 'anonymous',
    sessionId: req.sessionID
  };

  // 使用日志系统记录
  Logger.error('Frontend Error Report', errorReport, {
    source: 'frontend',
    reportId: id
  });

  // 使用统一错误监控管理器记录
  await errorMonitoringManager.logError({
    level: severity === 'critical' ? ERROR_LEVELS.CRITICAL :
      severity === 'error' ? ERROR_LEVELS.ERROR :
        severity === 'warning' ? ERROR_LEVELS.WARNING : ERROR_LEVELS.INFO,
    type: type === 'network' ? ERROR_TYPES.NETWORK :
      type === 'validation' ? ERROR_TYPES.VALIDATION :
        type === 'authentication' ? ERROR_TYPES.AUTHENTICATION :
          ERROR_TYPES.APPLICATION,
    message,
    stack,
    context: { ...context, details, code, errorUrl },
    userId: req.user?.id,
    sessionId: req.sessionID,
    requestId: id,
    userAgent: userAgent || req.get('User-Agent'),
    ip: req.ip,
    url: errorUrl,
    method: req.method
  });

  // 可以在这里添加错误统计、告警等逻辑
  await processErrorReport(errorReport);

  res.success(id, '错误报告已记录');
}));

/**
 * 获取错误统计
 */
router.get('/stats', asyncHandler(async (req, res) => {
  const { startDate, endDate, type: _type, severity: _severity } = req.query;

  // 这里应该从数据库或日志文件中获取错误统计
  // 目前返回模拟数据
  const stats = {
    totalErrors: 0,
    errorsByType: {},
    errorsBySeverity: {},
    errorsByTime: [],
    topErrors: [],
    period: {
      start: startDate || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      end: endDate || new Date().toISOString()
    }
  };

  res.success(stats);
}));

/**
 * 获取错误详情
 */
router.get('/:errorId', asyncHandler(async (req, res) => {
  const { errorId } = req.params;

  // 这里应该从存储中获取错误详情
  // 目前返回模拟响应
  res.json({
    success: true,
    data: {
      id: errorId,
      message: '错误详情暂不可用',
      note: '错误详情功能正在开发中'
    }
  });
}));

/**
 * 处理错误报告
 */
async function processErrorReport(errorReport) {
  try {
    // 1. 错误分类和优先级判断
    const priority = determinePriority(errorReport);

    // 2. 错误频率检查
    const frequency = await checkErrorFrequency(errorReport);

    // 3. 如果是高频错误或高优先级错误，发送告警
    if (priority === 'high' || frequency > 10) {
      await sendErrorAlert(errorReport, { priority, frequency });
    }

    // 4. 更新错误统计
    await updateErrorStats(errorReport);

  } catch (processError) {
    Logger.error('Error processing error report', processError, {
      originalErrorId: errorReport.id
    });
  }
}

/**
 * 确定错误优先级
 */
function determinePriority(errorReport) {
  const { type, severity, context } = errorReport;

  // 关键功能错误
  const criticalPaths = ['/api/auth', '/api/test', '/api/payment'];
  if (context?.url && criticalPaths.some(path => context.url.includes(path))) {
    return 'high';
  }

  // 严重程度判断
  if (severity === 'CRITICAL' || severity === 'HIGH') {
    
        return 'high';
      }

  // 错误类型判断
  if (type === 'SERVER' || type === 'AUTHENTICATION') {
    
        return 'medium';
      }

  return 'low';
}

/**
 * 检查错误频率
 */
async function checkErrorFrequency(_errorReport) {
  // 这里应该查询数据库或缓存来获取错误频率
  // 目前返回模拟值
  return Math.floor(Math.random() * 20);
}

/**
 * 发送错误告警
 */
async function sendErrorAlert(errorReport, metadata) {
  try {
    // 这里可以集成邮件、短信、Slack等告警系统
    Logger.warn('High priority error detected', {
      errorId: errorReport.id,
      type: errorReport.type,
      message: errorReport.message,
      priority: metadata.priority,
      frequency: metadata.frequency,
      timestamp: errorReport.timestamp
    });

  } catch (alertError) {
    Logger.error('Failed to send error alert', alertError);
  }
}

/**
 * 更新错误统计
 */
async function updateErrorStats(errorReport) {
  try {
    // 这里应该更新数据库中的错误统计
    // 目前只记录日志
    Logger.info('Error stats updated', {
      errorId: errorReport.id,
      type: errorReport.type,
      severity: errorReport.severity
    });

  } catch (statsError) {
    Logger.error('Failed to update error stats', statsError);
  }
}

/**
 * 健康检查端点
 */
router.get('/health', (req, res) => {
  res.success(new Date().toISOString(), 'Error reporting service is healthy');
});

module.exports = router;
