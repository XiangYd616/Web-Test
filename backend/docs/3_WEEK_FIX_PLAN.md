# 3周全面修复计划 (方案B)

**开始日期**: 2025年1月  
**预计完成**: 3周后  
**目标**: 修复所有P0和P1问题，提升系统到企业级可用状态  
**执行方式**: 分周迭代，每周有明确交付物

---

## 📋 总体目标

### Week 1: P0问题修复 - 恢复核心功能
- ✅ 测试队列服务重新实现
- ✅ WebSocket架构统一
- ✅ 基础缓存实现

### Week 2: P1问题完善 - 提升可靠性
- ✅ 告警系统完善
- ✅ 站内通知系统
- ✅ 监控增强

### Week 3: 功能启用与测试
- ✅ MFA和OAuth启用
- ✅ 完整测试
- ✅ 文档完善

---

## 🗓️ Week 1: P0问题修复

### Day 1-2: 测试队列服务重新实现

#### 目标
重新实现被删除的测试队列服务，恢复测试持久化和状态追踪能力。

#### 技术选型

**方案A: 基于Redis (推荐)** ✅
- 优点: 高性能、持久化、支持分布式
- 缺点: 需要额外部署Redis
- 适合: 生产环境

**方案B: 基于内存队列**
- 优点: 无额外依赖、实现简单
- 缺点: 重启丢失、不支持分布式
- 适合: 开发/小规模环境

**推荐**: 使用Redis，提供内存队列作为fallback

#### 实现任务

**1. 安装依赖**
```bash
npm install redis bull ioredis
```

**2. 创建队列服务**
```javascript
// services/queue/TestQueueService.js
const Queue = require('bull');
const Redis = require('ioredis');

class TestQueueService {
  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.testQueue = new Queue('test-execution', {
      redis: this.redis
    });
    this.setupProcessors();
  }

  async addTest(testData) {
    const job = await this.testQueue.add(testData, {
      priority: testData.priority || 0,
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 }
    });
    return job.id;
  }

  setupProcessors() {
    this.testQueue.process(async (job) => {
      // 执行测试逻辑
      return await this.executeTest(job.data);
    });
  }
}
```

**3. 修改test.js路由**
- 位置: `routes/test.js:979-996`
- 替换临时代码为真实队列调用
- 恢复测试持久化

**4. 数据库表设计**
```sql
CREATE TABLE test_queue (
  id UUID PRIMARY KEY,
  test_id VARCHAR(255) UNIQUE NOT NULL,
  test_type VARCHAR(50) NOT NULL,
  url TEXT NOT NULL,
  config JSONB,
  status VARCHAR(20) DEFAULT 'queued',
  priority INTEGER DEFAULT 0,
  user_id UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  retry_count INTEGER DEFAULT 0,
  error_message TEXT
);

CREATE INDEX idx_test_queue_status ON test_queue(status);
CREATE INDEX idx_test_queue_user ON test_queue(user_id);
```

**5. 实现队列管理API**
- `GET /api/queue/status` - 队列状态
- `GET /api/queue/jobs` - 任务列表
- `POST /api/queue/jobs/:id/cancel` - 取消任务
- `POST /api/queue/jobs/:id/retry` - 重试任务

#### 测试checklist
- [ ] 测试可以成功加入队列
- [ ] 队列状态正确追踪
- [ ] 测试结果正确持久化
- [ ] 优先级队列正常工作
- [ ] 失败重试机制有效
- [ ] 取消功能正常

#### 交付物
- `services/queue/TestQueueService.js` - 队列服务
- `routes/test.js` - 更新路由
- `migrations/003-test-queue.sql` - 数据库迁移
- `docs/QUEUE_SERVICE.md` - 使用文档

---

### Day 3-4: WebSocket架构统一

#### 目标
整合多个WebSocket实现，建立统一的实时通信架构。

#### 现状分析

**存在的WebSocket实现**:
1. `services/streaming/WebSocketManager.js`
2. `services/streaming/StreamingService.js`
3. `services/WebSocketService.js`
4. `engines/stress/StressTestWebSocketHandler.js`

**问题**:
- 多个实现，职责重叠
- 连接管理混乱
- 缺少统一的消息格式

#### 统一方案

**选择主实现**: `services/streaming/WebSocketManager.js`  
**原因**: 功能最完整，架构较清晰

**架构设计**:
```
WebSocketManager (统一入口)
├── ConnectionManager (连接管理)
├── ChannelManager (频道管理)
├── MessageBroker (消息分发)
└── HeartbeatMonitor (心跳检测)
```

#### 实现任务

**1. 重构WebSocketManager**
```javascript
// services/websocket/WebSocketManager.js
const WebSocket = require('ws');

class WebSocketManager {
  constructor() {
    this.wss = null;
    this.connections = new Map();
    this.channels = new Map();
    this.heartbeatInterval = 30000;
  }

  initialize(server) {
    this.wss = new WebSocket.Server({ server });
    this.setupConnectionHandler();
    this.startHeartbeat();
  }

  setupConnectionHandler() {
    this.wss.on('connection', (ws, req) => {
      const connectionId = this.generateConnectionId();
      const userId = this.extractUserId(req);
      
      this.connections.set(connectionId, {
        ws,
        userId,
        channels: new Set(),
        lastHeartbeat: Date.now()
      });

      ws.on('message', (data) => this.handleMessage(connectionId, data));
      ws.on('close', () => this.handleDisconnect(connectionId));
    });
  }

  broadcast(channel, event, data) {
    const message = JSON.stringify({ event, data, timestamp: Date.now() });
    
    for (const [id, conn] of this.connections) {
      if (conn.channels.has(channel) && conn.ws.readyState === WebSocket.OPEN) {
        conn.ws.send(message);
      }
    }
  }

  startHeartbeat() {
    setInterval(() => {
      const now = Date.now();
      for (const [id, conn] of this.connections) {
        if (now - conn.lastHeartbeat > this.heartbeatInterval * 2) {
          // 超时，关闭连接
          conn.ws.close();
          this.connections.delete(id);
        } else {
          // 发送心跳
          if (conn.ws.readyState === WebSocket.OPEN) {
            conn.ws.ping();
          }
        }
      }
    }, this.heartbeatInterval);
  }
}
```

**2. 统一消息格式**
```javascript
// 标准消息格式
{
  event: 'test.progress',
  data: {
    testId: 'xxx',
    progress: 50,
    message: 'Running tests...'
  },
  timestamp: 1234567890,
  channel: 'test-updates'
}
```

**3. 迁移现有功能**
- 压力测试实时更新 → 使用统一WebSocket
- 测试进度推送 → 使用统一WebSocket
- 删除冗余实现

**4. 实现频道管理**
```javascript
// 频道类型
const CHANNELS = {
  TEST_UPDATES: 'test-updates',
  SYSTEM_ALERTS: 'system-alerts',
  USER_NOTIFICATIONS: 'user-notifications',
  STRESS_TEST: 'stress-test-{testId}'
};
```

#### 测试checklist
- [ ] WebSocket连接建立正常
- [ ] 心跳检测有效
- [ ] 断线自动清理
- [ ] 频道订阅/取消订阅正常
- [ ] 消息广播正确
- [ ] 多客户端并发连接稳定

#### 交付物
- `services/websocket/WebSocketManager.js` - 统一服务
- `services/websocket/ChannelManager.js` - 频道管理
- 删除冗余文件
- `docs/WEBSOCKET_GUIDE.md` - 使用指南

---

### Day 5: 基础缓存实现

#### 目标
实现基于Redis的缓存层，提升性能，减少重复计算。

#### 缓存策略

**缓存内容**:
1. 测试结果 (TTL: 1小时)
2. 用户权限 (TTL: 15分钟)
3. 配置数据 (TTL: 30分钟)
4. API响应 (TTL: 5分钟)

**缓存键设计**:
```
test:result:{testId}
user:permissions:{userId}
config:{key}
api:{method}:{path}:{hash(params)}
```

#### 实现任务

**1. 创建缓存服务**
```javascript
// services/cache/CacheService.js
const Redis = require('ioredis');

class CacheService {
  constructor() {
    this.redis = new Redis(process.env.REDIS_URL);
    this.defaultTTL = 300; // 5分钟
  }

  async get(key) {
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  async set(key, value, ttl = this.defaultTTL) {
    await this.redis.setex(key, ttl, JSON.stringify(value));
  }

  async del(key) {
    await this.redis.del(key);
  }

  async invalidatePattern(pattern) {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  // 缓存装饰器
  async cached(key, ttl, fetchFn) {
    let data = await this.get(key);
    if (!data) {
      data = await fetchFn();
      await this.set(key, data, ttl);
    }
    return data;
  }
}
```

**2. 集成到测试路由**
```javascript
// routes/test.js
const cacheService = require('../services/cache/CacheService');

router.get('/:testId/result', async (req, res) => {
  const cacheKey = `test:result:${req.params.testId}`;
  
  const result = await cacheService.cached(cacheKey, 3600, async () => {
    return await testHistoryService.getTestResult(req.params.testId);
  });
  
  res.json(result);
});
```

**3. 实现缓存中间件**
```javascript
// middleware/cache.js
const cacheMiddleware = (ttl = 300) => {
  return async (req, res, next) => {
    const cacheKey = `api:${req.method}:${req.path}:${hash(req.query)}`;
    const cached = await cacheService.get(cacheKey);
    
    if (cached) {
      return res.json(cached);
    }
    
    res.sendResponse = res.json;
    res.json = (data) => {
      cacheService.set(cacheKey, data, ttl);
      res.sendResponse(data);
    };
    
    next();
  };
};
```

**4. 缓存管理API**
- `GET /api/cache/stats` - 缓存统计
- `DELETE /api/cache/invalidate` - 缓存失效
- `DELETE /api/cache/flush` - 清空缓存

#### 测试checklist
- [ ] 缓存读写正常
- [ ] TTL过期机制有效
- [ ] 缓存失效正确
- [ ] 缓存命中率统计
- [ ] 性能提升明显

#### 交付物
- `services/cache/CacheService.js` - 缓存服务
- `middleware/cache.js` - 缓存中间件
- `routes/cache.js` - 缓存管理API
- 更新相关路由使用缓存

---

## 🗓️ Week 2: P1问题完善

### Day 1-3: 告警系统完善

#### 目标
实现完整的多渠道告警系统，及时发现和响应系统问题。

#### 告警渠道

1. **邮件告警** (已有EmailService)
2. **Webhook告警** (新增)
3. **站内通知** (下一个任务)

#### 实现任务

**1. 告警规则引擎**
```javascript
// services/alerting/AlertRuleEngine.js
class AlertRuleEngine {
  constructor() {
    this.rules = new Map();
  }

  addRule(rule) {
    // rule: { id, name, condition, threshold, channels, cooldown }
    this.rules.set(rule.id, rule);
  }

  async evaluate(metric) {
    const triggeredRules = [];
    
    for (const [id, rule] of this.rules) {
      if (this.checkCondition(metric, rule)) {
        if (!this.isInCooldown(id)) {
          triggeredRules.push(rule);
          this.setCooldown(id, rule.cooldown);
        }
      }
    }
    
    return triggeredRules;
  }

  checkCondition(metric, rule) {
    switch (rule.condition) {
      case 'gt': return metric.value > rule.threshold;
      case 'lt': return metric.value < rule.threshold;
      case 'eq': return metric.value === rule.threshold;
      default: return false;
    }
  }
}
```

**2. 邮件告警实现**
```javascript
// services/alerting/EmailAlerter.js
const emailService = require('../email/EmailService');

class EmailAlerter {
  async send(alert) {
    const recipients = alert.recipients || [process.env.ADMIN_EMAIL];
    
    await emailService.sendMail(
      recipients.join(','),
      `[${alert.severity}] ${alert.title}`,
      this.generateHTML(alert)
    );
  }

  generateHTML(alert) {
    return `
      <h2>${alert.title}</h2>
      <p><strong>严重程度:</strong> ${alert.severity}</p>
      <p><strong>触发时间:</strong> ${alert.timestamp}</p>
      <p><strong>描述:</strong> ${alert.description}</p>
      <p><strong>指标:</strong> ${alert.metric.name} = ${alert.metric.value}</p>
      ${alert.actionUrl ? `<a href="${alert.actionUrl}">查看详情</a>` : ''}
    `;
  }
}
```

**3. Webhook告警**
```javascript
// services/alerting/WebhookAlerter.js
const axios = require('axios');

class WebhookAlerter {
  async send(alert, webhookUrl) {
    await axios.post(webhookUrl, {
      event: 'alert.triggered',
      alert: {
        id: alert.id,
        title: alert.title,
        severity: alert.severity,
        description: alert.description,
        metric: alert.metric,
        timestamp: alert.timestamp
      }
    }, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'TestWeb-Alert-System'
      },
      timeout: 5000
    });
  }
}
```

**4. 告警管理API**
- `POST /api/alerts/rules` - 创建告警规则
- `GET /api/alerts/rules` - 获取规则列表
- `PUT /api/alerts/rules/:id` - 更新规则
- `DELETE /api/alerts/rules/:id` - 删除规则
- `GET /api/alerts/history` - 告警历史
- `POST /api/alerts/:id/acknowledge` - 确认告警

**5. 数据库表**
```sql
CREATE TABLE alert_rules (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  metric_name VARCHAR(100) NOT NULL,
  condition VARCHAR(20) NOT NULL,
  threshold NUMERIC NOT NULL,
  severity VARCHAR(20) DEFAULT 'medium',
  channels JSONB DEFAULT '["email"]',
  cooldown INTEGER DEFAULT 300,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE alert_history (
  id UUID PRIMARY KEY,
  rule_id UUID REFERENCES alert_rules(id),
  title VARCHAR(255),
  description TEXT,
  severity VARCHAR(20),
  metric_data JSONB,
  triggered_at TIMESTAMP DEFAULT NOW(),
  acknowledged_at TIMESTAMP,
  acknowledged_by UUID,
  resolved_at TIMESTAMP
);
```

#### 交付物
- `services/alerting/AlertRuleEngine.js`
- `services/alerting/EmailAlerter.js`
- `services/alerting/WebhookAlerter.js`
- `routes/alerts.js` - 更新路由
- `migrations/004-alert-system.sql`

---

### Day 4-5: 站内通知系统

#### 目标
实现完整的站内通知系统，提升用户体验。

#### 功能需求

1. 通知创建和发送
2. 通知列表查询
3. 未读/已读标记
4. 通知偏好设置
5. 通知历史记录

#### 实现任务

**1. 数据库设计**
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  data JSONB,
  is_read BOOLEAN DEFAULT false,
  action_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  read_at TIMESTAMP
);

CREATE TABLE notification_preferences (
  user_id UUID PRIMARY KEY,
  email_enabled BOOLEAN DEFAULT true,
  push_enabled BOOLEAN DEFAULT false,
  categories JSONB DEFAULT '{}',
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);
```

**2. 通知服务**
```javascript
// services/notifications/NotificationService.js
class NotificationService {
  async create(userId, notification) {
    const result = await query(
      `INSERT INTO notifications (id, user_id, type, title, content, data, action_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [uuid(), userId, notification.type, notification.title, 
       notification.content, notification.data, notification.actionUrl]
    );
    
    // 通过WebSocket实时推送
    wsManager.sendToUser(userId, 'notification', result.rows[0]);
    
    return result.rows[0];
  }

  async getUnreadCount(userId) {
    const result = await query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false',
      [userId]
    );
    return parseInt(result.rows[0].count);
  }

  async markAsRead(notificationId, userId) {
    await query(
      'UPDATE notifications SET is_read = true, read_at = NOW() WHERE id = $1 AND user_id = $2',
      [notificationId, userId]
    );
  }

  async batchMarkAsRead(userId, notificationIds) {
    await query(
      'UPDATE notifications SET is_read = true, read_at = NOW() WHERE user_id = $1 AND id = ANY($2)',
      [userId, notificationIds]
    );
  }
}
```

**3. 通知API**
- `GET /api/notifications` - 获取通知列表
- `GET /api/notifications/unread-count` - 未读数量
- `PUT /api/notifications/:id/read` - 标记已读
- `PUT /api/notifications/read-all` - 全部已读
- `DELETE /api/notifications/:id` - 删除通知
- `GET /api/notifications/preferences` - 获取偏好
- `PUT /api/notifications/preferences` - 更新偏好

**4. 通知类型**
```javascript
const NOTIFICATION_TYPES = {
  TEST_COMPLETED: 'test_completed',
  TEST_FAILED: 'test_failed',
  ALERT_TRIGGERED: 'alert_triggered',
  SYSTEM_UPDATE: 'system_update',
  QUOTA_WARNING: 'quota_warning'
};
```

#### 交付物
- `services/notifications/NotificationService.js`
- `routes/notifications.js`
- `migrations/005-notifications.sql`
- WebSocket集成

---

## 🗓️ Week 3: 功能启用与测试

### Day 1-2: MFA和OAuth启用

#### 目标
验证并启用被禁用的MFA和OAuth功能。

#### MFA启用

**1. 验证MFA服务**
- 测试QR码生成
- 测试TOTP验证
- 测试备用码

**2. 更新auth.js路由**
```javascript
// routes/auth.js
const mfaRoutes = require('./mfa');
router.use('/mfa', mfaRoutes);
```

**3. 测试流程**
- 注册 → 启用MFA → 生成QR码 → 扫码 → 验证
- 登录 → MFA验证 → 成功

**4. 编写文档**
- MFA使用指南
- API文档更新

#### OAuth启用

**1. 验证OAuth服务**
- 测试Google OAuth
- 测试GitHub OAuth

**2. 配置OAuth应用**
```env
# Google
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-secret
GOOGLE_CALLBACK_URL=http://localhost:3001/api/auth/oauth/google/callback

# GitHub
GITHUB_CLIENT_ID=your-client-id
GITHUB_CLIENT_SECRET=your-secret
GITHUB_CALLBACK_URL=http://localhost:3001/api/auth/oauth/github/callback
```

**3. 更新auth.js路由**
```javascript
// routes/auth.js
const oauthRoutes = require('./oauth');
router.use('/oauth', oauthRoutes);
```

**4. 测试流程**
- 点击OAuth登录 → 跳转第三方 → 授权 → 回调 → 登录成功

#### 交付物
- 启用MFA和OAuth路由
- OAuth配置示例
- 测试报告
- 用户使用文档

---

### Day 3-5: 完整测试和文档

#### 目标
确保所有修复功能稳定可靠，文档完善。

#### 测试任务

**1. 单元测试**
- 队列服务测试
- 缓存服务测试
- 告警服务测试
- 通知服务测试

**2. 集成测试**
- 完整测试流程（创建→执行→结果→通知）
- MFA登录流程
- OAuth登录流程
- 告警触发和发送

**3. 性能测试**
- 队列吞吐量测试
- WebSocket并发连接测试
- 缓存命中率测试

**4. 压力测试**
- 1000并发用户
- 100并发测试
- 持续运行24小时

#### 文档任务

**1. 技术文档**
- 队列服务文档
- WebSocket使用指南
- 缓存策略文档
- 告警配置指南

**2. 部署文档**
- Redis部署指南
- 环境变量配置
- 性能调优建议

**3. API文档更新**
- 新增API端点
- 更新Swagger文档
- Postman Collection更新

**4. 用户文档**
- MFA使用教程
- OAuth登录指南
- 通知设置说明

#### 交付物
- 测试报告
- 性能基准测试结果
- 完整技术文档
- 用户手册

---

## 📊 验收标准

### P0问题修复验收

✅ **测试队列服务**
- [ ] 测试可正常加入队列
- [ ] 队列状态实时更新
- [ ] 失败自动重试
- [ ] 取消功能正常
- [ ] 性能满足要求（>100 tests/min）

✅ **WebSocket统一**
- [ ] 单一WebSocket入口
- [ ] 心跳检测有效
- [ ] 支持1000+并发连接
- [ ] 消息不丢失
- [ ] 断线自动清理

✅ **缓存服务**
- [ ] 缓存命中率>80%
- [ ] 响应时间降低>50%
- [ ] 缓存一致性保证
- [ ] 失效机制正常

### P1问题修复验收

✅ **告警系统**
- [ ] 邮件告警正常发送
- [ ] Webhook告警正常
- [ ] 告警规则引擎准确
- [ ] 告警历史完整
- [ ] 冷却期机制有效

✅ **通知系统**
- [ ] 站内通知实时推送
- [ ] 通知列表正常显示
- [ ] 已读/未读状态正确
- [ ] 偏好设置生效

✅ **MFA和OAuth**
- [ ] MFA流程完整可用
- [ ] OAuth多提供商支持
- [ ] 安全性符合标准
- [ ] 文档完善

---

## 🎯 成功指标

### 功能指标
- ✅ 所有P0问题完全解决
- ✅ 所有P1问题完全解决
- ✅ 测试覆盖率>80%
- ✅ 文档完整度>95%

### 性能指标
- ✅ API响应时间<200ms (p95)
- ✅ 队列吞吐量>100 tests/min
- ✅ WebSocket连接稳定性>99.9%
- ✅ 缓存命中率>80%

### 稳定性指标
- ✅ 24小时连续运行无崩溃
- ✅ 内存泄漏检测通过
- ✅ 并发测试通过（1000用户）

---

## 📅 里程碑

### Week 1 End (Day 5)
- ✅ P0问题修复完成
- ✅ 核心功能恢复
- ✅ 基础性能提升
- 🎯 **可进入内测阶段**

### Week 2 End (Day 10)
- ✅ P1问题修复完成
- ✅ 告警和通知系统上线
- ✅ 可靠性大幅提升
- 🎯 **可进入Beta测试**

### Week 3 End (Day 15)
- ✅ 所有功能完整可用
- ✅ 测试和文档完善
- ✅ 性能达到预期
- 🎯 **可发布到生产环境**

---

## 🔄 风险管理

### 技术风险

**风险1: Redis依赖**
- 影响: 高
- 缓解: 提供内存队列fallback
- 应急: 可降级到内存模式

**风险2: WebSocket兼容性**
- 影响: 中
- 缓解: 提供Long Polling备选
- 应急: 关闭实时功能

**风险3: 数据迁移**
- 影响: 中
- 缓解: 充分测试迁移脚本
- 应急: 准备回滚方案

### 进度风险

**风险: 时间不足**
- 缓解: 按优先级分阶段交付
- 应急: P0必须完成，P1可延期

---

## 📝 每日站会

### 建议流程
1. 昨日完成内容
2. 今日计划任务
3. 遇到的阻塞
4. 需要的帮助

### 检查点
- Day 2: 队列服务进度检查
- Day 4: WebSocket重构检查
- Day 7: Week 1验收
- Day 10: Week 2验收
- Day 15: 最终验收

---

## 🎉 完成后效果

### 系统提升

**性能提升**:
- API响应速度提升50%+
- 测试执行效率提升3x
- 系统吞吐量提升5x

**稳定性提升**:
- 可用性从95% → 99.9%
- 故障恢复时间减少80%
- 并发能力提升10x

**功能完整性**:
- 核心功能完整度: 75% → 95%
- 企业级特性覆盖: 60% → 90%
- 用户体验满意度: ⭐⭐⭐ → ⭐⭐⭐⭐⭐

---

**计划制定日期**: 2025年1月  
**预计开始日期**: 待定  
**责任人**: 开发团队  
**审核人**: 技术负责人

---

## 附录

### A. 环境要求

**开发环境**:
- Node.js 18+
- PostgreSQL 14+
- Redis 7+
- 16GB RAM
- 4 CPU Cores

**生产环境**:
- Node.js 18+ (PM2集群模式)
- PostgreSQL 14+ (主从复制)
- Redis 7+ (哨兵模式)
- 32GB RAM
- 8 CPU Cores
- Nginx反向代理

### B. 工具清单

- PM2 - 进程管理
- Redis Commander - Redis管理
- pgAdmin - PostgreSQL管理
- Postman - API测试
- Artillery - 性能测试
- Jest - 单元测试

### C. 参考资料

- Bull Queue文档: https://github.com/OptimalBits/bull
- WebSocket规范: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket
- Redis最佳实践: https://redis.io/topics/best-practices

