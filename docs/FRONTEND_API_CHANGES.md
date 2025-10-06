# 🚨 紧急：后端API路由已变更

**日期**: 2025-10-06  
**优先级**: 🔴 **P0 - 紧急**  
**影响**: 所有前端API调用将失败  
**行动**: 立即更新前端代码

---

## ⚠️ 重要变更

### 后端API路由已完全重构
- ❌ **移除了** `/api` 前缀
- ❌ **无兼容性层** - 旧路由不再工作
- ✅ 必须使用新路由

---

## 🔄 路由变更对照表

### 认证
```javascript
// ❌ 旧路由（不再工作）
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh

// ✅ 新路由（立即使用）
POST /auth/register
POST /auth/login
POST /auth/refresh
```

### 测试相关
```javascript
// ❌ 旧路由（不再工作）
POST /api/test/seo/analyze
POST /api/test/stress/start
POST /api/test/security/scan

// ✅ 新路由（立即使用）
POST /tests/seo/analyze      // 注意：test → tests (复数)
POST /tests/stress/start
POST /tests/security/scan
```

### 引擎管理
```javascript
// ❌ 旧路由（不再工作）
GET /api/test/k6/status
GET /api/test/lighthouse/status

// ✅ 新路由（立即使用）
GET /engines/k6/status        // 注意：从 /test 移到 /engines
GET /engines/lighthouse/status
```

### 系统相关
```javascript
// ❌ 旧路由（不再工作）
GET /api/system/info
GET /api/seo/analyze
GET /api/security/scan

// ✅ 新路由（立即使用）
GET /system/info
GET /seo/analyze
GET /security/scan
```

---

## 🔧 前端代码修改

### 1. 更新 API Base URL

**React/Vite 项目 (.env)**:
```env
# ❌ 删除这行
VITE_API_URL=http://localhost:3001/api

# ✅ 替换为
VITE_API_URL=http://localhost:3001
```

**Next.js 项目 (.env.local)**:
```env
# ❌ 删除这行
NEXT_PUBLIC_API_URL=http://localhost:3001/api

# ✅ 替换为
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 2. 更新 Axios 配置

**旧配置**:
```javascript
// ❌ 不再使用
const api = axios.create({
  baseURL: 'http://localhost:3001/api'  // 包含 /api
});
```

**新配置**:
```javascript
// ✅ 立即更新
const api = axios.create({
  baseURL: 'http://localhost:3001'  // 移除 /api
});
```

### 3. 更新直接调用

**旧代码**:
```javascript
// ❌ 不再工作
fetch('http://localhost:3001/api/auth/login', {
  method: 'POST',
  body: JSON.stringify(credentials)
});
```

**新代码**:
```javascript
// ✅ 立即更新
fetch('http://localhost:3001/auth/login', {  // 移除 /api
  method: 'POST',
  body: JSON.stringify(credentials)
});
```

### 4. 特殊注意：复数形式

```javascript
// ❌ 旧路径
/api/test/seo/analyze

// ✅ 新路径（注意 test → tests）
/tests/seo/analyze
```

---

## ✅ 快速检查清单

在提交代码前，请确认：

- [ ] 已更新 `.env` 或 `.env.local` 文件
- [ ] 已移除所有 `/api` 前缀
- [ ] 已将 `/test/` 改为 `/tests/` (复数)
- [ ] 已将引擎路由从 `/test/k6` 改为 `/engines/k6`
- [ ] 已测试所有API调用
- [ ] 已更新所有环境（dev、staging、production）

---

## 🔍 快速搜索替换

### VS Code / WebStorm

**步骤1**: 搜索
```regex
(['"`])(http://localhost:3001)/api/
```

**替换为**:
```
$1$2/
```

**步骤2**: 特殊替换
```regex
/api/test/
```
**替换为**:
```
/tests/
```

**步骤3**: 引擎路由
```regex
/test/(k6|lighthouse)/
```
**替换为**:
```
/engines/$1/
```

---

## 🧪 测试方法

### 1. 测试新路由是否可用
```bash
# 测试根路径
curl http://localhost:3001/

# 测试认证路由
curl http://localhost:3001/auth/login

# 测试健康检查
curl http://localhost:3001/health
```

### 2. 验证旧路由已失效
```bash
# 应该返回 404 或错误
curl http://localhost:3001/api/auth/login
```

---

## 📚 详细文档

需要更多信息？请查看：
- **路由重构文档** - `ROUTE_REFACTORING.md`

---

## 🆘 遇到问题？

### 常见错误

**错误1**: `404 Not Found`
```
原因：仍在使用旧的 /api/* 路由
解决：移除 /api 前缀
```

**错误2**: `CORS Error`
```
原因：环境变量未更新
解决：检查 .env 文件，移除 /api
```

**错误3**: 部分功能失效
```
原因：遗漏了某些API调用
解决：全局搜索 '/api/' 并替换
```

### 联系方式

- 💬 Slack: #backend-api
- 📧 Email: backend-team@example.com
- 🐛 Issues: 提交到项目Issues

---

## ⏰ 时间表

| 时间 | 行动 |
|-----|------|
| **立即** | 阅读本文档 |
| **30分钟内** | 更新本地开发环境 |
| **2小时内** | 更新所有API调用代码 |
| **今天内** | 完成测试并提交PR |
| **明天** | 部署到开发环境 |

---

**重要提醒**:
1. ⚠️ 后端服务器重启后，旧路由将完全失效
2. ⚠️ 这不是可选的更新，必须立即执行
3. ✅ 新路由架构更简洁、更符合RESTful规范

---

**最后更新**: 2025-10-06  
**后端版本**: 2.0  
**强制执行**: ✅ 是

