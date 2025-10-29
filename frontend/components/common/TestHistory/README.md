# TestHistory 统一历史组件

统一的测试历史记录组件，支持所有测试类型。

## 组件结构

```
components/common/TestHistory/
├── index.tsx              # 主组件
├── hooks/                 # 可复用 hooks
│   ├── useTestRecords.ts
│   ├── useFilters.ts
│   ├── usePagination.ts
│   ├── useSelection.ts
│   ├── useDeleteActions.ts
│   ├── useExport.ts
│   └── useDetailView.ts
├── components/            # 子组件
│   ├── HistoryHeader.tsx
│   ├── FilterBar.tsx
│   ├── RecordCard/
│   ├── PaginationBar.tsx
│   ├── LoadingState.tsx
│   ├── EmptyState.tsx
│   └── UnauthorizedState.tsx
├── types.ts              # 类型定义
├── utils.ts              # 工具函数
└── exports.ts            # 统一导出
```

## 使用方式

### 1. 直接使用通用组件

```tsx
import TestHistory from '@/components/common/TestHistory';

function MyPage() {
  return (
    <TestHistory
      testType="stress"
      title="压力测试历史"
      description="查看和管理压力测试记录"
      onTestSelect={(test) => console.log(test)}
      onTestRerun={(test) => console.log('重新运行', test)}
      onTestDelete={(testId) => console.log('删除', testId)}
    />
  );
}
```

### 2. 使用特定类型的包装组件

```tsx
import StressTestHistory from '@/components/stress/StressTestHistory';
// 或
import { StressTestHistory } from '@/components/common/TestHistory/exports';

function MyPage() {
  return (
    <StressTestHistory
      onTestSelect={(test) => console.log(test)}
      onTestRerun={(test) => console.log('重新运行', test)}
      onTestDelete={(testId) => console.log('删除', testId)}
    />
  );
}
```

## 可用的测试类型

| testType | 包装组件 | 说明 |
|----------|---------|------|
| `stress` | `StressTestHistory` | 压力测试 |
| `security` | `SecurityTestHistory` | 安全测试 |
| `performance` | `PerformanceTestHistory` | 性能测试 |
| `api` | `APITestHistory` | API 测试 |
| `seo` | `SEOTestHistory` | SEO 测试 |
| `accessibility` | `AccessibilityTestHistory` | 可访问性测试 |
| `compatibility` | `CompatibilityTestHistory` | 兼容性测试 |
| `network` | `NetworkTestHistory` | 网络测试 |
| `database` | `DatabaseTestHistory` | 数据库测试 |
| `ux` | `UXTestHistory` | UX 测试 |
| `website` | `WebsiteTestHistory` | 网站测试 |
| `all` | - | 所有类型 |

## Props

### TestHistoryProps

```typescript
interface TestHistoryProps {
  testType: 'all' | 'stress' | 'security' | 'api' | 'performance' | 
            'compatibility' | 'seo' | 'accessibility' | 'website' | 
            'network' | 'ux' | 'database';
  title?: string;                           // 标题
  description?: string;                     // 描述
  onTestSelect?: (test: TestHistoryItem) => void;   // 选择测试
  onTestRerun?: (test: TestHistoryItem) => void;    // 重新运行测试
  onTestDelete?: (testId: string) => void;          // 删除测试
}
```

### TestHistoryItem

```typescript
interface TestHistoryItem {
  id: string;
  testType: string;
  name?: string;
  url?: string;
  status: 'passed' | 'failed' | 'running' | 'cancelled';
  score?: number;
  startTime: string;
  endTime?: string;
  duration?: number;
  results?: any;
}
```

## 功能特性

- ✅ 统一的历史记录展示
- ✅ 搜索和过滤
- ✅ 多种排序方式
- ✅ 分页功能
- ✅ 批量操作
- ✅ 导出功能
- ✅ 详情查看
- ✅ 测试重跑
- ✅ 记录删除

## 迁移指南

### 从旧组件迁移

如果你之前使用的是特定测试类型的历史组件（如 `StressTestHistory`），现在有两个选择：

1. **继续使用包装组件**（推荐，无需修改代码）
   ```tsx
   // 之前
   import StressTestHistory from '@/components/stress/StressTestHistory';
   
   // 之后 - 无需修改，包装组件已更新
   import StressTestHistory from '@/components/stress/StressTestHistory';
   ```

2. **直接使用通用组件**
   ```tsx
   // 之前
   import StressTestHistory from '@/components/stress/StressTestHistory';
   <StressTestHistory onSelectTest={handleSelect} />
   
   // 之后
   import TestHistory from '@/components/common/TestHistory';
   <TestHistory testType="stress" onTestSelect={handleSelect} />
   ```

