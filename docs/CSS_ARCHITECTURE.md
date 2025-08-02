# CSS架构规范

## 🎯 目标
- 避免CSS冲突和覆盖问题
- 提高样式的可维护性和可预测性
- 建立一致的设计系统

## 📁 文件组织结构

```
src/styles/
├── base/                 # 基础样式
│   ├── reset.css        # CSS重置
│   ├── typography.css   # 字体样式
│   └── variables.css    # CSS变量
├── components/          # 组件样式
│   ├── button.module.css
│   ├── card.module.css
│   └── form.module.css
├── layouts/             # 布局样式
│   ├── header.css
│   ├── sidebar.css
│   └── main.css
├── pages/               # 页面特定样式
│   ├── dashboard.css
│   └── settings.css
└── utilities/           # 工具类
    ├── spacing.css
    └── colors.css
```

## 🏗️ CSS架构层级

### 1. 基础层 (Base Layer)
```css
@layer base {
  /* 全局重置和基础样式 */
}
```

### 2. 组件层 (Components Layer)
```css
@layer components {
  /* 可复用组件样式 */
}
```

### 3. 工具层 (Utilities Layer)
```css
@layer utilities {
  /* Tailwind utilities */
}
```

## 🎨 样式编写规范

### 1. 使用CSS模块化
```tsx
// ✅ 推荐
import styles from './Button.module.css';
<button className={styles.dangerButton}>删除</button>

// ❌ 避免
<button className="test-record-action-button">删除</button>
```

### 2. 组件样式隔离
```css
/* Button.module.css */
.button {
  @apply px-4 py-2 rounded-lg transition-all duration-200;
}

.danger {
  @apply bg-red-600 text-white hover:bg-red-700;
}
```

### 3. 避免全局CSS类
```css
/* ❌ 避免全局类 */
.test-record-action-button {
  background: gray;
}

/* ✅ 使用模块化 */
.actionButton {
  @apply bg-gray-600 hover:bg-gray-700;
}
```

## 🔧 CSS特异性管理

### 特异性优先级 (从低到高)
1. 元素选择器: `button { }`
2. 类选择器: `.button { }`
3. ID选择器: `#button { }`
4. 内联样式: `style="..."`
5. !important: `color: red !important;`

### 最佳实践
- 优先使用类选择器
- 避免使用 !important
- 使用CSS模块化避免命名冲突
- 合理使用CSS层级 (@layer)

## 🚀 迁移计划

### 阶段1: 组件样式隔离
- 将全局CSS类迁移到CSS模块
- 重构关键组件样式

### 阶段2: 建立设计系统
- 创建统一的组件库
- 标准化颜色、字体、间距

### 阶段3: 清理冗余样式
- 移除未使用的CSS文件
- 合并重复的样式定义
