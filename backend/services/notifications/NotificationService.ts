import https from 'https';
import { sendEmail } from '../email/emailService';

const Logger = require('../../utils/logger');

type AlertPayload = {
  alertId: string;
  type: string;
  severity: string;
  timestamp: Date;
  data: Record<string, unknown> & { message?: string };
};

type NotificationChannel = 'email' | 'slack' | 'sms';

type NotificationTargets = {
  email?: string | string[];
  slackWebhook?: string;
  sms?: string | string[];
  slackChannel?: string;
};

const DEFAULT_CHANNELS = (process.env.ALERT_CHANNELS || 'email')
  .split(',')
  .map(item => item.trim())
  .filter(Boolean) as NotificationChannel[];

class NotificationService {
  private resolveChannels(alert: AlertPayload): NotificationChannel[] {
    const channelsFromAlert = alert.data?.channels as string[] | undefined;
    if (Array.isArray(channelsFromAlert) && channelsFromAlert.length > 0) {
      return channelsFromAlert.filter(Boolean) as NotificationChannel[];
    }
    return DEFAULT_CHANNELS.length > 0 ? DEFAULT_CHANNELS : ['email'];
  }

  private resolveTargets(alert: AlertPayload): NotificationTargets {
    return {
      email:
        (alert.data?.email as string | string[] | undefined) ||
        process.env.ALERT_EMAIL_TO ||
        process.env.ADMIN_EMAIL,
      slackWebhook:
        (alert.data?.slackWebhook as string | undefined) || process.env.SLACK_WEBHOOK_URL,
      sms: (alert.data?.phone as string | string[] | undefined) || process.env.ALERT_SMS_TO,
      slackChannel: (alert.data?.slackChannel as string | undefined) || process.env.SLACK_CHANNEL,
    };
  }

  async sendAlert(alert: AlertPayload): Promise<void> {
    const channels = this.resolveChannels(alert);
    const targets = this.resolveTargets(alert);
    await Promise.allSettled(
      channels.map(channel => this.dispatchChannel(channel, alert, targets))
    );
  }

  private async dispatchChannel(
    channel: NotificationChannel,
    alert: AlertPayload,
    targets: NotificationTargets
  ) {
    switch (channel) {
      case 'email':
        return this.sendEmailAlert(alert, targets.email);
      case 'slack':
        return this.sendSlackAlert(alert, targets.slackWebhook, targets.slackChannel);
      case 'sms':
        return this.sendSmsAlert(alert, targets.sms);
      default:
        return undefined;
    }
  }

  private async sendEmailAlert(alert: AlertPayload, to?: string | string[]) {
    if (!to) {
      Logger.warn('告警邮件接收人未配置', { alertId: alert.alertId });
      return;
    }
    const subject = `【${alert.severity.toUpperCase()}】${alert.type}告警`;
    const message = alert.data?.message || '检测到新的系统告警';

    await sendEmail({
      to,
      subject,
      template: 'default',
      data: {
        username: '管理员',
        message: `${message}（告警ID：${alert.alertId}）`,
      },
    });
  }

  private async sendSlackAlert(
    alert: AlertPayload,
    webhook?: string,
    channel?: string
  ): Promise<void> {
    if (!webhook) {
      Logger.warn('Slack Webhook 未配置，跳过Slack通知', { alertId: alert.alertId });
      return;
    }

    const payload = {
      channel,
      username: 'Test-Web Alert',
      text: `*${alert.type}* (${alert.severity})\n${alert.data?.message || ''}`,
      attachments: [
        {
          color:
            alert.severity === 'critical'
              ? 'danger'
              : alert.severity === 'high'
                ? 'warning'
                : 'good',
          fields: [
            { title: '告警ID', value: alert.alertId, short: true },
            { title: '时间', value: alert.timestamp.toISOString(), short: true },
          ],
        },
      ],
    };

    const body = JSON.stringify(payload);
    await new Promise<void>((resolve, reject) => {
      const url = new URL(webhook);
      const request = https.request(
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
        response => {
          if (response.statusCode && response.statusCode >= 400) {
            reject(new Error(`Slack通知失败: ${response.statusCode}`));
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

  private async sendSmsAlert(alert: AlertPayload, to?: string | string[]) {
    if (!to) {
      Logger.warn('SMS接收人未配置，跳过短信通知', { alertId: alert.alertId });
      return;
    }

    const message = `${alert.type}(${alert.severity}): ${alert.data?.message || ''}`;
    const recipients = Array.isArray(to) ? to : [to];

    const smsEndpoint = process.env.SMS_WEBHOOK_URL;
    if (!smsEndpoint) {
      Logger.warn('SMS发送服务未配置，跳过短信通知', { alertId: alert.alertId });
      return;
    }

    const body = JSON.stringify({
      to: recipients,
      message,
      alertId: alert.alertId,
    });

    await new Promise<void>((resolve, reject) => {
      const url = new URL(smsEndpoint);
      const request = https.request(
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
        response => {
          if (response.statusCode && response.statusCode >= 400) {
            reject(new Error(`短信通知失败: ${response.statusCode}`));
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

const notificationService = new NotificationService();

export { NotificationService, notificationService };

module.exports = {
  NotificationService,
  notificationService,
};
