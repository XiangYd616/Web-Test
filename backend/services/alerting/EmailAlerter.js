const nodemailer = require('nodemailer');
const logger = require('../../utils/logger');

/**
 * 邮件告警服务
 * 负责发送告警邮件通知
 */
class EmailAlerter {
  constructor(config = {}) {
    this.config = {
      host: process.env.SMTP_HOST || config.host || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || config.port || 587,
      secure: process.env.SMTP_SECURE === 'true' || config.secure || false,
      auth: {
        user: process.env.SMTP_USER || config.user,
        pass: process.env.SMTP_PASSWORD || config.password
      },
      from: process.env.SMTP_FROM || config.from || 'noreply@test-web.com',
      timeout: config.timeout || 10000, // 10秒超时
      retryAttempts: config.retryAttempts || 3,
      retryDelay: config.retryDelay || 1000
    };

    this.transporter = null;
    this.isInitialized = false;
  }

  /**
   * 初始化邮件传输器
   */
  async initialize() {
    try {
      if (!this.config.auth.user || !this.config.auth.pass) {
        logger.warn('SMTP credentials not configured, EmailAlerter will not send emails');
        this.isInitialized = false;
        return false;
      }

      this.transporter = nodemailer.createTransport({
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure,
        auth: this.config.auth,
        timeout: this.config.timeout
      });

      // 验证连接
      await this.transporter.verify();
      this.isInitialized = true;
      logger.info('EmailAlerter initialized successfully');
      return true;
    } catch (error) {
      logger.error('Failed to initialize EmailAlerter:', error);
      this.isInitialized = false;
      return false;
    }
  }

  /**
   * 发送告警邮件
   * @param {Object} alert - 告警信息
   * @param {Array<string>} recipients - 收件人列表
   * @returns {Promise<Object>} 发送结果
   */
  async sendAlert(alert, recipients) {
    if (!this.isInitialized) {
      logger.warn('EmailAlerter not initialized, skipping email send');
      return { success: false, error: 'Not initialized' };
    }

    if (!recipients || recipients.length === 0) {
      logger.warn('No recipients provided for alert email');
      return { success: false, error: 'No recipients' };
    }

    const mailOptions = {
      from: this.config.from,
      to: recipients.join(', '),
      subject: this.generateSubject(alert),
      html: this.generateHtmlBody(alert),
      text: this.generateTextBody(alert)
    };

    // 带重试的发送
    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const info = await this.transporter.sendMail(mailOptions);
        logger.info(`Alert email sent successfully (attempt ${attempt}):`, {
          messageId: info.messageId,
          recipients,
          alertId: alert.id
        });
        
        return {
          success: true,
          messageId: info.messageId,
          attempt,
          recipients
        };
      } catch (error) {
        logger.error(`Failed to send alert email (attempt ${attempt}/${this.config.retryAttempts}):`, error);
        
        if (attempt < this.config.retryAttempts) {
          // 指数退避
          const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
          await this.sleep(delay);
        } else {
          return {
            success: false,
            error: error.message,
            attempts: attempt
          };
        }
      }
    }
  }

  /**
   * 生成邮件主题
   * @param {Object} alert - 告警信息
   * @returns {string} 邮件主题
   */
  generateSubject(alert) {
    const severityEmoji = {
      low: '⚠️',
      medium: '⚠️',
      high: '🔴',
      critical: '🚨'
    };

    const emoji = severityEmoji[alert.severity] || '⚠️';
    return `${emoji} [${alert.severity.toUpperCase()}] ${alert.ruleName}`;
  }

  /**
   * 生成HTML邮件正文
   * @param {Object} alert - 告警信息
   * @returns {string} HTML内容
   */
  generateHtmlBody(alert) {
    const severityColor = {
      low: '#fbbf24',
      medium: '#fb923c',
      high: '#f87171',
      critical: '#dc2626'
    };

    const color = severityColor[alert.severity] || '#6b7280';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .container {
      background: #ffffff;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .header {
      background: ${color};
      color: white;
      padding: 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
    }
    .content {
      padding: 30px;
    }
    .alert-info {
      background: #f9fafb;
      border-left: 4px solid ${color};
      padding: 15px;
      margin: 20px 0;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .info-row:last-child {
      border-bottom: none;
    }
    .label {
      font-weight: 600;
      color: #6b7280;
    }
    .value {
      color: #111827;
    }
    .condition {
      background: #fef3c7;
      padding: 10px;
      border-radius: 4px;
      margin: 15px 0;
      font-family: 'Courier New', monospace;
      font-size: 14px;
    }
    .footer {
      background: #f9fafb;
      padding: 20px;
      text-align: center;
      color: #6b7280;
      font-size: 14px;
    }
    .button {
      display: inline-block;
      background: ${color};
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚠️ Alert Triggered</h1>
    </div>
    
    <div class="content">
      <h2>${alert.ruleName}</h2>
      <p>${alert.description || 'An alert condition has been triggered.'}</p>
      
      <div class="alert-info">
        <div class="info-row">
          <span class="label">Severity:</span>
          <span class="value" style="color: ${color}; font-weight: 600;">${alert.severity.toUpperCase()}</span>
        </div>
        <div class="info-row">
          <span class="label">Metric:</span>
          <span class="value">${alert.metricName}</span>
        </div>
        <div class="info-row">
          <span class="label">Current Value:</span>
          <span class="value">${alert.currentValue}</span>
        </div>
        <div class="info-row">
          <span class="label">Threshold:</span>
          <span class="value">${alert.threshold}</span>
        </div>
        <div class="info-row">
          <span class="label">Triggered At:</span>
          <span class="value">${new Date(alert.triggeredAt).toLocaleString()}</span>
        </div>
      </div>
      
      ${alert.condition ? `
      <div class="condition">
        <strong>Condition:</strong> ${alert.condition}
      </div>
      ` : ''}
      
      ${alert.message ? `
      <div style="margin: 20px 0;">
        <strong>Message:</strong>
        <p>${alert.message}</p>
      </div>
      ` : ''}
      
      ${alert.dashboardUrl ? `
      <div style="text-align: center;">
        <a href="${alert.dashboardUrl}" class="button">View Dashboard</a>
      </div>
      ` : ''}
    </div>
    
    <div class="footer">
      <p>This is an automated alert from Test-Web Monitoring System</p>
      <p>Alert ID: ${alert.id || 'N/A'}</p>
      <p>${new Date().toLocaleString()}</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * 生成纯文本邮件正文
   * @param {Object} alert - 告警信息
   * @returns {string} 纯文本内容
   */
  generateTextBody(alert) {
    return `
ALERT TRIGGERED
===============

Rule: ${alert.ruleName}
Severity: ${alert.severity.toUpperCase()}
${alert.description ? `Description: ${alert.description}` : ''}

Alert Details:
--------------
Metric: ${alert.metricName}
Current Value: ${alert.currentValue}
Threshold: ${alert.threshold}
Triggered At: ${new Date(alert.triggeredAt).toLocaleString()}

${alert.condition ? `Condition: ${alert.condition}\n` : ''}
${alert.message ? `Message: ${alert.message}\n` : ''}
${alert.dashboardUrl ? `Dashboard: ${alert.dashboardUrl}\n` : ''}

---
This is an automated alert from Test-Web Monitoring System
Alert ID: ${alert.id || 'N/A'}
${new Date().toLocaleString()}
    `;
  }

  /**
   * 发送测试邮件
   * @param {string} recipient - 收件人
   * @returns {Promise<Object>} 发送结果
   */
  async sendTestEmail(recipient) {
    const testAlert = {
      id: 'test-' + Date.now(),
      ruleName: 'Test Alert',
      description: 'This is a test email to verify email alerting is working correctly.',
      severity: 'low',
      metricName: 'test.metric',
      currentValue: 100,
      threshold: 90,
      triggeredAt: new Date().toISOString(),
      condition: 'test.metric > 90',
      message: 'This is a test alert message.'
    };

    return this.sendAlert(testAlert, [recipient]);
  }

  /**
   * 批量发送告警
   * @param {Array<Object>} alerts - 告警列表
   * @param {Array<string>} recipients - 收件人列表
   * @returns {Promise<Array>} 发送结果列表
   */
  async sendBulkAlerts(alerts, recipients) {
    const results = [];
    
    for (const alert of alerts) {
      const result = await this.sendAlert(alert, recipients);
      results.push({
        alertId: alert.id,
        ...result
      });
    }
    
    return results;
  }

  /**
   * 发送告警摘要邮件
   * @param {Array<Object>} alerts - 告警列表
   * @param {Array<string>} recipients - 收件人列表
   * @param {string} period - 时间周期 (e.g., 'last 24 hours')
   * @returns {Promise<Object>} 发送结果
   */
  async sendAlertSummary(alerts, recipients, period = 'last 24 hours') {
    if (!this.isInitialized) {
      return { success: false, error: 'Not initialized' };
    }

    const summary = this.generateSummary(alerts, period);
    const mailOptions = {
      from: this.config.from,
      to: recipients.join(', '),
      subject: `📊 Alert Summary - ${period}`,
      html: this.generateSummaryHtml(summary, period),
      text: this.generateSummaryText(summary, period)
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      logger.info('Alert summary email sent successfully:', {
        messageId: info.messageId,
        recipients,
        alertCount: alerts.length
      });
      
      return {
        success: true,
        messageId: info.messageId,
        recipients
      };
    } catch (error) {
      logger.error('Failed to send alert summary email:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 生成告警摘要
   * @param {Array<Object>} alerts - 告警列表
   * @param {string} period - 时间周期
   * @returns {Object} 摘要数据
   */
  generateSummary(alerts, period) {
    const bySeverity = {
      critical: [],
      high: [],
      medium: [],
      low: []
    };

    alerts.forEach(alert => {
      const severity = alert.severity || 'low';
      if (bySeverity[severity]) {
        bySeverity[severity].push(alert);
      }
    });

    return {
      total: alerts.length,
      bySeverity,
      period,
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * 生成摘要HTML
   * @param {Object} summary - 摘要数据
   * @param {string} period - 时间周期
   * @returns {string} HTML内容
   */
  generateSummaryHtml(summary, period) {
    const severityColors = {
      critical: '#dc2626',
      high: '#f87171',
      medium: '#fb923c',
      low: '#fbbf24'
    };

    let alertsHtml = '';
    ['critical', 'high', 'medium', 'low'].forEach(severity => {
      const alerts = summary.bySeverity[severity];
      if (alerts.length > 0) {
        alertsHtml += `
        <div style="margin: 20px 0;">
          <h3 style="color: ${severityColors[severity]};">${severity.toUpperCase()} (${alerts.length})</h3>
          <ul>
            ${alerts.map(alert => `<li>${alert.ruleName} - ${alert.metricName}</li>`).join('')}
          </ul>
        </div>
        `;
      }
    });

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #3b82f6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
    .footer { background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; border-radius: 0 0 8px 8px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>📊 Alert Summary</h1>
    <p>${period}</p>
  </div>
  <div class="content">
    <h2>Total Alerts: ${summary.total}</h2>
    ${alertsHtml}
  </div>
  <div class="footer">
    <p>Generated at ${new Date(summary.generatedAt).toLocaleString()}</p>
  </div>
</body>
</html>
    `;
  }

  /**
   * 生成摘要纯文本
   * @param {Object} summary - 摘要数据
   * @param {string} period - 时间周期
   * @returns {string} 纯文本内容
   */
  generateSummaryText(summary, period) {
    let text = `ALERT SUMMARY - ${period}\n`;
    text += `================\n\n`;
    text += `Total Alerts: ${summary.total}\n\n`;

    ['critical', 'high', 'medium', 'low'].forEach(severity => {
      const alerts = summary.bySeverity[severity];
      if (alerts.length > 0) {
        text += `${severity.toUpperCase()} (${alerts.length}):\n`;
        alerts.forEach(alert => {
          text += `  - ${alert.ruleName} - ${alert.metricName}\n`;
        });
        text += `\n`;
      }
    });

    text += `\nGenerated at ${new Date(summary.generatedAt).toLocaleString()}`;
    return text;
  }

  /**
   * 关闭邮件传输器
   */
  async close() {
    if (this.transporter) {
      this.transporter.close();
      this.isInitialized = false;
      logger.info('EmailAlerter closed');
    }
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
      initialized: this.isInitialized,
      config: {
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure,
        from: this.config.from,
        hasCredentials: !!(this.config.auth.user && this.config.auth.pass)
      }
    };
  }
}

// 导出单例
let instance = null;

module.exports = {
  EmailAlerter,
  getInstance: (config) => {
    if (!instance) {
      instance = new EmailAlerter(config);
    }
    return instance;
  },
  resetInstance: () => {
    if (instance) {
      instance.close();
      instance = null;
    }
  }
};

