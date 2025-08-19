---
type: "agent_requested"
description: "创建命名文件的要求"
triggers:
  - "文件命名"
  - "创建文件"
  - "组件命名"
  - "变量命名"
auto_apply: true
priority: "medium"
---

# 📝 文件命名规范

## 🎯 核心原则
不要使用不必要的修饰词命名文件

## 📋 命名规则

### **文件命名**
- 使用简洁明确的名称
- 避免冗余的修饰词如"Optimized"、"Enhanced"、"Advanced"等
- 优先使用功能性描述而非技术性修饰

### **组件命名**
- 使用PascalCase：`Button.tsx`、`Modal.tsx`
- 描述组件的核心功能：`UserProfile.tsx` 而非 `OptimizedUserProfile.tsx`
- 避免技术实现细节：`DataTable.tsx` 而非 `VirtualizedDataTable.tsx`

### **变量和函数命名**
- 使用camelCase：`getUserData`、`isLoading`
- 描述用途而非实现：`fetchUserData` 而非 `optimizedFetchUserData`

## ✅ 好的命名示例
- `Button.tsx` ✓
- `Modal.tsx` ✓
- `Table.tsx` ✓
- `UserProfile.tsx` ✓

## ❌ 避免的命名
- `OptimizedButton.tsx` ✗
- `EnhancedModal.tsx` ✗
- `VirtualizedTable.tsx` ✗
- `AdvancedUserProfile.tsx` ✗