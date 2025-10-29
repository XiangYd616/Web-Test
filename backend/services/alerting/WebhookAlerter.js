const axios = require('axios');
const crypto = require('crypto');
const logger = require('../../utils/logger');

/**
 * Webhook告警服务
 * 负责发送Webhook通知到外部系统
 */
class WebhookAlerter {
  constructor(config = {}) {
    this.config = {
      timeout: config.timeout || 10000, // 10秒超时
      retryAttempts: config.retryAttempts || 3,
      retryDelay: config.retryDelay || 1000,
      signatureHeader: config.signatureHeader || 'X-Webhook-Signature',
      signatureAlgorithm: config.signatureAlgorithm || 'sha256',
      maxPayloadSize: config.maxPayloadSize || 1024 * 1024, // 1MB
      verifySSL: config.verifySSL !== false
    };

    this.webhooks = new Map(); // 存储webhook配置
  }

  /**
   * 注册webhook端点
   * @param {string} id - Webhook ID
   * @param {Object} webhook - Webhook配置
   */
  registerWebhook(id, webhook) {
    if (!webhook.url) {
      throw new Error('Webhook URL is required');
    }

    this.webhooks.set(id, {
      url: webhook.url,
      method: webhook.method || 'POST',
      headers: webhook.headers || {},
      secret: webhook.secret, // 用于签名
      enabled: webhook.enabled !== false,
      events: webhook.events || ['*'], // 监听的事件类型
      metadata: webhook.metadata || {}
    });

    logger.info(`Webhook registered: ${id} -> ${webhook.url}`);
  }

  /**
   * 移除webhook端点
   * @param {string} id - Webhook ID
   */
  unregisterWebhook(id) {
    const removed = this.webhooks.delete(id);
    if (removed) {
      logger.info(`Webhook unregistered: ${id}`);
    }
    return removed;
  }

  /**
   * 发送告警到webhook
   * @param {string} webhookId - Webhook ID
   * @param {Object} alert - 告警信息
   * @param {string} eventType - 事件类型
   * @returns {Promise<Object>} 发送结果
   */
  async sendAlert(webhookId, alert, eventType = 'alert.triggered') {
    const webhook = this.webhooks.get(webhookId);

    if (!webhook) {
      logger.warn(`Webhook not found: ${webhookId}`);
      return { success: false, error: 'Webhook not found' };
    }

    if (!webhook.enabled) {
      logger.debug(`Webhook disabled: ${webhookId}`);
      return { success: false, error: 'Webhook disabled' };
    }

    // 检查事件类型是否匹配
    if (!this.shouldSendEvent(webhook, eventType)) {
      logger.debug(`Event type ${eventType} not in webhook's event list`);
      return { success: false, error: 'Event type not subscribed' };
    }

    const payload = this.buildPayload(alert, eventType, webhook.metadata);
    
    // 检查payload大小
    const payloadSize = JSON.stringify(payload).length;
    if (payloadSize > this.config.maxPayloadSize) {
      logger.error(`Payload too large: ${payloadSize} bytes`);
      return { success: false, error: 'Payload too large' };
    }

    // 带重试的发送
    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const result = await this.sendRequest(webhook, payload);
        
        logger.info(`Webhook sent successfully (attempt ${attempt}):`, {
          webhookId,
          url: webhook.url,
          status: result.status,
          alertId: alert.id
        });

        return {
          success: true,
          webhookId,
          status: result.status,
          attempt,
          response: result.data
        };
      } catch (error) {
        logger.error(`Failed to send webhook (attempt ${attempt}/${this.config.retryAttempts}):`, {
          webhookId,
          error: error.message
        });

        if (attempt < this.config.retryAttempts) {
          // 指数退避
          const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
          await this.sleep(delay);
        } else {
          return {
            success: false,
            webhookId,
            error: error.message,
            attempts: attempt
          };
        }
      }
    }
  }

  /**
   * 发送HTTP请求
   * @param {Object} webhook - Webhook配置
   * @param {Object} payload - 请求数据
   * @returns {Promise<Object>} 响应结果
   */
  async sendRequest(webhook, payload) {
    const headers = { ...webhook.headers };
    headers['Content-Type'] = 'application/json';
    headers['User-Agent'] = 'Test-Web-Alerting/1.0';

    // 添加签名
    if (webhook.secret) {
      const signature = this.generateSignature(payload, webhook.secret);
      headers[this.config.signatureHeader] = signature;
    }

    const requestConfig = {
      method: webhook.method,
      url: webhook.url,
      data: payload,
      headers,
      timeout: this.config.timeout,
      httpsAgent: this.config.verifySSL ? undefined : new (require('https').Agent)({
        rejectUnauthorized: false
      })
    };

    const response = await axios(requestConfig);
    return response;
  }

  /**
   * 构建webhook payload
   * @param {Object} alert - 告警信息
   * @param {string} eventType - 事件类型
   * @param {Object} metadata - 额外元数据
   * @returns {Object} Webhook payload
   */
  buildPayload(alert, eventType, metadata = {}) {
    return {
      event: eventType,
      timestamp: new Date().toISOString(),
      alert: {
        id: alert.id,
        ruleName: alert.ruleName,
        ruleId: alert.ruleId,
        severity: alert.severity,
        description: alert.description,
        metric: {
          name: alert.metricName,
          currentValue: alert.currentValue,
          threshold: alert.threshold
        },
        condition: alert.condition,
        triggeredAt: alert.triggeredAt,
        message: alert.message,
        tags: alert.tags || [],
        context: alert.context || {}
      },
      metadata: {
        ...metadata,
        source: 'test-web-backend',
        version: '1.0'
      }
    };
  }

  /**
   * 生成payload签名
   * @param {Object} payload - 数据
   * @param {string} secret - 密钥
   * @returns {string} 签名
   */
  generateSignature(payload, secret) {
    const payloadString = JSON.stringify(payload);
    const hmac = crypto.createHmac(this.config.signatureAlgorithm, secret);
    hmac.update(payloadString);
    return `${this.config.signatureAlgorithm}=${hmac.digest('hex')}`;
  }

  /**
   * 验证webhook签名
   * @param {Object} payload - 数据
   * @param {string} signature - 签名
   * @param {string} secret - 密钥
   * @returns {boolean} 验证结果
   */
  verifySignature(payload, signature, secret) {
    const expectedSignature = this.generateSignature(payload, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * 检查是否应该发送事件
   * @param {Object} webhook - Webhook配置
   * @param {string} eventType - 事件类型
   * @returns {boolean}
   */
  shouldSendEvent(webhook, eventType) {
    if (webhook.events.includes('*')) {
      return true;
    }
    return webhook.events.includes(eventType);
  }

  /**
   * 批量发送告警到多个webhook
   * @param {Array<string>} webhookIds - Webhook ID列表
   * @param {Object} alert - 告警信息
   * @param {string} eventType - 事件类型
   * @returns {Promise<Array>} 发送结果列表
   */
  async sendToMultipleWebhooks(webhookIds, alert, eventType = 'alert.triggered') {
    const results = await Promise.allSettled(
      webhookIds.map(id => this.sendAlert(id, alert, eventType))
    );

    return results.map((result, index) => ({
      webhookId: webhookIds[index],
      success: result.status === 'fulfilled' && result.value.success,
      result: result.status === 'fulfilled' ? result.value : { error: result.reason.message }
    }));
  }

  /**
   * 发送测试webhook
   * @param {string} webhookId - Webhook ID
   * @returns {Promise<Object>} 发送结果
   */
  async sendTestWebhook(webhookId) {
    const testAlert = {
      id: 'test-' + Date.now(),
      ruleId: 'test-rule',
      ruleName: 'Test Alert',
      description: 'This is a test webhook to verify the integration is working correctly.',
      severity: 'low',
      metricName: 'test.metric',
      currentValue: 100,
      threshold: 90,
      triggeredAt: new Date().toISOString(),
      condition: 'test.metric > 90',
      message: 'This is a test alert message.',
      tags: ['test'],
      context: {
        testMode: true
      }
    };

    return this.sendAlert(webhookId, testAlert, 'alert.test');
  }

  /**
   * 获取webhook配置
   * @param {string} webhookId - Webhook ID
   * @returns {Object|null} Webhook配置
   */
  getWebhook(webhookId) {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook) {
      return null;
    }

    // 返回副本，隐藏secret
    return {
      url: webhook.url,
      method: webhook.method,
      enabled: webhook.enabled,
      events: webhook.events,
      metadata: webhook.metadata,
      hasSecret: !!webhook.secret
    };
  }

  /**
   * 获取所有webhook配置
   * @returns {Array} Webhook列表
   */
  getAllWebhooks() {
    const webhooks = [];
    for (const [id, webhook] of this.webhooks) {
      webhooks.push({
        id,
        ...this.getWebhook(id)
      });
    }
    return webhooks;
  }

  /**
   * 更新webhook配置
   * @param {string} webhookId - Webhook ID
   * @param {Object} updates - 更新内容
   * @returns {boolean} 是否更新成功
   */
  updateWebhook(webhookId, updates) {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook) {
      return false;
    }

    // 允许更新的字段
    const allowedUpdates = ['url', 'method', 'headers', 'secret', 'enabled', 'events', 'metadata'];
    for (const key of allowedUpdates) {
      if (updates[key] !== undefined) {
        webhook[key] = updates[key];
      }
    }

    this.webhooks.set(webhookId, webhook);
    logger.info(`Webhook updated: ${webhookId}`);
    return true;
  }

  /**
   * 启用/禁用webhook
   * @param {string} webhookId - Webhook ID
   * @param {boolean} enabled - 启用状态
   * @returns {boolean} 是否操作成功
   */
  setWebhookEnabled(webhookId, enabled) {
    return this.updateWebhook(webhookId, { enabled });
  }

  /**
   * 批量发送不同事件到webhook
   * @param {string} webhookId - Webhook ID
   * @param {Array<Object>} events - 事件列表 [{alert, eventType}, ...]
   * @returns {Promise<Array>} 发送结果列表
   */
  async sendBulkEvents(webhookId, events) {
    const results = [];
    
    for (const event of events) {
      const result = await this.sendAlert(webhookId, event.alert, event.eventType);
      results.push({
        eventType: event.eventType,
        alertId: event.alert.id,
        ...result
      });
    }
    
    return results;
  }

  /**
   * 发送告警恢复通知
   * @param {string} webhookId - Webhook ID
   * @param {Object} alert - 告警信息
   * @returns {Promise<Object>} 发送结果
   */
  async sendAlertResolved(webhookId, alert) {
    const resolvedAlert = {
      ...alert,
      resolvedAt: new Date().toISOString(),
      status: 'resolved'
    };

    return this.sendAlert(webhookId, resolvedAlert, 'alert.resolved');
  }

  /**
   * 发送告警升级通知
   * @param {string} webhookId - Webhook ID
   * @param {Object} alert - 告警信息
   * @param {string} oldSeverity - 原严重等级
   * @param {string} newSeverity - 新严重等级
   * @returns {Promise<Object>} 发送结果
   */
  async sendAlertEscalated(webhookId, alert, oldSeverity, newSeverity) {
    const escalatedAlert = {
      ...alert,
      oldSeverity,
      newSeverity,
      severity: newSeverity,
      escalatedAt: new Date().toISOString()
    };

    return this.sendAlert(webhookId, escalatedAlert, 'alert.escalated');
  }

  /**
   * 获取webhook统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    const webhooks = Array.from(this.webhooks.values());
    return {
      total: webhooks.length,
      enabled: webhooks.filter(w => w.enabled).length,
      disabled: webhooks.filter(w => !w.enabled).length,
      byEvents: this.groupWebhooksByEvents(webhooks)
    };
  }

  /**
   * 按事件类型分组webhook
   * @param {Array} webhooks - Webhook列表
   * @returns {Object} 分组结果
   */
  groupWebhooksByEvents(webhooks) {
    const grouped = {};
    for (const webhook of webhooks) {
      for (const event of webhook.events) {
        if (!grouped[event]) {
          grouped[event] = 0;
        }
        grouped[event]++;
      }
    }
    return grouped;
  }

  /**
   * 清理所有webhook
   */
  clear() {
    this.webhooks.clear();
    logger.info('All webhooks cleared');
  }

  /**
   * 睡眠函数
   * @param {number} ms - 毫秒数
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取服务状态
   * @returns {Object} 状态信息
   */
  getStatus() {
    return {
      webhookCount: this.webhooks.size,
      enabledCount: Array.from(this.webhooks.values()).filter(w => w.enabled).length,
      config: {
        timeout: this.config.timeout,
        retryAttempts: this.config.retryAttempts,
        maxPayloadSize: this.config.maxPayloadSize,
        verifySSL: this.config.verifySSL
      }
    };
  }
}

// 导出单例
let instance = null;

module.exports = {
  WebhookAlerter,
  getInstance: (config) => {
    if (!instance) {
      instance = new WebhookAlerter(config);
    }
    return instance;
  },
  resetInstance: () => {
    if (instance) {
      instance.clear();
      instance = null;
    }
  }
};

