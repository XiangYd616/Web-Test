# 项目组织规范

## 📋 概述

本文档定义了项目的文件组织规范，确保项目结构清晰、可维护，防止再次出现混乱。

## 📁 目录结构规范

### 1. 页面组件 (`src/pages/`)

页面组件按功能分类组织，每个分类一个目录：

```
src/pages/
├── auth/                 # 认证相关页面
│   ├── Login.tsx
│   └── Register.tsx
├── testing/              # 核心测试功能页面
│   ├── APITest.tsx
│   ├── CompatibilityTest.tsx
│   ├── InfrastructureTest.tsx
│   ├── SecurityTest.tsx
│   ├── SEOTest.tsx
│   ├── StressTest.tsx
│   ├── UXTest.tsx
│   └── WebsiteTest.tsx
├── admin/                # 管理相关页面
│   ├── Admin.tsx
│   ├── DataManagement.tsx
│   └── Settings.tsx
├── user/                 # 用户相关页面
│   ├── UserProfile.tsx
│   └── UserBookmarks.tsx
├── reports/              # 报告和分析页面
│   ├── Analytics.tsx
│   ├── MonitoringDashboard.tsx
│   ├── PerformanceAnalysis.tsx
│   ├── Reports.tsx
│   ├── SecurityReport.tsx
│   ├── Statistics.tsx
│   ├── StressTestDetail.tsx
│   ├── StressTestReport.tsx
│   ├── TestHistory.tsx
│   └── TestResultDetail.tsx
├── config/               # 配置和集成页面
│   ├── APIKeys.tsx
│   ├── CICDIntegration.tsx
│   ├── Integrations.tsx
│   ├── Notifications.tsx
│   ├── ScheduledTasks.tsx
│   ├── TestOptimizations.tsx
│   ├── TestSchedule.tsx
│   └── Webhooks.tsx
├── docs/                 # 文档页面
│   ├── APIDocs.tsx
│   └── Help.tsx
├── misc/                 # 其他页面
│   ├── DownloadDesktop.tsx
│   └── Subscription.tsx
└── dashboard/            # 仪表板页面（特殊目录）
    └── ModernDashboard.tsx
```

#### 页面分类规则

1. **auth/** - 认证和授权相关页面
   - 登录、注册、密码重置等

2. **testing/** - 核心测试功能页面
   - 只包含实际的测试功能页面
   - 不包含测试结果展示页面

3. **admin/** - 管理功能页面
   - 系统管理、数据管理、设置等

4. **user/** - 用户相关页面
   - 用户资料、书签、个人设置等

5. **reports/** - 报告和分析页面
   - 测试结果、统计分析、监控面板等
   - 所有展示类页面

6. **config/** - 配置和集成页面
   - 系统配置、第三方集成、通知设置等

7. **docs/** - 文档页面
   - API文档、帮助页面等

8. **misc/** - 其他页面
   - 不属于上述分类的页面

### 2. 组件库 (`src/components/`)

组件按功能和层级组织：

```
src/components/
├── ui/                   # 基础UI组件
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Modal.tsx
│   └── ...
├── layout/               # 布局组件
│   ├── Layout.tsx
│   ├── PageLayout.tsx
│   └── ...
├── charts/               # 图表组件
│   ├── Chart.tsx
│   ├── PerformanceChart.tsx
│   └── ...
├── auth/                 # 认证相关组件
│   ├── ProtectedRoute.tsx
│   ├── LoginPrompt.tsx
│   └── ...
├── testing/              # 测试相关组件
│   ├── TestControls.tsx
│   ├── TestResultDisplay.tsx
│   └── ...
├── analytics/            # 分析相关组件
│   ├── AnalyticsOverview.tsx
│   ├── PerformanceAnalysis.tsx
│   └── ...
├── admin/                # 管理相关组件
│   ├── UserManagement.tsx
│   ├── SystemMonitor.tsx
│   └── ...
└── ...
```

#### 组件分类规则

1. **ui/** - 基础UI组件
   - 可复用的基础组件
   - 不包含业务逻辑

2. **layout/** - 布局组件
   - 页面布局、导航等

3. **charts/** - 图表组件
   - 所有图表相关组件

4. **功能模块/** - 按业务功能分类
   - auth, testing, analytics, admin等
   - 包含特定业务逻辑的组件

### 3. 服务层 (`src/services/`)

服务按功能模块组织：

```
src/services/
├── api/                  # API相关服务
├── auth/                 # 认证服务
├── testing/              # 测试服务
├── analytics/            # 分析服务
├── data/                 # 数据服务
└── utils/                # 工具服务
```

## 🚫 禁止的做法

### 1. 文件组织禁忌

❌ **禁止在根目录堆积文件**
```
src/pages/
├── Login.tsx             # ❌ 应该在 auth/ 目录下
├── APITest.tsx           # ❌ 应该在 testing/ 目录下
├── Analytics.tsx         # ❌ 应该在 reports/ 目录下
└── ...                   # ❌ 37个文件堆在一起
```

❌ **禁止创建空目录或只有index.ts的目录**
```
src/pages/
├── empty-dir/            # ❌ 空目录
└── only-index/           # ❌ 只有index.ts的目录
    └── index.ts
```

❌ **禁止功能重复的目录**
```
src/components/
├── analysis/             # ❌ 与analytics重复
├── analytics/
├── modern/               # ❌ 与charts重复
└── charts/
```

### 2. 命名禁忌

❌ **禁止不一致的命名**
- 单复数混用：`analysis` vs `analytics`
- 功能不明确：`modern`, `misc`, `business`
- 层级混乱：既有文件又有同名目录

❌ **禁止无意义的分类**
```
src/components/
├── misc/                 # ❌ 垃圾桶分类
├── other/                # ❌ 无意义分类
└── stuff/                # ❌ 模糊分类
```

## ✅ 最佳实践

### 1. 新增页面规则

1. **确定功能分类**
   - 认证相关 → `auth/`
   - 测试功能 → `testing/`
   - 报告展示 → `reports/`
   - 配置管理 → `config/`
   - 其他 → 根据功能创建新分类

2. **命名规范**
   - 使用PascalCase：`UserProfile.tsx`
   - 功能明确：`SecurityTest.tsx` 而不是 `Test1.tsx`
   - 避免缩写：`Authentication.tsx` 而不是 `Auth.tsx`

3. **更新路由配置**
   - 同时更新 `AppRoutes.tsx`
   - 更新 `routePreloader.ts`
   - 更新 `routeUtils.ts`

### 2. 新增组件规则

1. **确定组件层级**
   - 基础UI → `ui/`
   - 业务组件 → 对应功能目录
   - 布局组件 → `layout/`

2. **避免过度分类**
   - 不要为单个组件创建目录
   - 相关组件放在同一目录

### 3. 重构指导

1. **定期检查**
   - 每月运行清理脚本
   - 检查是否有新的混乱

2. **重构原则**
   - 功能相关性优先
   - 保持目录平衡
   - 避免过深嵌套

## 🔧 维护工具

### 1. 自动化脚本

```bash
# 项目结构重构
npm run restructure

# 清理空目录
npm run clean:empty-dirs

# 更新导入路径
npm run update:imports

# 路由验证
npm run validate:routes
```

### 2. 定期维护

1. **每周检查**
   - 运行清理脚本
   - 检查新增文件分类

2. **每月审查**
   - 评估目录结构
   - 优化组织方式

3. **重构时机**
   - 文件数量超过阈值
   - 出现功能重复
   - 开发效率下降

## 📊 质量指标

### 1. 结构健康度指标

- **目录平衡度**: 每个目录文件数量适中（2-15个）
- **分类清晰度**: 每个文件都有明确的功能分类
- **命名一致性**: 遵循统一的命名规范
- **重复度**: 无功能重复的目录或文件

### 2. 维护便利性指标

- **查找效率**: 能快速定位文件
- **新增便利**: 新文件有明确的归属
- **重构安全**: 重构不会破坏功能

## 🎯 总结

遵循这些规范可以确保：

1. **项目结构清晰** - 每个文件都有明确的位置
2. **开发效率高** - 快速定位和修改文件
3. **维护成本低** - 减少重构和整理的工作量
4. **团队协作好** - 统一的组织方式便于协作

**记住**: 好的项目结构是项目成功的基础！
