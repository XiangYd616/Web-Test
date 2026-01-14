# 命名规范修复计划

**创建时间**: 2026-01-14  
**目标**: 移除无意义的命名修饰词，统一命名规范

---

## 📊 问题分析

### 发现的命名问题

**无意义修饰词**: "unified", "enhanced", "base", "common"等

**受影响的文件** (17个):

```
shared/types/
├── unifiedTypes.ts                    → types.ts 或 shared.types.ts
└── unified-test-types.js              → test.types.js

shared/utils/
├── unifiedErrorHandler.ts             → errorHandler.ts
└── unifiedErrorHandler.js             → errorHandler.js

frontend/types/
└── unifiedEngine.types.ts             → engine.types.ts

frontend/services/testing/
├── unifiedTestService.ts              → testService.ts
└── unifiedTestEngine.ts               → testEngine.ts

frontend/pages/
└── UnifiedTestPage.tsx                → TestPage.tsx

frontend/hooks/
├── useUnifiedTestEngine.ts            → useTestEngine.ts
└── useUnifiedSEOTest.ts               → useSEOTest.ts

frontend/components/
├── ui/UnifiedIcons.tsx                → Icons.tsx
├── testing/UnifiedTestExecutor.tsx    → TestExecutor.tsx
└── analysis/UnifiedPerformanceAnalysis.tsx → PerformanceAnalysis.tsx

frontend/tests/
├── unifiedEngine.test.tsx             → engine.test.tsx
└── integration/unifiedEngineIntegration.test.tsx → engineIntegration.test.tsx

backend/middleware/
└── unifiedErrorHandler.js             → errorHandler.js

docs/
└── UNIFIED_ARCHITECTURE.md            → ARCHITECTURE.md
```

---

## 🎯 命名规范原则

### 1. 移除无意义修饰词

**禁止使用**:

- `unified` - 所有代码都应该是统一的
- `enhanced` - 应该直接体现功能
- `base` - 使用更具体的名称
- `common` - 使用shared或具体功能名
- `util` - 使用具体功能名
- `helper` - 使用具体功能名
- `manager` - 除非真的是管理器

**推荐使用**:

- 具体的功能名称
- 领域驱动的名称
- 清晰的职责描述

### 2. 文件命名规范

**类型文件**:

```
❌ unifiedTypes.ts
✅ types.ts 或 shared.types.ts

❌ commonTypes.ts
✅ types.ts 或 domain.types.ts
```

**组件文件**:

```
❌ UnifiedTestPage.tsx
✅ TestPage.tsx

❌ EnhancedButton.tsx
✅ Button.tsx 或 PrimaryButton.tsx
```

**服务文件**:

```
❌ unifiedTestService.ts
✅ testService.ts

❌ baseApiService.ts
✅ apiService.ts 或 httpClient.ts
```

**工具文件**:

```
❌ unifiedErrorHandler.ts
✅ errorHandler.ts

❌ commonUtils.ts
✅ utils.ts 或 具体功能.utils.ts
```

### 3. 目录结构规范

**使用目录表达层级关系**:

```
shared/
├── types/
│   ├── api.types.ts      # API相关类型
│   ├── user.types.ts     # 用户相关类型
│   └── test.types.ts     # 测试相关类型
└── utils/
    ├── error.ts          # 错误处理
    └── validation.ts     # 验证工具
```

---

## 📋 重命名计划

### Phase 1: 核心类型文件 (高优先级)

#### 1. shared/types/unifiedTypes.ts → shared/types/index.ts

**原因**:

- 这是共享类型的主入口
- `index.ts`更符合模块导出规范
- 移除无意义的"unified"

**影响**: 3个文件引用

- `frontend/types/common.types.ts`
- `backend/types/index.ts`
- `shared/utils/unifiedErrorHandler.ts`

**执行**:

```bash
git mv shared/types/unifiedTypes.ts shared/types/index.ts
# 更新所有引用
```

#### 2. shared/types/unified-test-types.js → shared/types/test.types.ts

**原因**:

- 移除"unified"
- 统一使用TypeScript
- 使用`.types.ts`后缀

**执行**:

```bash
git mv shared/types/unified-test-types.js shared/types/test.types.ts
```

### Phase 2: 错误处理文件

#### 3. shared/utils/unifiedErrorHandler.ts → shared/utils/errorHandler.ts

**影响**: 需要检查引用

#### 4. backend/middleware/unifiedErrorHandler.js → backend/middleware/errorHandler.js

**影响**: 需要检查引用

### Phase 3: 前端类型文件

#### 5. frontend/types/unifiedEngine.types.ts → frontend/types/engine.types.ts

**原因**: 移除"unified"，保持简洁

### Phase 4: 服务和引擎文件

#### 6. frontend/services/testing/unifiedTestService.ts → frontend/services/testing/testService.ts

#### 7. frontend/services/testing/unifiedTestEngine.ts → frontend/services/testing/testEngine.ts

### Phase 5: 页面组件

#### 8. frontend/pages/UnifiedTestPage.tsx → frontend/pages/TestPage.tsx

### Phase 6: Hooks

#### 9. frontend/hooks/useUnifiedTestEngine.ts → frontend/hooks/useTestEngine.ts

#### 10. frontend/hooks/useUnifiedSEOTest.ts → frontend/hooks/useSEOTest.ts

### Phase 7: UI组件

#### 11. frontend/components/ui/UnifiedIcons.tsx → frontend/components/ui/Icons.tsx

#### 12. frontend/components/testing/UnifiedTestExecutor.tsx → frontend/components/testing/TestExecutor.tsx

#### 13. frontend/components/analysis/UnifiedPerformanceAnalysis.tsx → frontend/components/analysis/PerformanceAnalysis.tsx

### Phase 8: 测试文件

#### 14. frontend/tests/unifiedEngine.test.tsx → frontend/tests/engine.test.tsx

#### 15. frontend/tests/integration/unifiedEngineIntegration.test.tsx → frontend/tests/integration/engineIntegration.test.tsx

### Phase 9: 文档

#### 16. docs/UNIFIED_ARCHITECTURE.md → docs/ARCHITECTURE.md

---

## 🔄 执行步骤

### Step 1: 重命名核心类型文件

```bash
# 1. 重命名文件
git mv shared/types/unifiedTypes.ts shared/types/index.ts

# 2. 更新引用
# frontend/types/common.types.ts
# backend/types/index.ts
# shared/utils/unifiedErrorHandler.ts
```

### Step 2: 更新导入语句

**查找所有引用**:

```bash
grep -r "unifiedTypes" --include="*.ts" --include="*.tsx"
```

**替换模式**:

```typescript
// Before
import { ... } from '../../shared/types/unifiedTypes';

// After
import { ... } from '../../shared/types';
```

### Step 3: 验证构建

```bash
npm run type-check
npm run build
```

---

## ⚠️ 风险评估

### 低风险

- ✅ 文件重命名
- ✅ 导入路径更新
- ✅ Git保留历史

### 需要注意

- ⚠️ 17个文件需要重命名
- ⚠️ 可能有多处引用
- ⚠️ 需要更新测试

### 缓解措施

- ✅ 使用git mv保留历史
- ✅ 逐个文件处理
- ✅ 每步验证构建
- ✅ 提交前运行测试

---

## 📊 预期收益

### 代码可读性

```
Before:
- unifiedTypes.ts (什么是unified?)
- UnifiedTestPage.tsx (为什么需要unified?)
- useUnifiedTestEngine.ts (冗余的修饰词)

After:
- types/index.ts (清晰的模块入口)
- TestPage.tsx (简洁明了)
- useTestEngine.ts (直接表达功能)
```

### 维护性

```
减少认知负担:
- 不需要理解"unified"的含义
- 文件名直接表达功能
- 更容易查找和理解
```

### 一致性

```
统一命名风格:
- 移除所有无意义修饰词
- 建立清晰的命名规范
- 提高代码库一致性
```

---

## 🎯 执行优先级

### P0 - 立即执行 (核心类型)

1. `shared/types/unifiedTypes.ts` → `shared/types/index.ts`
2. 更新所有引用（3个文件）
3. 验证构建

### P1 - 本周完成 (服务和组件)

4-13. 重命名服务、组件、hooks文件 14-15. 更新测试文件

### P2 - 下周完成 (文档和清理)

16. 重命名文档
17. 最终验证和清理

---

## 📝 检查清单

### 重命名前

- [ ] 备份当前代码
- [ ] 记录所有引用位置
- [ ] 确认Git状态干净

### 重命名中

- [ ] 使用git mv重命名
- [ ] 更新所有导入语句
- [ ] 更新相关注释
- [ ] 更新文档引用

### 重命名后

- [ ] 运行type-check
- [ ] 运行build
- [ ] 运行测试
- [ ] 提交Git

---

**下一步**: 开始执行重命名，从核心类型文件开始
