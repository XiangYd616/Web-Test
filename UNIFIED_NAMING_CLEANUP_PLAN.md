# "Unified" 命名清理计划

**发现时间**: 2026-01-14  
**问题**: `useTestEngine.ts`文件中仍使用"Unified"修饰词

---

## 🔍 问题分析

### 当前状态

**文件**: `frontend/hooks/useTestEngine.ts`

```typescript
// 问题1: 接口名称包含Unified
export interface UnifiedTestEngine { ... }

// 问题2: 导出函数名包含Unified
export const useUnifiedTestEngine = (): UnifiedTestEngine => { ... }

// 问题3: 默认导出也包含Unified
export default useUnifiedTestEngine;
```

### 影响范围

根据grep搜索结果，以下文件引用了这些命名：

1. **直接使用**:
   - `components/monitoring/EngineMonitor.tsx`
   - `components/testing/TestExecutor.tsx`
   - `pages/TestPage.tsx`
   - `hooks/useLegacyCompatibility.ts`

2. **类型定义**:
   - `types/engine.types.ts` - `UnifiedTestEngineHook`接口
   - `services/testing/testEngine.ts` - `UnifiedTestEngine`类

3. **测试文件**:
   - `tests/engine.test.tsx`

---

## 🎯 清理方案

### 方案1: 完全重命名（推荐）

**优点**: 彻底清理，命名更简洁  
**缺点**: 影响范围较大

**步骤**:

1. 重命名接口: `UnifiedTestEngine` → `TestEngine`
2. 重命名函数: `useUnifiedTestEngine` → `useTestEngine`
3. 更新所有引用
4. 更新类型定义文件

### 方案2: 保持导出别名

**优点**: 向后兼容  
**缺点**: 仍保留Unified命名

**步骤**:

1. 添加别名导出
2. 逐步迁移

---

## 📋 执行计划（方案1）

### Step 1: 修改useTestEngine.ts

```typescript
// Before
export interface UnifiedTestEngine { ... }
export const useUnifiedTestEngine = (): UnifiedTestEngine => { ... }
export default useUnifiedTestEngine;

// After
export interface TestEngine { ... }
export const useTestEngine = (): TestEngine => { ... }
export default useTestEngine;
```

### Step 2: 更新直接引用

**文件列表**:

- `components/monitoring/EngineMonitor.tsx`
- `components/testing/TestExecutor.tsx`
- `pages/TestPage.tsx`
- `hooks/useLegacyCompatibility.ts`

**修改内容**:

```typescript
// Before
import { useUnifiedTestEngine } from '../../hooks/useTestEngine';
const engine = useUnifiedTestEngine();

// After
import { useTestEngine } from '../../hooks/useTestEngine';
const engine = useTestEngine();
```

### Step 3: 更新类型定义

**文件**: `types/engine.types.ts`

```typescript
// Before
export interface UnifiedTestEngineHook { ... }

// After
export interface TestEngineHook { ... }
```

### Step 4: 更新服务类

**文件**: `services/testing/testEngine.ts`

```typescript
// Before
export class UnifiedTestEngine { ... }

// After
export class TestEngine { ... }
```

### Step 5: 更新测试文件

**文件**: `tests/engine.test.tsx`

```typescript
// Before
vi.mock('../hooks/useUnifiedTestEngine', () => ({
  useUnifiedTestEngine: vi.fn(() => ({ ... }))
}));

// After
vi.mock('../hooks/useTestEngine', () => ({
  useTestEngine: vi.fn(() => ({ ... }))
}));
```

---

## ✅ 验收标准

- [ ] `useTestEngine.ts`中无Unified命名
- [ ] 所有引用已更新
- [ ] 类型定义已更新
- [ ] 测试文件已更新
- [ ] `npm run type-check`无错误
- [ ] `npm run build`成功

---

## 📊 预计影响

- **修改文件数**: 约8-10个
- **预计时间**: 30-45分钟
- **风险等级**: 中（需要仔细更新所有引用）

---

**准备开始执行清理...**
