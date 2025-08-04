# 样式迁移指南 - 消除内联样式

## 🎯 目标
将项目中的内联样式迁移到CSS类，提高代码质量和可维护性。

## 📋 常见内联样式及其替代方案

### 1. 卡片样式
```tsx
// ❌ 内联样式
<div style={{
  background: 'var(--card-background)',
  boxShadow: 'var(--card-shadow)',
  borderColor: 'var(--border-color)'
}}>

// ✅ CSS类
<div className="card-primary">
```

### 2. 主题切换按钮
```tsx
// ❌ 内联样式
<button style={{
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border-primary)',
  color: 'var(--text-primary)'
}}>

// ✅ CSS类
<button className="theme-toggle-btn">
```

### 3. 进度条
```tsx
// ❌ 内联样式
<div style={{ width: `${progress}%` }}>

// ✅ CSS变量 + 类
<div 
  className="progress-fill progress-fill-blue"
  style={{ '--progress': `${progress}%` }}
>
```

### 4. 网格布局
```tsx
// ❌ 内联样式
<div style={{ gridTemplateColumns: 'auto 1fr' }}>

// ✅ CSS类
<div className="grid-cols-auto-1fr">
```

### 5. 动画延迟
```tsx
// ❌ 内联样式
<div style={{ animationDelay: `${i * 0.15}s` }}>

// ✅ CSS类 + 变量
<div 
  className="loading-bar"
  style={{ '--delay': `${i * 0.15}s` }}
>
```

## 🛠️ 迁移步骤

### 步骤1：识别内联样式
```bash
# 查找所有内联样式
grep -r "style={{" src/ --include="*.tsx" --include="*.jsx"
```

### 步骤2：分类样式
- **静态样式** → 移动到CSS类
- **动态样式** → 使用CSS变量
- **条件样式** → 使用条件CSS类

### 步骤3：创建CSS类
在 `src/styles/components.css` 中添加对应的CSS类。

### 步骤4：更新组件
替换内联样式为CSS类。

### 步骤5：测试验证
确保样式效果一致。

## 📁 CSS文件结构

```
src/styles/
├── design-system.css      # 设计令牌和变量
├── components.css         # 组件样式类
├── pagination.css         # 分页组件样式
├── progress-bar.css       # 进度条样式
├── base/
│   ├── reset.css         # 重置样式
│   ├── typography.css    # 字体样式
│   └── scrollbar.css     # 滚动条样式
└── utilities/
    ├── animations.css    # 动画工具类
    ├── helpers.css       # 辅助工具类
    └── layout.css        # 布局工具类
```

## 🔧 工具和规则

### ESLint规则
使用 `.eslintrc-inline-styles.js` 来防止新的内联样式：

```bash
# 检查内联样式
npx eslint src/ --config .eslintrc-inline-styles.js
```

### 自动化脚本
```bash
# 创建样式迁移脚本
npm run migrate-styles
```

## 📊 迁移进度追踪

### 当前状态
- [ ] Login.tsx - 主题切换按钮和卡片样式
- [ ] Register.tsx - 主题切换按钮
- [ ] ModernDashboard.tsx - 统计卡片渐变
- [ ] EnhancedSEOAnalysis.tsx - 进度条
- [ ] EnhancedPerformanceAnalysis.tsx - 进度条
- [ ] Loading.tsx - 动画延迟
- [ ] DataTable.tsx - 网格布局

### 优先级
1. **高频使用组件** - 按钮、卡片、进度条
2. **页面级组件** - 登录、注册、仪表板
3. **工具组件** - 加载、表格

## 🎨 CSS变量使用规范

### 动态值使用CSS变量
```css
.progress-fill {
  width: var(--progress, 0%);
  transition: width 0.5s ease;
}
```

```tsx
// 组件中设置CSS变量
<div 
  className="progress-fill"
  style={{ '--progress': `${value}%` } as React.CSSProperties}
>
```

### 主题变量
```css
:root {
  --color-primary: #3b82f6;
  --bg-card: #374151;
  --border-primary: #4b5563;
}
```

## ✅ 验证清单

- [ ] 所有内联样式已迁移到CSS类
- [ ] 动态样式使用CSS变量
- [ ] ESLint检查通过
- [ ] 视觉效果保持一致
- [ ] 响应式设计正常
- [ ] 主题切换正常

## 🚀 最佳实践

1. **优先使用现有CSS类**
2. **新样式添加到对应的CSS文件**
3. **使用语义化的类名**
4. **保持CSS文件的组织结构**
5. **定期重构和优化CSS**

## 📞 需要帮助？

如果在迁移过程中遇到问题：
1. 查看现有的CSS文件寻找类似样式
2. 参考设计系统变量
3. 考虑是否需要新的工具类
4. 保持样式的一致性和可维护性
