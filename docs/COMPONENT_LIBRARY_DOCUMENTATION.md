# 组件库文档

## 📋 概述

这是一个现代化的React组件库，提供了一套完整的UI组件，支持主题定制、响应式设计和无障碍访问。

### 🎯 设计原则

- **一致性** - 统一的设计语言和交互模式
- **可访问性** - 符合WCAG 2.1 AA标准
- **可定制性** - 支持主题和样式定制
- **性能优化** - 轻量级，按需加载
- **开发友好** - TypeScript支持，完整的类型定义

### 🚀 快速开始

```tsx
import { Button, Card, Input } from '@/components/ui';

function App() {
  return (
    <Card>
      <Input label="用户名" placeholder="请输入用户名" />
      <Button variant="primary">提交</Button>
    </Card>
  );
}
```

## 📦 组件列表

### 基础组件

| 组件 | 描述 | 状态 |
|------|------|------|
| [Button](#button) | 按钮组件 | ✅ 稳定 |
| [Card](#card) | 卡片容器 | ✅ 稳定 |
| [Badge](#badge) | 标签徽章 | ✅ 稳定 |
| [Loading](#loading) | 加载状态 | ✅ 稳定 |

### 表单组件

| 组件 | 描述 | 状态 |
|------|------|------|
| [Input](#input) | 输入框 | ✅ 稳定 |
| [Select](#select) | 下拉选择 | ✅ 稳定 |
| [Textarea](#textarea) | 文本域 | ✅ 稳定 |

### 数据展示

| 组件 | 描述 | 状态 |
|------|------|------|
| [Table](#table) | 数据表格 | ✅ 稳定 |

### 反馈组件

| 组件 | 描述 | 状态 |
|------|------|------|
| [Modal](#modal) | 模态框 | ✅ 稳定 |

## 🎨 主题系统

### 主题配置

```tsx
// 主题配置示例
const theme = {
  colors: {
    primary: '#3b82f6',
    secondary: '#6b7280',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#3b82f6',
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
  },
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
  },
};
```

### 深色模式

组件库支持自动深色模式切换：

```tsx
// 深色模式会自动应用
<div data-theme="dark">
  <Button variant="primary">深色模式按钮</Button>
</div>
```

## 📱 响应式设计

所有组件都支持响应式设计，使用Tailwind CSS的断点系统：

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
  <Card>移动端单列，平板双列，桌面三列</Card>
</div>
```

## ♿ 无障碍支持

### 键盘导航

所有交互组件都支持键盘导航：

- `Tab` / `Shift+Tab` - 焦点移动
- `Enter` / `Space` - 激活按钮
- `Arrow Keys` - 列表导航
- `Escape` - 关闭模态框

### 屏幕阅读器

组件使用语义化HTML和ARIA属性：

```tsx
<Button aria-label="关闭对话框" onClick={handleClose}>
  ×
</Button>
```

### 颜色对比度

所有颜色组合都满足WCAG 2.1 AA标准（对比度 ≥ 4.5:1）。

## 🔧 开发指南

### 安装依赖

```bash
npm install @/components/ui
```

### TypeScript支持

所有组件都提供完整的TypeScript类型定义：

```tsx
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}
```

### 样式定制

#### 使用CSS变量

```css
:root {
  --color-primary: #3b82f6;
  --color-primary-hover: #2563eb;
}
```

#### 使用Tailwind类

```tsx
<Button className="bg-purple-500 hover:bg-purple-600">
  自定义颜色
</Button>
```

### 性能优化

#### 按需导入

```tsx
// 推荐：按需导入
import { Button } from '@/components/ui/Button';

// 避免：全量导入
import * as UI from '@/components/ui';
```

#### 懒加载

```tsx
import { lazy } from 'react';

const Table = lazy(() => import('@/components/ui/Table'));
```

## 🧪 测试

### 单元测试

```tsx
import { render, screen } from '@testing-library/react';
import { Button } from '@/components/ui';

test('renders button with text', () => {
  render(<Button>Click me</Button>);
  expect(screen.getByRole('button')).toHaveTextContent('Click me');
});
```

### 可访问性测试

```tsx
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

test('should not have accessibility violations', async () => {
  const { container } = render(<Button>Accessible button</Button>);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

## 📚 更多资源

- [组件API文档](./COMPONENT_API.md)
- [设计规范](./DESIGN_GUIDELINES.md)
- [迁移指南](./MIGRATION_GUIDE.md)
- [开发规范](./DEVELOPMENT_GUIDELINES.md)
- [故障排除](./TROUBLESHOOTING.md)

## 🤝 贡献指南

### 开发流程

1. Fork项目
2. 创建功能分支
3. 编写代码和测试
4. 提交Pull Request

### 代码规范

- 使用TypeScript
- 遵循ESLint规则
- 编写单元测试
- 更新文档

### 组件开发规范

1. **命名规范** - 使用PascalCase
2. **属性设计** - 保持API简洁一致
3. **样式管理** - 使用CSS模块或Tailwind
4. **测试覆盖** - 确保90%+覆盖率
5. **文档更新** - 同步更新使用文档

## 📄 许可证

MIT License - 详见 [LICENSE](../LICENSE) 文件。

## 🔄 版本历史

### v1.0.0 (2025-08-02)

- ✅ 初始版本发布
- ✅ 7个核心组件
- ✅ 完整的TypeScript支持
- ✅ 无障碍支持
- ✅ 响应式设计
- ✅ 主题系统

---

**维护团队**: 前端开发团队  
**最后更新**: 2025年8月2日  
**文档版本**: v1.0.0
