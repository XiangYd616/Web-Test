# 告警系统使用指南

## 📋 目录

- [系统概述](#系统概述)
- [快速开始](#快速开始)
- [核心组件](#核心组件)
- [告警规则配置](#告警规则配置)
- [通知渠道](#通知渠道)
- [API参考](#api参考)
- [最佳实践](#最佳实践)
- [故障排查](#故障排查)

---

## 系统概述

告警系统是Test-Web后端的核心监控组件，提供实时告警、多渠道通知和灵活的规则配置。

### 核心特性

- ✅ **规则引擎** - 灵活的条件评估和规则管理
- ✅ **多渠道通知** - 邮件、Webhook、站内通知
- ✅ **智能冷却期** - 防止告警风暴
- ✅ **优先级分级** - low/medium/high/critical
- ✅ **历史记录** - 完整的告警追踪
- ✅ **用户偏好** - 个性化通知设置

### 架构图

```
┌─────────────────────────────────────────────┐
│           监控指标 (Metrics)                 │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│      AlertRuleEngine (规则引擎)              │
│  - 规则加载                                  │
│  - 条件评估                                  │
│  - 冷却期管理                                │
└──────────┬──────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────┐
│         通知分发 (Dispatcher)                 │
└──┬───────┬────────┬──────────────────────────┘
   │       │        │
   ▼       ▼        ▼
┌─────┐ ┌────┐  ┌──────────┐
│Email│ │Web │  │站内通知   │
│     │ │hook│  │          │
└─────┘ └────┘  └──────────┘
```

---

## 快速开始

### 1. 环境配置

在 `.env` 文件中配置SMTP信息：

```bash
# SMTP邮件配置
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@test-web.com
```

### 2. 初始化服务

```javascript
const { AlertRuleEngine } = require('./services/alerting/AlertRuleEngine');
const { EmailAlerter } = require('./services/alerting/EmailAlerter');
const { WebhookAlerter } = require('./services/alerting/WebhookAlerter');
const { NotificationService } = require('./services/notification/NotificationService');

// 初始化告警引擎
const alertEngine = AlertRuleEngine.getInstance();
await alertEngine.loadRulesFromDatabase();

// 初始化邮件服务
const emailAlerter = EmailAlerter.getInstance();
await emailAlerter.initialize();

// 初始化Webhook服务
const webhookAlerter = WebhookAlerter.getInstance();

// 初始化通知服务
const notificationService = NotificationService.getInstance();
await notificationService.initialize();
```

### 3. 创建第一条告警规则

```bash
curl -X POST http://localhost:3001/api/alert-rules \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "High Error Rate Alert",
    "description": "Trigger when error rate exceeds 5%",
    "metricName": "test.error_rate",
    "condition": "{value} > 5",
    "severity": "high",
    "enabled": true,
    "cooldownPeriod": 300,
    "notificationChannels": ["email", "webhook", "notification"],
    "tags": ["production", "critical"]
  }'
```

---

## 核心组件

### 1. AlertRuleEngine (规则引擎)

#### 功能特性

- **规则管理**: 添加、更新、删除规则
- **条件评估**: 支持6种运算符 (>, >=, <, <=, ==, !=)
- **冷却期管理**: 防止重复告警
- **历史记录**: 评估历史追踪

#### 使用示例

```javascript
const alertEngine = AlertRuleEngine.getInstance();

// 添加规则
await alertEngine.addRule('rule-1', {
  name: 'CPU Usage Alert',
  metricName: 'system.cpu_usage',
  condition: '{value} > 80',
  severity: 'high',
  enabled: true,
  cooldownPeriod: 300
});

// 评估规则
const triggered = await alertEngine.evaluate('rule-1', 85);

if (triggered) {
  console.log('Alert triggered!');
}

// 获取评估历史
const history = alertEngine.getEvaluationHistory('rule-1', 10);
```

#### 条件语法

```javascript
// 基本语法: {value} operator threshold

// 示例:
"{value} > 80"        // 大于80
"{value} >= 90"       // 大于等于90
"{value} < 10"        // 小于10
"{value} <= 5"        // 小于等于5
"{value} == 100"      // 等于100
"{value} != 0"        // 不等于0
```

### 2. EmailAlerter (邮件告警)

#### 功能特性

- **HTML模板**: 精美的告警邮件
- **自动重试**: 指数退避重试机制
- **批量发送**: 支持批量告警
- **告警摘要**: 定期汇总报告

#### 使用示例

```javascript
const emailAlerter = EmailAlerter.getInstance();

// 发送单条告警
await emailAlerter.sendAlert({
  id: 'alert-123',
  ruleName: 'High CPU Usage',
  severity: 'high',
  metricName: 'cpu.usage',
  currentValue: 95,
  threshold: 80,
  triggeredAt: new Date().toISOString(),
  condition: '{value} > 80',
  message: 'CPU usage has exceeded threshold'
}, ['admin@example.com', 'ops@example.com']);

// 发送测试邮件
await emailAlerter.sendTestEmail('test@example.com');

// 发送告警摘要
await emailAlerter.sendAlertSummary(alerts, recipients, 'last 24 hours');
```

### 3. WebhookAlerter (Webhook告警)

#### 功能特性

- **灵活配置**: 支持自定义URL、方法、Headers
- **签名验证**: HMAC-SHA256签名
- **事件订阅**: 选择性接收事件
- **自动重试**: 失败自动重试

#### 使用示例

```javascript
const webhookAlerter = WebhookAlerter.getInstance();

// 注册Webhook
webhookAlerter.registerWebhook('slack-webhook', {
  url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  secret: 'your-secret-key',
  events: ['alert.triggered', 'alert.resolved'],
  metadata: {
    channel: '#alerts'
  }
});

// 发送告警
await webhookAlerter.sendAlert('slack-webhook', alert, 'alert.triggered');

// 发送测试
await webhookAlerter.sendTestWebhook('slack-webhook');
```

#### Webhook Payload格式

```json
{
  "event": "alert.triggered",
  "timestamp": "2025-10-15T11:00:00.000Z",
  "alert": {
    "id": "alert-123",
    "ruleName": "High CPU Usage",
    "ruleId": "rule-1",
    "severity": "high",
    "description": "CPU usage exceeded threshold",
    "metric": {
      "name": "cpu.usage",
      "currentValue": 95,
      "threshold": 80
    },
    "condition": "{value} > 80",
    "triggeredAt": "2025-10-15T11:00:00.000Z",
    "message": "CPU usage has exceeded threshold",
    "tags": ["production"],
    "context": {}
  },
  "metadata": {
    "source": "test-web-backend",
    "version": "1.0"
  }
}
```

### 4. NotificationService (站内通知)

#### 功能特性

- **通知管理**: 创建、查询、删除
- **已读状态**: 标记已读/未读
- **批量操作**: 批量标记、删除
- **用户偏好**: 通知偏好设置
- **静音时段**: 免打扰时间段

#### 使用示例

```javascript
const notificationService = NotificationService.getInstance();

// 创建通知
await notificationService.createNotification({
  userId: 'user-123',
  type: 'alert',
  title: '🔴 High CPU Usage',
  message: 'CPU usage has exceeded 80%',
  data: {
    alertId: 'alert-123',
    metricName: 'cpu.usage',
    currentValue: 95
  },
  priority: 'high',
  actionUrl: '/alerts/alert-123'
});

// 创建告警通知
await notificationService.createAlertNotification('user-123', alert);

// 获取用户通知
const result = await notificationService.getUserNotifications('user-123', {
  isRead: false,
  page: 1,
  limit: 20
});

// 标记为已读
await notificationService.markAsRead('notification-id', 'user-123');

// 标记所有为已读
await notificationService.markAllAsRead('user-123');
```

---

## 告警规则配置

### 规则字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | ✅ | 规则名称 |
| description | string | ❌ | 规则描述 |
| metricName | string | ✅ | 监控指标名称 |
| condition | string | ✅ | 触发条件 |
| severity | enum | ❌ | 严重等级 (low/medium/high/critical) |
| enabled | boolean | ❌ | 是否启用 (默认true) |
| cooldownPeriod | number | ❌ | 冷却期(秒，默认300) |
| notificationChannels | array | ❌ | 通知渠道 |
| tags | array | ❌ | 标签 |

### 严重等级

```javascript
const SEVERITY = {
  LOW: 'low',           // 低 - 一般信息
  MEDIUM: 'medium',     // 中 - 需要关注
  HIGH: 'high',         // 高 - 需要及时处理
  CRITICAL: 'critical'  // 关键 - 立即处理
};
```

### 通知渠道

```javascript
const CHANNELS = [
  'email',        // 邮件通知
  'webhook',      // Webhook通知
  'notification'  // 站内通知
];
```

### 完整示例

```json
{
  "name": "Critical API Response Time",
  "description": "Alert when API response time exceeds 2 seconds",
  "metricName": "api.response_time",
  "condition": "{value} > 2000",
  "severity": "critical",
  "enabled": true,
  "cooldownPeriod": 600,
  "notificationChannels": ["email", "webhook", "notification"],
  "tags": ["api", "performance", "production"]
}
```

---

## 通知渠道

### 1. 邮件通知

#### 配置要求

```bash
# .env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@test-web.com
```

#### Gmail配置步骤

1. 启用两步验证
2. 生成应用专用密码
3. 使用应用密码作为SMTP_PASSWORD

#### 邮件模板

系统提供两种邮件格式：
- **HTML**: 精美的响应式邮件
- **纯文本**: 备用格式

### 2. Webhook通知

#### Slack集成示例

```javascript
webhookAlerter.registerWebhook('slack', {
  url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  events: ['alert.triggered', 'alert.resolved']
});
```

#### Discord集成示例

```javascript
webhookAlerter.registerWebhook('discord', {
  url: 'https://discord.com/api/webhooks/YOUR/WEBHOOK',
  method: 'POST',
  events: ['alert.triggered']
});
```

#### 自定义Webhook

```javascript
webhookAlerter.registerWebhook('custom', {
  url: 'https://your-api.com/webhooks/alerts',
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'X-Custom-Header': 'value'
  },
  secret: 'your-secret-for-hmac',
  events: ['*']  // 接收所有事件
});
```

### 3. 站内通知

#### 通知类型

```javascript
const NOTIFICATION_TYPES = {
  INFO: 'info',       // 信息
  ALERT: 'alert',     // 告警
  WARNING: 'warning', // 警告
  SUCCESS: 'success'  // 成功
};
```

#### 优先级

```javascript
const PRIORITIES = {
  NORMAL: 'normal',   // 普通
  HIGH: 'high',       // 高
  URGENT: 'urgent'    // 紧急
};
```

---

## API参考

### 告警规则API

#### 创建规则

```http
POST /api/alert-rules
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "High Error Rate",
  "metricName": "error.rate",
  "condition": "{value} > 5",
  "severity": "high",
  "notificationChannels": ["email", "notification"]
}
```

#### 获取规则列表

```http
GET /api/alert-rules?page=1&limit=20&severity=high
Authorization: Bearer {token}
```

#### 更新规则

```http
PUT /api/alert-rules/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "enabled": false,
  "cooldownPeriod": 600
}
```

#### 删除规则

```http
DELETE /api/alert-rules/{id}
Authorization: Bearer {token}
```

#### 测试规则

```http
POST /api/alert-rules/{id}/test
Authorization: Bearer {token}
Content-Type: application/json

{
  "testValue": 95
}
```

### 告警历史API

#### 获取历史列表

```http
GET /api/alert-rules/history/list?page=1&limit=20&severity=high
Authorization: Bearer {token}
```

#### 获取统计信息

```http
GET /api/alert-rules/stats/overview?period=7d
Authorization: Bearer {token}
```

### 通知API

#### 获取用户通知

```http
GET /api/notifications?isRead=false&page=1&limit=20
Authorization: Bearer {token}
```

#### 标记为已读

```http
PUT /api/notifications/{id}/read
Authorization: Bearer {token}
```

#### 标记所有为已读

```http
PUT /api/notifications/read-all
Authorization: Bearer {token}
```

#### 删除通知

```http
DELETE /api/notifications/{id}
Authorization: Bearer {token}
```

---

## 最佳实践

### 1. 规则设计

#### ✅ 好的做法

```javascript
// 明确的规则名称
{
  "name": "API Response Time > 2s",
  "condition": "{value} > 2000",
  "severity": "high"
}

// 合理的冷却期
{
  "cooldownPeriod": 300  // 5分钟，避免告警风暴
}

// 分级告警
{
  "name": "CPU Usage Warning",
  "condition": "{value} > 70",
  "severity": "medium"
}
{
  "name": "CPU Usage Critical",
  "condition": "{value} > 90",
  "severity": "critical"
}
```

#### ❌ 避免的做法

```javascript
// 冷却期太短
{
  "cooldownPeriod": 10  // 太短，会产生大量告警
}

// 阈值不合理
{
  "condition": "{value} > 0.1"  // 阈值太低，频繁触发
}

// 没有描述
{
  "name": "Alert 1",
  "description": ""  // 缺少上下文信息
}
```

### 2. 通知策略

#### 分级通知

```javascript
// Critical - 所有渠道
{
  "severity": "critical",
  "notificationChannels": ["email", "webhook", "notification"]
}

// High - 邮件+站内
{
  "severity": "high",
  "notificationChannels": ["email", "notification"]
}

// Medium/Low - 仅站内
{
  "severity": "medium",
  "notificationChannels": ["notification"]
}
```

#### 静音时段

```javascript
// 设置用户静音时段
await notificationService.updateUserPreferences(userId, {
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00'
});
```

### 3. 性能优化

#### 批量操作

```javascript
// ✅ 批量创建通知
await notificationService.createBulkNotifications([
  { userId: 'user-1', title: 'Alert 1', ... },
  { userId: 'user-2', title: 'Alert 2', ... }
]);

// ✅ 批量标记已读
await notificationService.markMultipleAsRead(notificationIds, userId);
```

#### 定期清理

```javascript
// 清理30天前的已读通知
await notificationService.cleanupReadNotifications(userId, 30);
```

### 4. 监控和日志

```javascript
// 获取告警统计
const stats = await alertEngine.getStats();
console.log('Active rules:', stats.totalRules);
console.log('Triggered:', stats.triggeredCount);

// 检查服务状态
const emailStatus = emailAlerter.getStatus();
const webhookStatus = webhookAlerter.getStatus();
```

---

## 故障排查

### 常见问题

#### 1. 邮件发送失败

**症状**: 邮件无法发送，日志显示SMTP错误

**解决方案**:
```bash
# 检查SMTP配置
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# 验证邮件服务
curl -X POST http://localhost:3001/api/alert-rules/test/email \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"recipient": "test@example.com"}'
```

#### 2. Webhook超时

**症状**: Webhook发送超时

**解决方案**:
```javascript
// 增加超时时间
const webhookAlerter = new WebhookAlerter({
  timeout: 30000,  // 30秒
  retryAttempts: 5
});
```

#### 3. 告警风暴

**症状**: 短时间内收到大量重复告警

**解决方案**:
```javascript
// 增加冷却期
{
  "cooldownPeriod": 600  // 10分钟
}

// 或调整阈值
{
  "condition": "{value} > 90"  // 提高阈值
}
```

#### 4. 规则未触发

**症状**: 指标超过阈值但未触发告警

**解决方案**:
```bash
# 1. 检查规则是否启用
GET /api/alert-rules/{id}

# 2. 测试规则
POST /api/alert-rules/{id}/test
{
  "testValue": 100
}

# 3. 检查冷却期
# 查看评估历史
alertEngine.getEvaluationHistory(ruleId)
```

### 日志分析

```bash
# 查看告警日志
grep "Alert triggered" logs/app.log

# 查看邮件发送日志
grep "Email sent" logs/app.log

# 查看Webhook日志
grep "Webhook sent" logs/app.log
```

---

## 集成示例

### 与测试队列集成

```javascript
// 在测试完成时触发告警评估
testQueueService.on('job:completed', async (job, result) => {
  // 评估错误率
  if (result.errorRate > 0) {
    await alertEngine.evaluate('error-rate-rule', result.errorRate);
  }
  
  // 评估响应时间
  if (result.avgResponseTime > 0) {
    await alertEngine.evaluate('response-time-rule', result.avgResponseTime);
  }
});
```

### 与监控系统集成

```javascript
// 定期评估系统指标
setInterval(async () => {
  const metrics = await monitoringService.getMetrics();
  
  for (const [metricName, value] of Object.entries(metrics)) {
    // 查找对应的告警规则
    const rules = await alertEngine.getRulesByMetric(metricName);
    
    for (const rule of rules) {
      await alertEngine.evaluate(rule.id, value);
    }
  }
}, 60000); // 每分钟评估一次
```

---

## 附录

### 环境变量完整列表

```bash
# SMTP邮件配置
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@test-web.com

# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_NAME=test_web
DB_USER=postgres
DB_PASSWORD=your-password
```

### 数据库表结构

```sql
-- 告警规则表
CREATE TABLE alert_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  metric_name VARCHAR(255) NOT NULL,
  condition TEXT NOT NULL,
  severity VARCHAR(20) DEFAULT 'medium',
  enabled BOOLEAN DEFAULT true,
  cooldown_period INTEGER DEFAULT 300,
  notification_channels JSONB DEFAULT '["email"]',
  tags JSONB DEFAULT '[]',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 告警历史表
CREATE TABLE alert_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rule_id UUID REFERENCES alert_rules(id),
  severity VARCHAR(20),
  metric_name VARCHAR(255),
  metric_value NUMERIC,
  threshold NUMERIC,
  message TEXT,
  triggered_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP,
  metadata JSONB
);

-- 站内通知表
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  type VARCHAR(50) DEFAULT 'info',
  title VARCHAR(255),
  message TEXT,
  data JSONB,
  priority VARCHAR(20) DEFAULT 'normal',
  action_url VARCHAR(500),
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 通知偏好表
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) UNIQUE,
  email_enabled BOOLEAN DEFAULT true,
  push_enabled BOOLEAN DEFAULT true,
  alert_types JSONB DEFAULT '["all"]',
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 支持与反馈

如有问题或建议，请联系：
- 技术支持: support@test-web.com
- 文档反馈: docs@test-web.com

---

**最后更新**: 2025-10-15  
**版本**: 1.0  
**作者**: Test-Web Team

