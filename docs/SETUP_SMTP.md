# SMTP 邮件服务配置指南

## 📋 概述

配置 SMTP 邮件服务，启用注册验证邮件、测试报告通知等功能。

---

## 🚀 快速配置

### 方式一：使用 Gmail（推荐，免费）

#### 1. 开启 Gmail "应用专用密码"

1. 访问 Google 账户: https://myaccount.google.com/
2. 选择"安全性" → "两步验证"（必须先开启）
3. 在"两步验证"页面底部，找到"应用专用密码"
4. 选择"邮件"和"其他（自定义名称）"，输入"Test-Web Backend"
5. 点击"生成"，复制 16 位密码

#### 2. 配置环境变量

在 `backend/.env` 中添加：

```bash
# SMTP 配置 - Gmail
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_16_digit_app_password  # 应用专用密码

# 发件人信息
EMAIL_FROM=your_email@gmail.com
EMAIL_FROM_NAME=Test-Web Platform
```

**优点**:
- ✅ 免费
- ✅ 可靠稳定
- ✅ 每天 500 封邮件额度

**缺点**:
- ⚠️ 需要 Google 账户
- ⚠️ 必须开启两步验证

---

### 方式二：使用 Outlook/Hotmail

```bash
# SMTP 配置 - Outlook
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@outlook.com
SMTP_PASS=your_password

EMAIL_FROM=your_email@outlook.com
EMAIL_FROM_NAME=Test-Web Platform
```

**注意**: Outlook 可能需要在账户设置中允许"不太安全的应用"。

---

### 方式三：使用 QQ 邮箱（国内推荐）

#### 1. 开启 QQ 邮箱 SMTP 服务

1. 登录 QQ 邮箱: https://mail.qq.com/
2. 设置 → 账户 → POP3/IMAP/SMTP/Exchange/CardDAV/CalDAV服务
3. 开启"POP3/SMTP服务"或"IMAP/SMTP服务"
4. 生成授权码（16位）

#### 2. 配置环境变量

```bash
# SMTP 配置 - QQ 邮箱
SMTP_HOST=smtp.qq.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_qq_number@qq.com
SMTP_PASS=your_authorization_code  # 授权码，不是QQ密码

EMAIL_FROM=your_qq_number@qq.com
EMAIL_FROM_NAME=Test-Web平台
```

---

### 方式四：使用 163 邮箱

```bash
# SMTP 配置 - 163 邮箱
SMTP_HOST=smtp.163.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your_email@163.com
SMTP_PASS=your_authorization_code  # 客户端授权密码

EMAIL_FROM=your_email@163.com
EMAIL_FROM_NAME=Test-Web平台
```

---

### 方式五：使用专业邮件服务（生产环境推荐）

#### SendGrid (免费 100 封/天)

```bash
# SMTP 配置 - SendGrid
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=your_sendgrid_api_key

EMAIL_FROM=verified@yourdomain.com
EMAIL_FROM_NAME=Test-Web Platform
```

注册: https://sendgrid.com/

#### Mailgun (免费 5000 封/月，前3个月)

```bash
# SMTP 配置 - Mailgun
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=postmaster@yourdomain.mailgun.org
SMTP_PASS=your_mailgun_password

EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=Test-Web Platform
```

注册: https://www.mailgun.com/

#### 阿里云邮件推送（国内）

```bash
# SMTP 配置 - 阿里云
SMTP_HOST=smtpdm.aliyun.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your_aliyun_username
SMTP_PASS=your_aliyun_password

EMAIL_FROM=noreply@your-domain.com
EMAIL_FROM_NAME=Test-Web平台
```

---

### 方式六：开发测试（无需真实SMTP）

使用 MailHog 或 MailCatcher 捕获邮件（不实际发送）：

#### MailHog (推荐)

```bash
# 启动 MailHog (Docker)
docker run -d -p 1025:1025 -p 8025:8025 mailhog/mailhog

# 配置
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=

EMAIL_FROM=test@example.com
EMAIL_FROM_NAME=Test-Web Platform
```

查看邮件: http://localhost:8025

---

## ✅ 验证配置

### 1. 测试 SMTP 连接

创建测试脚本 `backend/scripts/test-smtp.js`:

```javascript
const nodemailer = require('nodemailer');
require('dotenv').config();

async function testSMTP() {
  console.log('\n🔍 测试 SMTP 配置...\n');
  
  try {
    // 创建传输器
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
    
    // 验证连接
    console.log('📍 验证SMTP连接...');
    await transporter.verify();
    console.log('✅ SMTP 连接成功');
    
    // 发送测试邮件
    console.log('\n📍 发送测试邮件...');
    const info = await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM}>`,
      to: process.env.SMTP_USER,  // 发送给自己
      subject: 'Test-Web 邮件服务测试',
      text: '这是一封测试邮件，如果你收到此邮件，说明 SMTP 配置成功！',
      html: `
        <h2>✅ SMTP 配置成功！</h2>
        <p>这是一封测试邮件，如果你收到此邮件，说明 SMTP 配置成功！</p>
        <p><strong>发送时间:</strong> ${new Date().toLocaleString()}</p>
        <p><strong>服务器:</strong> ${process.env.SMTP_HOST}</p>
        <hr>
        <p style="color: #666;">Test-Web Platform - Email Service Test</p>
      `
    });
    
    console.log('✅ 邮件发送成功');
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`   收件人: ${process.env.SMTP_USER}`);
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ SMTP 配置验证成功！');
    console.log('='.repeat(60));
    console.log('\n🎯 以下功能现已可用:');
    console.log('  • 用户注册邮箱验证');
    console.log('  • 密码重置邮件');
    console.log('  • 测试报告邮件通知');
    console.log('  • 告警邮件通知');
    console.log('');
    
  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ SMTP 配置验证失败');
    console.error('='.repeat(60));
    console.error(`\n错误信息: ${error.message}\n`);
    
    console.log('💡 解决方案:\n');
    
    if (error.message.includes('Invalid login')) {
      console.log('1️⃣ 检查用户名和密码是否正确');
      console.log('2️⃣ Gmail 需使用"应用专用密码"');
      console.log('3️⃣ QQ/163 邮箱需使用"授权码"');
    }
    
    if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
      console.log('1️⃣ 检查 SMTP_HOST 和 SMTP_PORT 是否正确');
      console.log('2️⃣ 检查网络连接');
      console.log('3️⃣ 检查防火墙设置');
    }
    
    if (error.message.includes('self signed certificate')) {
      console.log('1️⃣ 尝试设置 SMTP_SECURE=false');
      console.log('2️⃣ 或在代码中添加: rejectUnauthorized: false');
    }
    
    console.log('\n📚 查看完整配置指南: docs/SETUP_SMTP.md');
    console.log('');
    
    process.exit(1);
  }
}

testSMTP();
```

运行测试:
```bash
node backend/scripts/test-smtp.js
```

### 2. 使用依赖检测器

```bash
npm run --prefix backend check:deps
```

期望输出:
```
🌟 检查可选依赖...
ℹ SMTP 已配置: smtp.gmail.com
```

---

## 🎯 启用的功能

配置完成后，以下功能将可用：

### ✅ 用户认证
- **注册验证邮件**: 用户注册后发送验证链接
- **密码重置**: 发送密码重置链接
- **邮箱变更**: 验证新邮箱地址

### ✅ 测试通知
- **测试完成通知**: 测试结束后发送报告
- **定时任务报告**: 定时测试的结果通知
- **告警通知**: 测试失败或异常告警

### ✅ 系统通知
- **系统维护通知**: 计划维护提醒
- **安全警告**: 异常登录或安全事件通知

---

## 📊 使用示例

### 1. 发送注册验证邮件

```javascript
const emailService = require('./services/email/EmailService');

// 发送验证邮件
await emailService.sendEmailVerification(
  'user@example.com',
  'verification_token_here',
  'Username'
);
```

### 2. 发送测试报告

```javascript
await emailService.sendTestReport(
  'user@example.com',
  {
    testType: 'SEO',
    url: 'https://example.com',
    score: 85,
    reportUrl: 'https://app.example.com/reports/123'
  }
);
```

---

## 🐛 常见问题

### Q1: Gmail "Invalid login: 535-5.7.8 Username and Password not accepted"

**原因**: 未使用应用专用密码

**解决**:
1. 开启 Google 账户的两步验证
2. 生成应用专用密码
3. 使用应用专用密码，而不是 Google 账户密码

### Q2: QQ 邮箱 "535 Login Fail"

**原因**: 未使用授权码

**解决**:
1. 登录 QQ 邮箱
2. 设置 → 账户 → 开启 SMTP 服务
3. 生成授权码
4. 使用授权码，而不是 QQ 密码

### Q3: "self signed certificate in certificate chain"

**解决**:
```bash
# 方案1: 禁用 SSL
SMTP_SECURE=false

# 方案2: 在代码中添加(仅开发环境)
transporter = nodemailer.createTransport({
  // ... 其他配置
  tls: {
    rejectUnauthorized: false
  }
});
```

### Q4: 邮件进入垃圾箱

**解决**:
1. 使用专业邮件服务（SendGrid、Mailgun）
2. 配置 SPF、DKIM、DMARC 记录
3. 使用已验证的域名
4. 避免触发垃圾邮件过滤器的关键词

### Q5: 发送速率限制

**Gmail**: 每天 500 封  
**QQ 邮箱**: 每天约 50 封  
**专业服务**: 根据套餐

**解决**: 升级到专业邮件服务

---

## 🔒 安全建议

### 1. 密码管理
```bash
# ❌ 错误：硬编码密码
SMTP_PASS=my_password_123

# ✅ 正确：使用环境变量
# 在 .env 中配置，不提交到 Git
```

### 2. 使用应用专用密码
- Gmail: 应用专用密码
- QQ/163: 授权码
- **永远不要使用主账户密码**

### 3. 限制发送频率
```javascript
// 在代码中添加发送频率限制
const rateLimit = require('express-rate-limit');

const emailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 5 // 最多 5 封邮件
});
```

### 4. 邮件内容安全
- 避免包含敏感信息
- 使用 HTTPS 链接
- 设置邮件过期时间

---

## 📊 推荐配置对比

| 服务 | 免费额度 | 适用场景 | 可靠性 | 配置难度 |
|------|---------|---------|-------|---------|
| **Gmail** | 500封/天 | 个人开发 | ⭐⭐⭐⭐⭐ | 简单 |
| **QQ邮箱** | ~50封/天 | 国内个人 | ⭐⭐⭐⭐ | 简单 |
| **SendGrid** | 100封/天 | 小型项目 | ⭐⭐⭐⭐⭐ | 中等 |
| **Mailgun** | 5000封/月 | 中小型项目 | ⭐⭐⭐⭐⭐ | 中等 |
| **阿里云** | 按量付费 | 生产环境 | ⭐⭐⭐⭐⭐ | 复杂 |
| **MailHog** | 无限制 | 开发测试 | ⭐⭐⭐ | 简单 |

---

## 🔗 相关资源

- [Nodemailer 文档](https://nodemailer.com/)
- [Gmail SMTP 设置](https://support.google.com/mail/answer/7126229)
- [SendGrid 快速开始](https://docs.sendgrid.com/for-developers/sending-email/quickstart-nodejs)
- [Mailgun 文档](https://documentation.mailgun.com/en/latest/)

---

## 🎉 下一步

1. ✅ 选择邮件服务提供商
2. ✅ 配置环境变量
3. ✅ 运行测试脚本验证
4. ✅ 发送第一封测试邮件

**配置完成后，记得运行 `npm run --prefix backend check:deps` 验证！** ✅

