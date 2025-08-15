/**
 * 统一错误监控管理器
 * 提供错误收集、分析、告警和报告功能
 */

const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');
const { configManager } = require('./ConfigManager.js');

/**
 * 错误级别定义
 */
const ERROR_LEVELS = {
  CRITICAL: 'critical',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
  DEBUG: 'debug'
};

/**
 * 错误类型定义
 */
const ERROR_TYPES = {
  SYSTEM: 'system',
  APPLICATION: 'application',
  DATABASE: 'database',
  NETWORK: 'network',
  AUTHENTICATION: 'authentication',
  VALIDATION: 'validation',
  TEST_ENGINE: 'test_engine',
  EXTERNAL_API: 'external_api'
};

/**
 * 错误监控管理器
 */
class ErrorMonitoringManager extends EventEmitter {
  constructor() {
    super();
    this.errors = new Map();
    this.errorStats = {
      total: 0,
      byLevel: {},
      byType: {},
      byHour: {},
      recentErrors: []
    };
    this.alertRules = new Map();
    this.isInitialized = false;
    this.logFile = null;
    
    // 初始化错误统计
    this.initializeStats();
    
    // 设置定期清理
    this.setupCleanup();
  }

  /**
   * 初始化错误监控
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }

    try {
      // 创建日志目录
      const logDir = path.join(process.cwd(), 'logs');
      await fs.mkdir(logDir, { recursive: true });
      
      this.logFile = path.join(logDir, 'errors.log');
      
      // 设置默认告警规则
      this.setupDefaultAlertRules();
      
      // 监听进程错误
      this.setupProcessErrorHandlers();
      
      this.isInitialized = true;
      console.log('✅ 错误监控管理器初始化完成');
      
      this.emit('initialized');
    } catch (error) {
      console.error('❌ 错误监控管理器初始化失败:', error);
      throw error;
    }
  }

  /**
   * 初始化错误统计
   */
  initializeStats() {
    Object.values(ERROR_LEVELS).forEach(level => {
      this.errorStats.byLevel[level] = 0;
    });
    
    Object.values(ERROR_TYPES).forEach(type => {
      this.errorStats.byType[type] = 0;
    });
  }

  /**
   * 记录错误
   * @param {Object} errorInfo - 错误信息
   */
  async logError(errorInfo) {
    const errorId = this.generateErrorId();
    const timestamp = new Date();
    
    const errorRecord = {
      id: errorId,
      timestamp,
      level: errorInfo.level || ERROR_LEVELS.ERROR,
      type: errorInfo.type || ERROR_TYPES.APPLICATION,
      message: errorInfo.message,
      stack: errorInfo.stack,
      context: errorInfo.context || {},
      userId: errorInfo.userId,
      sessionId: errorInfo.sessionId,
      requestId: errorInfo.requestId,
      userAgent: errorInfo.userAgent,
      ip: errorInfo.ip,
      url: errorInfo.url,
      method: errorInfo.method,
      resolved: false,
      resolvedAt: null,
      resolvedBy: null
    };

    // 存储错误记录
    this.errors.set(errorId, errorRecord);
    
    // 更新统计
    this.updateStats(errorRecord);
    
    // 写入日志文件
    await this.writeToLogFile(errorRecord);
    
    // 检查告警规则
    await this.checkAlertRules(errorRecord);
    
    // 发送事件
    this.emit('errorLogged', errorRecord);
    
    console.error(`[${errorRecord.level.toUpperCase()}] ${errorRecord.message}`, {
      id: errorId,
      type: errorRecord.type,
      context: errorRecord.context
    });
    
    return errorId;
  }

  /**
   * 更新错误统计
   * @param {Object} errorRecord - 错误记录
   */
  updateStats(errorRecord) {
    this.errorStats.total++;
    this.errorStats.byLevel[errorRecord.level]++;
    this.errorStats.byType[errorRecord.type]++;
    
    // 按小时统计
    const hour = errorRecord.timestamp.getHours();
    if (!this.errorStats.byHour[hour]) {
      this.errorStats.byHour[hour] = 0;
    }
    this.errorStats.byHour[hour]++;
    
    // 保持最近100个错误
    this.errorStats.recentErrors.unshift(errorRecord);
    if (this.errorStats.recentErrors.length > 100) {
      this.errorStats.recentErrors.pop();
    }
  }

  /**
   * 写入日志文件
   * @param {Object} errorRecord - 错误记录
   */
  async writeToLogFile(errorRecord) {
    if (!this.logFile) return;
    
    try {
      const logEntry = JSON.stringify({
        timestamp: errorRecord.timestamp.toISOString(),
        id: errorRecord.id,
        level: errorRecord.level,
        type: errorRecord.type,
        message: errorRecord.message,
        context: errorRecord.context,
        stack: errorRecord.stack
      }) + '\n';
      
      await fs.appendFile(this.logFile, logEntry);
    } catch (error) {
      console.error('写入错误日志失败:', error);
    }
  }

  /**
   * 设置默认告警规则
   */
  setupDefaultAlertRules() {
    // 严重错误立即告警
    this.addAlertRule('critical_errors', {
      condition: (error) => error.level === ERROR_LEVELS.CRITICAL,
      action: 'immediate',
      description: '严重错误立即告警'
    });
    
    // 错误频率告警
    this.addAlertRule('error_frequency', {
      condition: () => {
        const recentErrors = this.getRecentErrors(5); // 最近5分钟
        return recentErrors.length > 10;
      },
      action: 'frequency',
      description: '错误频率过高告警'
    });
    
    // 数据库错误告警
    this.addAlertRule('database_errors', {
      condition: (error) => error.type === ERROR_TYPES.DATABASE,
      action: 'database',
      description: '数据库错误告警'
    });
    
    // 测试引擎错误告警
    this.addAlertRule('test_engine_errors', {
      condition: (error) => error.type === ERROR_TYPES.TEST_ENGINE,
      action: 'test_engine',
      description: '测试引擎错误告警'
    });
  }

  /**
   * 添加告警规则
   * @param {string} name - 规则名称
   * @param {Object} rule - 规则配置
   */
  addAlertRule(name, rule) {
    this.alertRules.set(name, {
      ...rule,
      enabled: true,
      triggeredCount: 0,
      lastTriggered: null
    });
  }

  /**
   * 检查告警规则
   * @param {Object} errorRecord - 错误记录
   */
  async checkAlertRules(errorRecord) {
    for (const [name, rule] of this.alertRules) {
      if (!rule.enabled) continue;
      
      try {
        if (rule.condition(errorRecord)) {
          await this.triggerAlert(name, rule, errorRecord);
        }
      } catch (error) {
        console.error(`告警规则 ${name} 检查失败:`, error);
      }
    }
  }

  /**
   * 触发告警
   * @param {string} ruleName - 规则名称
   * @param {Object} rule - 规则配置
   * @param {Object} errorRecord - 错误记录
   */
  async triggerAlert(ruleName, rule, errorRecord) {
    rule.triggeredCount++;
    rule.lastTriggered = new Date();
    
    const alertInfo = {
      ruleName,
      rule,
      errorRecord,
      timestamp: new Date()
    };
    
    // 发送告警事件
    this.emit('alertTriggered', alertInfo);
    
    // 根据告警类型执行相应操作
    switch (rule.action) {
      case 'immediate':
        await this.sendImmediateAlert(alertInfo);
        break;
      case 'frequency':
        await this.sendFrequencyAlert(alertInfo);
        break;
      case 'database':
        await this.sendDatabaseAlert(alertInfo);
        break;
      case 'test_engine':
        await this.sendTestEngineAlert(alertInfo);
        break;
    }
  }

  /**
   * 发送立即告警
   * @param {Object} alertInfo - 告警信息
   */
  async sendImmediateAlert(alertInfo) {
    console.error('🚨 严重错误告警:', {
      errorId: alertInfo.errorRecord.id,
      message: alertInfo.errorRecord.message,
      type: alertInfo.errorRecord.type
    });
    
    // 这里可以集成邮件、短信、Slack等告警渠道
    // await this.sendEmailAlert(alertInfo);
    // await this.sendSlackAlert(alertInfo);
  }

  /**
   * 发送频率告警
   * @param {Object} alertInfo - 告警信息
   */
  async sendFrequencyAlert(alertInfo) {
    console.warn('⚠️ 错误频率过高告警:', {
      recentErrorCount: this.getRecentErrors(5).length,
      threshold: 10
    });
  }

  /**
   * 发送数据库告警
   * @param {Object} alertInfo - 告警信息
   */
  async sendDatabaseAlert(alertInfo) {
    console.error('🗄️ 数据库错误告警:', {
      errorId: alertInfo.errorRecord.id,
      message: alertInfo.errorRecord.message
    });
  }

  /**
   * 发送测试引擎告警
   * @param {Object} alertInfo - 告警信息
   */
  async sendTestEngineAlert(alertInfo) {
    console.error('🔧 测试引擎错误告警:', {
      errorId: alertInfo.errorRecord.id,
      message: alertInfo.errorRecord.message
    });
  }

  /**
   * 获取最近的错误
   * @param {number} minutes - 分钟数
   * @returns {Array} 错误列表
   */
  getRecentErrors(minutes = 60) {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    return this.errorStats.recentErrors.filter(error => 
      error.timestamp > cutoff
    );
  }

  /**
   * 获取错误统计
   * @returns {Object} 统计信息
   */
  getErrorStats() {
    return {
      ...this.errorStats,
      alertRules: Array.from(this.alertRules.entries()).map(([name, rule]) => ({
        name,
        enabled: rule.enabled,
        triggeredCount: rule.triggeredCount,
        lastTriggered: rule.lastTriggered,
        description: rule.description
      }))
    };
  }

  /**
   * 标记错误为已解决
   * @param {string} errorId - 错误ID
   * @param {string} resolvedBy - 解决者
   */
  resolveError(errorId, resolvedBy) {
    const error = this.errors.get(errorId);
    if (error) {
      error.resolved = true;
      error.resolvedAt = new Date();
      error.resolvedBy = resolvedBy;
      
      this.emit('errorResolved', error);
      return true;
    }
    return false;
  }

  /**
   * 设置进程错误处理器
   */
  setupProcessErrorHandlers() {
    // 未捕获的异常
    process.on('uncaughtException', (error) => {
      this.logError({
        level: ERROR_LEVELS.CRITICAL,
        type: ERROR_TYPES.SYSTEM,
        message: 'Uncaught Exception',
        stack: error.stack,
        context: { error: error.message }
      });
    });
    
    // 未处理的Promise拒绝
    process.on('unhandledRejection', (reason, promise) => {
      this.logError({
        level: ERROR_LEVELS.CRITICAL,
        type: ERROR_TYPES.SYSTEM,
        message: 'Unhandled Promise Rejection',
        stack: reason?.stack,
        context: { reason: reason?.message || reason, promise }
      });
    });
  }

  /**
   * 设置定期清理
   */
  setupCleanup() {
    // 每小时清理旧错误记录
    setInterval(() => {
      this.cleanupOldErrors();
    }, 60 * 60 * 1000);
  }

  /**
   * 清理旧错误记录
   */
  cleanupOldErrors() {
    const retentionDays = configManager.get('monitoring.retentionDays', 30);
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    
    let cleanedCount = 0;
    for (const [id, error] of this.errors) {
      if (error.timestamp < cutoff) {
        this.errors.delete(id);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`🧹 清理了 ${cleanedCount} 个过期错误记录`);
    }
  }

  /**
   * 生成错误ID
   * @returns {string} 错误ID
   */
  generateErrorId() {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取错误详情
   * @param {string} errorId - 错误ID
   * @returns {Object|null} 错误详情
   */
  getError(errorId) {
    return this.errors.get(errorId) || null;
  }

  /**
   * 搜索错误
   * @param {Object} criteria - 搜索条件
   * @returns {Array} 错误列表
   */
  searchErrors(criteria = {}) {
    const errors = Array.from(this.errors.values());
    
    return errors.filter(error => {
      if (criteria.level && error.level !== criteria.level) return false;
      if (criteria.type && error.type !== criteria.type) return false;
      if (criteria.resolved !== undefined && error.resolved !== criteria.resolved) return false;
      if (criteria.startDate && error.timestamp < criteria.startDate) return false;
      if (criteria.endDate && error.timestamp > criteria.endDate) return false;
      if (criteria.message && !error.message.includes(criteria.message)) return false;
      
      return true;
    }).sort((a, b) => b.timestamp - a.timestamp);
  }
}

// 创建单例实例
const errorMonitoringManager = new ErrorMonitoringManager();

module.exports = {
  ErrorMonitoringManager,
  errorMonitoringManager,
  ERROR_LEVELS,
  ERROR_TYPES
};
