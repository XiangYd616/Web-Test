# 可选的统一测试组件

这些组件是为了提供一致的用户体验而创建的**可选**组件。各个测试页面可以选择性使用，**不强制替换现有实现**。

## 🎯 设计原则

- **可选使用**: 页面可以选择使用或保持现有实现
- **向后兼容**: 不破坏现有功能
- **渐进式升级**: 提供平滑的升级路径
- **保持独立性**: 每个测试页面保持自己的特色

## 📦 组件列表

### 1. TestConfigPanel - 测试配置面板

提供统一的测试配置界面，支持自定义扩展。

```tsx
import { TestConfigPanel } from '../components/testing/shared';

// 基础使用
<TestConfigPanel
  config={testConfig}
  onConfigChange={setTestConfig}
  testType="performance"
/>

// 带自定义字段
<TestConfigPanel
  config={testConfig}
  onConfigChange={setTestConfig}
  testType="security"
  customFields={
    <div>
      <label>扫描深度</label>
      <select>
        <option>标准</option>
        <option>深度</option>
      </select>
    </div>
  }
/>
```

### 2. TestProgressDisplay - 进度显示组件

统一的测试进度显示，支持队列信息和控制按钮。

```tsx
import { TestProgressDisplay } from '../components/testing/shared';

<TestProgressDisplay
  status="running"
  progress={45}
  message="正在执行安全扫描..."
  currentStep="检查SSL证书"
  onCancel={handleCancel}
  showQueueInfo={true}
/>
```

### 3. TestResultsViewer - 结果展示组件

统一的测试结果展示，支持多种数据格式和导出功能。

```tsx
import { TestResultsViewer } from '../components/testing/shared';

<TestResultsViewer
  result={testResult}
  onExport={handleExport}
  onShare={handleShare}
  showRawData={true}
/>
```

## 🔧 在现有页面中使用

### 选项1: 完全替换（推荐用于新页面）

```tsx
// 新的测试页面可以直接使用统一组件
import { TestConfigPanel, TestProgressDisplay, TestResultsViewer } from '../components/testing/shared';

const NewTestPage = () => {
  return (
    <div>
      <TestConfigPanel {...configProps} />
      <TestProgressDisplay {...progressProps} />
      <TestResultsViewer {...resultProps} />
    </div>
  );
};
```

### 选项2: 部分使用（推荐用于现有页面）

```tsx
// 现有页面可以选择性使用部分组件
import { TestProgressDisplay } from '../components/testing/shared';

const ExistingTestPage = () => {
  return (
    <div>
      {/* 保持现有的配置界面 */}
      <CustomConfigPanel />
      
      {/* 使用统一的进度显示 */}
      <TestProgressDisplay {...progressProps} />
      
      {/* 保持现有的结果展示 */}
      <CustomResultsPanel />
    </div>
  );
};
```

### 选项3: 渐进式升级

```tsx
// 可以通过配置开关来控制使用哪种组件
const TestPage = () => {
  const useUnifiedComponents = false; // 可以通过配置控制

  return (
    <div>
      {useUnifiedComponents ? (
        <TestConfigPanel {...configProps} />
      ) : (
        <LegacyConfigPanel {...configProps} />
      )}
    </div>
  );
};
```

## 🎨 自定义样式

所有组件都使用Tailwind CSS，可以通过className属性自定义样式：

```tsx
<TestConfigPanel
  className="custom-config-panel"
  config={config}
  onConfigChange={setConfig}
  testType="api"
/>
```

## 📋 迁移指南

### 对于StressTest.tsx（保持现有实现）
- **建议**: 保持现有的复杂状态管理和自定义布局
- **原因**: 功能完整，性能优秀，作为其他页面的参考标准

### 对于APITest.tsx（可选升级）
- **建议**: 可以选择使用TestProgressDisplay替换现有进度显示
- **优势**: 统一的进度显示和队列信息
- **保持**: 现有的端点配置和批量测试功能

### 对于SEOTest.tsx（保持特色功能）
- **建议**: 保持现有的在线/本地双模式特色
- **可选**: 使用TestResultsViewer增强结果展示
- **保持**: useUnifiedSEOTest Hook和所有现有功能

### 对于其他页面（渐进式改进）
- **建议**: 根据页面完成度选择性使用组件
- **原则**: 不破坏现有功能，只增强用户体验

## 🔍 组件特性对比

| 特性 | TestConfigPanel | 现有配置 | 建议 |
|------|----------------|----------|------|
| URL验证 | ✅ 自动验证 | ❓ 各页面不同 | 可选升级 |
| 超时设置 | ✅ 滑块+输入 | ❓ 各页面不同 | 可选升级 |
| 高级选项 | ✅ 可折叠 | ❓ 各页面不同 | 可选升级 |
| 自定义扩展 | ✅ 支持 | ✅ 支持 | 保持现有 |

| 特性 | TestProgressDisplay | 现有进度 | 建议 |
|------|-------------------|----------|------|
| 队列信息 | ✅ 统一显示 | ❓ 仅压力测试 | 推荐升级 |
| 控制按钮 | ✅ 统一样式 | ❓ 各页面不同 | 可选升级 |
| 时间信息 | ✅ 详细显示 | ❓ 各页面不同 | 可选升级 |
| 紧凑模式 | ✅ 支持 | ❌ 不支持 | 新功能 |

## 🚀 最佳实践

1. **保持现有功能**: 不要为了使用新组件而删除现有功能
2. **渐进式升级**: 一次升级一个组件，测试后再继续
3. **用户体验优先**: 如果现有实现用户体验更好，保持现有实现
4. **文档更新**: 升级后更新相关文档和注释

## 📞 支持

如果在使用过程中遇到问题：

1. 检查现有页面的实现方式
2. 参考StressTest.tsx的完整实现
3. 查看组件的TypeScript类型定义
4. 保持现有功能不变的前提下进行调整

记住：这些组件是**可选的增强**，不是**强制的替换**！
