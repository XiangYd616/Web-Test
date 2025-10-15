/**
 * 邮件发送服务
 * 使用nodemailer处理所有邮件发送功能
 */

const nodemailer = require('nodemailer');
const logger = require('../../utils/logger');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initialized = false;
    this.initialize();
  }

  /**
   * 初始化邮件传输器
   */
  initialize() {
    try {
      // 检查必需的环境变量
      if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
        logger.warn('邮件服务未配置: 缺少SMTP配置环境变量');
        return;
      }

      this.transporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD
        },
        // 连接超时设置
        connectionTimeout: 10000,
        greetingTimeout: 5000
      });

      this.initialized = true;
      logger.info('邮件服务初始化成功');
    } catch (error) {
      logger.error('邮件服务初始化失败', error);
      this.initialized = false;
    }
  }

  /**
   * 检查邮件服务是否可用
   */
  isAvailable() {
    return this.initialized && this.transporter !== null;
  }

  /**
   * 验证SMTP连接
   */
  async verify() {
    if (!this.isAvailable()) {
      throw new Error('邮件服务未初始化');
    }

    try {
      await this.transporter.verify();
      logger.info('SMTP连接验证成功');
      return true;
    } catch (error) {
      logger.error('SMTP连接验证失败', error);
      return false;
    }
  }

  /**
   * 发送邮件通用方法
   */
  async sendMail(to, subject, html, text = null) {
    if (!this.isAvailable()) {
      logger.warn('邮件服务不可用,跳过发送邮件', { to, subject });
      return { success: false, message: '邮件服务未配置' };
    }

    try {
      const mailOptions = {
        from: `"${process.env.EMAIL_FROM_NAME || 'TestWeb'}" <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, '') // 简单的HTML转文本
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      logger.info('邮件发送成功', {
        messageId: info.messageId,
        to,
        subject
      });

      return {
        success: true,
        messageId: info.messageId
      };
    } catch (error) {
      logger.error('邮件发送失败', error, { to, subject });
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 发送密码重置邮件
   */
  async sendPasswordReset(email, resetToken, username = '') {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;
    
    const subject = '重置您的密码 - TestWeb';
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .container {
      background-color: #f9f9f9;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #2c3e50;
      margin: 0;
    }
    .content {
      background-color: white;
      padding: 20px;
      border-radius: 5px;
    }
    .button {
      display: inline-block;
      padding: 12px 30px;
      background-color: #3498db;
      color: white !important;
      text-decoration: none;
      border-radius: 5px;
      margin: 20px 0;
    }
    .button:hover {
      background-color: #2980b9;
    }
    .footer {
      margin-top: 30px;
      text-align: center;
      font-size: 12px;
      color: #7f8c8d;
    }
    .warning {
      background-color: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 10px;
      margin: 15px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔐 密码重置请求</h1>
    </div>
    <div class="content">
      <p>你好${username ? ' ' + username : ''},</p>
      <p>我们收到了重置您账户密码的请求。如果这是您发起的操作，请点击下面的按钮重置密码:</p>
      <div style="text-align: center;">
        <a href="${resetUrl}" class="button">重置密码</a>
      </div>
      <p>或复制以下链接到浏览器:</p>
      <p style="word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 3px;">
        ${resetUrl}
      </p>
      <div class="warning">
        <strong>⚠️ 安全提示:</strong>
        <ul>
          <li>此链接将在 <strong>1小时</strong> 后失效</li>
          <li>如果您没有发起此请求，请忽略此邮件</li>
          <li>请勿将此链接分享给他人</li>
        </ul>
      </div>
    </div>
    <div class="footer">
      <p>此邮件由 TestWeb 自动发送，请勿直接回复</p>
      <p>© ${new Date().getFullYear()} TestWeb. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `;

    return await this.sendMail(email, subject, html);
  }

  /**
   * 发送邮箱验证邮件
   */
  async sendEmailVerification(email, verificationToken, username = '') {
    const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}&email=${encodeURIComponent(email)}`;
    
    const subject = '验证您的邮箱 - TestWeb';
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .container {
      background-color: #f9f9f9;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #2c3e50;
      margin: 0;
    }
    .content {
      background-color: white;
      padding: 20px;
      border-radius: 5px;
    }
    .button {
      display: inline-block;
      padding: 12px 30px;
      background-color: #27ae60;
      color: white !important;
      text-decoration: none;
      border-radius: 5px;
      margin: 20px 0;
    }
    .button:hover {
      background-color: #229954;
    }
    .footer {
      margin-top: 30px;
      text-align: center;
      font-size: 12px;
      color: #7f8c8d;
    }
    .info {
      background-color: #d1ecf1;
      border-left: 4px solid #17a2b8;
      padding: 10px;
      margin: 15px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✉️ 欢迎加入 TestWeb!</h1>
    </div>
    <div class="content">
      <p>你好${username ? ' ' + username : ''},</p>
      <p>感谢您注册 TestWeb! 为了确保账户安全，请验证您的邮箱地址。</p>
      <div style="text-align: center;">
        <a href="${verifyUrl}" class="button">验证邮箱</a>
      </div>
      <p>或复制以下链接到浏览器:</p>
      <p style="word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 3px;">
        ${verifyUrl}
      </p>
      <div class="info">
        <strong>📌 提示:</strong>
        <ul>
          <li>此链接将在 <strong>24小时</strong> 后失效</li>
          <li>验证后即可使用所有功能</li>
          <li>如有问题请联系客服</li>
        </ul>
      </div>
    </div>
    <div class="footer">
      <p>此邮件由 TestWeb 自动发送，请勿直接回复</p>
      <p>© ${new Date().getFullYear()} TestWeb. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `;

    return await this.sendMail(email, subject, html);
  }

  /**
   * 发送欢迎邮件
   */
  async sendWelcomeEmail(email, username) {
    const subject = '欢迎加入 TestWeb!';
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🎉 欢迎 ${username}!</h1>
    <p>您的账户已成功创建并验证。</p>
    <p>开始使用 TestWeb 进行网站测试和监控吧!</p>
    <p>如有任何问题,请随时联系我们的支持团队。</p>
    <p>祝您使用愉快!</p>
  </div>
</body>
</html>
    `;

    return await this.sendMail(email, subject, html);
  }
}

// 创建单例
const emailService = new EmailService();

module.exports = emailService;

