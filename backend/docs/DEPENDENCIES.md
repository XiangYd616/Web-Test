# 项目依赖说明

## 📦 依赖分类

### 核心依赖（必需）

#### Web 框架
- `express` - Web 应用框架
- `cors` - 跨域资源共享
- `helmet` - 安全头部
- `compression` - 响应压缩

#### 数据库
- `pg` - PostgreSQL 客户端
- `pg-hstore` - PostgreSQL hstore 数据类型
- `sequelize` - ORM 框架
- `mysql2` - MySQL 客户端（如果需要多数据库支持）

#### 认证与安全
- `bcrypt` - 密码哈希
- `jsonwebtoken` - JWT 令牌 ⚠️ 已从 devDependencies 移至 dependencies
- `speakeasy` - 2FA/TOTP
- `express-rate-limit` - 速率限制

#### 验证
- `joi` - 环境变量和数据验证
- `express-validator` - 请求验证

---

### 可选依赖（功能相关）

#### 测试引擎（⚠️ MVP 状态）
这些依赖仅用于**状态检查**，实际功能未完成：

- `lighthouse` (12.8.2) - **保留**
  - 用途：检查是否安装、版本查询
  - 实际使用：仅在 `/engines/lighthouse/status` 端点
  - 状态：❌ 运行功能未实现（返回模拟数据）
  - 建议：**等待实现后再移除**

- `playwright` (1.53.1) - **保留**
  - 用途：检查是否安装、版本查询
  - 实际使用：仅在 `/engines/playwright/status` 端点
  - 状态：❌ 运行功能未实现（返回模拟数据）
  - 建议：**等待实现后再移除**

- `puppeteer` (24.10.2) - **保留**
  - 用途：检查是否安装、版本查询
  - 实际使用：仅在 `/engines/puppeteer/status` 端点
  - 状态：❌ 运行功能未实现
  - 建议：**等待实现后再移除**

#### 数据库（多余）
- `mongodb` (6.17.0) - **可移除** ⚠️
  - 项目使用 PostgreSQL
  - 未在代码中使用
  - 建议：**立即移除**（除非计划支持 MongoDB）

#### 其他功能依赖
- `redis` / `ioredis` - 缓存和会话存储
- `bull` - 任务队列（基于 Redis）
- `socket.io` - WebSocket 通信
- `nodemailer` - 邮件发送
- `qrcode` - 二维码生成
- `sharp` - 图片处理
- `axios` - HTTP 客户端
- `cheerio` - HTML 解析
- `winston` - 日志记录

---

## 🔧 依赖大小分析

### 大型依赖（影响构建大小）

| 包名 | 大小 | 建议 |
|------|------|------|
| puppeteer | ~300MB | 仅状态检查，考虑移除 |
| playwright | ~200MB | 仅状态检查，考虑移除 |
| lighthouse | ~180MB | 仅状态检查，考虑移除 |
| mongodb | ~50MB | 未使用，**立即移除** |

### 优化建议

#### 方案 1：延迟安装（推荐）
```json
{
  "optionalDependencies": {
    "lighthouse": "^12.8.2",
    "playwright": "^1.53.1",
    "puppeteer": "^24.10.2"
  }
}
```

优点：
- 不影响基础功能
- 需要时可安装
- 减小 CI/CD 构建时间

#### 方案 2：动态检查（当前实现）
```javascript
try {
  const lighthouse = require('lighthouse');
  // 检查成功
} catch (error) {
  // 未安装，返回状态
}
```

---

## ⚠️ 立即行动

### 1. 移除未使用的依赖
```bash
npm uninstall mongodb
```

**理由**：
- 项目使用 PostgreSQL
- 代码中无 MongoDB 引用
- 节省 ~50MB

### 2. 移动 jsonwebtoken 到 dependencies ✅ 已完成
```bash
# 已在 package.json 中修复
# jsonwebtoken 现在在 dependencies 中
```

**理由**：
- 生产环境需要 JWT 认证
- 之前错误地放在 devDependencies

---

## 📊 依赖审计

### 安全性
```bash
# 定期运行
npm audit
npm audit fix
```

### 过时检查
```bash
npm outdated
```

### 未使用依赖检测
```bash
npx depcheck
```

---

## 🎯 长期计划

### Phase 1（立即）
- [x] 移动 jsonwebtoken 到 dependencies
- [ ] 移除 mongodb

### Phase 2（1-2周）
- [ ] 实现 Lighthouse/Playwright/Puppeteer 真实功能
- [ ] 或者将它们移至 optionalDependencies

### Phase 3（1-2月）
- [ ] 审查所有依赖的必要性
- [ ] 考虑替换大型依赖
- [ ] 优化构建大小

---

## 📝 维护指南

### 添加新依赖时
1. 评估必要性
2. 检查包大小
3. 审查安全性
4. 更新此文档

### 升级依赖时
1. 查看 CHANGELOG
2. 测试兼容性
3. 运行测试套件
4. 检查破坏性变更

---

**最后更新**: 2025-01-XX  
**维护者**: 开发团队

