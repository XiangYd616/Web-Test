# API 端点文档索引

## 📋 目录
- [认证端点](#认证端点)
- [测试管理](#测试管理)
- [性能测试](#性能测试)
- [安全测试](#安全测试)
- [兼容性测试](#兼容性测试)
- [数据管理](#数据管理)
- [配置管理](#配置管理)
- [用户管理](#用户管理)
- [系统管理](#系统管理)
- [监控和分析](#监控和分析)

---

## 认证端点

### POST /api/auth/register
**描述**: 用户注册  
**权限**: 公开  
**请求体**:
```json
{
  "email": "user@example.com",
  "password": "password123",
  "username": "username"
}
```

### POST /api/auth/login
**描述**: 用户登录  
**权限**: 公开  
**请求体**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

### POST /api/auth/logout
**描述**: 用户登出  
**权限**: 需要认证  

### GET /api/auth/me
**描述**: 获取当前用户信息  
**权限**: 需要认证  

### POST /api/auth/refresh
**描述**: 刷新JWT Token  
**权限**: 需要有效的refresh token  

### POST /api/auth/forgot-password
**描述**: 请求重置密码  
**权限**: 公开  

### POST /api/auth/reset-password
**描述**: 重置密码  
**权限**: 需要重置令牌  

### POST /api/auth/verify-email
**描述**: 验证邮箱  
**权限**: 需要验证令牌  

### POST /api/auth/change-password
**描述**: 修改密码  
**权限**: 需要认证  

---

## 测试管理

### POST /api/test/website
**描述**: 启动网站综合测试  
**权限**: 需要认证  
**请求体**:
```json
{
  "url": "https://example.com",
  "testType": "full"
}
```

### GET /api/test/status/:testId
**描述**: 获取测试状态  
**权限**: 需要认证  
**参数**: 
- `testId`: 测试ID

### GET /api/test/result/:testId
**描述**: 获取测试结果  
**权限**: 需要认证  

### POST /api/test/cancel/:testId
**描述**: 取消测试  
**权限**: 需要认证  

### DELETE /api/test/:testId
**描述**: 删除测试记录  
**权限**: 需要认证  

### GET /api/test/history
**描述**: 获取测试历史  
**权限**: 需要认证  
**查询参数**:
- `timeRange`: 时间范围(天) 1-365
- `page`: 页码
- `limit`: 每页数量

### GET /api/test/statistics
**描述**: 获取测试统计信息  
**权限**: 需要认证  

### GET /api/test/queue
**描述**: 获取测试队列状态  
**权限**: 需要认证  

---

## 性能测试

### POST /api/test/performance
**描述**: 执行性能测试  
**权限**: 需要认证  
**请求体**:
```json
{
  "url": "https://example.com",
  "options": {
    "device": "desktop",
    "location": "default"
  }
}
```

### POST /api/test/performance/lighthouse
**描述**: Lighthouse性能测试  
**权限**: 需要认证  

### POST /api/test/performance/pagespeed
**描述**: Google PageSpeed测试  
**权限**: 需要认证  

### POST /api/test/performance/gtmetrix
**描述**: GTmetrix性能测试  
**权限**: 需要认证  

### POST /api/test/performance/webpagetest
**描述**: WebPageTest性能测试  
**权限**: 需要认证  

### POST /api/test/performance/core-web-vitals
**描述**: Core Web Vitals测试  
**权限**: 需要认证  

### POST /api/test/performance/resource-analysis
**描述**: 资源分析  
**权限**: 需要认证  

---

## 安全测试

### POST /api/test/security
**描述**: 执行安全测试  
**权限**: 需要认证  
**请求体**:
```json
{
  "url": "https://example.com",
  "module": "full"
}
```

### GET /api/test/security/history
**描述**: 获取安全测试历史  
**权限**: 需要认证  

### GET /api/test/security/statistics
**描述**: 获取安全测试统计  
**权限**: 需要认证  

### GET /api/test/security/:testId
**描述**: 获取安全测试详细结果  
**权限**: 需要认证  

### DELETE /api/test/security/:testId
**描述**: 删除安全测试结果  
**权限**: 需要认证  

---

## 兼容性测试

### POST /api/test/compatibility
**描述**: 执行兼容性测试  
**权限**: 需要认证  
**请求体**:
```json
{
  "url": "https://example.com",
  "browsers": ["chrome", "firefox", "safari"]
}
```

### POST /api/test/compatibility/caniuse
**描述**: Can I Use兼容性测试  
**权限**: 需要认证  

### POST /api/test/compatibility/browserstack
**描述**: BrowserStack跨浏览器测试  
**权限**: 需要认证  

### POST /api/test/compatibility/feature-detection
**描述**: 特性检测测试  
**权限**: 需要认证  

---

## SEO测试

### POST /api/test/seo
**描述**: 执行SEO测试  
**权限**: 需要认证  
**请求体**:
```json
{
  "url": "https://example.com"
}
```

---

## 可访问性测试

### POST /api/test/accessibility
**描述**: 执行可访问性测试  
**权限**: 需要认证  

---

## 压力测试

### POST /api/test/stress
**描述**: 启动压力测试  
**权限**: 需要认证  
**请求体**:
```json
{
  "url": "https://example.com",
  "vus": 10,
  "duration": "30s"
}
```

### GET /api/test/stress/:testId
**描述**: 获取压力测试状态  
**权限**: 需要认证  

### POST /api/test/stress/:testId/cancel
**描述**: 取消压力测试  
**权限**: 需要认证  

### POST /api/test/stress/:testId/stop
**描述**: 停止压力测试  
**权限**: 需要认证  

### GET /api/test/stress/running
**描述**: 获取运行中的压力测试  
**权限**: 需要认证  

---

## 数据管理

### POST /api/data
**描述**: 创建数据  
**权限**: 需要认证  

### GET /api/data
**描述**: 查询数据  
**权限**: 需要认证  
**查询参数**:
- `page`: 页码
- `limit`: 每页数量
- `sortBy`: 排序字段
- `order`: 排序方向

### GET /api/data/:id
**描述**: 获取单个数据  
**权限**: 需要认证  

### PUT /api/data/:id
**描述**: 更新数据  
**权限**: 需要认证  

### DELETE /api/data/:id
**描述**: 删除数据  
**权限**: 需要认证  

### POST /api/data/export
**描述**: 导出数据  
**权限**: 需要认证  

### POST /api/data/import
**描述**: 导入数据  
**权限**: 需要认证  

### GET /api/data/statistics
**描述**: 获取数据统计  
**权限**: 需要认证  

### POST /api/data/backup
**描述**: 创建数据备份  
**权限**: 管理员  

---

## 配置管理

### GET /api/config
**描述**: 获取所有配置  
**权限**: 需要认证  

### GET /api/config/:key
**描述**: 获取单个配置项  
**权限**: 需要认证  

### PUT /api/config/:key
**描述**: 更新配置项  
**权限**: 管理员  

### POST /api/config/batch
**描述**: 批量更新配置  
**权限**: 管理员  

### GET /api/config/schema
**描述**: 获取配置模式  
**权限**: 需要认证  

### GET /api/config/history
**描述**: 获取配置历史  
**权限**: 管理员  

### POST /api/config/rollback/:version
**描述**: 回滚配置  
**权限**: 管理员  

### POST /api/config/reset
**描述**: 重置配置为默认值  
**权限**: 管理员  

### POST /api/config/validate
**描述**: 验证配置  
**权限**: 需要认证  

### GET /api/config/export
**描述**: 导出配置  
**权限**: 管理员  

### POST /api/config/import
**描述**: 导入配置  
**权限**: 管理员  

---

## 用户管理

### GET /api/admin/users
**描述**: 获取用户列表  
**权限**: 管理员  

### GET /api/admin/users/:userId
**描述**: 获取用户详情  
**权限**: 管理员  

### PUT /api/admin/users/:userId
**描述**: 更新用户信息  
**权限**: 管理员  

### DELETE /api/admin/users/:userId
**描述**: 删除用户  
**权限**: 管理员  

### POST /api/admin/users/:userId/lock
**描述**: 锁定用户账户  
**权限**: 管理员  

### POST /api/admin/users/:userId/unlock
**描述**: 解锁用户账户  
**权限**: 管理员  

---

## 系统管理

### GET /api/health
**描述**: 健康检查  
**权限**: 公开  

### GET /api/system/status
**描述**: 系统状态  
**权限**: 管理员  

### GET /api/system/engines
**描述**: 测试引擎状态  
**权限**: 需要认证  

### POST /api/cache/clear
**描述**: 清理缓存  
**权限**: 管理员  

### GET /api/database/health
**描述**: 数据库健康检查  
**权限**: 管理员  

---

## 监控和分析

### GET /api/metrics
**描述**: 获取系统指标  
**权限**: 管理员  

### GET /api/analytics
**描述**: 获取分析数据  
**权限**: 需要认证  

### GET /api/analytics/tests
**描述**: 测试分析数据  
**权限**: 需要认证  

### GET /api/analytics/users
**描述**: 用户分析数据  
**权限**: 管理员  

---

## 错误代码

所有API响应遵循统一的错误代码体系,详见 [错误代码文档](./ERROR_CODES.md)

### 通用响应格式

**成功响应**:
```json
{
  "success": true,
  "data": { ... }
}
```

**错误响应**:
```json
{
  "success": false,
  "error": {
    "code": 1001,
    "message": "Validation error",
    "details": { ... }
  }
}
```

---

## 认证方式

### JWT Bearer Token
大多数端点需要在请求头中包含JWT Token:

```http
Authorization: Bearer <your_jwt_token>
```

### 获取Token
通过 `/api/auth/login` 端点登录获取Token。

---

## 速率限制

- **窗口**: 15分钟
- **限制**: 100次请求/窗口
- **响应头**: 
  - `X-RateLimit-Limit`: 限制数
  - `X-RateLimit-Remaining`: 剩余请求数
  - `X-RateLimit-Reset`: 重置时间

---

## 分页

支持分页的端点接受以下查询参数:

- `page`: 页码 (默认: 1)
- `limit`: 每页数量 (默认: 20, 最大: 100)

**响应格式**:
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

---

## 更多信息

- **Swagger文档**: `http://localhost:3001/api-docs`
- **Postman集合**: 见 `docs/postman_collection.json`
- **错误代码**: 见 `docs/ERROR_CODES.md`

---

**最后更新**: 2025-10-15

