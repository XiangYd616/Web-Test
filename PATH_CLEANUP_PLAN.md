# 路径清理计划

**发现时间**: 2026-01-14  
**问题**: 重命名后的文件仍有旧的引用和命名

---

## 🔍 发现的问题

### 1. 组件导出名称不一致

**ComprehensiveTestPage.tsx**:

- 文件名: `ComprehensiveTestPage.tsx`
- 导出名: `TestPage` ❌
- 接口名: `TestPageProps` ❌

**应该**:

- 导出名: `ComprehensiveTestPage` ✅
- 接口名: `ComprehensiveTestPageProps` ✅

### 2. TestComponent.tsx 类似问题

**TestComponent.tsx**:

- 文件名: `TestComponent.tsx`
- 导出名: `TestComponent` ❌
- 接口名: `TestComponentProps` ❌

**应该**:

- 导出名: `TestComponent` ✅
- 接口名: `TestComponentProps` ✅

### 3. 引用路径需要更新

**StressTest.tsx**:

```typescript
// 当前
import { TestPage } from '../components/testing/ComprehensiveTestPage';

// 应该
import { ComprehensiveTestPage } from '../components/testing/ComprehensiveTestPage';
```

---

## 📋 修复清单

### Step 1: 更新 ComprehensiveTestPage.tsx

- [ ] 重命名接口: `TestPageProps` → `ComprehensiveTestPageProps`
- [ ] 重命名导出: `TestPage` → `ComprehensiveTestPage`
- [ ] 更新默认导出

### Step 2: 更新 TestComponent.tsx

- [ ] 重命名接口: `TestComponentProps` → `TestComponentProps`
- [ ] 重命名导出: `TestComponent` → `TestComponent`
- [ ] 更新默认导出

### Step 3: 更新所有引用

- [ ] StressTest.tsx - 更新导入和使用
- [ ] business/index.ts - 更新注释
- [ ] 其他可能的引用

---

## 🎯 执行顺序

1. 修复 ComprehensiveTestPage.tsx 内部命名
2. 修复 TestComponent.tsx 内部命名
3. 更新所有引用这些组件的文件
4. 验证构建

---

**准备执行修复...**
