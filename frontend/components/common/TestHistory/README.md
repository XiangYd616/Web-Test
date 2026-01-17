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

### 1. 基础用法（配置驱动）

```tsx
import TestHistory from '@/components/common/TestHistory';
import { stressTestConfig } from '@/components/common/TestHistory/config';

function MyPage() {
  return (
    <TestHistory
      config={stressTestConfig}
      onRecordClick={test => console.log(test)}
      onRecordDelete={testId => console.log('删除', testId)}
    />
  );
}
```

### 2. 自定义事件处理

```tsx
import TestHistory from '@/components/common/TestHistory';
import { stressTestConfig } from '@/components/common/TestHistory/config';

function MyPage() {
  return (
    <TestHistory
      config={stressTestConfig}
      onRecordClick={test => console.log('选择', test)}
      onRecordDelete={testId => console.log('删除', testId)}
    />
  );
}
```

## 可用的测试类型

| testType        | 配置                      | 说明         |
| --------------- | ------------------------- | ------------ |
| `stress`        | `stressTestConfig`        | 压力测试     |
| `security`      | `securityTestConfig`      | 安全测试     |
| `performance`   | `performanceTestConfig`   | 性能测试     |
| `api`           | `apiTestConfig`           | API 测试     |
| `seo`           | `seoTestConfig`           | SEO 测试     |
| `accessibility` | `accessibilityTestConfig` | 可访问性测试 |
| `compatibility` | `compatibilityTestConfig` | 兼容性测试   |
| `network`       | `networkTestConfig`       | 网络测试     |
| `database`      | `databaseTestConfig`      | 数据库测试   |
| `ux`            | `uxTestConfig`            | UX 测试      |
| `website`       | `websiteTestConfig`       | 网站测试     |
| `all`           | -                         | 所有类型     |

## Props

### TestHistoryProps

```typescript
interface TestHistoryProps {
  config: TestHistoryConfig; // 配置对象
  onRecordClick?: (record: TestRecord) => void; // 记录点击
  onRecordDelete?: (id: string) => Promise<void>; // 单个删除
  onBatchDelete?: (ids: string[]) => Promise<void>; // 批量删除
  additionalFilters?: Record<string, unknown>; // 额外筛选条件
  className?: string; // 自定义类名
}
```

### TestRecord

```typescript
interface TestRecord {
  id: string;
  testName: string;
  testType: string;
  url: string;
  status: 'idle' | 'starting' | 'running' | 'completed' | 'failed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  startTime?: string;
  endTime?: string;
  duration?: number;
  overallScore?: number;
  performanceGrade?: string;
  config: Record<string, unknown>;
  results?: Record<string, unknown>;
  errorMessage?: string;
  totalRequests?: number;
  successfulRequests?: number;
  failedRequests?: number;
  averageResponseTime?: number;
  peakTps?: number;
  errorRate?: number;
  tags?: string[];
  environment?: string;
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

如果你之前使用的是特定测试类型的历史组件（如 `StressTestHistory`），请改为直接使用通用组件：

```tsx
// 之前
import StressTestHistory from '@/components/stress/StressTestHistory';
<StressTestHistory onSelectTest={handleSelect} />;

// 之后
import { TestHistory } from '@/components/common/TestHistory';
import { stressTestConfig } from '@/components/common/TestHistory/config';
<TestHistory config={stressTestConfig} onRecordSelect={handleSelect} />;
```
