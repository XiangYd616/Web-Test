# 设计系统文档

## 概述

本项目采用统一的设计系统，确保界面的一致性和可维护性。

## 设计令牌

### 颜色系统
- 主色调：`var(--color-primary)`
- 次要色调：`var(--color-secondary)`
- 成功色：`var(--color-success)`
- 警告色：`var(--color-warning)`
- 危险色：`var(--color-danger)`

### 间距系统
- 超小：`var(--spacing-1)` (4px)
- 小：`var(--spacing-2)` (8px)
- 中：`var(--spacing-4)` (16px)
- 大：`var(--spacing-6)` (24px)
- 超大：`var(--spacing-8)` (32px)

### 字体系统
- 超小：`var(--font-size-xs)` (12px)
- 小：`var(--font-size-sm)` (14px)
- 基础：`var(--font-size-base)` (16px)
- 大：`var(--font-size-lg)` (18px)
- 超大：`var(--font-size-xl)` (20px)

## 使用指南

### 在CSS中使用
```css
.my-component {
  color: var(--color-primary);
  padding: var(--spacing-4);
  font-size: var(--font-size-base);
}
```

### 在组件中使用
```tsx
<div className="text-primary p-4 text-base">
  内容
</div>
```

## 维护指南

1. 所有新的设计值都应该添加到设计令牌中
2. 避免使用硬编码值
3. 定期审查和清理未使用的令牌
4. 保持设计系统文档的更新
