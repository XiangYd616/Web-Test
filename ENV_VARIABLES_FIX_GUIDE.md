# 环境变量统一命名指南

## 当前状况

项目使用 **Vite** 作为构建工具，但代码中存在混用 `process.env` 和 `NEXT_PUBLIC_` 前缀的情况。

### 问题识别

1. **使用 `process.env` 访问环境变量**
   - 在Vite项目中应该使用 `import.meta.env`
   - `process.env` 在客户端代码中不可用（Vite不会自动注入）

2. **使用 `NEXT_PUBLIC_` 前缀**
   - `NEXT_PUBLIC_` 是 Next.js 的约定
   - Vite 使用 `VITE_` 前缀

## 需要修复的环境变量

### 高频使用的变量：

| 当前名称 | 正确名称 | 使用次数 (估计) |
|----------|----------|----------------|
| `process.env.REQUEST_TIMEOUT` | `import.meta.env.VITE_REQUEST_TIMEOUT` | 20+ |
| `process.env.NEXT_PUBLIC_API_URL` | `import.meta.env.VITE_API_URL` | 2 |
| `process.env.NODE_ENV` | 保持不变 (标准变量) | 多处 |

### 受影响的文件（部分列表）：

#### 配置文件
- `frontend/config/apiConfig.ts` - 3处
- `frontend/config/authConfig.ts` - 1处
- `frontend/config/testTypes.ts` - 2处
- `frontend/config/security.ts` - 多处

#### 组件文件
- `frontend/components/scheduling/TestScheduler.tsx`
- `frontend/components/security/SecurityTestPanel.tsx`
- `frontend/components/testing/TestEngineStatus.tsx` - 3处

#### 页面文件
- `frontend/pages/CompatibilityTest.tsx`
- `frontend/pages/DatabaseTest.tsx`
- `frontend/pages/NetworkTest.tsx`
- `frontend/pages/advanced/TestTemplates.tsx`

#### 服务文件
- `frontend/services/api/testApiClient.ts`
- `frontend/services/testing/unifiedTestService.ts`
- `frontend/services/batchTestingService.ts`
- `frontend/services/integrationService.ts`

#### Hooks
- `frontend/hooks/useNetworkTestState.ts` - 2处

## 修复步骤

### 步骤 1: 创建/更新 .env 文件

创建 `.env.local` 文件（如果不存在）：

```bash
# API 配置
VITE_API_URL=http://localhost:3000/api
VITE_REQUEST_TIMEOUT=30000

# 安全配置
VITE_MAX_LOGIN_ATTEMPTS=5
VITE_LOCKOUT_DURATION=15
VITE_SESSION_TIMEOUT=86400000

# API 限流
VITE_API_RATE_LIMIT=100
VITE_ADMIN_API_RATE_LIMIT=50

# 功能开关
VITE_ENABLE_DEBUG=false
VITE_ENABLE_ANALYTICS=true
```

### 步骤 2: 批量替换代码

使用编辑器的查找替换功能：

#### 替换 1: REQUEST_TIMEOUT
**查找:** `process\.env\.REQUEST_TIMEOUT`  
**替换为:** `import.meta.env.VITE_REQUEST_TIMEOUT`

**注意:** 需要为数值类型添加类型转换或默认值：
```typescript
// 修改前
timeout: process.env.REQUEST_TIMEOUT || 30000

// 修改后
timeout: Number(import.meta.env.VITE_REQUEST_TIMEOUT) || 30000
// 或
timeout: import.meta.env.VITE_REQUEST_TIMEOUT ? Number(import.meta.env.VITE_REQUEST_TIMEOUT) : 30000
```

#### 替换 2: API_URL
**查找:** `process\.env\.NEXT_PUBLIC_API_URL`  
**替换为:** `import.meta.env.VITE_API_URL`

```typescript
// 修改前
baseURL: process.env.NEXT_PUBLIC_API_URL || '/api'

// 修改后
baseURL: import.meta.env.VITE_API_URL || '/api'
```

#### 替换 3: 其他环境变量
对于其他使用 `import.meta.env.VITE_` 的变量，确保它们也遵循同样的模式。

### 步骤 3: 特殊情况处理

#### NODE_ENV 保持不变
```typescript
// 这些是正确的，不需要修改
if (process.env.NODE_ENV === 'development') { ... }
isProduction: process.env.NODE_ENV === 'production'
```

#### 类型定义
为 Vite 环境变量添加类型定义，创建或更新 `frontend/vite-env.d.ts`:

```typescript
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_REQUEST_TIMEOUT: string
  readonly VITE_MAX_LOGIN_ATTEMPTS: string
  readonly VITE_LOCKOUT_DURATION: string
  readonly VITE_SESSION_TIMEOUT: string
  readonly VITE_API_RATE_LIMIT: string
  readonly VITE_ADMIN_API_RATE_LIMIT: string
  readonly VITE_ENABLE_DEBUG: string
  readonly VITE_ENABLE_ANALYTICS: string
  readonly VITE_GOOGLE_PAGESPEED_API_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

### 步骤 4: 验证修复

1. **类型检查**
   ```bash
   npm run type-check
   ```

2. **构建测试**
   ```bash
   npm run build
   ```

3. **运行时测试**
   ```bash
   npm run dev
   ```
   - 检查控制台是否有环境变量相关的错误
   - 测试依赖环境变量的功能

## 重要提示

### ⚠️ 数值类型转换

Vite 的环境变量都是字符串类型。如果需要数值，必须手动转换：

```typescript
// ❌ 错误 - 会是字符串 "30000"
const timeout = import.meta.env.VITE_REQUEST_TIMEOUT || 30000;

// ✅ 正确 - 转换为数字
const timeout = Number(import.meta.env.VITE_REQUEST_TIMEOUT) || 30000;

// ✅ 也正确 - 使用 parseInt
const timeout = parseInt(import.meta.env.VITE_REQUEST_TIMEOUT || '30000', 10);
```

### ⚠️ 布尔值转换

```typescript
// ❌ 错误 - 字符串 "false" 会被转换为 true
const isDebug = import.meta.env.VITE_ENABLE_DEBUG;

// ✅ 正确
const isDebug = import.meta.env.VITE_ENABLE_DEBUG === 'true';
```

### ⚠️ 环境变量的可见性

- Vite 只会暴露以 `VITE_` 开头的环境变量到客户端代码
- 其他环境变量（如 `NODE_ENV`, `MODE`）是Vite内置的
- 服务器端代码可以继续使用 `process.env`

## 迁移检查清单

- [ ] 创建 `.env.example` 文件
- [ ] 更新 `.env.local` 文件（添加 VITE_ 前缀）
- [ ] 替换代码中的 `process.env.REQUEST_TIMEOUT`
- [ ] 替换代码中的 `process.env.NEXT_PUBLIC_API_URL`
- [ ] 检查并替换其他非标准环境变量
- [ ] 添加类型定义 `vite-env.d.ts`
- [ ] 添加数值类型转换
- [ ] 添加布尔值转换
- [ ] 运行 `npm run type-check`
- [ ] 运行 `npm run build`
- [ ] 运行 `npm run dev` 并测试功能
- [ ] 更新项目文档
- [ ] 通知团队成员更新本地 `.env.local`

## 预期收益

1. **正确的运行时行为**
   - 环境变量在生产构建中正确可用
   - 避免 `undefined` 导致的运行时错误

2. **更好的开发体验**
   - 类型检查支持
   - IDE 自动完成

3. **符合框架约定**
   - 遵循 Vite 的最佳实践
   - 减少混淆和误用

4. **团队协作**
   - 统一的环境变量管理方式
   - 清晰的配置文档

---

**优先级:** 中高（影响生产构建的正确性）  
**预计修复时间:** 1-2小时  
**风险:** 中等（需要仔细测试所有依赖环境变量的功能）  
**创建时间:** 2025-10-03

