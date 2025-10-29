/**
 * 错误监控告警系统
 * 实时监控错误并发送告警通知
 */

const { EventEmitter } = require('events');
const { configCenter } = require('../config/ConfigCenter');
const { ErrorSeverity } = require('./ErrorHandler');

/**
 * 告警通道类型
 */
const AlertChannels = {
  EMAIL: 'email',
  SMS: 'sms',
  WEBHOOK: 'webhook',
  SLACK: 'slack',
  DINGTALK: 'dingtalk'
};

/**
 * 告警级别
 */
const AlertLevels = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low'
};

/**
 * 基础告警通道
 */
class AlertChannel {
  constructor(name, config = {}) {
    this.name = name;
    this.config = config;
    this.enabled = config.enabled !== false;
    this.rateLimiter = new Map(); // 防止告警风暴
  }

  async send(alert) {
    if (!this.enabled) return;
    
    // 检查速率限制
    if (this.isRateLimited(alert)) {
      return;
    }
    
    try {
      await this.doSend(alert);
      this.updateRateLimit(alert);
    } catch (error) {
      console.error(`告警发送失败 [${this.name}]:`, error);
    }
  }

  async doSend(alert) {
    throw new Error('doSend method must be implemented');
  }

  isRateLimited(alert) {
    const key = `${alert.type}_${alert.severity}`;
    const now = Date.now();
    const limit = this.rateLimiter.get(key);
    
    if (!limit) return false;
    
    // 5分钟内同类型告警最多发送3次
    const timeWindow = 5 * 60 * 1000;
    const maxCount = 3;
    
    const recentAlerts = limit.timestamps.filter(time => now - time < timeWindow);
    return recentAlerts.length >= maxCount;
  }

  updateRateLimit(alert) {
    const key = `${alert.type}_${alert.severity}`;
    const now = Date.now();
    
    if (!this.rateLimiter.has(key)) {
      this.rateLimiter.set(key, { timestamps: [] });
    }
    
    const limit = this.rateLimiter.get(key);
    limit.timestamps.push(now);
    
    // 清理过期记录
    const timeWindow = 5 * 60 * 1000;
    limit.timestamps = limit.timestamps.filter(time => now - time < timeWindow);
  }
}

/**
 * 邮件告警通道
 */
class EmailAlertChannel extends AlertChannel {
  constructor(config) {
    super(AlertChannels.EMAIL, config);
    this.smtpConfig = config.smtp || {};
    this.recipients = config.recipients || [];
  }

  async doSend(alert) {
    // 这里可以集成实际的邮件服务
    
    // 模拟邮件发送
    return new Promise(resolve => setTimeout(resolve, 100));
  }
}

/**
 * Webhook告警通道
 */
class WebhookAlertChannel extends AlertChannel {
  constructor(config) {
    super(AlertChannels.WEBHOOK, config);
    this.url = config.url;
    this.headers = config.headers || {};
    this.timeout = config.timeout || 5000;
  }

  async doSend(alert) {
    try {
      const payload = {
        alert: {
          id: alert.id,
          title: alert.title,
          message: alert.message,
          severity: alert.severity,
          type: alert.type,
          timestamp: alert.timestamp,
          details: alert.details
        },
        source: 'test-web-platform',
        environment: process.env.NODE_ENV || 'development'
      };

      const response = await fetch(this.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.headers
        },
        body: JSON.stringify(payload),
        timeout: this.timeout
      });

      if (!response.ok) {
        throw new Error(`Webhook响应错误: ${response.status}`);
      }

    } catch (error) {
      console.error(`Webhook告警发送失败:`, error);
      throw error;
    }
  }
}

/**
 * Slack告警通道
 */
class SlackAlertChannel extends AlertChannel {
  constructor(config) {
    super(AlertChannels.SLACK, config);
    this.webhookUrl = config.webhookUrl;
    this.channel = config.channel;
    this.username = config.username || 'Test-Web Alert';
  }

  async doSend(alert) {
    const color = this.getSeverityColor(alert.severity);
    const payload = {
      channel: this.channel,
      username: this.username,
      attachments: [{
        color,
        title: alert.title,
        text: alert.message,
        fields: [
          {
            title: '严重程度',
            value: alert.severity,
            short: true
          },
          {
            title: '错误类型',
            value: alert.type,
            short: true
          },
          {
            title: '时间',
            value: new Date(alert.timestamp).toLocaleString(),
            short: true
          }
        ],
        footer: 'Test-Web Platform',
        ts: Math.floor(Date.now() / 1000)
      }]
    };

    const response = await fetch(this.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Slack告警发送失败: ${response.status}`);
    }

  }

  getSeverityColor(severity) {
    const colors = {
      [ErrorSeverity.CRITICAL]: 'danger',
      [ErrorSeverity.HIGH]: 'warning',
      [ErrorSeverity.MEDIUM]: 'good',
      [ErrorSeverity.LOW]: '#36a64f'
    };
    return colors[severity] || 'good';
  }
}

/**
 * 钉钉告警通道
 */
class DingTalkAlertChannel extends AlertChannel {
  constructor(config) {
    super(AlertChannels.DINGTALK, config);
    this.webhookUrl = config.webhookUrl;
    this.secret = config.secret;
  }

  async doSend(alert) {
    const timestamp = Date.now();
    const sign = this.generateSign(timestamp);
    
    const payload = {
      msgtype: 'markdown',
      markdown: {
        title: alert.title,
        text: this.formatMarkdownMessage(alert)
      }
    };

    const url = `${this.webhookUrl}&timestamp=${timestamp}&sign=${sign}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`钉钉告警发送失败: ${response.status}`);
    }

  }

  generateSign(timestamp) {
    if (!this.secret) return '';
    
    const crypto = require('crypto');
    const stringToSign = `${timestamp}\n${this.secret}`;
    return encodeURIComponent(crypto.createHmac('sha256', this.secret).update(stringToSign).digest('base64'));
  }

  formatMarkdownMessage(alert) {
    return `
## ${alert.title}

**错误信息**: ${alert.message}

**严重程度**: ${alert.severity}

**错误类型**: ${alert.type}

**发生时间**: ${new Date(alert.timestamp).toLocaleString()}

**错误ID**: ${alert.details.errorId || 'N/A'}

**请求ID**: ${alert.details.requestId || 'N/A'}

---
*来自 Test-Web Platform 监控系统*
    `.trim();
  }
}

/**
 * 告警规则引擎
 */
class AlertRuleEngine {
  constructor() {
    this.rules = new Map();
    this.loadDefaultRules();
  }

  loadDefaultRules() {
    // 默认告警规则
    this.addRule('critical_errors', {
      condition: (error) => error.severity === ErrorSeverity.CRITICAL,
      alertLevel: AlertLevels.CRITICAL,
      channels: [AlertChannels.EMAIL, AlertChannels.WEBHOOK, AlertChannels.SLACK],
      throttle: 0 // 立即告警
    });

    this.addRule('high_error_rate', {
      condition: (error, stats) => {
        const key = `${error.type}_${error.severity}`;
        const stat = stats[key];
        return stat && stat.rate > 10; // 每分钟超过10个错误
      },
      alertLevel: AlertLevels.HIGH,
      channels: [AlertChannels.EMAIL, AlertChannels.SLACK],
      throttle: 5 * 60 * 1000 // 5分钟内最多告警一次
    });

    this.addRule('database_errors', {
      condition: (error) => error.type === 'DATABASE_ERROR',
      alertLevel: AlertLevels.HIGH,
      channels: [AlertChannels.EMAIL, AlertChannels.WEBHOOK],
      throttle: 2 * 60 * 1000 // 2分钟内最多告警一次
    });

    this.addRule('authentication_failures', {
      condition: (error, stats) => {
        const authErrors = stats['AUTHENTICATION_ERROR_medium'] || { count: 0 };
        return authErrors.count > 20; // 5分钟内超过20次认证失败
      },
      alertLevel: AlertLevels.MEDIUM,
      channels: [AlertChannels.EMAIL],
      throttle: 10 * 60 * 1000 // 10分钟内最多告警一次
    });
  }

  addRule(name, rule) {
    this.rules.set(name, {
      ...rule,
      lastTriggered: 0
    });
  }

  evaluateRules(error, stats = {}) {
    const alerts = [];
    const now = Date.now();

    for (const [name, rule] of this.rules) {
      try {
        // 检查条件
        if (!rule.condition(error, stats)) {
          continue;
        }

        // 检查节流
        if (now - rule.lastTriggered < rule.throttle) {
          continue;
        }

        // 创建告警
        const alert = this.createAlert(name, rule, error);
        alerts.push(alert);

        // 更新最后触发时间
        rule.lastTriggered = now;

      } catch (ruleError) {
        console.error(`告警规则评估失败 [${name}]:`, ruleError);
      }
    }

    return alerts;
  }

  createAlert(ruleName, rule, error) {
    return {
      id: `alert_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      rule: ruleName,
      level: rule.alertLevel,
      channels: rule.channels,
      title: this.generateAlertTitle(error),
      message: this.generateAlertMessage(error),
      severity: error.severity,
      type: error.type,
      timestamp: error.timestamp,
      details: {
        errorId: error.errorId,
        requestId: error.requestId,
        userId: error.userId,
        context: error.context
      }
    };
  }

  generateAlertTitle(error) {
    const severityEmoji = {
      [ErrorSeverity.CRITICAL]: '🚨',
      [ErrorSeverity.HIGH]: '⚠️',
      [ErrorSeverity.MEDIUM]: '⚡',
      [ErrorSeverity.LOW]: 'ℹ️'
    };

    return `${severityEmoji[error.severity] || '❗'} ${error.severity.toUpperCase()} - ${error.type}`;
  }

  generateAlertMessage(error) {
    return `错误信息: ${error.message}\n错误ID: ${error.errorId}\n发生时间: ${new Date(error.timestamp).toLocaleString()}`;
  }
}

/**
 * 错误监控系统
 */
class ErrorMonitoringSystem extends EventEmitter {
  constructor() {
    super();
    this.channels = new Map();
    this.ruleEngine = new AlertRuleEngine();
    this.isInitialized = false;
    this.alertHistory = [];
    this.maxHistorySize = 1000;
  }

  /**
   * 初始化监控系统
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      // 设置告警通道
      await this.setupAlertChannels();
      
      this.isInitialized = true;
      console.log('✅ 错误监控系统初始化完成');
      
    } catch (error) {
      console.error('❌ 错误监控系统初始化失败:', error);
      throw error;
    }
  }

  /**
   * 设置告警通道
   */
  async setupAlertChannels() {
    // 邮件通道
    const emailConfig = configCenter.get('monitoring.email');
    if (emailConfig && emailConfig.enabled) {
      this.channels.set(AlertChannels.EMAIL, new EmailAlertChannel(emailConfig));
    }

    // Webhook通道
    const webhookConfig = configCenter.get('monitoring.webhook');
    if (webhookConfig && webhookConfig.enabled) {
      this.channels.set(AlertChannels.WEBHOOK, new WebhookAlertChannel(webhookConfig));
    }

    // Slack通道
    const slackConfig = configCenter.get('monitoring.slack');
    if (slackConfig && slackConfig.enabled) {
      this.channels.set(AlertChannels.SLACK, new SlackAlertChannel(slackConfig));
    }

    // 钉钉通道
    const dingtalkConfig = configCenter.get('monitoring.dingtalk');
    if (dingtalkConfig && dingtalkConfig.enabled) {
      this.channels.set(AlertChannels.DINGTALK, new DingTalkAlertChannel(dingtalkConfig));
    }

  }

  /**
   * 记录错误并评估告警
   */
  async recordError(error, stats = {}) {
    try {
      // 评估告警规则
      const alerts = this.ruleEngine.evaluateRules(error, stats);
      
      // 发送告警
      for (const alert of alerts) {
        await this.sendAlert(alert);
      }
      
      // 触发事件
      this.emit('errorRecorded', { error, alerts });
      
    } catch (monitoringError) {
      console.error('错误监控记录失败:', monitoringError);
    }
  }

  /**
   * 发送告警
   */
  async sendAlert(alert) {
    try {
      // 记录告警历史
      this.addToHistory(alert);
      
      // 发送到指定通道
      const sendPromises = alert.channels.map(async (channelType) => {
        const channel = this.channels.get(channelType);
        if (channel) {
          await channel.send(alert);
        } else {
          console.warn(`告警通道未配置: ${channelType}`);
        }
      });
      
      await Promise.allSettled(sendPromises);
      
      this.emit('alertSent', alert);
      
    } catch (error) {
      console.error('发送告警失败:', error);
      this.emit('alertFailed', { alert, error });
    }
  }

  /**
   * 添加到告警历史
   */
  addToHistory(alert) {
    this.alertHistory.unshift({
      ...alert,
      sentAt: new Date().toISOString()
    });
    
    // 限制历史记录大小
    if (this.alertHistory.length > this.maxHistorySize) {
      this.alertHistory = this.alertHistory.slice(0, this.maxHistorySize);
    }
  }

  /**
   * 获取告警历史
   */
  getAlertHistory(limit = 50) {
    return this.alertHistory.slice(0, limit);
  }

  /**
   * 添加自定义告警规则
   */
  addAlertRule(name, rule) {
    this.ruleEngine.addRule(name, rule);
  }

  /**
   * 测试告警通道
   */
  async testAlertChannels() {
    const testAlert = {
      id: 'test_alert',
      title: '🧪 告警通道测试',
      message: '这是一个测试告警，用于验证告警通道配置是否正确。',
      severity: ErrorSeverity.LOW,
      type: 'TEST_ALERT',
      timestamp: new Date().toISOString(),
      details: {
        test: true
      }
    };

    const results = {};
    
    for (const [channelType, channel] of this.channels) {
      try {
        await channel.send(testAlert);
        results[channelType] = { success: true };
      } catch (error) {
        results[channelType] = { success: false, error: error.message };
      }
    }
    
    return results;
  }

  /**
   * 获取监控系统状态
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      channelsCount: this.channels.size,
      rulesCount: this.ruleEngine.rules.size,
      alertHistoryCount: this.alertHistory.length,
      channels: Array.from(this.channels.keys())
    };
  }
}

// 创建全局实例
const errorMonitoringSystem = new ErrorMonitoringSystem();

module.exports = {
  ErrorMonitoringSystem,
  AlertChannels,
  AlertLevels,
  EmailAlertChannel,
  WebhookAlertChannel,
  SlackAlertChannel,
  DingTalkAlertChannel,
  AlertRuleEngine,
  errorMonitoringSystem
};
