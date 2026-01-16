# TestHistory 使用文档

## 📖 概述

TestHistory 是一个配置驱动的通用测试历史组件,支持多种测试类型的历史记录展示。

**核心优势**:

- 🎯 **配置驱动**: 通过配置文件定义,无需重复编写组件代码
- 🔄 **高度复用**: 一个组件支持所有测试类型
- 🎨 **灵活定制**: 支持自定义列、筛选器、操作等
- 📦 **开箱即用**: 内置分页、排序、筛选、批量操作等功能

---

## 🚀 快速开始

### 1. 基础用法

```typescript
import { TestHistory } from '@/components/common/TestHistory';
import { stressTestConfig } from '@/components/common/TestHistory/config';

function StressTestHistoryPage() {
  return (
    <TestHistory config={stressTestConfig} />
  );
}
```

### 2. 自定义事件处理

```typescript
import { TestHistory } from '@/components/common/TestHistory';
import { seoTestConfig } from '@/components/common/TestHistory/config';

function SEOTestHistoryPage() {
  const handleRecordClick = (record: TestRecord) => {
    // 跳转到详情页
    navigate(`/seo/detail/${record.id}`);
  };

  const handleDelete = async (id: string) => {
    // 自定义删除逻辑
    await deleteTestRecord(id);
    // 刷新列表
    refresh();
  };

  return (
    <TestHistory
      config={seoTestConfig}
      onRecordClick={handleRecordClick}
      onRecordDelete={handleDelete}
    />
  );
}
```

### 3. 添加额外筛选

```typescript
import { TestHistory } from '@/components/common/TestHistory';
import { stressTestConfig } from '@/components/common/TestHistory/config';

function FilteredStressTestHistory() {
  const [userId, setUserId] = useState('');

  return (
    <TestHistory
      config={stressTestConfig}
      additionalFilters={{
        userId,
        // 其他自定义筛选条件
      }}
    />
  );
}
```

---

## ⚙️ 创建新配置

### 步骤1: 创建配置文件

在 `components/common/TestHistory/config/` 下创建新配置文件:

```typescript
// config/apiTestConfig.ts
import { TestHistoryConfig } from '../types';

export const apiTestConfig: TestHistoryConfig = {
  testType: 'api',
  apiEndpoint: '/api/test/api',
  title: 'API测试历史',

  columns: [
    {
      key: 'testName',
      title: '测试名称',
      width: 200,
      sortable: true,
    },
    {
      key: 'endpoint',
      title: 'API端点',
      width: 300,
      sortable: true,
    },
    {
      key: 'method',
      title: '请求方法',
      width: 100,
      formatter: (method: string) => method.toUpperCase(),
    },
    {
      key: 'responseTime',
      title: '响应时间',
      width: 120,
      sortable: true,
      formatter: (ms: number) => `${ms}ms`,
    },
    {
      key: 'status',
      title: '状态',
      width: 120,
      sortable: true,
    },
    {
      key: 'createdAt',
      title: '创建时间',
      width: 180,
      sortable: true,
    },
  ],

  statusOptions: [
    { value: 'all', label: '全部' },
    { value: 'completed', label: '成功' },
    { value: 'failed', label: '失败' },
  ],

  features: {
    export: true,
    batchDelete: true,
    detailView: true,
    search: true,
  },

  customFilters: [
    {
      key: 'method',
      label: '请求方法',
      type: 'select',
      options: [
        { value: 'all', label: '全部方法' },
        { value: 'GET', label: 'GET' },
        { value: 'POST', label: 'POST' },
        { value: 'PUT', label: 'PUT' },
        { value: 'DELETE', label: 'DELETE' },
      ],
    },
  ],
};
```

### 步骤2: 注册配置

在 `config/index.ts` 中添加新配置:

```typescript
import apiTestConfig from './apiTestConfig';

export const configMap: Record<string, TestHistoryConfig> = {
  stress: stressTestConfig,
  seo: seoTestConfig,
  api: apiTestConfig, // 新增
};
```

### 步骤3: 使用新配置

```typescript
import { TestHistory } from '@/components/common/TestHistory';
import { apiTestConfig } from '@/components/common/TestHistory/config';

function APITestHistoryPage() {
  return <TestHistory config={apiTestConfig} />;
}
```

---

## 🎨 配置选项

### TestHistoryConfig

```typescript
interface TestHistoryConfig {
  // 基础配置
  testType: string; // 测试类型标识
  apiEndpoint: string; // API基础路径
  title: string; // 页面标题
  description?: string; // 描述文本

  // 显示配置
  columns: ColumnConfig[]; // 表格列配置
  statusOptions: StatusOption[]; // 状态选项
  defaultPageSize?: number; // 默认每页数量
  pageSizeOptions?: number[]; // 页面大小选项

  // 功能配置
  features: {
    export?: boolean; // 是否支持导出
    exportFormats?: string[]; // 支持的导出格式
    batchDelete?: boolean; // 是否支持批量删除
    detailView?: boolean; // 是否支持详情查看
    rerun?: boolean; // 是否支持重新运行
    search?: boolean; // 是否支持搜索
    advancedFilter?: boolean; // 是否支持高级筛选
  };

  // 自定义配置
  customFilters?: FilterConfig[]; // 额外筛选器
  customActions?: ActionConfig[]; // 自定义操作
  formatters?: Formatters; // 数据格式化函数
  emptyState?: EmptyStateConfig; // 空状态配置
}
```

### ColumnConfig

```typescript
interface ColumnConfig {
  key: string; // 字段键
  title: string; // 列标题
  width?: string | number; // 列宽度
  sortable?: boolean; // 是否可排序
  filterable?: boolean; // 是否可筛选
  formatter?: (value: any) => string; // 格式化函数
  render?: (record: any) => ReactNode; // 自定义渲染
  align?: 'left' | 'center' | 'right'; // 对齐方式
}
```

---

## 📊 内置功能

### 1. 分页

自动处理分页逻辑,支持:

- 页码切换
- 每页数量调整
- 总数显示

### 2. 排序

点击列标题进行排序:

- 升序/降序切换
- 多列排序支持(可配置)

### 3. 筛选

内置筛选功能:

- 状态筛选
- 搜索关键字
- 日期范围
- 自定义筛选器

### 4. 批量操作

支持批量操作:

- 全选/反选
- 批量删除
- 批量导出

### 5. 导出

支持多种格式导出:

- JSON
- CSV

---

## 🔧 高级用法

### 自定义格式化器

```typescript
formatters: {
  // 日期格式化
  date: (date: string | Date) => {
    return dayjs(date).format('YYYY-MM-DD HH:mm:ss');
  },

  // 数字格式化
  number: (num: number) => {
    return num.toLocaleString('zh-CN');
  },

  // 自定义字段格式化
  customField: (value: any) => {
    return value ? '是' : '否';
  },
}
```

### 自定义操作按钮

```typescript
customActions: [
  {
    key: 'share',
    label: '分享',
    icon: <ShareIcon />,
    onClick: (record) => {
      shareTest(record.id);
    },
    visible: (record) => record.status === 'completed',
    disabled: (record) => !record.canShare,
  },
]
```

### 自定义空状态

```typescript
emptyState: {
  title: '暂无数据',
  description: '还没有创建任何测试',
  icon: <EmptyIcon />,
  action: {
    label: '创建第一个测试',
    onClick: () => navigate('/create'),
  },
}
```

---

## 📝 最佳实践

### 1. 配置文件组织

```
config/
├── index.ts                 # 配置索引
├── stressTestConfig.ts      # 压力测试配置
├── seoTestConfig.ts         # SEO测试配置
├── apiTestConfig.ts         # API测试配置
└── common/                  # 共享配置
    ├── statusOptions.ts     # 通用状态选项
    └── formatters.ts        # 通用格式化器
```

### 2. 代码复用

提取共享的配置到单独文件:

```typescript
// config/common/statusOptions.ts
export const commonStatusOptions = [
  { value: 'all', label: '全部状态' },
  { value: 'running', label: '运行中' },
  { value: 'completed', label: '已完成' },
  { value: 'failed', label: '失败' },
];

// 在具体配置中使用
import { commonStatusOptions } from './common/statusOptions';

export const myTestConfig: TestHistoryConfig = {
  // ...
  statusOptions: commonStatusOptions,
  // ...
};
```

### 3. 类型安全

为自定义字段定义类型:

```typescript
interface StressTestRecord extends TestRecord {
  concurrent: number;
  peakTps: number;
  errorRate: number;
}

// 在formatter中使用类型
formatter: (value: number, record: StressTestRecord) => {
  return `${value} / ${record.concurrent}`;
};
```

---

## 🐛 故障排除

### 问题1: 数据不显示

**原因**: API端点配置错误或数据格式不匹配

**解决**:

1. 检查 `apiEndpoint` 配置
2. 确认API返回格式符合 `TestHistoryResponse`
3. 查看浏览器控制台错误

### 问题2: 列显示异常

**原因**: Column key 与数据字段不匹配

**解决**:

1. 确认 `columns[].key` 与 API 返回的字段名一致
2. 使用 `formatter` 或 `render` 处理复杂数据

### 问题3: 筛选不生效

**原因**: 后端未处理筛选参数

**解决**:

1. 确认后端接收并处理查询参数
2. 检查网络请求中的查询字符串
3. 验证 `customFilters` 配置

---

## 📚 相关资源

- [类型定义](./types.ts)
- [配置示例](./config/)
- [Hooks文档](./hooks/)
- [组件API](./README.md)

---

## 🤝 贡献指南

添加新的测试类型配置:

1. 在 `config/` 下创建新配置文件
2. 在 `config/index.ts` 中注册配置
3. 更新本文档添加使用示例
4. 提交 PR

---

**最后更新**: 2025-11-13  
**维护者**: Development Team
