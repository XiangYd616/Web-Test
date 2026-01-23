/**
 * 错误监控告警系统
 * 实时监控错误并发送告警通知
 */

import crypto from 'crypto';
import { EventEmitter } from 'events';
import { configCenter } from '../config/ConfigCenter';
import { ErrorSeverity } from '../middleware/errorHandler';
import Logger from './logger';

interface AlertChannelConfig {
  enabled?: boolean;
  [key: string]: unknown;
}

interface Alert {
  id: string;
  rule: string;
  level: string;
  channels: string[];
  title: string;
  message: string;
  severity: string;
  type: string;
  timestamp: string;
  details: {
    errorId?: string;
    requestId?: string;
    userId?: string;
    context?: Record<string, unknown>;
    test?: boolean;
  };
  sentAt?: string;
}

type ErrorEvent = {
  severity: string;
  type: string;
  message: string;
  errorId?: string;
  requestId?: string;
  userId?: string;
  timestamp: string;
  details?: Record<string, unknown>;
  context?: Record<string, unknown>;
};

interface AlertRule {
  condition: (
    error: ErrorEvent,
    stats?: Record<string, { rate?: number; count?: number }>
  ) => boolean;
  alertLevel: string;
  channels: string[];
  throttle: number;
  lastTriggered?: number;
}

/**
 * 告警通道类型
 */
export const AlertChannels = {
  EMAIL: 'email',
  SMS: 'sms',
  WEBHOOK: 'webhook',
  SLACK: 'slack',
  DINGTALK: 'dingtalk',
} as const;

/**
 * 告警级别
 */
export const AlertLevels = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
} as const;

/**
 * 基础告警通道
 */
export class AlertChannel {
  protected name: string;

  protected config: AlertChannelConfig;

  protected enabled: boolean;

  protected rateLimiter: Map<string, { timestamps: number[] }> = new Map();

  constructor(name: string, config: AlertChannelConfig = {}) {
    this.name = name;
    this.config = config;
    this.enabled = config.enabled !== false;
  }

  async send(alert: Alert): Promise<void> {
    if (!this.enabled) return;

    if (this.isRateLimited(alert)) {
      return;
    }

    try {
      await this.doSend(alert);
      this.updateRateLimit(alert);
    } catch (error) {
      Logger.error(`告警发送失败 [${this.name}]`, error);
    }
  }

  async doSend(_alert: Alert): Promise<void> {
    throw new Error('doSend method must be implemented');
  }

  private isRateLimited(alert: Alert): boolean {
    const key = `${alert.type}_${alert.severity}`;
    const now = Date.now();
    const limit = this.rateLimiter.get(key);

    if (!limit) return false;

    const timeWindow = 5 * 60 * 1000;
    const maxCount = 3;

    const recentAlerts = limit.timestamps.filter(time => now - time < timeWindow);
    return recentAlerts.length >= maxCount;
  }

  private updateRateLimit(alert: Alert): void {
    const key = `${alert.type}_${alert.severity}`;
    const now = Date.now();

    if (!this.rateLimiter.has(key)) {
      this.rateLimiter.set(key, { timestamps: [] });
    }

    const limit = this.rateLimiter.get(key);
    if (!limit) return;
    limit.timestamps.push(now);

    const timeWindow = 5 * 60 * 1000;
    limit.timestamps = limit.timestamps.filter(time => now - time < timeWindow);
  }
}

/**
 * 邮件告警通道
 */
export class EmailAlertChannel extends AlertChannel {
  private smtpConfig: Record<string, unknown>;

  private recipients: string[];

  constructor(config: AlertChannelConfig) {
    super(AlertChannels.EMAIL, config);
    this.smtpConfig = (config.smtp as Record<string, unknown>) || {};
    this.recipients = (config.recipients as string[]) || [];
  }

  async doSend(_alert: Alert): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 100));
  }
}

/**
 * Webhook告警通道
 */
export class WebhookAlertChannel extends AlertChannel {
  private url?: string;

  private headers: Record<string, string>;

  private timeout: number;

  constructor(config: AlertChannelConfig) {
    super(AlertChannels.WEBHOOK, config);
    this.url = config.url as string | undefined;
    this.headers = (config.headers as Record<string, string>) || {};
    this.timeout = (config.timeout as number) || 5000;
  }

  async doSend(alert: Alert): Promise<void> {
    if (!this.url) return;

    const payload = {
      alert: {
        id: alert.id,
        title: alert.title,
        message: alert.message,
        severity: alert.severity,
        type: alert.type,
        timestamp: alert.timestamp,
        details: alert.details,
      },
      source: 'test-web-platform',
      environment: process.env.NODE_ENV || 'development',
    };

    const body = JSON.stringify(payload);
    await new Promise<void>((resolve, reject) => {
      const url = new URL(this.url as string);
      const request = (url.protocol === 'https:' ? require('https') : require('http')).request(
        {
          method: 'POST',
          hostname: url.hostname,
          port: url.port || (url.protocol === 'https:' ? 443 : 80),
          path: `${url.pathname}${url.search}`,
          headers: {
            'Content-Type': 'application/json',
            ...this.headers,
            'Content-Length': Buffer.byteLength(body),
          },
          timeout: this.timeout,
        },
        (response: { statusCode?: number; on: (event: string, cb: () => void) => void }) => {
          if (response.statusCode && response.statusCode >= 400) {
            reject(new Error(`Webhook响应错误: ${response.statusCode}`));
            return;
          }
          response.on('data', () => undefined);
          response.on('end', () => resolve());
        }
      );

      request.on('error', reject);
      request.write(body);
      request.end();
    });
  }
}

/**
 * Slack告警通道
 */
export class SlackAlertChannel extends AlertChannel {
  private webhookUrl?: string;

  private channel?: string;

  private username: string;

  constructor(config: AlertChannelConfig) {
    super(AlertChannels.SLACK, config);
    this.webhookUrl = config.webhookUrl as string | undefined;
    this.channel = config.channel as string | undefined;
    this.username = (config.username as string) || 'Test-Web Alert';
  }

  async doSend(alert: Alert): Promise<void> {
    if (!this.webhookUrl) return;

    const color = this.getSeverityColor(alert.severity);
    const payload = {
      channel: this.channel,
      username: this.username,
      attachments: [
        {
          color,
          title: alert.title,
          text: alert.message,
          fields: [
            { title: '严重程度', value: alert.severity, short: true },
            { title: '错误类型', value: alert.type, short: true },
            { title: '时间', value: new Date(alert.timestamp).toLocaleString(), short: true },
          ],
          footer: 'Test-Web Platform',
          ts: Math.floor(Date.now() / 1000),
        },
      ],
    };

    const body = JSON.stringify(payload);
    await new Promise<void>((resolve, reject) => {
      const url = new URL(this.webhookUrl as string);
      const request = require('https').request(
        {
          method: 'POST',
          hostname: url.hostname,
          port: url.port || 443,
          path: `${url.pathname}${url.search}`,
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body),
          },
        },
        (response: { statusCode?: number; on: (event: string, cb: () => void) => void }) => {
          if (response.statusCode && response.statusCode >= 400) {
            reject(new Error(`Slack告警发送失败: ${response.statusCode}`));
            return;
          }
          response.on('data', () => undefined);
          response.on('end', () => resolve());
        }
      );

      request.on('error', reject);
      request.write(body);
      request.end();
    });
  }

  private getSeverityColor(severity: string): string {
    const colors: Record<string, string> = {
      [ErrorSeverity.CRITICAL]: 'danger',
      [ErrorSeverity.HIGH]: 'warning',
      [ErrorSeverity.MEDIUM]: 'good',
      [ErrorSeverity.LOW]: '#36a64f',
    };
    return colors[severity] || 'good';
  }
}

/**
 * 钉钉告警通道
 */
export class DingTalkAlertChannel extends AlertChannel {
  private webhookUrl?: string;

  private secret?: string;

  constructor(config: AlertChannelConfig) {
    super(AlertChannels.DINGTALK, config);
    this.webhookUrl = config.webhookUrl as string | undefined;
    this.secret = config.secret as string | undefined;
  }

  async doSend(alert: Alert): Promise<void> {
    if (!this.webhookUrl) return;

    const timestamp = Date.now();
    const sign = this.generateSign(timestamp);

    const payload = {
      msgtype: 'markdown',
      markdown: {
        title: alert.title,
        text: this.formatMarkdownMessage(alert),
      },
    };

    const url = `${this.webhookUrl}&timestamp=${timestamp}&sign=${sign}`;

    const body = JSON.stringify(payload);
    await new Promise<void>((resolve, reject) => {
      const parsed = new URL(url);
      const request = require('https').request(
        {
          method: 'POST',
          hostname: parsed.hostname,
          port: parsed.port || 443,
          path: `${parsed.pathname}${parsed.search}`,
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body),
          },
        },
        (response: { statusCode?: number; on: (event: string, cb: () => void) => void }) => {
          if (response.statusCode && response.statusCode >= 400) {
            reject(new Error(`钉钉告警发送失败: ${response.statusCode}`));
            return;
          }
          response.on('data', () => undefined);
          response.on('end', () => resolve());
        }
      );

      request.on('error', reject);
      request.write(body);
      request.end();
    });
  }

  private generateSign(timestamp: number): string {
    if (!this.secret) return '';

    const stringToSign = `${timestamp}\n${this.secret}`;
    return encodeURIComponent(
      crypto.createHmac('sha256', this.secret).update(stringToSign).digest('base64')
    );
  }

  private formatMarkdownMessage(alert: Alert): string {
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
export class AlertRuleEngine {
  rules = new Map<string, AlertRule>();

  constructor() {
    this.loadDefaultRules();
  }

  loadDefaultRules(): void {
    this.addRule('critical_errors', {
      condition: error => error.severity === ErrorSeverity.CRITICAL,
      alertLevel: AlertLevels.CRITICAL,
      channels: [AlertChannels.EMAIL, AlertChannels.WEBHOOK, AlertChannels.SLACK],
      throttle: 0,
    });

    this.addRule('high_error_rate', {
      condition: (error, stats = {}) => {
        const key = `${error.type}_${error.severity}`;
        const stat = stats[key];
        return Boolean(stat && stat.rate && stat.rate > 10);
      },
      alertLevel: AlertLevels.HIGH,
      channels: [AlertChannels.EMAIL, AlertChannels.SLACK],
      throttle: 5 * 60 * 1000,
    });

    this.addRule('database_errors', {
      condition: error => error.type === 'DATABASE_ERROR',
      alertLevel: AlertLevels.HIGH,
      channels: [AlertChannels.EMAIL, AlertChannels.WEBHOOK],
      throttle: 2 * 60 * 1000,
    });

    this.addRule('authentication_failures', {
      condition: (_error, stats = {}) => {
        const authErrors = stats['AUTHENTICATION_ERROR_medium'] || { count: 0 };
        return (authErrors.count ?? 0) > 20;
      },
      alertLevel: AlertLevels.MEDIUM,
      channels: [AlertChannels.EMAIL],
      throttle: 10 * 60 * 1000,
    });
  }

  addRule(name: string, rule: AlertRule): void {
    this.rules.set(name, {
      ...rule,
      lastTriggered: 0,
    });
  }

  evaluateRules(
    error: ErrorEvent,
    stats: Record<string, { rate?: number; count?: number }> = {}
  ): Alert[] {
    const alerts: Alert[] = [];
    const now = Date.now();

    for (const [name, rule] of this.rules) {
      try {
        if (!rule.condition(error, stats)) {
          continue;
        }

        if (now - (rule.lastTriggered ?? 0) < rule.throttle) {
          continue;
        }

        const alert = this.createAlert(name, rule, error);
        alerts.push(alert);

        rule.lastTriggered = now;
      } catch (ruleError) {
        Logger.error(`告警规则评估失败 [${name}]`, ruleError);
      }
    }

    return alerts;
  }

  createAlert(ruleName: string, rule: AlertRule, error: ErrorEvent): Alert {
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
        context: error.context,
      },
    };
  }

  generateAlertTitle(error: ErrorEvent): string {
    const severityEmoji: Record<string, string> = {
      [ErrorSeverity.CRITICAL]: '🚨',
      [ErrorSeverity.HIGH]: '⚠️',
      [ErrorSeverity.MEDIUM]: '⚡',
      [ErrorSeverity.LOW]: 'ℹ️',
    };

    return `${severityEmoji[error.severity] || '❗'} ${error.severity.toUpperCase()} - ${error.type}`;
  }

  generateAlertMessage(error: ErrorEvent): string {
    return `错误信息: ${error.message}\n错误ID: ${error.errorId}\n发生时间: ${new Date(error.timestamp).toLocaleString()}`;
  }
}

/**
 * 错误监控系统
 */
export class ErrorMonitoringSystem extends EventEmitter {
  private channels = new Map<string, AlertChannel>();

  private ruleEngine = new AlertRuleEngine();

  private isInitialized = false;

  private alertHistory: Alert[] = [];

  private maxHistorySize = 1000;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await this.setupAlertChannels();

      this.isInitialized = true;
      Logger.system('error_monitoring_initialized', '错误监控系统初始化完成');
    } catch (error) {
      Logger.error('错误监控系统初始化失败', error);
      throw error;
    }
  }

  private async setupAlertChannels(): Promise<void> {
    const emailConfig = configCenter.get('monitoring.email') as AlertChannelConfig | undefined;
    if (emailConfig && emailConfig.enabled) {
      this.channels.set(AlertChannels.EMAIL, new EmailAlertChannel(emailConfig));
    }

    const webhookConfig = configCenter.get('monitoring.webhook') as AlertChannelConfig | undefined;
    if (webhookConfig && webhookConfig.enabled) {
      this.channels.set(AlertChannels.WEBHOOK, new WebhookAlertChannel(webhookConfig));
    }

    const slackConfig = configCenter.get('monitoring.slack') as AlertChannelConfig | undefined;
    if (slackConfig && slackConfig.enabled) {
      this.channels.set(AlertChannels.SLACK, new SlackAlertChannel(slackConfig));
    }

    const dingtalkConfig = configCenter.get('monitoring.dingtalk') as
      | AlertChannelConfig
      | undefined;
    if (dingtalkConfig && dingtalkConfig.enabled) {
      this.channels.set(AlertChannels.DINGTALK, new DingTalkAlertChannel(dingtalkConfig));
    }
  }

  async recordError(
    error: ErrorEvent,
    stats: Record<string, { rate?: number; count?: number }> = {}
  ): Promise<void> {
    try {
      const alerts = this.ruleEngine.evaluateRules(error, stats);

      for (const alert of alerts) {
        await this.sendAlert(alert);
      }

      this.emit('errorRecorded', { error, alerts });
    } catch (monitoringError) {
      Logger.error('错误监控记录失败', monitoringError);
    }
  }

  private async sendAlert(alert: Alert): Promise<void> {
    try {
      this.addToHistory(alert);

      const sendPromises = alert.channels.map(async channelType => {
        const channel = this.channels.get(channelType);
        if (channel) {
          await channel.send(alert);
        } else {
          Logger.warn('告警通道未配置', { channelType });
        }
      });

      await Promise.allSettled(sendPromises);

      this.emit('alertSent', alert);
    } catch (error) {
      Logger.error('发送告警失败', error);
      this.emit('alertFailed', { alert, error });
    }
  }

  private addToHistory(alert: Alert): void {
    this.alertHistory.unshift({
      ...alert,
      sentAt: new Date().toISOString(),
    });

    if (this.alertHistory.length > this.maxHistorySize) {
      this.alertHistory = this.alertHistory.slice(0, this.maxHistorySize);
    }
  }

  getAlertHistory(limit = 50): Alert[] {
    return this.alertHistory.slice(0, limit);
  }

  addAlertRule(name: string, rule: AlertRule): void {
    this.ruleEngine.addRule(name, rule);
  }

  async testAlertChannels(): Promise<Record<string, { success: boolean; error?: string }>> {
    const testAlert: Alert = {
      id: 'test_alert',
      rule: 'manual',
      level: AlertLevels.LOW,
      channels: [],
      title: '🧪 告警通道测试',
      message: '这是一个测试告警，用于验证告警通道配置是否正确。',
      severity: ErrorSeverity.LOW,
      type: 'TEST_ALERT',
      timestamp: new Date().toISOString(),
      details: {
        test: true,
      },
    };

    const results: Record<string, { success: boolean; error?: string }> = {};

    for (const [channelType, channel] of this.channels) {
      try {
        await channel.send(testAlert);
        results[channelType] = { success: true };
      } catch (error) {
        results[channelType] = { success: false, error: (error as Error).message };
      }
    }

    return results;
  }

  getStatus(): Record<string, unknown> {
    return {
      initialized: this.isInitialized,
      channelsCount: this.channels.size,
      rulesCount: this.ruleEngine.rules.size,
      alertHistoryCount: this.alertHistory.length,
      channels: Array.from(this.channels.keys()),
    };
  }
}

// 创建全局实例
export const errorMonitoringSystem = new ErrorMonitoringSystem();

// 兼容 CommonJS require
module.exports = {
  ErrorMonitoringSystem,
  AlertChannels,
  AlertLevels,
  EmailAlertChannel,
  WebhookAlertChannel,
  SlackAlertChannel,
  DingTalkAlertChannel,
  AlertRuleEngine,
  errorMonitoringSystem,
};
