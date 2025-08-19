# 业务组件架构重构

本文档描述了前端组件架构重构的实现，包括业务组件的重构和全局状态管理的优化。

## 架构概览

重构后的前端架构采用以下设计模式：

- **组件分层**: UI组件 → 业务组件 → 页面组件
- **状态管理**: React Context + useReducer + 自定义Hook
- **数据流**: 单向数据流，通过dispatch更新状态
- **持久化**: 支持localStorage、sessionStorage和内存缓存

## 业务组件

### TestRunner - 统一测试运行器

统一的测试运行器组件，支持多种测试类型的统一界面和流程管理。

**特性:**
- 支持8种测试类型（压力、SEO、安全、API、性能、可访问性、兼容性、数据库）
- 统一的配置界面和进度显示
- 测试历史记录管理
- 实时进度更新和错误处理

**使用示例:**
```tsx
import { TestRunner } from '../components/business/TestRunner';

<TestRunner
  testType="stress"
  title="压力测试"
  description="测试网站在高并发情况下的性能表现"
  icon={<TestTube className="w-6 h-6" />}
  onTestComplete={handleTestComplete}
  onTestStart={handleTestStart}
/>
```

### ResultViewer - 统一结果展示

统一的测试结果展示组件，支持多种测试类型的结果可视化和分析。

**特性:**
- 多标签页展示（概览、详情、问题、建议）
- 支持图表和数据可视化
- 问题筛选和搜索功能
- 报告导出和分享功能

**使用示例:**
```tsx
import { ResultViewer } from '../components/business/ResultViewer';

<ResultViewer
  result={testResult}
  details={resultDetails}
  onDownload={handleDownload}
  onShare={handleShare}
  onRetry={handleRetry}
/>
```

### MonitorDashboard - 监控仪表板

集成实时监控功能的仪表板组件，提供统一的监控界面。

**特性:**
- 实时监控目标管理
- 告警系统集成
- 监控统计和图表展示
- WebSocket实时数据更新

**使用示例:**
```tsx
import { MonitorDashboard } from '../components/business/MonitorDashboard';

<MonitorDashboard />
```

### DataExporter - 数据导出器

支持多格式数据导出的组件，提供统一的导出界面和任务管理。

**特性:**
- 支持多种导出格式（PDF、Excel、CSV、JSON、PNG、SVG）
- 导出任务队列和进度跟踪
- 高级筛选和配置选项
- 文件压缩和密码保护

**使用示例:**
```tsx
import { DataExporter } from '../components/business/DataExporter';

<DataExporter
  onExport={handleExport}
  availableData={data}
/>
```

## 状态管理

### 全局状态结构

```typescript
interface AppState {
  auth: AuthState;      // 认证状态
  test: TestState;      // 测试状态
  monitoring: MonitoringState;  // 监控状态
  ui: UIState;          // UI状态
}
```

### 自定义Hook

#### useAuth - 认证管理
```typescript
const {
  user,
  isAuthenticated,
  login,
  logout,
  hasPermission
} = useAuth();
```

#### useTest - 测试管理
```typescript
const {
  activeTests,
  history,
  startTest,
  cancelTest,
  getTestHistory
} = useTest();
```

#### useMonitoring - 监控管理
```typescript
const {
  targets,
  alerts,
  startMonitoring,
  addTarget,
  resolveAlert
} = useMonitoring();
```

### 状态持久化

支持多种存储方式：

```typescript
import { localStorage, sessionStorage, memoryStorage } from '../utils/storage';

// 持久化存储
localStorage.set('key', value, expiry);

// 会话存储
sessionStorage.set('key', value);

// 内存缓存
memoryStorage.set('key', value);
```

## 组件通信

### 父子组件通信
通过props传递数据和回调函数：

```tsx
<TestRunner
  onTestComplete={(result) => {
    // 处理测试完成
  }}
  onTestStart={(config) => {
    // 处理测试开始
  }}
/>
```

### 跨组件通信
通过全局状态管理：

```tsx
// 组件A中更新状态
const { dispatch } = useAppContext();
dispatch({ type: 'TEST_START', payload: { test } });

// 组件B中读取状态
const { state } = useAppContext();
const { activeTests } = state.test;
```

### 实时数据更新
通过WebSocket和自定义Hook：

```tsx
const { data, isConnected } = useRealTimeData('monitoring');

useEffect(() => {
  if (data) {
    // 处理实时数据更新
  }
}, [data]);
```

## 错误处理

### 统一错误处理
所有组件都支持统一的错误处理机制：

```tsx
try {
  await startTest(config);
} catch (error) {
  showNotification(error.message, 'error');
}
```

### 错误边界
使用React Error Boundary捕获组件错误：

```tsx
<ErrorBoundary>
  <TestRunner />
</ErrorBoundary>
```

## 性能优化

### 组件懒加载
```tsx
const TestRunner = lazy(() => import('./TestRunner'));
const ResultViewer = lazy(() => import('./ResultViewer'));
```

### 状态缓存
```tsx
const { data } = useQuery(
  ['testHistory', userId],
  () => getTestHistory(userId),
  {
    staleTime: 5 * 60 * 1000, // 5分钟缓存
    cacheTime: 10 * 60 * 1000 // 10分钟保留
  }
);
```

### 虚拟化长列表
对于大量数据的列表，使用虚拟化技术：

```tsx
import { FixedSizeList as List } from 'react-window';

<List
  height={400}
  itemCount={items.length}
  itemSize={50}
>
  {({ index, style }) => (
    <div style={style}>
      {items[index]}
    </div>
  )}
</List>
```

## 测试

### 单元测试
每个Hook都有对应的单元测试：

```bash
# 运行测试
npm test

# 运行特定测试
npm test useAuth.test.ts

# 查看测试覆盖率
npm run test:coverage
```

### 集成测试
测试组件间的交互：

```tsx
test('测试运行器应该能够启动测试并更新状态', async () => {
  render(
    <AppProvider>
      <TestRunner testType="stress" />
    </AppProvider>
  );
  
  // 模拟用户操作
  fireEvent.click(screen.getByText('开始测试'));
  
  // 验证状态更新
  await waitFor(() => {
    expect(screen.getByText('测试进行中')).toBeInTheDocument();
  });
});
```

## 部署和维护

### 构建优化
```bash
# 生产构建
npm run build

# 分析包大小
npm run analyze

# 类型检查
npm run type-check
```

### 监控和调试
- 使用React DevTools查看组件状态
- 使用Redux DevTools查看状态变化
- 使用Performance API监控性能

## 最佳实践

1. **组件职责单一**: 每个组件只负责一个特定功能
2. **状态最小化**: 只在全局状态中存储必要的共享数据
3. **类型安全**: 使用TypeScript确保类型安全
4. **错误处理**: 为所有异步操作添加错误处理
5. **性能优化**: 使用React.memo、useMemo、useCallback优化性能
6. **可访问性**: 确保组件支持键盘导航和屏幕阅读器

## 未来扩展

1. **微前端支持**: 支持将组件作为独立的微前端模块
2. **主题系统**: 支持动态主题切换和自定义主题
3. **国际化**: 支持多语言界面
4. **离线支持**: 支持离线模式和数据同步
5. **插件系统**: 支持第三方插件扩展功能