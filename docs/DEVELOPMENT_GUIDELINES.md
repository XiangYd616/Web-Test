# 开发规范指南

## 📋 概述

本文档定义了组件库开发的标准规范，确保代码质量、一致性和可维护性。

## 🎯 核心原则

### 1. 一致性原则
- **API设计一致** - 相似功能的组件使用相似的API
- **命名规范一致** - 统一的命名约定
- **样式规范一致** - 统一的样式架构

### 2. 可维护性原则
- **模块化设计** - 组件职责单一，高内聚低耦合
- **文档完整** - 每个组件都有完整的文档和示例
- **测试覆盖** - 确保90%+的测试覆盖率

### 3. 性能优化原则
- **按需加载** - 支持tree-shaking和懒加载
- **渲染优化** - 避免不必要的重渲染
- **包体积控制** - 保持组件轻量级

## 📁 项目结构

```
src/
├── components/
│   └── ui/
│       ├── Button/
│       │   ├── index.tsx          # 主组件文件
│       │   ├── Button.module.css  # 样式文件（可选）
│       │   └── __tests__/         # 测试文件
│       │       └── Button.test.tsx
│       ├── Card/
│       └── index.ts               # 统一导出
├── styles/
│   ├── base/                      # 基础样式
│   ├── utilities/                 # 工具类
│   └── critical.css               # 关键路径CSS
├── utils/
│   ├── cssLoader.ts               # CSS动态加载
│   └── browserSupport.ts          # 浏览器兼容性
├── hooks/
│   └── useCSS.ts                  # CSS相关Hooks
└── types/
    └── components.ts               # 组件类型定义
```

## 🏗️ 组件开发规范

### 1. 组件命名

#### 文件命名
```
✅ 推荐
Button.tsx
Card.tsx
DataTable.tsx

❌ 避免
button.tsx
card-component.tsx
data_table.tsx
```

#### 组件命名
```tsx
✅ 推荐
export const Button: React.FC<ButtonProps> = ({ ... }) => { ... }
export default Button;

❌ 避免
export const ButtonComponent = ({ ... }) => { ... }
export const button = ({ ... }) => { ... }
```

### 2. 属性设计

#### 属性命名规范
```tsx
interface ButtonProps {
  // 基础属性
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  
  // 状态属性
  disabled?: boolean;
  loading?: boolean;
  
  // 事件属性
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  
  // 内容属性
  children: React.ReactNode;
  icon?: React.ReactNode;
  
  // 样式属性
  className?: string;
  style?: React.CSSProperties;
}
```

#### 属性设计原则
1. **必需属性最少** - 只有真正必需的属性才标记为required
2. **默认值合理** - 提供合理的默认值
3. **类型严格** - 使用联合类型而不是string
4. **向后兼容** - 新增属性不应破坏现有API

### 3. 组件结构

```tsx
import React, { forwardRef } from 'react';
import { cn } from '@/utils/classNames';

// 1. 类型定义
interface ButtonProps {
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  className?: string;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

// 2. 组件实现
const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  children,
  className,
  onClick,
  ...props
}, ref) => {
  // 3. 状态和逻辑
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || loading) return;
    onClick?.(event);
  };

  // 4. 样式计算
  const buttonClasses = cn(
    'btn',
    `btn-${variant}`,
    `btn-${size}`,
    {
      'btn-disabled': disabled,
      'btn-loading': loading,
    },
    className
  );

  // 5. 渲染
  return (
    <button
      ref={ref}
      className={buttonClasses}
      disabled={disabled || loading}
      onClick={handleClick}
      aria-busy={loading}
      {...props}
    >
      {loading && <LoadingSpinner size="sm" />}
      {children}
    </button>
  );
});

// 6. 显示名称
Button.displayName = 'Button';

export default Button;
```

## 🎨 CSS开发规范

### 1. CSS架构

#### 文件组织
```
src/styles/
├── base/
│   ├── reset.css          # CSS重置
│   ├── typography.css     # 字体系统
│   └── scrollbar.css      # 滚动条样式
├── utilities/
│   ├── helpers.css        # 辅助工具类
│   ├── animations.css     # 动画样式
│   └── layout.css         # 布局工具类
├── critical.css           # 关键路径CSS
└── index.css              # 主样式文件
```

#### 样式命名规范
```css
/* 组件样式 - 使用BEM命名 */
.btn {
  /* 基础样式 */
}

.btn--primary {
  /* 主要变体 */
}

.btn--sm {
  /* 小尺寸 */
}

.btn__icon {
  /* 图标元素 */
}

.btn--loading {
  /* 加载状态 */
}
```

### 2. CSS变量系统

```css
:root {
  /* 颜色系统 */
  --color-primary: #3b82f6;
  --color-primary-hover: #2563eb;
  --color-primary-active: #1d4ed8;
  
  /* 间距系统 */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
  
  /* 字体系统 */
  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;
  
  /* 圆角系统 */
  --radius-sm: 0.25rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;
  
  /* 阴影系统 */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}
```

### 3. 响应式设计

```css
/* 移动优先设计 */
.component {
  /* 移动端样式 */
  padding: var(--spacing-sm);
}

/* 平板样式 */
@media (min-width: 768px) {
  .component {
    padding: var(--spacing-md);
  }
}

/* 桌面样式 */
@media (min-width: 1024px) {
  .component {
    padding: var(--spacing-lg);
  }
}
```

### 4. 深色模式支持

```css
/* 浅色模式（默认） */
.btn {
  background-color: var(--color-primary);
  color: white;
}

/* 深色模式 */
[data-theme="dark"] .btn {
  background-color: var(--color-primary-dark);
  color: var(--color-text-dark);
}

/* 系统主题 */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme]) .btn {
    background-color: var(--color-primary-dark);
    color: var(--color-text-dark);
  }
}
```

## 🧪 测试规范

### 1. 测试文件结构

```
src/components/ui/Button/
├── index.tsx
└── __tests__/
    ├── Button.test.tsx           # 单元测试
    ├── Button.visual.test.tsx    # 视觉回归测试
    └── Button.a11y.test.tsx      # 无障碍测试
```

### 2. 测试用例规范

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Button from '../Button';

describe('Button Component', () => {
  // 基础渲染测试
  it('renders with default props', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button')).toHaveTextContent('Click me');
  });

  // 属性测试
  it('applies variant classes correctly', () => {
    render(<Button variant="primary">Primary</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-primary');
  });

  // 交互测试
  it('handles click events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  // 状态测试
  it('disables button when loading', () => {
    render(<Button loading>Loading</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  // 无障碍测试
  it('has proper ARIA attributes', () => {
    render(<Button loading>Loading</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');
  });
});
```

### 3. 测试覆盖率要求

- **单元测试覆盖率**: ≥ 90%
- **分支覆盖率**: ≥ 85%
- **功能覆盖率**: 100%

## 📚 文档规范

### 1. 组件文档结构

```markdown
# ComponentName 组件名称

## 概述
简要描述组件的用途和特性。

## 基础用法
```tsx
import { ComponentName } from '@/components/ui';

<ComponentName prop="value">内容</ComponentName>
```

## API
| 属性 | 类型 | 默认值 | 描述 |
|------|------|--------|------|

## 示例
### 基础示例
### 高级用法
### 自定义样式

## 无障碍
描述无障碍特性和键盘导航。

## 注意事项
使用时需要注意的事项。
```

### 2. 代码注释规范

```tsx
/**
 * Button组件 - 用于触发操作的按钮
 * 
 * @example
 * ```tsx
 * <Button variant="primary" onClick={handleClick}>
 *   点击我
 * </Button>
 * ```
 */
interface ButtonProps {
  /** 按钮变体，控制按钮的视觉样式 */
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  
  /** 按钮尺寸 */
  size?: 'sm' | 'md' | 'lg';
  
  /** 是否禁用按钮 */
  disabled?: boolean;
  
  /** 点击事件处理函数 */
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  
  /** 按钮内容 */
  children: React.ReactNode;
}
```

## 🔧 工具和配置

### 1. TypeScript配置

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

### 2. ESLint规则

```json
{
  "extends": [
    "@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended"
  ],
  "rules": {
    "react/prop-types": "off",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "react/display-name": "error"
  }
}
```

### 3. Prettier配置

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2
}
```

## 🚀 发布流程

### 1. 版本管理

```bash
# 补丁版本（bug修复）
npm version patch

# 次要版本（新功能）
npm version minor

# 主要版本（破坏性变更）
npm version major
```

### 2. 变更日志

```markdown
# Changelog

## [1.1.0] - 2025-08-02

### Added
- 新增Button组件的loading状态
- 新增Table组件的排序功能

### Changed
- 优化Card组件的响应式布局
- 更新Input组件的错误提示样式

### Fixed
- 修复Modal组件的焦点管理问题
- 修复Badge组件在Safari中的显示问题

### Deprecated
- 废弃旧的DataTable组件，请使用新的Table组件

### Removed
- 移除了不再使用的legacy样式

### Security
- 修复了XSS安全漏洞
```

## ✅ 代码审查清单

### 功能性
- [ ] 组件功能符合需求
- [ ] API设计合理
- [ ] 错误处理完善
- [ ] 边界情况考虑

### 代码质量
- [ ] 代码结构清晰
- [ ] 命名规范一致
- [ ] 注释完整准确
- [ ] 无重复代码

### 性能
- [ ] 无不必要的重渲染
- [ ] 内存使用合理
- [ ] 包体积控制

### 测试
- [ ] 测试覆盖率达标
- [ ] 测试用例完整
- [ ] 无障碍测试通过

### 文档
- [ ] API文档完整
- [ ] 使用示例清晰
- [ ] 变更日志更新

---

**维护团队**: 前端开发团队  
**最后更新**: 2025年8月2日  
**文档版本**: v1.0.0
