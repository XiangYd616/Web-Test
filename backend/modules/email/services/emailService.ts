/**
 * 邮件发送服务
 * 统一封装SMTP发送逻辑与模板渲染
 */

import * as fs from 'fs/promises';
import type { SentMessageInfo, Transporter } from 'nodemailer';
import nodemailer from 'nodemailer';
import path from 'path';
import Logger from '../../utils/logger';

type MailerConfig = {
  host?: string;
  port: number;
  secure: boolean;
  auth: {
    user?: string;
    pass?: string;
  };
  from: {
    address: string;
    name: string;
  };
};

type TemplateData = {
  username?: string;
  resetUrl?: string;
  expiryHours?: number;
  verificationUrl?: string;
  code?: string;
  expiryMinutes?: number;
  appName?: string;
  daysUntilExpiry?: number;
  message?: string;
  lockedUntil?: string;
  supportEmail?: string;
  changePasswordUrl?: string;
  resetPasswordUrl?: string;
  [key: string]: unknown;
};

type SendEmailInput = {
  to: string | string[];
  subject: string;
  template?: string;
  data?: TemplateData;
  html?: string;
  text?: string;
};

type SkippedResult = {
  skipped: true;
};

const EMAIL_ERROR_CODE = {
  SMTP_NOT_CONFIGURED: 'SMTP_NOT_CONFIGURED',
  TEMPLATE_NOT_FOUND: 'EMAIL_TEMPLATE_NOT_FOUND',
  SEND_FAILED: 'EMAIL_SEND_FAILED',
} as const;

class EmailServiceError extends Error {
  code: keyof typeof EMAIL_ERROR_CODE;

  constructor(code: keyof typeof EMAIL_ERROR_CODE, message: string) {
    super(message);
    this.name = 'EmailServiceError';
    this.code = code;
  }
}

let cachedTransporter: Transporter<SentMessageInfo> | null = null;
const templateCache = new Map<string, string>();
const templateDir = path.join(__dirname, '../../email-templates');

function getMailerConfig(): MailerConfig {
  return {
    host: process.env.SMTP_HOST || process.env.SMTP_SERVER,
    port: Number.parseInt(process.env.SMTP_PORT || '', 10) || 587,
    secure: String(process.env.SMTP_SECURE).toLowerCase() === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS || process.env.SMTP_PASSWORD,
    },
    from: {
      address: process.env.EMAIL_FROM || process.env.ALERT_EMAIL_FROM || 'noreply@testweb.com',
      name: process.env.EMAIL_FROM_NAME || 'Test-Web Platform',
    },
  };
}

function ensureTransporter() {
  if (cachedTransporter) return cachedTransporter;
  const config = getMailerConfig();

  if (!config.host || !config.auth.user || !config.auth.pass) {
    Logger.error('邮件配置不完整，SMTP 未配置', {
      code: EMAIL_ERROR_CODE.SMTP_NOT_CONFIGURED,
      host: config.host,
      user: config.auth.user ? '***' : null,
    });
    throw new EmailServiceError(
      'SMTP_NOT_CONFIGURED',
      'SMTP 未配置，请设置 SMTP_HOST/SMTP_USER/SMTP_PASS'
    );
  }

  cachedTransporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
  });

  return cachedTransporter;
}

async function loadTemplate(template: string): Promise<string> {
  const cached = templateCache.get(template);
  if (cached) return cached;
  const filePath = path.join(templateDir, `${template}.html`);
  try {
    const content = await fs.readFile(filePath, 'utf8');
    templateCache.set(template, content);
    return content;
  } catch (error) {
    Logger.error('邮件模板加载失败', {
      code: EMAIL_ERROR_CODE.TEMPLATE_NOT_FOUND,
      template,
      filePath,
      error: error instanceof Error ? error.message : String(error),
    });
    throw new EmailServiceError('TEMPLATE_NOT_FOUND', `邮件模板不存在: ${template}`);
  }
}

function renderTemplate(template: string, data: TemplateData = {}) {
  const safe = <T>(value: T | undefined | null, fallback: T): T =>
    value === undefined || value === null ? fallback : value;
  const valueMap: Record<string, string> = {
    username: String(safe<string>(data.username, '用户')),
    resetUrl: String(safe<string>(data.resetUrl, '#')),
    resetPasswordUrl: String(safe<string>(data.resetPasswordUrl ?? data.resetUrl, '#')),
    verificationUrl: String(safe<string>(data.verificationUrl, '#')),
    code: String(safe<string>(data.code, '******')),
    expiryMinutes: String(safe<number>(data.expiryMinutes, 5)),
    expiryHours: String(safe<number>(data.expiryHours, 1)),
    appName: String(safe<string>(data.appName, 'Test-Web Platform')),
    daysUntilExpiry: String(safe<number>(data.daysUntilExpiry, 7)),
    message: String(safe<string>(data.message, '您收到一条系统通知。')),
    lockedUntil: String(safe<string>(data.lockedUntil, '')),
    supportEmail: String(safe<string>(data.supportEmail, 'support@example.com')),
    changePasswordUrl: String(safe<string>(data.changePasswordUrl, '#')),
  };
  return template.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_match, key: string) => {
    return valueMap[key] ?? '';
  });
}

async function sendEmail({
  to,
  subject,
  template,
  data,
  html,
  text,
}: SendEmailInput): Promise<SentMessageInfo | SkippedResult> {
  const transporter = ensureTransporter();

  if (!transporter) {
    Logger.error('邮件发送失败，SMTP 未配置', {
      code: EMAIL_ERROR_CODE.SMTP_NOT_CONFIGURED,
      to,
      subject,
    });
    throw new EmailServiceError(
      'SMTP_NOT_CONFIGURED',
      'SMTP 未配置，请设置 SMTP_HOST/SMTP_USER/SMTP_PASS'
    );
  }

  const config = getMailerConfig();
  const htmlTemplate = html || (template ? await loadTemplate(template) : undefined);
  const htmlContent = htmlTemplate ? renderTemplate(htmlTemplate, data) : undefined;
  const textContent = text || (htmlContent ? htmlContent.replace(/<[^>]+>/g, '') : undefined);

  try {
    const info = await transporter.sendMail({
      from: `${config.from.name} <${config.from.address}>`,
      to,
      subject,
      html: htmlContent,
      text: textContent,
    });

    Logger.info('邮件发送成功', {
      code: 'EMAIL_SENT',
      to,
      subject,
      messageId: info.messageId,
    });
    return info;
  } catch (error) {
    Logger.error('邮件发送失败', error, {
      code: EMAIL_ERROR_CODE.SEND_FAILED,
      to,
      subject,
    });
    throw new EmailServiceError('SEND_FAILED', '邮件发送失败');
  }
}

export { EMAIL_ERROR_CODE, EmailServiceError, sendEmail };
