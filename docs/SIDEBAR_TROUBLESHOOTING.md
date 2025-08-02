# 侧边栏问题排查指南

## 🔍 问题描述

用户反馈侧边栏中的SEO测试、安全测试、性能测试页面不见了。

## ✅ 已完成的修复

### 1. 修复测试工具组默认展开状态
**问题**: 测试工具组默认是折叠的，用户看不到子菜单项
**修复**: 将`expandedGroups`初始状态设置为`['testing']`

```tsx
// 修复前
const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

// 修复后  
const [expandedGroups, setExpandedGroups] = useState<string[]>(['testing']);
```

### 2. 添加缺失的CSS样式
**问题**: `.themed-sidebar`类没有定义，可能导致样式问题
**修复**: 在`theme-config.css`中添加样式定义

```css
/* 主题感知的侧边栏样式 */
.themed-sidebar {
  background-color: var(--surface-primary);
  border-right: 1px solid var(--border-primary);
  box-shadow: var(--shadow-lg);
}
```

## 📋 侧边栏菜单配置验证

### 测试工具菜单项配置
```tsx
{
  id: 'testing',
  name: '测试工具',
  icon: TestTube,
  href: '#',
  children: [
    {
      id: 'website-test',
      name: '网站测试',
      icon: Globe,
      href: '/website-test'
    },
    {
      id: 'stress-test', 
      name: '压力测试',
      icon: Zap,
      href: '/stress-test'
    },
    {
      id: 'seo-test',
      name: 'SEO测试',
      icon: Search,
      href: '/seo-test'
    },
    {
      id: 'security-test',
      name: '安全测试',
      icon: Shield,
      href: '/security-test',
      badge: 'NEW'
    },
    {
      id: 'performance-test',
      name: '性能测试',
      icon: Zap,
      href: '/performance-test',
      badge: 'NEW'
    },
    {
      id: 'compatibility-test',
      name: '兼容性测试',
      icon: Monitor,
      href: '/compatibility-test'
    },
    {
      id: 'api-test',
      name: 'API测试',
      icon: Code,
      href: '/api-test'
    }
  ]
}
```

### 路由配置验证
所有测试页面的路由都已正确配置：
- `/seo-test` → SEOTest组件
- `/security-test` → SecurityTest组件  
- `/performance-test` → PerformanceTest组件
- `/compatibility-test` → CompatibilityTest组件
- `/api-test` → APITest组件

## 🧪 测试步骤

### 1. 检查侧边栏是否显示
1. 访问 `http://localhost:5173`
2. 查看左侧侧边栏
3. 确认"测试工具"组是否默认展开
4. 确认是否显示所有子菜单项

### 2. 检查菜单项功能
1. 点击"SEO测试"菜单项
2. 确认页面跳转到 `/seo-test`
3. 重复测试其他菜单项

### 3. 检查响应式行为
1. 缩小浏览器窗口
2. 确认侧边栏在移动端的表现
3. 测试侧边栏折叠/展开功能

## 🔧 可能的其他问题

### 1. JavaScript错误
检查浏览器控制台是否有JavaScript错误：
```bash
# 打开浏览器开发者工具
F12 → Console标签
```

### 2. CSS加载问题
检查样式是否正确加载：
```bash
# 检查Network标签
F12 → Network → CSS文件是否正常加载
```

### 3. 组件渲染问题
检查React组件是否正常渲染：
```bash
# 检查React DevTools
React DevTools → Components → ModernSidebar
```

## 🚀 验证修复效果

### 预期结果
1. ✅ 侧边栏正常显示
2. ✅ "测试工具"组默认展开
3. ✅ 显示所有测试菜单项：
   - 网站测试
   - 压力测试  
   - SEO测试
   - 安全测试 (NEW)
   - 性能测试 (NEW)
   - 兼容性测试
   - API测试
4. ✅ 点击菜单项正常跳转
5. ✅ 样式显示正常

### 如果问题仍然存在
1. 检查浏览器缓存，尝试硬刷新 (Ctrl+F5)
2. 检查是否有其他CSS冲突
3. 验证React组件的state是否正确
4. 检查是否有条件渲染逻辑阻止了菜单显示

## 📝 相关文件

- `src/components/modern/ModernSidebar.tsx` - 侧边栏组件
- `src/components/modern/ModernLayout.tsx` - 布局组件
- `src/components/routing/AppRoutes.tsx` - 路由配置
- `src/styles/theme-config.css` - 主题样式
- `src/index.css` - 主样式文件

---

**总结**: 主要问题是测试工具组默认折叠状态和缺失的CSS样式。修复后，侧边栏应该正常显示所有测试菜单项。
