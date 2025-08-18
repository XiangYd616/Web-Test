# 组件文档

## 概述

Test-Web 前端采用组件化架构，提供了丰富的可复用UI组件。所有组件都使用TypeScript编写，支持完整的类型检查。

## 组件分类

### 基础UI组件 (`components/ui/`)

#### Button 按钮组件

通用按钮组件，支持多种变体和状态。

**导入**:
```typescript
import { Button, PrimaryButton, SecondaryButton, IconButton } from '@components/ui/Button';
```

**基础用法**:
```tsx
// 基础按钮
<Button>点击我</Button>

// 不同变体
<Button variant="primary">主要按钮</Button>
<Button variant="secondary">次要按钮</Button>
<Button variant="danger">危险按钮</Button>
<Button variant="ghost">幽灵按钮</Button>
<Button variant="outline">轮廓按钮</Button>

// 不同尺寸
<Button size="xs">超小</Button>
<Button size="sm">小</Button>
<Button size="md">中等</Button>
<Button size="lg">大</Button>
<Button size="xl">超大</Button>

// 加载状态
<Button loading>加载中...</Button>

// 带图标
<Button icon={<Icon />} iconPosition="left">左图标</Button>
<Button icon={<Icon />} iconPosition="right">右图标</Button>

// 全宽按钮
<Button fullWidth>全宽按钮</Button>
```

**属性**:
| 属性 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `variant` | `'primary' \| 'secondary' \| 'danger' \| 'ghost' \| 'outline'` | `'primary'` | 按钮变体 |
| `size` | `'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl'` | `'md'` | 按钮尺寸 |
| `loading` | `boolean` | `false` | 加载状态 |
| `icon` | `React.ReactNode` | - | 图标 |
| `iconPosition` | `'left' \| 'right'` | `'left'` | 图标位置 |
| `fullWidth` | `boolean` | `false` | 全宽显示 |
| `disabled` | `boolean` | `false` | 禁用状态 |

**预定义组件**:
```tsx
<PrimaryButton>主要按钮</PrimaryButton>
<SecondaryButton>次要按钮</SecondaryButton>
<DangerButton>危险按钮</DangerButton>
<GhostButton>幽灵按钮</GhostButton>
<OutlineButton>轮廓按钮</OutlineButton>

<IconButton icon={<Icon />} aria-label="图标按钮" />
<DeleteButton>删除</DeleteButton>
```

#### Input 输入组件

通用输入组件，支持多种输入类型和验证状态。

**导入**:
```typescript
import { Input, TextArea, SearchInput } from '@components/ui/Input';
```

**基础用法**:
```tsx
// 基础输入
<Input placeholder="请输入内容" />

// 不同变体
<Input variant="default" />
<Input variant="filled" />
<Input variant="outline" />

// 不同尺寸
<Input size="sm" />
<Input size="md" />
<Input size="lg" />

// 带图标
<Input leftIcon={<SearchIcon />} placeholder="搜索..." />
<Input rightIcon={<EyeIcon />} type="password" />

// 验证状态
<Input error="这是错误信息" />
<Input success="验证成功" />

// 文本域
<TextArea placeholder="请输入多行文本" rows={4} />
<TextArea resize="vertical" />
```

**属性**:
| 属性 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `variant` | `'default' \| 'filled' \| 'outline'` | `'default'` | 输入框变体 |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | 输入框尺寸 |
| `leftIcon` | `React.ReactNode` | - | 左侧图标 |
| `rightIcon` | `React.ReactNode` | - | 右侧图标 |
| `error` | `string` | - | 错误信息 |
| `success` | `string` | - | 成功信息 |
| `disabled` | `boolean` | `false` | 禁用状态 |

#### Modal 模态框组件

模态框组件，支持多种尺寸和自定义内容。

**导入**:
```typescript
import { Modal, ConfirmModal } from '@components/ui/Modal';
```

**基础用法**:
```tsx
// 基础模态框
<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="模态框标题"
  size="md"
>
  <p>模态框内容</p>
</Modal>

// 带底部操作的模态框
<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="确认操作"
  footer={
    <>
      <Button variant="ghost" onClick={() => setIsOpen(false)}>
        取消
      </Button>
      <Button onClick={handleConfirm}>
        确认
      </Button>
    </>
  }
>
  <p>确定要执行此操作吗？</p>
</Modal>

// 确认对话框
<ConfirmModal
  isOpen={isConfirmOpen}
  onClose={() => setIsConfirmOpen(false)}
  onConfirm={handleDelete}
  title="删除确认"
  message="确定要删除这个项目吗？此操作不可撤销。"
  type="danger"
  confirmText="删除"
  cancelText="取消"
/>
```

**属性**:
| 属性 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `isOpen` | `boolean` | - | 是否打开 |
| `onClose` | `() => void` | - | 关闭回调 |
| `title` | `string` | - | 标题 |
| `size` | `'sm' \| 'md' \| 'lg' \| 'xl' \| 'full'` | `'md'` | 尺寸 |
| `closable` | `boolean` | `true` | 是否可关闭 |
| `maskClosable` | `boolean` | `true` | 点击遮罩关闭 |
| `footer` | `React.ReactNode` | - | 底部内容 |

#### Form 表单组件

完整的表单管理组件，支持验证和状态管理。

**导入**:
```typescript
import { Form, FormField, FormInput, FormSubmit, useForm } from '@components/ui/Form';
```

**基础用法**:
```tsx
// 基础表单
<Form
  initialValues={{ name: '', email: '' }}
  validationSchema={{
    name: (value) => !value ? '姓名不能为空' : null,
    email: (value) => !value.includes('@') ? '邮箱格式不正确' : null
  }}
  onSubmit={async (values) => {
    console.log('提交数据:', values);
  }}
>
  <FormField name="name" label="姓名" required>
    <FormInput name="name" placeholder="请输入姓名" />
  </FormField>
  
  <FormField name="email" label="邮箱" required>
    <FormInput name="email" type="email" placeholder="请输入邮箱" />
  </FormField>
  
  <FormSubmit>提交</FormSubmit>
</Form>

// 使用表单Hook
function MyForm() {
  const { fields, setFieldValue, isValid } = useForm();
  
  return (
    <div>
      <input
        value={fields.name?.value || ''}
        onChange={(e) => setFieldValue('name', e.target.value)}
      />
      <button disabled={!isValid}>提交</button>
    </div>
  );
}
```

#### Toast 通知组件

全局通知组件，支持多种类型的消息提示。

**导入**:
```typescript
import { ToastProvider, useToast } from '@components/ui/Toast';
```

**基础用法**:
```tsx
// 在应用根部添加Provider
<ToastProvider>
  <App />
</ToastProvider>

// 在组件中使用
function MyComponent() {
  const toast = useToast();
  
  const handleSuccess = () => {
    toast.success('操作成功！');
  };
  
  const handleError = () => {
    toast.error('操作失败，请重试');
  };
  
  const handleWarning = () => {
    toast.warning('请注意检查输入');
  };
  
  const handleInfo = () => {
    toast.info('这是一条信息');
  };
  
  const handleCustom = () => {
    toast.custom({
      type: 'success',
      title: '自定义标题',
      message: '自定义消息内容',
      duration: 5000,
      action: {
        label: '查看详情',
        onClick: () => console.log('点击了操作按钮')
      }
    });
  };
  
  return (
    <div>
      <Button onClick={handleSuccess}>成功提示</Button>
      <Button onClick={handleError}>错误提示</Button>
      <Button onClick={handleWarning}>警告提示</Button>
      <Button onClick={handleInfo}>信息提示</Button>
      <Button onClick={handleCustom}>自定义提示</Button>
    </div>
  );
}
```

### 布局组件 (`components/ui/Layout.tsx`)

#### PageLayout 页面布局

页面级布局组件，提供统一的页面结构。

**导入**:
```typescript
import { PageLayout, GridLayout, FlexLayout, Card } from '@components/ui/Layout';
```

**基础用法**:
```tsx
// 页面布局
<PageLayout
  title="测试页面"
  description="这是一个测试页面"
  icon={TestIcon}
  maxWidth="lg"
  background="default"
>
  <div>页面内容</div>
</PageLayout>

// 网格布局
<GridLayout cols={3} gap="md">
  <Card title="卡片1">内容1</Card>
  <Card title="卡片2">内容2</Card>
  <Card title="卡片3">内容3</Card>
</GridLayout>

// 弹性布局
<FlexLayout direction="row" justify="between" align="center" gap="md">
  <div>左侧内容</div>
  <div>右侧内容</div>
</FlexLayout>

// 卡片组件
<Card
  title="测试结果"
  description="性能测试报告"
  icon={ChartIcon}
  variant="elevated"
  hoverable
  onClick={() => console.log('点击卡片')}
>
  <div>卡片内容</div>
</Card>
```

### 通用组件 (`components/common/`)

#### ErrorBoundary 错误边界

React错误边界组件，用于捕获和处理组件错误。

**导入**:
```typescript
import ErrorBoundary, { withErrorBoundary } from '@components/common/ErrorBoundary';
```

**基础用法**:
```tsx
// 包装组件
<ErrorBoundary
  level="component"
  onError={(error, errorInfo) => {
    console.error('组件错误:', error, errorInfo);
  }}
>
  <MyComponent />
</ErrorBoundary>

// 使用HOC
const SafeComponent = withErrorBoundary(MyComponent, {
  level: 'component',
  context: 'MyComponent'
});

// 自定义错误回退
<ErrorBoundary
  fallback={(error, errorInfo, retry) => (
    <div>
      <h2>出错了</h2>
      <p>{error.message}</p>
      <Button onClick={retry}>重试</Button>
    </div>
  )}
>
  <MyComponent />
</ErrorBoundary>
```

#### LazyComponent 懒加载组件

懒加载组件包装器，支持加载状态和错误处理。

**导入**:
```typescript
import LazyComponent from '@components/common/LazyComponent';
```

**基础用法**:
```tsx
// 懒加载组件
<LazyComponent
  importFn={() => import('./HeavyComponent')}
  fallback={<div>加载中...</div>}
  errorFallback={<div>加载失败</div>}
  retryCount={3}
  placeholder={<div>占位内容</div>}
/>

// 带占位符高度
<LazyComponent
  importFn={() => import('./ChartComponent')}
  placeholderHeight={400}
  fallback={<ChartSkeleton />}
/>
```

## 样式系统

### Tailwind CSS 类名

所有组件都使用Tailwind CSS进行样式设计，支持响应式和暗色模式。

**常用类名模式**:
```css
/* 响应式 */
.responsive-class {
  @apply text-sm md:text-base lg:text-lg;
}

/* 暗色模式 */
.dark-mode-class {
  @apply bg-white dark:bg-gray-800 text-gray-900 dark:text-white;
}

/* 状态变化 */
.interactive-class {
  @apply transition-all duration-200 hover:scale-105 focus:ring-2;
}
```

### CSS变量

项目使用CSS变量来管理主题色彩：

```css
:root {
  --color-primary: #3b82f6;
  --color-secondary: #6b7280;
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  --color-info: #06b6d4;
}
```

## 最佳实践

### 组件开发规范

1. **类型安全**: 所有组件都应该有完整的TypeScript类型定义
2. **可访问性**: 遵循WCAG 2.1 AA标准
3. **响应式设计**: 支持移动端和桌面端
4. **暗色模式**: 所有组件都应支持暗色模式
5. **性能优化**: 使用React.memo和useMemo优化性能

### 组件命名规范

```typescript
// 组件文件命名: PascalCase
Button.tsx
Modal.tsx
ErrorBoundary.tsx

// 组件导出
export const Button: React.FC<ButtonProps> = ({ ... }) => { ... };
export default Button;

// 类型定义
export interface ButtonProps {
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}
```

### 测试规范

每个组件都应该有对应的测试文件：

```typescript
// Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import Button from './Button';

describe('Button Component', () => {
  it('renders correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
  
  it('handles click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

## 贡献指南

### 添加新组件

1. 在相应目录创建组件文件
2. 编写TypeScript类型定义
3. 实现组件逻辑
4. 添加样式（Tailwind CSS）
5. 编写测试用例
6. 更新文档
7. 提交PR

### 组件模板

```typescript
/**
 * 组件描述
 */

import React from 'react';
import { cn } from '@utils/cn';

export interface MyComponentProps {
  children: React.ReactNode;
  className?: string;
  // 其他属性...
}

export const MyComponent: React.FC<MyComponentProps> = ({
  children,
  className,
  ...props
}) => {
  return (
    <div
      className={cn(
        'base-classes',
        'responsive-classes',
        'dark:dark-mode-classes',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

MyComponent.displayName = 'MyComponent';

export default MyComponent;
```
