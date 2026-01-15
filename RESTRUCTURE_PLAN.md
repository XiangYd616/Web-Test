# 项目重构执行计划

## 阶段 1: 准备工作（第1天）

### 1.1 创建备份

```bash
# 创建备份分支
git checkout -b backup/pre-restructure
git push origin backup/pre-restructure

# 创建工作分支
git checkout -b refactor/project-restructure
```

### 1.2 安装依赖检查工具

```bash
npm install -g depcheck
npm install -g madge
```

---

## 阶段 2: 清理重复文件（第2-3天）

### 2.1 删除 Shared 模块中的 JS 文件

**要删除的文件**:

- `shared/index.js` → 保留 `shared/index.ts`
- `shared/types/index.js` → 保留 `shared/types/index.ts`
- `shared/constants/index.js` → 保留 `shared/constants/index.ts`
- `shared/utils/index.js` → 保留 `shared/utils/index.ts`
- `shared/utils/apiResponseBuilder.js` → 保留
  `shared/utils/apiResponseBuilder.ts`

**执行步骤**:

1. 检查 JS 文件的引用
2. 更新所有导入路径为 TS 版本
3. 删除 JS 文件
4. 运行测试验证

### 2.2 合并重复的中间件

**要合并的文件**:

- `backend/middleware/cache.js` + `backend/middleware/cacheMiddleware.js` →
  `backend/middleware/cache.middleware.js`
- `backend/middleware/errorHandler.js` +
  `backend/middleware/ErrorHandler.js` →
  `backend/middleware/error.middleware.js`

### 2.3 清理未使用的文件

```bash
# 运行依赖检查
cd backend && npx depcheck
cd ../frontend && npx depcheck
```

---

## 阶段 3: 重组 Backend 结构（第4-7天）

### 3.1 新的 Backend 结构

```
backend/
├── src/
│   ├── modules/                    ← 按业务模块组织
│   │   ├── auth/
│   │   │   ├── auth.controller.js
│   │   │   ├── auth.service.js
│   │   │   ├── auth.routes.js
│   │   │   └── auth.validation.js
│   │   ├── test/
│   │   │   ├── controllers/
│   │   │   ├── services/
│   │   │   ├── engines/
│   │   │   └── routes/
│   │   ├── admin/
│   │   ├── analytics/
│   │   └── report/
│   │
│   ├── core/                       ← 核心功能
│   │   ├── database/
│   │   ├── cache/
│   │   ├── logger/
│   │   └── config/
│   │
│   ├── shared/                     ← 共享工具
│   │   ├── middleware/
│   │   ├── utils/
│   │   └── constants/
│   │
│   ├── types/                      ← 类型定义
│   └── app.js                      ← 应用入口
│
└── package.json
```

### 3.2 路由重组计划

**当前**: 56 个路由文件  
**目标**: 15-20 个模块化路由

**合并方案**:

1. **测试相关** (合并 20+ 个测试路由)
   - `routes/test/performance.js`
   - `routes/test/security.js`
   - `routes/test/seo.js`
   - `routes/test/api.js`
   - 等等...

2. **管理相关** (合并 10+ 个管理路由)
   - `routes/admin.js`
   - `routes/users.js`
   - `routes/roles.js`
   - 等等...

3. **分析相关** (合并 5+ 个分析路由)
   - `routes/analytics.js`
   - `routes/reports.js`
   - `routes/statistics.js`

---

## 阶段 4: 统一命名规范（第8-9天）

### 4.1 文件命名规范

**规则**:

- **Controllers**: `*.controller.js` (camelCase)
- **Services**: `*.service.js` (camelCase)
- **Routes**: `*.routes.js` (camelCase)
- **Middleware**: `*.middleware.js` (camelCase)
- **Utils**: `*.util.js` (camelCase)
- **Models**: `*.model.js` (PascalCase for class files)
- **Types**: `*.types.ts` (camelCase)

**需要重命名的文件**:

```
backend/
├── TestEngineManager.js → testEngine.manager.js
├── ReportGenerator.js → report.generator.js
├── AlertManager.js → alert.manager.js
├── ConfigCenter.js → config.center.js
└── DatabaseManager.js → database.manager.js
```

### 4.2 变量和函数命名

**规则**:

- 变量: camelCase
- 函数: camelCase
- 类: PascalCase
- 常量: UPPER_SNAKE_CASE
- 私有成员: \_camelCase

---

## 阶段 5: 整理文档结构（第10-11天）

### 5.1 新的文档结构

```
docs/
├── README.md                    ← 项目概述和快速开始
├── ARCHITECTURE.md              ← 架构设计文档
├── API.md                       ← API 文档
├── DEVELOPMENT.md               ← 开发指南
├── DEPLOYMENT.md                ← 部署指南
├── TESTING.md                   ← 测试指南
├── TROUBLESHOOTING.md           ← 故障排查
├── CHANGELOG.md                 ← 变更日志
├── CONTRIBUTING.md              ← 贡献指南
└── guides/                      ← 详细指南
    ├── frontend-guide.md
    ├── backend-guide.md
    └── database-guide.md
```

### 5.2 文档整合计划

**删除或归档**:

- 过时的分析文档 (analysis/ 目录)
- 重复的架构文档
- 临时的测试报告

**保留并更新**:

- 核心 API 文档
- 架构设计文档
- 开发和部署指南

---

## 阶段 6: 优化配置管理（第12-13天）

### 6.1 统一配置文件位置

```
config/
├── eslint/
│   ├── base.config.js
│   ├── frontend.config.js
│   └── backend.config.js
├── typescript/
│   ├── base.json
│   ├── frontend.json
│   └── backend.json
├── vite/
│   └── vite.config.ts
└── test/
    ├── vitest.config.ts
    └── playwright.config.ts
```

### 6.2 环境变量管理

**创建统一的环境变量文件**:

```
.env.example              ← 示例配置
.env.development          ← 开发环境
.env.production           ← 生产环境
.env.test                 ← 测试环境
```

---

## 阶段 7: 依赖优化（第14天）

### 7.1 清理重复依赖

**在根 package.json 中统一管理**:

```json
{
  "workspaces": ["frontend", "backend", "shared"],
  "dependencies": {
    "react": "^18.2.0",
    "axios": "^1.11.0"
  }
}
```

**从子包中移除重复依赖**

### 7.2 UI 库选择

**决策**: 选择一个主要 UI 库

- 选项 A: 只使用 Ant Design
- 选项 B: 只使用 Material UI
- 推荐: Ant Design (已有更多组件使用)

**移除未使用的 UI 库依赖**

---

## 阶段 8: 类型系统优化（第15-16天）

### 8.1 解决类型冲突

**修复 shared/types/index.ts**:

```typescript
// 统一导出，避免命名冲突
export * from './api.types';
export * from './test.types';
export * from './auth.types';
// ... 其他类型

// 对于冲突的类型，使用命名空间
export namespace API {
  export * from './api.types';
}

export namespace Test {
  export * from './test.types';
}
```

### 8.2 类型导入规范

**推荐导入方式**:

```typescript
// 具名导入
import { ApiResponse, TestType } from '@shared/types';

// 命名空间导入（避免冲突）
import { API, Test } from '@shared/types';
type Response = API.ApiResponse;
type Type = Test.TestType;
```

---

## 阶段 9: 测试补充（第17-18天）

### 9.1 测试覆盖目标

- **单元测试**: 核心业务逻辑 >80%
- **集成测试**: API 端点 >70%
- **E2E 测试**: 关键用户流程 >60%

### 9.2 测试结构

```
tests/
├── unit/
│   ├── backend/
│   └── frontend/
├── integration/
│   └── api/
└── e2e/
    └── flows/
```

---

## 阶段 10: 验证和发布（第19-20天）

### 10.1 验证清单

- [ ] 所有测试通过
- [ ] 构建成功
- [ ] 类型检查通过
- [ ] Lint 检查通过
- [ ] 文档更新完成
- [ ] 依赖审计通过

### 10.2 发布流程

```bash
# 1. 运行完整测试
npm run test
npm run e2e

# 2. 构建检查
npm run build:check

# 3. 创建 PR
git push origin refactor/project-restructure

# 4. Code Review

# 5. 合并到主分支
git checkout main
git merge refactor/project-restructure

# 6. 标记版本
git tag -a v2.0.0 -m "Major restructure"
git push origin v2.0.0
```

---

## 回滚计划

如果重构出现问题:

```bash
# 回滚到备份分支
git checkout backup/pre-restructure

# 或者重置到特定提交
git reset --hard <commit-hash>
```

---

## 成功指标

### 量化指标

- 文件数量减少 30%
- 代码重复率降低 50%
- 构建时间减少 20%
- 测试覆盖率提升到 75%+

### 质量指标

- 统一的代码风格
- 清晰的模块边界
- 完善的文档
- 稳定的 CI/CD

---

## 团队协作

### 沟通计划

- 每日站会: 同步进度
- 周会: 回顾和调整
- 文档: 记录所有重大决策

### 责任分配

- 后端重构: Backend Team
- 前端重构: Frontend Team
- 文档整理: Tech Writer
- 测试补充: QA Team

---

**预计总时间**: 20 个工作日  
**建议团队规模**: 4-6 人  
**风险等级**: 中等
