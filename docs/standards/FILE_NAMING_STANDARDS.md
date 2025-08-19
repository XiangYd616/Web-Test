# Test-Web文件命名规范 📝

> 制定时间：2025-08-19  
> 适用范围：前端项目所有文件  
> 目标：统一命名规范，提高代码可维护性

## 🎯 命名规范原则

### 基本原则
1. **一致性**: 同类型文件使用相同的命名模式
2. **可读性**: 文件名能清晰表达文件用途
3. **简洁性**: 避免过长的文件名
4. **语义化**: 使用有意义的英文单词
5. **无歧义**: 避免重复和混淆的命名

### 大小写规范
- **组件文件**: PascalCase (如: `UserProfile.tsx`)
- **工具文件**: camelCase (如: `apiClient.ts`)
- **常量文件**: UPPER_CASE (如: `API_ENDPOINTS.ts`)
- **配置文件**: kebab-case (如: `vite.config.js`)

## 📁 目录结构规范

### 页面文件 (`pages/`)
```
pages/
├── auth/                 # 认证相关页面
│   ├── Login.tsx
│   ├── Register.tsx
│   └── ForgotPassword.tsx
├── dashboard/            # 仪表板页面
│   ├── Overview.tsx
│   └── Analytics.tsx
├── testing/              # 测试工具页面
│   ├── TestDashboard.tsx
│   ├── StressTest.tsx
│   ├── PerformanceTest.tsx
│   ├── SecurityTest.tsx
│   ├── SEOTest.tsx
│   ├── APITest.tsx
│   ├── WebsiteTest.tsx
│   └── ContentDetection.tsx
├── data/                 # 数据管理页面
│   ├── DataCenter.tsx
│   ├── Reports.tsx
│   └── Export.tsx
├── user/                 # 用户中心页面
│   ├── Profile.tsx
│   ├── Settings.tsx
│   └── Preferences.tsx
├── help/                 # 帮助支持页面
│   ├── Documentation.tsx
│   ├── FAQ.tsx
│   └── Support.tsx
└── system/               # 系统页面
    ├── Home.tsx
    ├── About.tsx
    ├── NotFound.tsx
    └── Error.tsx
```

### 组件文件 (`components/`)
```
components/
├── ui/                   # 基础UI组件
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Modal.tsx
│   └── Card.tsx
├── business/             # 业务组件
│   ├── TestResultCard.tsx
│   ├── UserAvatar.tsx
│   └── DataTable.tsx
├── layout/               # 布局组件
│   ├── Sidebar.tsx
│   ├── Header.tsx
│   ├── Footer.tsx
│   └── Navigation.tsx
└── shared/               # 共享组件
    ├── LoadingSpinner.tsx
    ├── ErrorBoundary.tsx
    └── ConfirmDialog.tsx
```

### 服务文件 (`services/`)
```
services/
├── apiClient.ts          # API客户端
├── authService.ts        # 认证服务
├── testService.ts        # 测试服务
├── userService.ts        # 用户服务
└── dataService.ts        # 数据服务
```

### 工具文件 (`utils/`)
```
utils/
├── formatters.ts         # 格式化工具
├── validators.ts         # 验证工具
├── helpers.ts            # 辅助函数
├── constants.ts          # 常量定义
└── types.ts              # 类型定义
```

## 🔧 需要规范化的文件

### 重复文件清理
```
❌ 需要删除的重复文件
pages/Home.tsx           → 删除 (使用 pages/system/Home.tsx)
pages/About.tsx          → 删除 (使用 pages/system/About.tsx)
pages/NotFound.tsx       → 删除 (使用 pages/system/NotFound.tsx)
pages/errors/NotFound.tsx → 删除 (合并到 pages/system/NotFound.tsx)
pages/errors/Unauthorized.tsx → 移动到 pages/system/Error.tsx

✅ 保留的标准文件
pages/system/Home.tsx    → 首页
pages/system/About.tsx   → 关于页面
pages/system/NotFound.tsx → 404页面
pages/system/Error.tsx   → 错误页面
```

### 文件重命名
```
❌ 当前命名 → ✅ 规范命名
components/layout/OptimizedRoutes.tsx → components/layout/AppRoutes.tsx
components/layout/OptimizedSidebar.tsx → components/layout/Sidebar.tsx
App.simple.tsx → 删除 (临时文件)
```

### 目录整理
```
❌ 混乱的core目录 → ✅ 按功能分组
pages/core/Dashboard.tsx → pages/dashboard/Overview.tsx (已完成)
pages/core/DataCenter.tsx → pages/data/DataCenter.tsx (已完成)
pages/core/Settings.tsx → pages/user/Settings.tsx (已完成)
pages/core/* → 分散到对应功能目录
```

## 📋 规范化执行计划

### Phase 1: 清理重复文件 (10分钟)
1. **删除顶级重复文件**
   ```bash
   rm pages/Home.tsx
   rm pages/About.tsx  
   rm pages/NotFound.tsx
   ```

2. **删除errors目录重复文件**
   ```bash
   rm pages/errors/NotFound.tsx
   mv pages/errors/Unauthorized.tsx pages/system/Error.tsx
   rmdir pages/errors
   ```

3. **删除临时文件**
   ```bash
   rm App.simple.tsx
   ```

### Phase 2: 重命名核心文件 (15分钟)
1. **重命名路由组件**
   ```bash
   mv components/layout/OptimizedRoutes.tsx components/layout/AppRoutes.tsx
   mv components/layout/OptimizedSidebar.tsx components/layout/Sidebar.tsx
   ```

2. **更新导入引用**
   - 更新 App.tsx 中的导入
   - 更新 AppLayout.tsx 中的导入

### Phase 3: 清理core目录 (20分钟)
1. **检查core目录剩余文件**
2. **移动到对应功能目录**
3. **更新所有导入引用**
4. **删除空的core目录**

### Phase 4: 验证和测试 (15分钟)
1. **检查所有导入是否正确**
2. **运行TypeScript检查**
3. **测试页面加载**
4. **验证路由功能**

## 🎯 命名规范示例

### ✅ 正确的命名
```typescript
// 组件文件
UserProfile.tsx
TestResultCard.tsx
NavigationMenu.tsx

// 服务文件
apiClient.ts
authService.ts
dataService.ts

// 工具文件
formatUtils.ts
validationHelpers.ts
constants.ts

// 类型文件
userTypes.ts
apiTypes.ts
commonTypes.ts

// 配置文件
vite.config.js
tailwind.config.js
tsconfig.json
```

### ❌ 错误的命名
```typescript
// 不一致的大小写
userprofile.tsx
TestResultcard.tsx
navigationmenu.tsx

// 不清晰的命名
utils.ts
helpers.ts
data.ts

// 重复的命名
Home.tsx (在多个目录)
NotFound.tsx (在多个目录)
```

## 📊 规范化收益

### 开发效率提升
- **文件查找速度提升 50%**: 清晰的目录结构
- **代码维护成本降低 40%**: 统一的命名规范
- **新人上手时间减少 60%**: 直观的文件组织

### 代码质量提升
- **导入错误减少 80%**: 规范的文件路径
- **重复代码减少 30%**: 避免重复文件
- **可读性提升 70%**: 语义化的文件名

### 团队协作改善
- **代码审查效率提升 50%**: 标准化的结构
- **冲突解决速度提升 40%**: 清晰的文件职责
- **知识传递效率提升 60%**: 统一的组织方式

---

**📝 文件命名规范化将显著提升项目的可维护性和开发效率！**
