# 测试页面历史标签页集成指南

## 📋 概述

基于压力测试页面的标签页设计，为所有测试页面提供统一的测试历史标签页功能。每个测试页面都包含两个标签页：
- **测试标签页**：进行测试配置和执行
- **历史标签页**：查看该测试类型的历史记录

## 🏗️ 组件架构

### 1. TestPageWithHistory - 通用测试页面容器
```typescript
interface TestPageWithHistoryProps {
  testType: 'stress' | 'security' | 'api' | 'performance' | 'compatibility' | 'seo' | 'accessibility';
  testName: string;
  testIcon?: string;
  testContent: React.ReactNode;
  historyContent: React.ReactNode;
  className?: string;
  defaultTab?: 'test' | 'history';
  onTabChange?: (tab: 'test' | 'history') => void;
}
```

### 2. TestPageHistory - 测试历史组件
```typescript
interface TestPageHistoryProps {
  testType: 'stress' | 'security' | 'api' | 'performance' | 'compatibility' | 'seo' | 'accessibility';
  className?: string;
  onTestSelect?: (test: TestRecord) => void;
  onTestRerun?: (test: TestRecord) => void;
}
```

## 🚀 快速集成

### 步骤1：导入组件
```typescript
import TestPageWithHistory from '../components/testing/TestPageWithHistory';
import TestPageHistory from '../components/testHistory/TestPageHistory';
```

### 步骤2：创建测试内容
```typescript
const testContent = (
  <div className="space-y-6">
    {/* 你的测试配置和执行界面 */}
    <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg border border-gray-700/50 p-6">
      <h3 className="text-lg font-semibold text-white mb-4">
        🔧 测试配置
      </h3>
      {/* 测试表单和控件 */}
    </div>
  </div>
);
```

### 步骤3：创建历史内容
```typescript
const historyContent = (
  <TestPageHistory
    testType="security" // 替换为你的测试类型
    onTestSelect={(test) => {
      // 处理测试记录选择
      console.log('选择的测试:', test);
    }}
    onTestRerun={(test) => {
      // 处理重新运行测试
      setTestUrl(test.url);
      setTestName(`${test.testName} - 重新运行`);
    }}
  />
);
```

### 步骤4：组合页面
```typescript
return (
  <TestPageWithHistory
    testType="security"
    testName="安全测试"
    testIcon="🛡️"
    testContent={testContent}
    historyContent={historyContent}
    onTabChange={(tab) => {
      console.log('切换到标签页:', tab);
    }}
  />
);
```

## 📊 支持的测试类型

| 测试类型 | 名称 | 图标 | 颜色 |
|----------|------|------|------|
| stress | 压力测试 | ⚡ | #ef4444 |
| security | 安全测试 | 🛡️ | #f59e0b |
| api | API测试 | 🔌 | #8b5cf6 |
| performance | 性能测试 | 🚀 | #3b82f6 |
| compatibility | 兼容性测试 | 🌐 | #06b6d4 |
| seo | SEO测试 | 📈 | #10b981 |
| accessibility | 可访问性测试 | ♿ | #6366f1 |

## 🎯 功能特性

### 1. 标签页切换
- 平滑的标签页切换动画
- 状态保持（从其他页面返回时记住当前标签页）
- 响应式设计，移动端友好

### 2. 测试历史功能
- **搜索**：按测试名称或URL搜索
- **筛选**：按状态筛选（全部、已完成、运行中、失败、等待中）
- **分页**：支持大量历史记录的分页显示
- **批量操作**：支持批量选择和操作
- **快速操作**：查看详情、重新运行、更多操作

### 3. 测试记录操作
- **查看详情**：导航到测试详情页面
- **重新运行**：预填配置并切换到测试标签页
- **状态显示**：直观的状态标签和颜色编码

## 🔧 高级配置

### 1. 自定义样式
```typescript
<TestPageWithHistory
  className="custom-test-page"
  // ... 其他props
/>
```

### 2. 默认标签页
```typescript
<TestPageWithHistory
  defaultTab="history" // 默认显示历史标签页
  // ... 其他props
/>
```

### 3. 标签页切换回调
```typescript
<TestPageWithHistory
  onTabChange={(tab) => {
    // 处理标签页切换
    if (tab === 'history') {
      // 刷新历史记录
      refreshHistory();
    }
  }}
  // ... 其他props
/>
```

## 📱 响应式设计

组件已经内置了响应式设计：

- **桌面端**：完整的双列布局，丰富的交互功能
- **平板端**：自适应布局，保持核心功能
- **移动端**：单列布局，简化操作界面

## 🔄 状态管理

### 1. 标签页状态
```typescript
const [activeTab, setActiveTab] = useState<'test' | 'history'>('test');

// 处理从其他页面导航过来的状态
useEffect(() => {
  if (location.state?.activeTab) {
    setActiveTab(location.state.activeTab);
  }
}, [location.state]);
```

### 2. 测试配置预填
```typescript
// 从历史记录重新运行时预填配置
const handleTestRerun = (test: TestRecord) => {
  setTestUrl(test.url);
  setTestName(`${test.testName} - 重新运行`);
  // 切换到测试标签页
  setActiveTab('test');
};
```

## 🎨 UI/UX 设计原则

### 1. 一致性
- 所有测试页面使用相同的标签页结构
- 统一的颜色方案和交互模式
- 一致的图标和文案

### 2. 易用性
- 清晰的视觉层次
- 直观的操作流程
- 友好的错误提示

### 3. 性能
- 懒加载历史记录
- 防抖搜索
- 虚拟滚动（大量数据时）

## 🚀 最佳实践

### 1. 测试页面结构
```typescript
const YourTestPage: React.FC = () => {
  // 测试状态
  const [testConfig, setTestConfig] = useState({});
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState(null);

  // 测试内容
  const testContent = (
    <div className="space-y-6">
      {/* 配置区域 */}
      <TestConfigSection />
      
      {/* 进度区域 */}
      {isRunning && <TestProgressSection />}
      
      {/* 结果区域 */}
      {results && <TestResultsSection />}
    </div>
  );

  // 历史内容
  const historyContent = (
    <TestPageHistory
      testType="your-test-type"
      onTestSelect={handleTestSelect}
      onTestRerun={handleTestRerun}
    />
  );

  return (
    <TestPageWithHistory
      testType="your-test-type"
      testName="你的测试"
      testIcon="🔧"
      testContent={testContent}
      historyContent={historyContent}
    />
  );
};
```

### 2. 错误处理
```typescript
const handleTestRerun = (test: TestRecord) => {
  try {
    // 预填配置
    setTestConfig(test.config);
    setActiveTab('test');
  } catch (error) {
    console.error('重新运行测试失败:', error);
    // 显示错误提示
  }
};
```

### 3. 性能优化
```typescript
// 使用 useCallback 优化回调函数
const handleTestSelect = useCallback((test: TestRecord) => {
  // 处理测试选择
}, []);

// 使用 useMemo 优化计算
const filteredTests = useMemo(() => {
  return tests.filter(test => 
    test.testName.includes(searchQuery)
  );
}, [tests, searchQuery]);
```

## 🎉 总结

通过这套标签页系统，你可以：

1. **快速集成**：几行代码就能为任何测试页面添加历史功能
2. **统一体验**：所有测试页面都有一致的用户体验
3. **功能丰富**：搜索、筛选、分页、批量操作等完整功能
4. **易于维护**：组件化设计，便于维护和扩展

现在你可以在所有测试页面中使用这个标签页结构，为用户提供更好的测试历史管理体验！
