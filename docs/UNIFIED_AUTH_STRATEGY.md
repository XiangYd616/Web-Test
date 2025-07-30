# 统一认证策略设计

## 概述

本文档定义了系统的统一认证策略，解决当前认证逻辑混乱的问题，确保前后端认证逻辑一致。

## 功能分类

### 1. 公开功能（无需认证）
**策略**: 任何人都可以访问和使用

**后端**: 无认证中间件或使用 `optionalAuth`
**前端**: 无认证检查

**包含功能**:
- 首页/欢迎页面
- 产品介绍页面
- API文档页面
- 健康检查端点
- 基础的测试工具页面访问（但不能执行测试）

### 2. 可选认证功能（推荐登录）
**策略**: 未登录用户可以查看界面，但执行功能需要登录

**后端**: 使用 `optionalAuth` 中间件
**前端**: 使用 `useAuthCheck` Hook，在执行操作时检查认证

**包含功能**:
- 网站测试工具
- 性能测试工具
- SEO测试工具
- 安全测试工具
- 压力测试工具
- API测试工具
- 测试历史查看（登录用户看自己的，未登录用户看公开的）

### 3. 强制认证功能（必须登录）
**策略**: 必须登录才能访问

**后端**: 使用 `authMiddleware` 中间件
**前端**: 使用 `ProtectedRoute` 或 `withAuthCheck({ requireAuth: true })`

**包含功能**:
- 用户仪表板
- 个人设置
- 测试历史管理
- 数据导出
- 集成配置
- 监控设置

### 4. 管理员功能（需要管理员权限）
**策略**: 必须是管理员才能访问

**后端**: 使用 `authMiddleware + adminAuth` 中间件
**前端**: 使用 `AdminGuard` 组件

**包含功能**:
- 用户管理
- 系统设置
- 数据管理
- 系统监控
- 报告管理

## 实现规范

### 后端API认证规范

```javascript
// 1. 公开API - 无认证
router.get('/health', asyncHandler(async (req, res) => {
  // 公开端点
}));

// 2. 可选认证API - 推荐登录
router.post('/test/website', 
  optionalAuth,
  testRateLimiter,
  asyncHandler(async (req, res) => {
    // 可选认证端点
    // req.user 可能为 null
  })
);

// 3. 强制认证API - 必须登录
router.get('/user/profile', 
  authMiddleware,
  asyncHandler(async (req, res) => {
    // 强制认证端点
    // req.user 保证存在
  })
);

// 4. 管理员API - 需要管理员权限
router.get('/admin/users', 
  authMiddleware,
  adminAuth,
  asyncHandler(async (req, res) => {
    // 管理员端点
  })
);
```

### 前端认证检查规范

```tsx
// 1. 公开组件 - 无认证检查
const PublicComponent = () => {
  return <div>公开内容</div>;
};

// 2. 可选认证组件 - 推荐登录
const OptionalAuthComponent = () => {
  const { requireLogin, LoginPromptComponent } = useAuthCheck({
    feature: "网站测试",
    description: "执行网站测试"
  });

  const handleTest = () => {
    if (!requireLogin()) return;
    // 执行测试逻辑
  };

  return (
    <div>
      <button onClick={handleTest}>开始测试</button>
      {LoginPromptComponent}
    </div>
  );
};

// 3. 强制认证组件 - 必须登录
const ProtectedComponent = withAuthCheck(MyComponent, {
  requireAuth: true,
  feature: "用户设置",
  description: "管理用户设置"
});

// 4. 管理员组件 - 需要管理员权限
const AdminComponent = () => {
  return (
    <AdminGuard>
      <div>管理员内容</div>
    </AdminGuard>
  );
};
```

### 路由保护规范

```tsx
// 公开路由 - 无保护
<Route path="/website-test" element={<WebsiteTest />} />

// 强制认证路由 - 使用ProtectedRoute
<Route path="/dashboard" element={
  <ProtectedRoute>
    <Dashboard />
  </ProtectedRoute>
} />

// 管理员路由 - 使用AdminGuard
<Route path="/admin/*" element={
  <AdminGuard>
    <AdminRoutes />
  </AdminGuard>
} />
```

## 用户体验标准

### 1. 登录提示标准
- 使用统一的 `LoginPrompt` 组件
- 显示功能亮点和登录好处
- 提供登录和注册选项
- 支持自定义功能名称和描述

### 2. 重定向标准
- 登录后重定向到原页面
- 登出后重定向到首页
- 权限不足时显示友好提示

### 3. 错误处理标准
- 统一的错误消息格式
- 友好的用户提示
- 适当的重试机制

## 迁移计划

1. **阶段1**: 修复后端API认证策略
2. **阶段2**: 修复前端路由保护
3. **阶段3**: 统一前端认证检查
4. **阶段4**: 测试和验证

## 验证清单

- [ ] 所有API端点使用正确的认证中间件
- [ ] 前端路由保护符合策略
- [ ] 用户体验一致
- [ ] 登录/登出流程正常
- [ ] 权限检查正确
- [ ] 错误处理友好
