/**
 * 错误通知助手
 * 本地化程度：100%
 * 为所有测试引擎提供统一的错误通知功能
 */

const Logger = require('./logger');

class ErrorNotificationHelper {
  constructor(engineName) {
    this.engineName = engineName;
  }

  /**
   * 发送详细的测试失败通知
   */
  async sendTestFailedNotification(testId, error, context = {}) {
    try {
      const errorInfo = {
        testId,
        engine: this.engineName,
        timestamp: new Date().toISOString(),
        error: {
          message: error.message || '未知错误',
          code: error.code || 'UNKNOWN_ERROR',
          type: error.name || 'Error',
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        },
        context: {
          url: context.url,
          config: this.sanitizeConfig(context.config || {}),
          stage: context.stage || 'unknown',
          duration: context.duration || 0,
          ...context
        },
        retryable: this.isRetryableError(error),
        severity: this.getErrorSeverity(error),
        category: this.getErrorCategory(error),
        suggestions: this.getErrorSuggestions(error)
      };
      
      // 发送实时通知
      if (global.realtimeService) {
        await global.realtimeService.notifyTestFailed(testId, errorInfo);
      }
      
      // 记录详细错误日志
      Logger.error('测试失败通知已发送', error, {
        testId,
        engine: this.engineName,
        errorCode: error.code,
        retryable: errorInfo.retryable,
        severity: errorInfo.severity
      });
      
      return true;
    } catch (notificationError) {
      Logger.error('发送测试失败通知失败', notificationError, {
        testId,
        engine: this.engineName,
        originalError: error.message
      });
      return false;
    }
  }

  /**
   * 发送测试警告通知
   */
  async sendTestWarningNotification(testId, warning, context = {}) {
    try {
      const warningInfo = {
        testId,
        engine: this.engineName,
        timestamp: new Date().toISOString(),
        warning: {
          message: warning.message || '未知警告',
          code: warning.code || 'UNKNOWN_WARNING',
          type: warning.type || 'warning'
        },
        context: {
          url: context.url,
          stage: context.stage || 'unknown',
          ...context
        },
        severity: this.getWarningSeverity(warning),
        suggestions: this.getWarningSuggestions(warning)
      };
      
      // 发送实时通知
      if (global.realtimeService) {
        await global.realtimeService.notifyTestWarning?.(testId, warningInfo);
      }
      
      Logger.warn('测试警告通知已发送', {
        testId,
        engine: this.engineName,
        warningCode: warning.code,
        severity: warningInfo.severity
      });
      
      return true;
    } catch (notificationError) {
      Logger.error('发送测试警告通知失败', notificationError, {
        testId,
        engine: this.engineName
      });
      return false;
    }
  }

  /**
   * 发送测试超时通知
   */
  async sendTestTimeoutNotification(testId, timeoutInfo, context = {}) {
    try {
      const timeoutNotification = {
        testId,
        engine: this.engineName,
        timestamp: new Date().toISOString(),
        timeout: {
          duration: timeoutInfo.duration || 0,
          limit: timeoutInfo.limit || 0,
          stage: timeoutInfo.stage || 'unknown'
        },
        context: {
          url: context.url,
          ...context
        },
        retryable: true,
        severity: 'medium',
        suggestions: [
          '检查网络连接',
          '增加超时时间限制',
          '稍后重试测试'
        ]
      };
      
      // 发送实时通知
      if (global.realtimeService) {
        await global.realtimeService.notifyTestTimeout?.(testId, timeoutNotification);
      }
      
      Logger.warn('测试超时通知已发送', {
        testId,
        engine: this.engineName,
        duration: timeoutInfo.duration,
        limit: timeoutInfo.limit
      });
      
      return true;
    } catch (notificationError) {
      Logger.error('发送测试超时通知失败', notificationError, {
        testId,
        engine: this.engineName
      });
      return false;
    }
  }

  /**
   * 判断错误是否可重试
   */
  isRetryableError(error) {
    const retryableErrors = [
      'TIMEOUT',
      'NETWORK_ERROR',
      'CONNECTION_REFUSED',
      'CONNECTION_TIMEOUT',
      'DNS_LOOKUP_FAILED',
      'TEMPORARY_FAILURE',
      'RATE_LIMITED',
      'SERVICE_UNAVAILABLE'
    ];
    
    const retryableMessages = [
      'timeout',
      'network',
      'connection',
      'temporary',
      'rate limit',
      'service unavailable',
      'try again'
    ];
    
    // 检查错误代码
    if (error.code && retryableErrors.includes(error.code)) {
      return true;
    }
    
    // 检查错误消息
    const message = (error.message || '').toLowerCase();
    return retryableMessages.some(keyword => message.includes(keyword));
  }

  /**
   * 获取错误严重程度
   */
  getErrorSeverity(error) {
    const criticalErrors = ['SECURITY_VIOLATION', 'DATA_CORRUPTION', 'SYSTEM_FAILURE'];
    const highErrors = ['ANALYSIS_FAILED', 'INVALID_RESPONSE', 'AUTHENTICATION_FAILED'];
    const mediumErrors = ['TIMEOUT', 'NETWORK_ERROR', 'VALIDATION_ERROR'];
    
    const code = error.code || '';
    
    if (criticalErrors.includes(code)) return 'critical';
    if (highErrors.includes(code)) return 'high';
    if (mediumErrors.includes(code)) return 'medium';
    
    return 'low';
  }

  /**
   * 获取错误分类
   */
  getErrorCategory(error) {
    const code = error.code || '';
    const message = (error.message || '').toLowerCase();
    
    if (code.includes('NETWORK') || message.includes('network')) return 'network';
    if (code.includes('TIMEOUT') || message.includes('timeout')) return 'timeout';
    if (code.includes('VALIDATION') || message.includes('validation')) return 'validation';
    if (code.includes('AUTHENTICATION') || message.includes('auth')) return 'authentication';
    if (code.includes('PERMISSION') || message.includes('permission')) return 'permission';
    if (code.includes('ANALYSIS') || message.includes('analysis')) return 'analysis';
    
    return 'general';
  }

  /**
   * 获取错误建议
   */
  getErrorSuggestions(error) {
    const category = this.getErrorCategory(error);
    
    const suggestions = {
      network: [
        '检查网络连接',
        '验证URL是否可访问',
        '检查防火墙设置',
        '稍后重试'
      ],
      timeout: [
        '增加超时时间限制',
        '检查网络速度',
        '分批处理大型页面',
        '稍后重试'
      ],
      validation: [
        '检查输入参数格式',
        '验证URL有效性',
        '确认配置参数正确',
        '查看详细错误信息'
      ],
      authentication: [
        '检查API密钥',
        '验证访问权限',
        '更新认证信息',
        '联系管理员'
      ],
      analysis: [
        '检查页面内容',
        '验证页面结构',
        '确认页面可访问性',
        '尝试不同的分析配置'
      ],
      general: [
        '查看详细错误日志',
        '检查系统状态',
        '稍后重试',
        '联系技术支持'
      ]
    };
    
    return suggestions[category] || suggestions.general;
  }

  /**
   * 获取警告严重程度
   */
  getWarningSeverity(warning) {
    const code = warning.code || '';
    const message = (warning.message || '').toLowerCase();
    
    if (code.includes('PERFORMANCE') || message.includes('slow')) return 'medium';
    if (code.includes('DEPRECATED') || message.includes('deprecated')) return 'low';
    if (code.includes('SECURITY') || message.includes('security')) return 'high';
    
    return 'low';
  }

  /**
   * 获取警告建议
   */
  getWarningSuggestions(warning) {
    const code = warning.code || '';
    const message = (warning.message || '').toLowerCase();
    
    if (code.includes('PERFORMANCE') || message.includes('slow')) {
      return ['优化页面性能', '减少资源大小', '启用缓存'];
    }
    
    if (code.includes('SECURITY') || message.includes('security')) {
      return ['检查安全配置', '更新安全策略', '启用HTTPS'];
    }
    
    return ['查看详细信息', '考虑优化建议'];
  }

  /**
   * 清理配置对象（移除敏感信息）
   */
  sanitizeConfig(config) {
    const sanitized = { ...config };
    
    // 移除敏感字段
    const sensitiveFields = [
      'password', 'token', 'apiKey', 'secret', 'key',
      'auth', 'authorization', 'credential', 'private'
    ];
    
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }

  /**
   * 创建错误上下文
   */
  createErrorContext(testId, url, config, additionalContext = {}) {
    return {
      testId,
      url: url ? url.substring(0, 100) : undefined,
      config: this.sanitizeConfig(config || {}),
      timestamp: new Date().toISOString(),
      engine: this.engineName,
      ...additionalContext
    };
  }
}

module.exports = ErrorNotificationHelper;
