# 🔄 后端 API 路径同步更新指南

**重要**: 前端已经移除了所有 `/api` 前缀，后端必须同步更新！

---

## ⚠️ 当前状态

### 前端 (已完成) ✅
- **位置**: D:\myproject\Test-Web
- **分支**: feature/frontend-ui-dev
- **状态**: 已提交所有更改，移除了 192 处 `/api` 前缀

### 后端 (需要更新) ⚠️
- **位置**: D:\myproject\Test-Web-backend
- **分支**: feature/backend-api-dev
- **状态**: 需要移除路由中的 `/api` 前缀

---

## 🎯 后端需要做的更改

### 核心问题

**前端现在调用**:
```typescript
fetch('/auth/login')        // ❌ 后端目前没有这个路由
fetch('/test/start')        // ❌ 后端目前没有这个路由
fetch('/monitoring/alerts') // ❌ 后端目前没有这个路由
```

**后端当前路由** (假设):
```javascript
app.use('/api/auth', authRoutes)    // ✅ 目前这样
app.use('/api/test', testRoutes)    // ✅ 目前这样
app.use('/api/monitoring', monitoringRoutes) // ✅ 目前这样
```

**需要改为**:
```javascript
app.use('/auth', authRoutes)        // ✅ 移除 /api
app.use('/test', testRoutes)        // ✅ 移除 /api
app.use('/monitoring', monitoringRoutes) // ✅ 移除 /api
```

---

## 🚀 后端更新步骤

### 步骤 1: 切换到后端目录

```bash
cd D:\myproject\Test-Web-backend
```

### 步骤 2: 查找所有 API 路由注册

通常在以下文件中：
- `backend/server.js` 或 `backend/app.js` (主入口)
- `backend/src/index.js` 或 `backend/src/app.js`
- `backend/routes/index.js` (路由汇总)

**查找命令**:
```bash
# 在后端目录中搜索 /api/ 前缀
grep -r "'/api/" . --include="*.js" --include="*.ts"

# 或使用 PowerShell
Select-String -Path "*.js","*.ts" -Pattern "'/api/" -Recurse
```

### 步骤 3: 识别需要修改的文件

典型的需要修改的代码模式：

```javascript
// ❌ 需要修改
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/test', testRoutes);
app.use('/api/monitoring', monitoringRoutes);

// ✅ 修改为
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/test', testRoutes);
app.use('/monitoring', monitoringRoutes);
```

### 步骤 4: 常见的后端路由文件

#### Express.js 示例

**backend/server.js** 或 **backend/src/app.js**:
```javascript
// 查找类似这样的代码
const express = require('express');
const app = express();

// ❌ 旧的路由注册
app.use('/api/auth', require('./routes/auth'));
app.use('/api/test', require('./routes/test'));
app.use('/api/monitoring', require('./routes/monitoring'));

// ✅ 新的路由注册 (移除 /api)
app.use('/auth', require('./routes/auth'));
app.use('/test', require('./routes/test'));
app.use('/monitoring', require('./routes/monitoring'));
```

#### 可能的其他位置

**backend/routes/index.js**:
```javascript
const router = express.Router();

// ❌ 如果在这里有 /api 前缀
router.use('/api/auth', authRouter);

// ✅ 改为
router.use('/auth', authRouter);
```

### 步骤 5: 执行自动化搜索和替换

创建一个后端迁移脚本：

**backend-remove-api-prefix.ps1**:
```powershell
#!/usr/bin/env pwsh

Write-Host "🔧 后端 API 路径迁移" -ForegroundColor Cyan

$backendPath = "D:\myproject\Test-Web-backend"
cd $backendPath

# 搜索所有包含 '/api/' 的文件
Write-Host "`n搜索需要修改的文件..." -ForegroundColor Yellow

$files = Get-ChildItem -Path . -Include "*.js","*.ts" -Recurse | 
         Where-Object { $_.FullName -notmatch "node_modules" } |
         Select-String -Pattern "'/api/" |
         Select-Object -ExpandProperty Path -Unique

Write-Host "`n找到 $($files.Count) 个文件需要修改:" -ForegroundColor Green
$files | ForEach-Object { Write-Host "  - $_" -ForegroundColor Gray }

Write-Host "`n⚠️  请手动检查并修改这些文件" -ForegroundColor Yellow
Write-Host "   将 '/api/' 改为 '/'" -ForegroundColor Yellow
```

---

## 📝 详细修改清单

### 必须检查的文件

#### 1. 主应用文件
- [ ] `backend/server.js`
- [ ] `backend/src/index.js`
- [ ] `backend/src/app.js`
- [ ] `backend/app.js`

#### 2. 路由配置
- [ ] `backend/routes/index.js`
- [ ] `backend/src/routes/index.js`
- [ ] `backend/config/routes.js`

#### 3. 中间件配置
- [ ] CORS 配置
- [ ] 请求日志
- [ ] 认证中间件

#### 4. API 文档
- [ ] Swagger/OpenAPI 配置
- [ ] API 文档文件

---

## 🧪 测试后端更改

### 步骤 1: 启动后端服务器

```bash
cd D:\myproject\Test-Web-backend
npm run dev
```

### 步骤 2: 测试 API 端点

使用 curl 或 Postman 测试：

```bash
# 测试新的路径（无 /api 前缀）
curl http://localhost:3001/auth/login
curl http://localhost:3001/test/start
curl http://localhost:3001/monitoring/alerts

# 确保这些返回正常响应，而不是 404
```

### 步骤 3: 使用前端测试

```bash
# 在另一个终端，启动前端
cd D:\myproject\Test-Web
npm run frontend

# 在浏览器中测试
# 访问 http://localhost:5174
# 尝试登录和其他功能
```

---

## 🔍 常见的后端文件位置

### Express.js 项目

```
backend/
├── server.js           ← 主入口，查找 app.use('/api/...')
├── src/
│   ├── app.js         ← 应用配置
│   ├── index.js       ← 可能的主入口
│   └── routes/
│       ├── index.js   ← 路由汇总
│       ├── auth.js    ← 认证路由
│       ├── test.js    ← 测试路由
│       └── ...
└── config/
    └── routes.js      ← 路由配置
```

### NestJS 项目

```
backend/
├── src/
│   ├── main.ts        ← 主入口，查找 setGlobalPrefix('/api')
│   └── app.module.ts  ← 应用模块
```

**NestJS 示例**:
```typescript
// ❌ 旧的代码
app.setGlobalPrefix('api');

// ✅ 移除这行或改为空字符串
app.setGlobalPrefix(''); // 或直接删除这行
```

---

## 📋 提交后端更改

修改完成后，提交更改：

```bash
cd D:\myproject\Test-Web-backend

# 查看修改
git status
git diff

# 添加修改
git add .

# 提交
git commit -m "fix(api): 移除后端路由 /api 前缀

- 更新所有路由注册，移除 /api 前缀
- 与前端 API 调用保持一致
- 相关前端更改: feature/frontend-ui-dev 分支

Breaking Change: 所有 API 路径不再包含 /api 前缀
- 旧: POST /api/auth/login
- 新: POST /auth/login"

# 推送
git push -u origin feature/backend-api-dev
```

---

## 🔄 同步部署计划

### 重要提示

**前后端必须同时部署**，否则会出现 404 错误！

### 部署顺序

#### 选项 1: 先合并到 main，再部署（推荐）

```bash
# 1. 在主仓库切换到 main
cd D:\myproject\Test-Web
git checkout main

# 2. 合并前端分支
git merge feature/frontend-ui-dev

# 3. 合并后端分支
git merge feature/backend-api-dev

# 4. 推送
git push origin main

# 5. 同时部署前后端
```

#### 选项 2: 使用功能开关（渐进式）

如果不能同时部署，可以临时支持两种路径：

**后端临时方案** (不推荐，仅应急):
```javascript
// 同时支持旧路径和新路径
app.use('/api/auth', authRoutes);  // 旧路径，临时保留
app.use('/auth', authRoutes);      // 新路径

// 一周后移除旧路径
```

---

## 🆘 问题排查

### 问题 1: 前端调用后端返回 404

**原因**: 后端还没有移除 `/api` 前缀

**解决**: 
- 检查后端路由配置
- 确保所有 `app.use('/api/...')` 改为 `app.use('/...')`

### 问题 2: CORS 错误

**原因**: CORS 配置可能包含 `/api` 路径限制

**检查**:
```javascript
// 检查 CORS 配置
app.use(cors({
  origin: 'http://localhost:5174',
  // 确保没有路径限制
}));
```

### 问题 3: Nginx 反向代理

如果使用 Nginx，需要更新配置：

```nginx
# ❌ 旧配置
location /api/ {
    proxy_pass http://backend:3001/api/;
}

# ✅ 新配置
location / {
    proxy_pass http://backend:3001/;
}
```

---

## 📚 相关文档

- [前端 API 更改文档](docs/FRONTEND_API_CHANGES.md)
- [API 迁移完成报告](API_MIGRATION_COMPLETION_REPORT.md)
- [Git 提交指南](GIT_COMMIT_GUIDE.md)

---

## 🎯 快速检查清单

在推送前端代码之前，确保：

- [ ] 找到后端的路由注册文件
- [ ] 移除所有 `/api` 前缀
- [ ] 更新 API 文档（如 Swagger）
- [ ] 本地测试前后端联调
- [ ] 提交后端更改
- [ ] 与团队协调部署时间
- [ ] 准备回滚方案

---

**最后更新**: 2025-10-06  
**前端状态**: ✅ 已完成  
**后端状态**: ⚠️ 待处理  
**优先级**: 🔴 高 - 必须在前端推送后立即处理

