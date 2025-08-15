/**
 * 统一错误处理器
 * 整合所有错误处理逻辑，提供企业级错误管理能力
 */

const { EventEmitter } = require('events');
const { configCenter } = require('../config/ConfigCenter');

/**
 * 标准化错误类型
 */
const ErrorTypes = {
  // 系统错误
  SYSTEM_ERROR: 'SYSTEM_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',

  // 业务错误
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  BUSINESS_LOGIC_ERROR: 'BUSINESS_LOGIC_ERROR',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',

  // 认证授权错误
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  TOKEN_ERROR: 'TOKEN_ERROR',

  // 外部服务错误
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',

  // 客户端错误
  CLIENT_ERROR: 'CLIENT_ERROR',
  RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
  REQUEST_TIMEOUT: 'REQUEST_TIMEOUT'
};

/**
 * 错误严重程度
 */
const ErrorSeverity = {
  CRITICAL: 'critical',    // 系统崩溃级别
  HIGH: 'high',           // 严重影响功能
  MEDIUM: 'medium',       // 影响用户体验
  LOW: 'low',            // 轻微问题
  INFO: 'info'           // 信息性错误
};

/**
 * 统一错误类
 */
class UnifiedError extends Error {
  constructor(message, type = ErrorTypes.INTERNAL_ERROR, options = {}) {
    super(message);

    this.name = 'UnifiedError';
    this.type = type;
    this.severity = options.severity || this.getSeverityByType(type);
    this.statusCode = options.statusCode || this.getStatusCodeByType(type);
    this.code = options.code || this.generateErrorCode(type);
    this.details = options.details || {};
    this.context = options.context || {};
    this.timestamp = new Date().toISOString();
    this.requestId = options.requestId;
    this.userId = options.userId;
    this.sessionId = options.sessionId;
    this.retryable = options.retryable !== undefined ? options.retryable : this.isRetryableByType(type);

    // 错误追踪
    this.errorId = this.generateErrorId();
    this.correlationId = options.correlationId;

    // 捕获堆栈信息
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, UnifiedError);
    }
  }

  /**
   * 根据错误类型获取严重程度
   */
  getSeverityByType(type) {
    const severityMap = {
      [ErrorTypes.SYSTEM_ERROR]: ErrorSeverity.CRITICAL,
      [ErrorTypes.INTERNAL_ERROR]: ErrorSeverity.HIGH,
      [ErrorTypes.DATABASE_ERROR]: ErrorSeverity.HIGH,
      [ErrorTypes.EXTERNAL_SERVICE_ERROR]: ErrorSeverity.MEDIUM,
      [ErrorTypes.AUTHENTICATION_ERROR]: ErrorSeverity.MEDIUM,
      [ErrorTypes.AUTHORIZATION_ERROR]: ErrorSeverity.MEDIUM,
      [ErrorTypes.VALIDATION_ERROR]: ErrorSeverity.LOW,
      [ErrorTypes.CLIENT_ERROR]: ErrorSeverity.LOW,
      [ErrorTypes.RESOURCE_NOT_FOUND]: ErrorSeverity.LOW
    };

    return severityMap[type] || ErrorSeverity.MEDIUM;
  }

  /**
   * 根据错误类型获取HTTP状态码
   */
  getStatusCodeByType(type) {
    const statusCodeMap = {
      [ErrorTypes.VALIDATION_ERROR]: 400,
      [ErrorTypes.CLIENT_ERROR]: 400,
      [ErrorTypes.AUTHENTICATION_ERROR]: 401,
      [ErrorTypes.AUTHORIZATION_ERROR]: 403,
      [ErrorTypes.TOKEN_ERROR]: 401,
      [ErrorTypes.RESOURCE_NOT_FOUND]: 404,
      [ErrorTypes.RATE_LIMIT_ERROR]: 429,
      [ErrorTypes.INTERNAL_ERROR]: 500,
      [ErrorTypes.SYSTEM_ERROR]: 500,
      [ErrorTypes.DATABASE_ERROR]: 500,
      [ErrorTypes.EXTERNAL_SERVICE_ERROR]: 502,
      [ErrorTypes.NETWORK_ERROR]: 503,
      [ErrorTypes.REQUEST_TIMEOUT]: 504
    };

    return statusCodeMap[type] || 500;
  }

  /**
   * 生成错误代码
   */
  generateErrorCode(type) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `${type}_${timestamp}_${random}`.toUpperCase();
  }

  /**
   * 生成错误ID
   */
  generateErrorId() {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 判断错误是否可重试
   */
  isRetryableByType(type) {
    const retryableTypes = [
      ErrorTypes.NETWORK_ERROR,
      ErrorTypes.REQUEST_TIMEOUT,
      ErrorTypes.EXTERNAL_SERVICE_ERROR,
      ErrorTypes.RATE_LIMIT_ERROR
    ];

    return retryableTypes.includes(type);
  }

  /**
   * 转换为API响应格式
   */
  toApiResponse() {
    return {
      success: false,
      error: {
        id: this.errorId,
        code: this.code,
        type: this.type,
        message: this.message,
        severity: this.severity,
        retryable: this.retryable,
        details: this.details
      },
      meta: {
        timestamp: this.timestamp,
        requestId: this.requestId,
        correlationId: this.correlationId
      }
    };
  }

  /**
   * 转换为日志格式
   */
  toLogFormat() {
    return {
      errorId: this.errorId,
      type: this.type,
      severity: this.severity,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      stack: this.stack,
      details: this.details,
      context: this.context,
      timestamp: this.timestamp,
      requestId: this.requestId,
      userId: this.userId,
      sessionId: this.sessionId,
      correlationId: this.correlationId,
      retryable: this.retryable
    };
  }
}

/**
 * 错误统计管理器
 */
class ErrorStatsManager {
  constructor() {
    this.stats = new Map();
    this.timeWindows = {
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000
    };
  }

  /**
   * 记录错误统计
   */
  recordError(error) {
    const now = Date.now();
    const key = `${error.type}_${error.severity}`;

    if (!this.stats.has(key)) {
      this.stats.set(key, {
        count: 0,
        firstOccurred: now,
        lastOccurred: now,
        occurrences: []
      });
    }

    const stat = this.stats.get(key);
    stat.count++;
    stat.lastOccurred = now;
    stat.occurrences.push(now);

    // 清理过期的记录（保留24小时）
    const cutoff = now - this.timeWindows['24h'];
    stat.occurrences = stat.occurrences.filter(time => time > cutoff);
  }

  /**
   * 获取错误统计
   */
  getStats(timeWindow = '1h') {
    const now = Date.now();
    const windowMs = this.timeWindows[timeWindow];
    const cutoff = now - windowMs;

    const result = {};

    for (const [key, stat] of this.stats) {
      const recentOccurrences = stat.occurrences.filter(time => time > cutoff);

      if (recentOccurrences.length > 0) {
        result[key] = {
          count: recentOccurrences.length,
          rate: recentOccurrences.length / (windowMs / 1000 / 60), // 每分钟错误率
          firstOccurred: stat.firstOccurred,
          lastOccurred: stat.lastOccurred
        };
      }
    }

    return result;
  }

  /**
   * 检查错误率阈值
   */
  checkThresholds() {
    const stats = this.getStats('5m');
    const alerts = [];

    // 配置阈值
    const thresholds = {
      [ErrorSeverity.CRITICAL]: { rate: 1, count: 1 },
      [ErrorSeverity.HIGH]: { rate: 5, count: 10 },
      [ErrorSeverity.MEDIUM]: { rate: 20, count: 50 },
      [ErrorSeverity.LOW]: { rate: 100, count: 200 }
    };

    for (const [key, stat] of Object.entries(stats)) {
      const [type, severity] = key.split('_');
      const threshold = thresholds[severity];

      if (threshold && (stat.rate > threshold.rate || stat.count > threshold.count)) {
        alerts.push({
          type,
          severity,
          rate: stat.rate,
          count: stat.count,
          threshold,
          message: `错误率超过阈值: ${type}/${severity} - ${stat.count}次/5分钟 (${stat.rate.toFixed(2)}/分钟)`
        });
      }
    }

    return alerts;
  }
}

/**
 * 统一错误处理器
 */
class UnifiedErrorHandler extends EventEmitter {
  constructor() {
    super();
    this.statsManager = new ErrorStatsManager();
    this.logAggregator = null; // 将在后续设置
    this.monitoringSystem = null; // 将在后续设置
    this.isInitialized = false;

    // 错误处理配置
    this.config = {
      enableLogging: true,
      enableMonitoring: true,
      enableAlerting: true,
      enableStats: true,
      logLevel: 'error',
      alertThresholds: {
        [ErrorSeverity.CRITICAL]: { count: 1, timeWindow: '1m' },
        [ErrorSeverity.HIGH]: { count: 5, timeWindow: '5m' },
        [ErrorSeverity.MEDIUM]: { count: 20, timeWindow: '15m' },
        [ErrorSeverity.LOW]: { count: 100, timeWindow: '1h' }
      }
    };
  }

  /**
   * 初始化错误处理器
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      // 从配置中心加载配置
      this.loadConfiguration();

      // 设置全局错误处理
      this.setupGlobalErrorHandlers();

      // 启动定期检查
      this.startPeriodicChecks();

      this.isInitialized = true;
      console.log('✅ 统一错误处理器初始化完成');

    } catch (error) {
      console.error('❌ 统一错误处理器初始化失败:', error);
      throw error;
    }
  }

  /**
   * 从配置中心加载配置
   */
  loadConfiguration() {
    this.config.enableLogging = configCenter.get('logging.enableFile', true);
    this.config.logLevel = configCenter.get('logging.level', 'error');
    this.config.enableMonitoring = configCenter.get('monitoring.enabled', true);

    // 监听配置变更
    configCenter.watch('logging.level', (newValue) => {
      this.config.logLevel = newValue;
      console.log('🔄 错误处理器日志级别已更新:', newValue);
    });
  }

  /**
   * 设置全局错误处理
   */
  setupGlobalErrorHandlers() {
    // 处理未捕获的异常
    process.on('uncaughtException', (error) => {
      const unifiedError = this.createUnifiedError(error, ErrorTypes.SYSTEM_ERROR, {
        context: { source: 'uncaughtException' }
      });

      this.handleError(unifiedError);

      // 优雅关闭
      setTimeout(() => {
        process.exit(1);
      }, 1000);
    });

    // 处理未处理的Promise拒绝
    process.on('unhandledRejection', (reason, promise) => {
      const error = reason instanceof Error ? reason : new Error(String(reason));
      const unifiedError = this.createUnifiedError(error, ErrorTypes.SYSTEM_ERROR, {
        context: { source: 'unhandledRejection', promise: promise.toString() }
      });

      this.handleError(unifiedError);
    });
  }

  /**
   * 启动定期检查
   */
  startPeriodicChecks() {
    // 每分钟检查错误阈值
    setInterval(() => {
      if (this.config.enableAlerting) {
        const alerts = this.statsManager.checkThresholds();
        if (alerts.length > 0) {
          this.emit('thresholdExceeded', alerts);
        }
      }
    }, 60 * 1000);

    // 每小时清理过期统计
    setInterval(() => {
      this.cleanupStats();
    }, 60 * 60 * 1000);
  }

  /**
   * 创建统一错误
   */
  createUnifiedError(error, type = null, options = {}) {
    if (error instanceof UnifiedError) {
      return error;
    }

    // 自动检测错误类型
    if (!type) {
      type = this.detectErrorType(error);
    }

    return new UnifiedError(
      error.message || '未知错误',
      type,
      {
        ...options,
        details: {
          originalError: error.name,
          originalMessage: error.message,
          originalStack: error.stack,
          ...options.details
        }
      }
    );
  }

  /**
   * 自动检测错误类型
   */
  detectErrorType(error) {
    // 数据库错误
    if (error.name && error.name.includes('Sequelize')) {
      return ErrorTypes.DATABASE_ERROR;
    }

    // 网络错误
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return ErrorTypes.NETWORK_ERROR;
    }

    // 验证错误
    if (error.name === 'ValidationError') {
      return ErrorTypes.VALIDATION_ERROR;
    }

    // 认证错误
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return ErrorTypes.TOKEN_ERROR;
    }

    // 默认为内部错误
    return ErrorTypes.INTERNAL_ERROR;
  }

  /**
   * 处理错误的主要方法
   */
  async handleError(error, context = {}) {
    try {
      // 确保是统一错误格式
      const unifiedError = this.createUnifiedError(error, null, { context });

      // 记录错误统计
      if (this.config.enableStats) {
        this.statsManager.recordError(unifiedError);
      }

      // 记录日志
      if (this.config.enableLogging) {
        await this.logError(unifiedError);
      }

      // 发送监控数据
      if (this.config.enableMonitoring && this.monitoringSystem) {
        await this.monitoringSystem.recordError(unifiedError);
      }

      // 触发事件
      this.emit('error', unifiedError);

      // 检查是否需要立即告警
      if (this.shouldAlert(unifiedError)) {
        this.emit('alert', unifiedError);
      }

      return unifiedError;

    } catch (handlingError) {
      console.error('错误处理器自身发生错误:', handlingError);
      // 避免无限循环，直接输出到控制台
      console.error('原始错误:', error);
    }
  }

  /**
   * 记录错误日志
   */
  async logError(error) {
    const logData = error.toLogFormat();

    // 输出到控制台
    console.error(`[${error.severity.toUpperCase()}] ${error.type}: ${error.message}`, logData);

    // 如果有日志聚合器，发送到聚合器
    if (this.logAggregator) {
      await this.logAggregator.log(logData);
    }
  }

  /**
   * 判断是否需要立即告警
   */
  shouldAlert(error) {
    // 关键错误立即告警
    if (error.severity === ErrorSeverity.CRITICAL) {
      return true;
    }

    // 高严重程度错误在短时间内多次出现时告警
    if (error.severity === ErrorSeverity.HIGH) {
      const stats = this.statsManager.getStats('5m');
      const key = `${error.type}_${error.severity}`;
      return stats[key] && stats[key].count >= 3;
    }

    return false;
  }

  /**
   * Express错误处理中间件
   */
  expressMiddleware() {
    return async (error, req, res, next) => {
      // 如果响应已发送，跳过
      if (res.headersSent) {
        return next(error);
      }

      try {
        // 创建请求上下文
        const context = {
          method: req.method,
          url: req.originalUrl,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          userId: req.user?.id,
          sessionId: req.sessionID,
          requestId: req.requestId,
          headers: req.headers,
          body: req.body,
          query: req.query,
          params: req.params
        };

        // 处理错误
        const unifiedError = await this.handleError(error, context);

        // 发送响应
        res.status(unifiedError.statusCode).json(unifiedError.toApiResponse());

      } catch (handlingError) {
        console.error('Express错误处理中间件发生错误:', handlingError);

        // 发送基本错误响应
        res.status(500).json({
          success: false,
          error: {
            code: 'HANDLER_ERROR',
            message: '错误处理器发生异常',
            type: ErrorTypes.SYSTEM_ERROR
          },
          meta: {
            timestamp: new Date().toISOString()
          }
        });
      }
    };
  }

  /**
   * 获取错误统计
   */
  getStats(timeWindow = '1h') {
    return this.statsManager.getStats(timeWindow);
  }

  /**
   * 清理过期统计
   */
  cleanupStats() {
    // 统计管理器会自动清理过期数据
    console.log('🧹 清理过期错误统计数据');
  }

  /**
   * 设置日志聚合器
   */
  setLogAggregator(aggregator) {
    this.logAggregator = aggregator;
  }

  /**
   * 设置监控系统
   */
  setMonitoringSystem(monitoring) {
    this.monitoringSystem = monitoring;
  }

  /**
   * 获取处理器状态
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      config: this.config,
      stats: this.getStats(),
      uptime: process.uptime()
    };
  }
}

/**
 * 初始化错误处理系统
 */
async function initializeErrorHandlingSystem() {
  try {
    console.log('🚀 初始化错误处理系统...');

    // 初始化错误处理器
    await unifiedErrorHandler.initialize();

    // 初始化日志聚合器
    const { errorLogAggregator } = require('./ErrorLogAggregator');
    await errorLogAggregator.initialize();

    // 初始化监控系统
    const { errorMonitoringSystem } = require('./ErrorMonitoringSystem');
    await errorMonitoringSystem.initialize();

    // 连接各个组件
    unifiedErrorHandler.setLogAggregator(errorLogAggregator);
    unifiedErrorHandler.setMonitoringSystem(errorMonitoringSystem);

    // 设置事件监听
    unifiedErrorHandler.on('error', async (error) => {
      const stats = unifiedErrorHandler.getStats('5m');
      await errorMonitoringSystem.recordError(error, stats);
    });

    unifiedErrorHandler.on('alert', (error) => {
      console.log(`🚨 立即告警触发: ${error.type} - ${error.message}`);
    });

    errorMonitoringSystem.on('alertSent', (alert) => {
      console.log(`📢 告警已发送: ${alert.title}`);
    });

    errorMonitoringSystem.on('thresholdExceeded', (alerts) => {
      console.log(`⚠️ 错误阈值超限: ${alerts.length} 个告警`);
    });

    console.log('✅ 错误处理系统初始化完成');

  } catch (error) {
    console.error('❌ 错误处理系统初始化失败:', error);
    throw error;
  }
}

// 创建全局实例
const unifiedErrorHandler = new UnifiedErrorHandler();

module.exports = {
  UnifiedError,
  UnifiedErrorHandler,
  ErrorTypes,
  ErrorSeverity,
  ErrorStatsManager,
  unifiedErrorHandler,
  initializeErrorHandlingSystem
};
