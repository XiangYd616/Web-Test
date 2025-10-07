# 后端 API 路径变更总结

**日期**: 2025-01-17  
**分支**: `feature/backend-api-dev`  
**状态**: ✅ 完成

---

## 📋 变更概述

为了与前端 API 调用保持一致，从后端路由定义中移除了 `/api` 前缀。

### 变更模式

```javascript
// 之前 (Old)
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// 之后 (New) 
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
```

---

## 🔍 修改文件统计

| 文件 | 修改处数 | 状态 |
|------|---------|------|
| `backend/server.js` | 7 处 | ✅ 完成 |
| `backend/src/index.js` | 1 处 | ✅ 完成 |
| `backend/src/RouteManager.js` | 1 处 | ✅ 完成 |
| `backend/config/swagger.js` | 1 处 | ✅ 完成 |
| **总计** | **10 处** | ✅ 完成 |

---

## 📝 详细修改列表

### 1. `backend/server.js` (主路由注册文件)

**修改行**: 133-139

```diff
// API路由
- app.use('/api/auth', authRoutes);
- app.use('/api/oauth', oauthRoutes);
- app.use('/api/test', testRoutes);
- app.use('/api/tests', testsRoutes);
- app.use('/api/seo', seoRoutes);
- app.use('/api/security', securityRoutes);
- app.use('/api/performance', performanceRoutes);
+ app.use('/auth', authRoutes);
+ app.use('/oauth', oauthRoutes);
+ app.use('/test', testRoutes);
+ app.use('/tests', testsRoutes);
+ app.use('/seo', seoRoutes);
+ app.use('/security', securityRoutes);
+ app.use('/performance', performanceRoutes);
```

**说明**: 主服务器文件中的所有 API 路由注册已移除 `/api` 前缀

---

### 2. `backend/src/index.js` (入口文件)

**修改行**: 35

```diff
// 限流中间件
- app.use('/api/', limiter);
+ app.use('/', limiter);
```

**说明**: 限流中间件路径更新

---

### 3. `backend/src/RouteManager.js` (路由管理器)

**修改行**: 531

```diff
// 通配符路由
- this.app.use('/api/*', (req, res) => {
+ this.app.use('/*', (req, res) => {
```

**说明**: 路由管理器中的通配符路由更新

---

### 4. `backend/config/swagger.js` (API 文档配置)

**修改行**: 566

```diff
// Swagger JSON endpoint
- app.get('/api/docs.json', (req, res) => {
+ app.get('/docs.json', (req, res) => {
```

**说明**: Swagger 文档端点路径更新

---

## ⚠️ 注意事项

### 保留的 `/api` 引用

以下位置保留了 `/api` 前缀，需要根据实际情况处理：

1. **限流中间件** (`server.js` 第95行):
   ```javascript
   app.use('/api', limiter); // 可能需要更新为 app.use('/', limiter)
   ```

2. **API 信息端点** (`server.js` 第114行):
   ```javascript
   app.get('/info', (req, res) => {
     res.json({
       endpoints: {
         auth: '/api/auth',     // 文档中的端点说明，建议更新
         oauth: '/api/oauth',
         // ...
       }
     });
   });
   ```

### 推荐处理

1. **限流中间件**: 建议将 `app.use('/api', limiter)` 更改为 `app.use('/', limiter)` 或直接移除（因为已经有全局限流）

2. **API 文档**: 更新 `/info` 端点返回的路径信息，移除文档中的 `/api` 前缀

---

## 🔧 辅助工具

### API 前缀检查脚本

位置: `scripts/check-api-prefix.ps1`

**使用方法**:

```powershell
# 干跑模式 - 仅检查不修改
.\scripts\check-api-prefix.ps1

# 执行模式 - 自动移除 /api 前缀
.\scripts\check-api-prefix.ps1 -Execute
```

---

## ✅ 验证步骤

### 1. 代码检查

```bash
# 检查是否还有遗漏的 /api 前缀
.\scripts\check-api-prefix.ps1
```

### 2. 启动测试

```bash
# 启动后端服务器
npm run dev

# 或
node backend/server.js
```

### 3. API 端点测试

使用以下新路径测试：

```bash
# 健康检查
curl http://localhost:3001/health

# API 信息
curl http://localhost:3001/info

# 认证路由
curl http://localhost:3001/auth/login

# 测试路由
curl http://localhost:3001/tests/list
```

### 4. 前后端集成测试

确保前端请求能够正确到达后端：

- 前端请求: `fetch('/auth/login', ...)`
- 后端路由: `app.use('/auth', authRoutes)`
- 最终完整路径: `http://localhost:3001/auth/login`

---

## 📖 与前端同步

### 前端变更参考

- **前端文档**: `Test-Web/docs/FRONTEND_API_CHANGES.md`
- **修改文件数**: 48 个
- **替换点数**: 192 处
- **迁移脚本**: `Test-Web/scripts/remove-api-prefix.ps1`

### 路径对照表

| 功能模块 | 旧路径 | 新路径 |
|---------|--------|--------|
| 认证 | `/api/auth/*` | `/auth/*` |
| OAuth | `/api/oauth/*` | `/oauth/*` |
| 测试 | `/api/tests/*` | `/tests/*` |
| SEO | `/api/seo/*` | `/seo/*` |
| 安全 | `/api/security/*` | `/security/*` |
| 性能 | `/api/performance/*` | `/performance/*` |

---

## 🚀 下一步

1. ✅ **已完成**: 移除后端路由中的 `/api` 前缀
2. ⏳ **待处理**: 更新 `/info` 端点中的文档说明
3. ⏳ **待处理**: 考虑是否调整限流中间件路径
4. ⏳ **待测试**: 前后端集成测试
5. ⏳ **待提交**: Git 提交变更

---

## 📌 提交建议

### Git 提交命令

```bash
# 添加修改的文件
git add backend/server.js
git add backend/src/index.js
git add backend/src/RouteManager.js
git add backend/config/swagger.js

# 添加辅助脚本
git add scripts/check-api-prefix.ps1

# 添加文档
git add docs/BACKEND_API_CHANGES.md

# 提交
git commit -m "refactor(backend): remove /api prefix from routes to match frontend changes

- Remove /api prefix from all route registrations
- Update limiter middleware path
- Update RouteManager wildcard route
- Update Swagger documentation endpoint
- Add api-prefix checking script
- Add detailed change documentation

Affected files:
- backend/server.js (7 route changes)
- backend/src/index.js (1 change)
- backend/src/RouteManager.js (1 change)
- backend/config/swagger.js (1 change)

Total: 10 route path updates

Synchronized with frontend API changes (48 files, 192 replacements)"
```

---

## 📞 问题反馈

如遇到以下情况,请及时反馈：

- ✗ 404 错误 - API 路径未找到
- ✗ CORS 错误 - 跨域请求失败  
- ✗ 路由冲突 - 多个路由匹配相同路径
- ✗ 中间件失效 - 认证/限流等中间件未生效

---

**文档版本**: v1.0  
**最后更新**: 2025-01-17  
**维护者**: AI Assistant

