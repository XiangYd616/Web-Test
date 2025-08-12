# 统一测试页面迁移指南

## 概述

所有测试页面现在都使用统一的头部组件设计，类似压力测试页面的效果。这包括：

1. **统一的头部设计** - 包含标题、描述、图标
2. **标签页切换** - 测试和历史记录之间的切换
3. **测试控制按钮** - 开始/停止测试按钮
4. **一致的用户体验** - 所有测试页面保持相同的交互模式

## 新组件

### UnifiedTestHeader
- 统一的测试页面头部组件
- 包含标题、描述、图标、标签页切换、测试控制按钮

### UnifiedTestPageLayout
- 完整的测试页面布局组件
- 包含头部、内容区域、历史记录标签页
- 支持状态持久化和键盘快捷键

## 迁移步骤

### 1. 导入新组件

```typescript
import { UnifiedTestPageLayout } from '../components/testing/UnifiedTestPageLayout';
```

### 2. 替换现有布局

**之前：**
```typescript
<UnifiedTestPageWithHistory
  testType="seo"
  testTypeName="SEO测试"
  testIcon={Search}
  onTestSelect={handleTestSelect}
  onTestRerun={handleTestRerun}
  additionalComponents={LoginPromptComponent}
>
  {/* 测试内容 */}
</UnifiedTestPageWithHistory>
```

**之后：**
```typescript
<UnifiedTestPageLayout
  testType="seo"
  title="SEO综合分析"
  description="全面分析网站SEO状况，发现关键问题和优化机会"
  icon={Search}
  testStatus={testStatus}
  isTestDisabled={!testConfig.url}
  onStartTest={handleStartTest}
  onTestSelect={handleTestSelect}
  onTestRerun={handleTestRerun}
  additionalComponents={LoginPromptComponent}
  testTabLabel="SEO测试"
  historyTabLabel="测试历史"
  testContent={
    <>
      {/* 测试内容 */}
    </>
  }
/>
```

### 3. 移除重复的标题

由于 `UnifiedTestPageLayout` 已经包含了标题，需要移除测试内容中的重复标题。

### 4. 更新属性映射

| 旧属性 | 新属性 | 说明 |
|--------|--------|------|
| `testTypeName` | `title` | 页面标题 |
| - | `description` | 页面描述 |
| `testIcon` | `icon` | 页面图标 |
| - | `testStatus` | 测试状态 |
| - | `isTestDisabled` | 是否禁用测试按钮 |
| - | `onStartTest` | 开始测试回调 |
| - | `testTabLabel` | 测试标签页标签 |
| - | `historyTabLabel` | 历史标签页标签 |
| `children` | `testContent` | 测试内容 |

## 已完成的页面

- ✅ SEOTest.tsx
- ✅ PerformanceTest.tsx

## 待迁移的页面

- [ ] APITest.tsx
- [ ] CompatibilityTest.tsx
- [ ] AccessibilityTest.tsx
- [ ] SecurityTest.tsx (如果存在)

## 注意事项

1. **保持功能完整性** - 确保所有原有功能都正常工作
2. **测试状态管理** - 确保测试状态正确传递给头部组件
3. **历史记录功能** - 确保历史记录选择和重新运行功能正常
4. **登录提示** - 确保登录提示组件正确显示

## 键盘快捷键

新的统一布局支持键盘快捷键：
- `Ctrl+1` / `Cmd+1` - 切换到测试标签页
- `Ctrl+2` / `Cmd+2` - 切换到历史标签页

## 效果预览

迁移后，所有测试页面将具有：
- 统一的深色主题头部
- 左侧：图标 + 标题 + 描述
- 右侧：标签页切换按钮 + 测试控制按钮
- 平滑的标签页切换动画
- 状态持久化（刷新页面后保持当前标签页）
