# 故障排除指南

## 📋 概述

本指南提供了使用组件库时可能遇到的常见问题及其解决方案。

## 🚨 常见问题

### 1. 组件导入问题

#### 问题：组件导入失败
```
Error: Module not found: Can't resolve '@/components/ui'
```

**原因**: 路径别名配置问题

**解决方案**:
```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});

// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

#### 问题：组件类型定义缺失
```
Error: Could not find a declaration file for module '@/components/ui'
```

**解决方案**:
```typescript
// src/types/components.d.ts
declare module '@/components/ui' {
  export const Button: React.FC<any>;
  export const Card: React.FC<any>;
  // ... 其他组件
}
```

### 2. 样式问题

#### 问题：组件样式不生效
**症状**: 组件渲染但没有样式

**可能原因**:
1. CSS文件未正确导入
2. CSS加载顺序问题
3. 样式被覆盖

**解决方案**:
```tsx
// 确保在应用入口导入样式
import '@/styles/index.css';

// 检查CSS加载顺序
import './global.css';  // 全局样式
import './components.css';  // 组件样式
```

#### 问题：样式冲突
**症状**: 组件样式被其他CSS覆盖

**解决方案**:
```css
/* 使用更具体的选择器 */
.my-app .btn {
  /* 组件样式 */
}

/* 或使用CSS模块 */
.button {
  composes: btn from '@/components/ui/Button/Button.module.css';
}
```

#### 问题：深色模式不工作
**症状**: 主题切换无效果

**解决方案**:
```tsx
// 确保正确设置主题属性
<div data-theme="dark">
  <App />
</div>

// 或使用CSS类
<div className="dark">
  <App />
</div>
```

### 3. TypeScript 问题

#### 问题：属性类型错误
```
Type '"large"' is not assignable to type '"sm" | "md" | "lg"'
```

**解决方案**:
```tsx
// 错误
<Button size="large">Click me</Button>

// 正确
<Button size="lg">Click me</Button>
```

#### 问题：事件处理器类型错误
```
Type '(id: string) => void' is not assignable to type '(event: MouseEvent) => void'
```

**解决方案**:
```tsx
// 错误
const handleClick = (id: string) => { ... };
<Button onClick={handleClick}>Click</Button>

// 正确
const handleClick = (event: React.MouseEvent) => {
  const id = event.currentTarget.dataset.id;
  // 处理逻辑
};
<Button onClick={handleClick} data-id="123">Click</Button>
```

### 4. 性能问题

#### 问题：组件渲染缓慢
**症状**: 页面加载或交互响应慢

**诊断方法**:
```tsx
// 使用React DevTools Profiler
import { Profiler } from 'react';

<Profiler id="MyComponent" onRender={onRenderCallback}>
  <MyComponent />
</Profiler>
```

**解决方案**:
```tsx
// 1. 使用React.memo优化
const OptimizedComponent = React.memo(MyComponent);

// 2. 使用useMemo缓存计算结果
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(props);
}, [props.dependency]);

// 3. 使用useCallback缓存函数
const handleClick = useCallback((event) => {
  // 处理逻辑
}, [dependency]);
```

#### 问题：CSS文件过大
**症状**: 首屏加载时间长

**解决方案**:
```tsx
// 使用动态导入
const loadPageCSS = async (pageName: string) => {
  await import(`@/styles/pages/${pageName}.css`);
};

// 使用CSS按需加载
import { useCSS } from '@/hooks/useCSS';

const MyComponent = () => {
  const { loaded } = useCSS('/styles/my-component.css', { immediate: true });
  
  if (!loaded) return <Loading />;
  return <div>Component content</div>;
};
```

### 5. 响应式问题

#### 问题：移动端显示异常
**症状**: 组件在移动设备上布局错乱

**解决方案**:
```tsx
// 使用响应式属性
<Button 
  size={{ base: 'lg', md: 'md' }}
  fullWidth={{ base: true, md: false }}
>
  响应式按钮
</Button>

// 使用CSS媒体查询
<div className="w-full md:w-auto">
  <Button>自适应按钮</Button>
</div>
```

#### 问题：断点不生效
**症状**: 响应式样式在某些屏幕尺寸下不工作

**解决方案**:
```css
/* 检查断点定义 */
@media (min-width: 768px) {
  .responsive-component {
    /* 平板样式 */
  }
}

@media (min-width: 1024px) {
  .responsive-component {
    /* 桌面样式 */
  }
}
```

### 6. 无障碍问题

#### 问题：键盘导航不工作
**症状**: 无法使用Tab键导航

**解决方案**:
```tsx
// 确保组件有正确的tabIndex
<Button tabIndex={0}>可聚焦按钮</Button>

// 处理键盘事件
const handleKeyDown = (event: React.KeyboardEvent) => {
  if (event.key === 'Enter' || event.key === ' ') {
    handleClick();
  }
};

<div 
  tabIndex={0}
  onKeyDown={handleKeyDown}
  role="button"
>
  自定义按钮
</div>
```

#### 问题：屏幕阅读器支持不足
**症状**: 屏幕阅读器无法正确读取内容

**解决方案**:
```tsx
// 添加ARIA标签
<Button 
  aria-label="关闭对话框"
  aria-describedby="help-text"
>
  ×
</Button>
<div id="help-text">点击此按钮关闭对话框</div>

// 使用语义化HTML
<nav role="navigation">
  <ul>
    <li><a href="/home">首页</a></li>
    <li><a href="/about">关于</a></li>
  </ul>
</nav>
```

### 7. 浏览器兼容性问题

#### 问题：IE11不支持某些特性
**症状**: 在IE11中样式或功能异常

**解决方案**:
```css
/* 使用CSS特性检测 */
@supports (display: grid) {
  .grid-container {
    display: grid;
  }
}

@supports not (display: grid) {
  .grid-container {
    display: flex;
    flex-wrap: wrap;
  }
}
```

#### 问题：Safari中的样式问题
**症状**: 在Safari中显示异常

**解决方案**:
```css
/* 添加webkit前缀 */
.backdrop-blur {
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
}

/* 处理Safari特有问题 */
@supports (-webkit-appearance: none) {
  .safari-specific {
    /* Safari特定样式 */
  }
}
```

## 🔧 调试工具

### 1. React DevTools
```bash
# 安装React DevTools浏览器扩展
# Chrome: https://chrome.google.com/webstore/detail/react-developer-tools
# Firefox: https://addons.mozilla.org/en-US/firefox/addon/react-devtools/
```

### 2. CSS调试
```css
/* 临时添加边框调试布局 */
* {
  outline: 1px solid red !important;
}

/* 调试特定组件 */
.debug .btn {
  background: yellow !important;
  border: 2px solid red !important;
}
```

### 3. 性能分析
```tsx
// 使用Performance API
const start = performance.now();
// 组件渲染
const end = performance.now();
console.log(`渲染时间: ${end - start}ms`);

// 使用React Profiler
import { Profiler } from 'react';

const onRenderCallback = (id, phase, actualDuration) => {
  console.log('组件渲染信息:', { id, phase, actualDuration });
};
```

## 📊 错误监控

### 1. 错误边界
```tsx
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('组件错误:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <h1>出现了错误</h1>;
    }

    return this.props.children;
  }
}
```

### 2. 控制台日志
```tsx
// 开发环境下的调试日志
if (process.env.NODE_ENV === 'development') {
  console.log('组件状态:', state);
  console.log('组件属性:', props);
}
```

## 🆘 获取帮助

### 1. 文档资源
- [组件API文档](./COMPONENT_API.md)
- [开发规范](./DEVELOPMENT_GUIDELINES.md)
- [迁移指南](./MIGRATION_GUIDE.md)

### 2. 在线资源
- [React官方文档](https://react.dev/)
- [TypeScript文档](https://www.typescriptlang.org/docs/)
- [Tailwind CSS文档](https://tailwindcss.com/docs)

### 3. 社区支持
- GitHub Issues
- Stack Overflow
- 开发团队内部支持

### 4. 调试检查清单

#### 组件问题
- [ ] 检查组件导入路径
- [ ] 验证属性类型和值
- [ ] 确认CSS文件已导入
- [ ] 检查控制台错误信息

#### 样式问题
- [ ] 检查CSS加载顺序
- [ ] 验证选择器优先级
- [ ] 确认主题设置正确
- [ ] 测试不同浏览器

#### 性能问题
- [ ] 使用React DevTools分析
- [ ] 检查不必要的重渲染
- [ ] 优化大型列表渲染
- [ ] 分析包体积大小

#### 无障碍问题
- [ ] 测试键盘导航
- [ ] 验证ARIA标签
- [ ] 检查颜色对比度
- [ ] 使用屏幕阅读器测试

---

**维护团队**: 前端开发团队  
**最后更新**: 2025年8月2日  
**文档版本**: v1.0.0
