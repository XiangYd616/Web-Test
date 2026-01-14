# 项目重构迁移指南

## 📋 目录

1. [开始之前](#开始之前)
2. [快速开始](#快速开始)
3. [详细步骤](#详细步骤)
4. [常见问题](#常见问题)
5. [回滚方案](#回滚方案)

---

## 开始之前

### 前置条件

- Node.js >= 18.0.0
- npm >= 9.0.0
- Git 已安装
- 已备份当前代码

### 预计时间

- **快速清理**: 1-2 小时
- **完整重构**: 2-3 周

### 风险评估

- **低风险**: 删除重复文件、更新导入
- **中风险**: 重组目录结构、合并路由
- **高风险**: 数据库迁移、API 变更

---

## 快速开始

### 步骤 1: 创建备份

```powershell
# 创建备份分支
git checkout -b backup/pre-restructure-$(Get-Date -Format 'yyyyMMdd')
git push origin backup/pre-restructure-$(Get-Date -Format 'yyyyMMdd')

# 创建工作分支
git checkout -b refactor/project-restructure
```

### 步骤 2: 运行分析工具

```powershell
# 分析当前项目结构
.\scripts\cleanup\analyze-structure.ps1 -Detailed

# 查看分析报告
cat structure-analysis.json
```

### 步骤 3: 清理重复文件（预演）

```powershell
# 先运行预演模式，查看将要删除的文件
.\scripts\cleanup\cleanup-duplicates.ps1 -DryRun -Verbose

# 确认无误后，执行实际删除
.\scripts\cleanup\cleanup-duplicates.ps1
```

### 步骤 4: 更新导入路径（预演）

```powershell
# 先运行预演模式
.\scripts\cleanup\update-imports.ps1 -DryRun

# 确认无误后，执行实际更新
.\scripts\cleanup\update-imports.ps1
```

### 步骤 5: 验证

```powershell
# TypeScript 类型检查
npm run type-check

# Lint 检查
npm run lint

# 运行测试
npm test

# 构建检查
npm run build:check
```

---

## 详细步骤

### 阶段 1: 清理 Shared 模块

#### 1.1 删除重复的 JS 文件

**要删除的文件**:

```
shared/index.js
shared/types/index.js
shared/constants/index.js
shared/utils/index.js
shared/utils/apiResponseBuilder.js
```

**手动操作**:

```powershell
# 检查文件是否被引用
Get-ChildItem -Path backend,frontend -Recurse -Include *.js,*.ts,*.tsx |
  Select-String "shared/index.js" |
  Select-Object -ExpandProperty Path -Unique

# 如果有引用，先更新引用
# 将 'shared/index.js' 改为 'shared/index'
# 将 'shared/types/index.js' 改为 'shared/types'
```

**自动操作**:

```powershell
.\scripts\cleanup\cleanup-duplicates.ps1
```

#### 1.2 更新 package.json

**shared/package.json**:

```json
{
  "name": "@test-web/shared",
  "version": "1.0.0",
  "type": "module",
  "main": "./index.ts",
  "types": "./index.ts",
  "exports": {
    ".": "./index.ts",
    "./types": "./types/index.ts",
    "./utils": "./utils/index.ts",
    "./constants": "./constants/index.ts"
  }
}
```

### 阶段 2: 重组 Backend 结构

#### 2.1 创建新的目录结构

```powershell
# 创建新目录
New-Item -ItemType Directory -Path backend/src/modules -Force
New-Item -ItemType Directory -Path backend/src/core -Force
New-Item -ItemType Directory -Path backend/src/shared -Force

# 创建模块目录
$modules = @('auth', 'test', 'admin', 'analytics', 'report')
foreach ($module in $modules) {
    New-Item -ItemType Directory -Path "backend/src/modules/$module" -Force
}
```

#### 2.2 迁移路由文件

**示例: 合并测试相关路由**

```javascript
// backend/src/modules/test/test.routes.js
import express from 'express';
import { performanceController } from './controllers/performance.controller.js';
import { securityController } from './controllers/security.controller.js';
import { seoController } from './controllers/seo.controller.js';

const router = express.Router();

// Performance 测试路由
router.post('/performance', performanceController.runTest);
router.get('/performance/:id', performanceController.getResult);

// Security 测试路由
router.post('/security', securityController.runTest);
router.get('/security/:id', securityController.getResult);

// SEO 测试路由
router.post('/seo', seoController.runTest);
router.get('/seo/:id', seoController.getResult);

export default router;
```

**迁移脚本**:

```powershell
# 移动文件到新位置
Move-Item backend/routes/performance.js backend/src/modules/test/controllers/performance.controller.js
Move-Item backend/routes/security.js backend/src/modules/test/controllers/security.controller.js
Move-Item backend/routes/seo.js backend/src/modules/test/controllers/seo.controller.js
```

#### 2.3 更新主应用文件

**backend/src/app.js**:

```javascript
import express from 'express';
import authRoutes from './modules/auth/auth.routes.js';
import testRoutes from './modules/test/test.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';

const app = express();

// 中间件
app.use(express.json());

// 路由
app.use('/api/auth', authRoutes);
app.use('/api/test', testRoutes);
app.use('/api/admin', adminRoutes);

export default app;
```

### 阶段 3: 合并重复中间件

#### 3.1 合并缓存中间件

**删除**: `backend/middleware/cacheMiddleware.js`  
**保留**: `backend/middleware/cache.middleware.js`

```javascript
// backend/src/shared/middleware/cache.middleware.js
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export const cacheMiddleware = (duration = 300) => {
  return async (req, res, next) => {
    const key = `cache:${req.originalUrl}`;

    try {
      const cached = await redis.get(key);
      if (cached) {
        return res.json(JSON.parse(cached));
      }

      // 保存原始 json 方法
      const originalJson = res.json.bind(res);

      // 重写 json 方法以缓存响应
      res.json = data => {
        redis.setex(key, duration, JSON.stringify(data));
        return originalJson(data);
      };

      next();
    } catch (error) {
      next();
    }
  };
};
```

#### 3.2 合并错误处理中间件

**删除**: `backend/middleware/unifiedErrorHandler.js`  
**保留**: `backend/middleware/error.middleware.js`

```javascript
// backend/src/shared/middleware/error.middleware.js
import { ApiResponseBuilder } from '@shared/utils/apiResponseBuilder';

export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // 已知错误类型
  if (err.name === 'ValidationError') {
    return res
      .status(400)
      .json(ApiResponseBuilder.validationError(err.message, err.details));
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json(ApiResponseBuilder.unauthorized(err.message));
  }

  // 默认服务器错误
  res.status(500).json(ApiResponseBuilder.serverError('Internal server error'));
};
```

### 阶段 4: 统一命名规范

#### 4.1 文件重命名映射表

| 旧文件名               | 新文件名                | 类型      |
| ---------------------- | ----------------------- | --------- |
| `TestEngineManager.js` | `testEngine.manager.js` | Manager   |
| `ReportGenerator.js`   | `report.generator.js`   | Generator |
| `AlertManager.js`      | `alert.manager.js`      | Manager   |
| `ConfigCenter.js`      | `config.center.js`      | Service   |
| `DatabaseManager.js`   | `database.manager.js`   | Manager   |

#### 4.2 批量重命名脚本

```powershell
# 重命名脚本
$renames = @{
    'backend/engines/TestEngineManager.js' = 'backend/src/core/testEngine.manager.js'
    'backend/reports/ReportGenerator.js' = 'backend/src/modules/report/report.generator.js'
    'backend/alert/AlertManager.js' = 'backend/src/core/alert.manager.js'
}

foreach ($old in $renames.Keys) {
    $new = $renames[$old]
    if (Test-Path $old) {
        $newDir = Split-Path $new -Parent
        if (-not (Test-Path $newDir)) {
            New-Item -ItemType Directory -Path $newDir -Force
        }
        Move-Item $old $new -Force
        Write-Host "Renamed: $old -> $new"
    }
}
```

### 阶段 5: 整理文档

#### 5.1 保留的核心文档

```
docs/
├── README.md              ← 项目概述
├── ARCHITECTURE.md        ← 架构设计
├── API.md                 ← API 文档
├── DEVELOPMENT.md         ← 开发指南
├── DEPLOYMENT.md          ← 部署指南
├── TESTING.md             ← 测试指南
├── TROUBLESHOOTING.md     ← 故障排查
└── CHANGELOG.md           ← 变更日志
```

#### 5.2 归档旧文档

```powershell
# 创建归档目录
New-Item -ItemType Directory -Path docs/archive -Force

# 移动旧文档
$oldDocs = Get-ChildItem -Path docs -Filter *.md |
  Where-Object { $_.Name -notin @('README.md', 'ARCHITECTURE.md', 'API.md', 'DEVELOPMENT.md', 'DEPLOYMENT.md', 'TESTING.md', 'TROUBLESHOOTING.md', 'CHANGELOG.md') }

foreach ($doc in $oldDocs) {
    Move-Item $doc.FullName "docs/archive/$($doc.Name)" -Force
}

# 归档分析目录
Move-Item docs/analysis docs/archive/analysis -Force
```

### 阶段 6: 优化依赖

#### 6.1 清理重复依赖

**根 package.json** (保留共享依赖):

```json
{
  "workspaces": ["frontend", "backend", "shared"],
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "axios": "^1.11.0",
    "date-fns": "^4.1.0"
  }
}
```

**frontend/package.json** (只保留前端特定依赖):

```json
{
  "dependencies": {
    "antd": "^5.27.1",
    "react-router-dom": "^6.20.1",
    "recharts": "^2.15.3"
  }
}
```

**backend/package.json** (只保留后端特定依赖):

```json
{
  "dependencies": {
    "express": "^4.21.2",
    "pg": "^8.16.2",
    "redis": "^5.5.6"
  }
}
```

#### 6.2 移除未使用的依赖

```powershell
# 检查未使用的依赖
cd backend
npx depcheck

cd ../frontend
npx depcheck

# 移除未使用的依赖
npm uninstall <package-name>
```

### 阶段 7: 类型系统优化

#### 7.1 解决类型冲突

**shared/types/index.ts**:

```typescript
// 使用命名空间避免冲突
export namespace API {
  export * from './api.types';
}

export namespace Test {
  export * from './test.types';
}

export namespace Auth {
  export * from './auth.types';
}

// 导出常用类型（无冲突）
export * from './base.types';
export * from './ui.types';
export * from './system.types';
```

#### 7.2 更新导入方式

**之前**:

```typescript
import { TestType, ApiResponse } from '@shared/types';
// 可能导致冲突
```

**之后**:

```typescript
import { Test, API } from '@shared/types';

type MyTestType = Test.TestType;
type MyApiResponse = API.ApiResponse;
```

---

## 常见问题

### Q1: 删除 JS 文件后出现导入错误

**问题**: `Cannot find module 'shared/index.js'`

**解决方案**:

```powershell
# 运行导入更新脚本
.\scripts\cleanup\update-imports.ps1

# 或手动更新
# 将 from 'shared/index.js' 改为 from 'shared/index'
```

### Q2: TypeScript 类型检查失败

**问题**: `Type 'X' is not assignable to type 'Y'`

**解决方案**:

```typescript
// 检查类型导入是否正确
import { API } from '@shared/types';

// 使用命名空间避免冲突
type Response = API.ApiResponse;
```

### Q3: 构建失败

**问题**: `Module not found`

**解决方案**:

```powershell
# 清理缓存
npm run clean

# 重新安装依赖
rm -rf node_modules package-lock.json
npm install

# 重新构建
npm run build
```

### Q4: 测试失败

**问题**: 测试找不到模块

**解决方案**:

```javascript
// 更新测试配置中的路径映射
// vitest.config.ts
export default defineConfig({
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'shared'),
      '@backend': resolve(__dirname, 'backend/src'),
    },
  },
});
```

---

## 回滚方案

### 完全回滚

```powershell
# 回滚到备份分支
git checkout backup/pre-restructure-<date>

# 或者重置到特定提交
git log --oneline
git reset --hard <commit-hash>
```

### 部分回滚

```powershell
# 只回滚特定文件
git checkout HEAD -- <file-path>

# 回滚特定目录
git checkout HEAD -- backend/src/
```

---

## 验证清单

完成重构后，请确认以下项目:

- [ ] 所有测试通过 (`npm test`)
- [ ] TypeScript 检查通过 (`npm run type-check`)
- [ ] Lint 检查通过 (`npm run lint`)
- [ ] 构建成功 (`npm run build`)
- [ ] 开发服务器正常启动 (`npm run dev`)
- [ ] 生产构建正常 (`npm run build:check`)
- [ ] 文档已更新
- [ ] 依赖审计通过 (`npm audit`)
- [ ] 性能测试通过
- [ ] E2E 测试通过 (`npm run e2e`)

---

## 下一步

完成迁移后:

1. 更新 CI/CD 配置
2. 通知团队成员
3. 更新部署文档
4. 进行性能测试
5. 监控生产环境

---

**需要帮助?** 查看 `TROUBLESHOOTING.md` 或联系技术团队。
