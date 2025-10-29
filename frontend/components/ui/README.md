# UI组件库

这是一个基于React和TypeScript构建的现代化UI组件库，为Test Web App提供统一的用户界面组件。

## 特性

- 🎨 **统一设计系统** - 基于设计规范的一致性组件
- 🌙 **主题支持** - 内置深色/浅色主题切换
- ♿ **可访问性** - 符合WCAG标准的无障碍设计
- 📱 **响应式** - 支持各种屏幕尺寸
- 🔧 **TypeScript** - 完整的类型定义和智能提示
- 🧪 **测试覆盖** - 完整的单元测试和集成测试
- 📚 **文档完善** - Storybook文档和使用示例

## 快速开始

### 安装依赖

```bash
npm install
```

### 基础使用

```tsx
import { Button, Input, Modal } from '@/components/ui';

function App() {
  return (
    <div>
      <Button variant="primary" onClick={() => console.log('clicked')}>
        点击我
      </Button>
      
      <Input 
        label="用户名"
        placeholder="请输入用户名"
        onChange={(value) => console.log(value)}
      />
    </div>
  );
}
```

### 主题配置

```tsx
import { ThemeProvider } from '@/components/ui';

function App() {
  return (
    <ThemeProvider defaultTheme="dark">
      {/* 你的应用内容 */}
    </ThemeProvider>
  );
}
```

## 组件列表

### 基础组件

- **Button** - 按钮组件，支持多种变体和状态
- **Input** - 输入框组件，包含各种输入类型
- **Textarea** - 多行文本输入组件
- **Select** - 下拉选择组件
- **Checkbox** - 复选框组件
- **Radio** - 单选框组件

### 数据展示

- **Table** - 表格组件，支持排序、筛选、分页
- **Card** - 卡片容器组件
- **Badge** - 徽章组件
- **Progress** - 进度条组件
- **Chart** - 图表组件

### 反馈组件

- **Modal** - 模态框组件
- **Loading** - 加载状态组件
- **Notification** - 通知组件
- **StatusIndicator** - 状态指示器

### 导航组件

- **Breadcrumb** - 面包屑导航
- **Steps** - 步骤条
- **Tabs** - 标签页

### 布局组件

- **Layout** - 页面布局组件
- **Grid** - 栅格系统
- **Space** - 间距组件

## 主题系统

### 主题变量

组件库使用CSS变量实现主题系统，支持深色和浅色两种主题：

```css
:root {
  /* 主色调 */
  --color-primary: #3b82f6;
  --color-primary-hover: #2563eb;
  
  /* 背景色 */
  --bg-primary: #ffffff;
  --bg-secondary: #f8fafc;
  
  /* 文本颜色 */
  --text-primary: #0f172a;
  --text-secondary: #475569;
}
```

### 主题切换

```tsx
import { useTheme } from '@/contexts/ThemeContext';

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  
  return (
    <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
      切换主题
    </button>
  );
}
```

## 组件API

### Button

```tsx
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  onClick?: (event: React.MouseEvent) => void;
  children: React.ReactNode;
}
```

### Input

```tsx
interface InputProps {
  label?: string;
  description?: string;
  error?: string;
  success?: string;
  variant?: 'default' | 'filled' | 'outlined';
  size?: 'sm' | 'md' | 'lg';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  value?: string;
  onChange?: (value: string, event: React.ChangeEvent) => void;
}
```

### Modal

```tsx
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  children: React.ReactNode;
}
```

## 样式定制

### 使用Tailwind CSS类

所有组件都支持通过`className`属性添加自定义样式：

```tsx
<Button className="w-full mt-4 shadow-lg">
  自定义样式按钮
</Button>
```

### CSS变量覆盖

可以通过覆盖CSS变量来定制主题：

```css
.custom-theme {
  --color-primary: #10b981;
  --color-primary-hover: #059669;
}
```

## 可访问性

所有组件都遵循WCAG 2.1 AA标准：

- 支持键盘导航
- 提供适当的ARIA属性
- 支持屏幕阅读器
- 具有足够的颜色对比度
- 提供焦点指示器

### 键盘导航

- `Tab` / `Shift + Tab` - 在可聚焦元素间导航
- `Enter` / `Space` - 激活按钮和链接
- `Escape` - 关闭模态框和下拉菜单
- `Arrow Keys` - 在选项间导航

## 测试

### 运行测试

```bash
# 运行所有测试
npm test

# 运行特定组件测试
npm test Button

# 运行测试并生成覆盖率报告
npm run test:coverage
```

### 测试示例

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '@/components/ui';

test('按钮点击事件', () => {
  const handleClick = jest.fn();
  render(<Button onClick={handleClick}>点击我</Button>);
  
  fireEvent.click(screen.getByRole('button'));
  expect(handleClick).toHaveBeenCalledTimes(1);
});
```

## Storybook文档

启动Storybook查看组件文档和示例：

```bash
npm run storybook
```

访问 http://localhost:6006 查看组件文档。

## 开发指南

### 添加新组件

1. 在`src/components/ui/`目录下创建组件文件
2. 在`types/index.ts`中添加类型定义
3. 创建对应的测试文件
4. 创建Storybook文档
5. 在`index.ts`中导出组件

### 组件开发规范

- 使用TypeScript编写组件
- 遵循React Hooks最佳实践
- 支持ref转发
- 提供完整的类型定义
- 编写单元测试
- 创建Storybook文档
- 遵循可访问性标准

### 样式规范

- 使用Tailwind CSS类
- 支持主题变量
- 响应式设计
- 一致的间距和尺寸
- 适当的动画和过渡效果

## 贡献指南

1. Fork项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建Pull Request

### 提交规范

使用约定式提交格式：

```
feat: 添加新的Button组件变体
fix: 修复Input组件的焦点问题
docs: 更新组件文档
test: 添加Modal组件测试
style: 优化组件样式
refactor: 重构Table组件逻辑
```

## 版本历史

### v1.0.0
- 初始版本发布
- 基础组件实现
- 主题系统
- TypeScript支持

## 许可证

MIT License

## 联系方式

如有问题或建议，请提交Issue或联系开发团队。