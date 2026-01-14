# Universal 命名修复计划

**发现时间**: 2026-01-14  
**问题**: 项目中存在使用"Universal"无意义修饰词的文件

---

## 📋 发现的文件

### 需要重命名的文件（3个）

1. **UniversalTestPage.tsx**
   - 路径: `frontend/components/testing/UniversalTestPage.tsx`
   - 建议: `TestPage.tsx` 或 `ComprehensiveTestPage.tsx`
   - 原因: "Universal"是无意义修饰词

2. **UniversalTestComponent.tsx**
   - 路径: `frontend/components/testing/unified/UniversalTestComponent.tsx`
   - 建议: `TestComponent.tsx`
   - 原因: "Universal"是无意义修饰词

3. **UniversalConfigPanel.tsx**
   - 路径: `frontend/components/testing/shared/UniversalConfigPanel.tsx`
   - 建议: `ConfigPanel.tsx` 或 `TestConfigPanel.tsx`
   - 原因: "Universal"是无意义修饰词

---

## 🎯 重命名方案

### 方案1: 简化命名（推荐）

```
UniversalTestPage.tsx → TestPage.tsx
UniversalTestComponent.tsx → TestComponent.tsx
UniversalConfigPanel.tsx → ConfigPanel.tsx
```

### 方案2: 描述性命名

```
UniversalTestPage.tsx → ComprehensiveTestPage.tsx
UniversalTestComponent.tsx → TestExecutorComponent.tsx
UniversalConfigPanel.tsx → TestConfigPanel.tsx
```

---

## 📊 影响分析

需要检查这些文件的引用：

```bash
# 搜索引用
grep -r "UniversalTestPage" frontend/
grep -r "UniversalTestComponent" frontend/
grep -r "UniversalConfigPanel" frontend/
```

---

## ✅ 执行计划

1. 使用 `git mv` 重命名文件（保留历史）
2. 更新所有引用
3. 更新导出语句
4. 验证构建

---

**准备执行重命名...**
