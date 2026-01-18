/**
 * 邮件发送服务
 * 统一封装SMTP发送逻辑与模板渲染
 */

const nodemailer = require('nodemailer');
const Logger = require('../../middleware/logger.js');

let cachedTransporter = null;

function getMailerConfig() {
  return {
    host: process.env.SMTP_HOST || process.env.SMTP_SERVER,
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
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
    Logger.warn('邮件配置不完整，跳过邮件发送', {
      host: config.host,
      user: config.auth.user ? '***' : null,
    });
    return null;
  }

  cachedTransporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
  });

  return cachedTransporter;
}

function renderTemplate(template, data = {}) {
  const safe = (value, fallback = '') => (value === undefined || value === null ? fallback : value);
  const username = safe(data.username, '用户');

  switch (template) {
    case 'password-reset': {
      const resetUrl = safe(data.resetUrl, '#');
      const expiryHours = safe(data.expiryHours, 1);
      return `
        <p>${username}，您好：</p>
        <p>我们收到您的密码重置请求，请在 ${expiryHours} 小时内点击以下链接完成重置：</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>如果不是您本人操作，请忽略此邮件。</p>
      `;
    }
    case 'email-verification': {
      const verificationUrl = safe(data.verificationUrl, '#');
      return `
        <p>${username}，您好：</p>
        <p>请点击以下链接完成邮箱验证：</p>
        <p><a href="${verificationUrl}">${verificationUrl}</a></p>
        <p>如果不是您本人操作，请忽略此邮件。</p>
      `;
    }
    case 'mfa-code': {
      const code = safe(data.code, '******');
      const expiryMinutes = safe(data.expiryMinutes, 5);
      const appName = safe(data.appName, 'Test-Web Platform');
      return `
        <p>您的 ${appName} 登录验证码为：</p>
        <h2 style="letter-spacing: 3px;">${code}</h2>
        <p>验证码有效期 ${expiryMinutes} 分钟，请勿泄露给他人。</p>
      `;
    }
    case 'password-expiry-warning': {
      const days = safe(data.daysUntilExpiry, 7);
      return `
        <p>${username}，您好：</p>
        <p>您的账户密码将在 ${days} 天后过期，请尽快更新密码。</p>
      `;
    }
    case 'password-expired':
      return `
        <p>${username}，您好：</p>
        <p>您的账户密码已过期，请尽快登录系统完成重置。</p>
      `;
    case 'account-locked':
      return `
        <p>${username}，您好：</p>
        <p>由于多次登录失败，您的账户已被临时锁定。如非本人操作，请联系管理员。</p>
      `;
    default:
      return `
        <p>${username}，您好：</p>
        <p>${safe(data.message, '您收到一条系统通知。')}</p>
      `;
  }
}

async function sendEmail({ to, subject, template, data, html, text }) {
  const transporter = ensureTransporter();
  if (!transporter) {
    Logger.warn('邮件发送被跳过，SMTP未配置', { to, subject });
    return { skipped: true };
  }

  const config = getMailerConfig();
  const htmlContent = html || (template ? renderTemplate(template, data) : undefined);
  const textContent = text || (htmlContent ? htmlContent.replace(/<[^>]+>/g, '') : undefined);

  try {
    const info = await transporter.sendMail({
      from: `${config.from.name} <${config.from.address}>`,
      to,
      subject,
      html: htmlContent,
      text: textContent,
    });

    Logger.info('邮件发送成功', { to, subject, messageId: info.messageId });
    return info;
  } catch (error) {
    Logger.error('邮件发送失败', error, { to, subject });
    throw error;
  }
}

module.exports = {
  sendEmail,
};
