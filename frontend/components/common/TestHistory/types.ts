/**
 * TestHistory Types
 * 
 * 文件路径: frontend/components/common/TestHistory/types.ts
 * 创建时间: 2025-10-05
 */

export interface TestRecord {
  id: string;
  testName: string;
  testType: string;
  url: string;
  status: 'idle' | 'starting' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime?: string;
  endTime?: string;
  duration?: number;
  createdAt: string;
  updatedAt: string;
  overallScore?: number;
  performanceGrade?: string;
  config: any;
  results?: any;
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

export interface LoadTestRecordsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  dateFilter?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface DeleteDialogState {
  isOpen: boolean;
  type: 'single' | 'batch';
  recordId?: string;
  recordName?: string;
  recordNames?: string[];
  isLoading: boolean;
}

export interface FilterState {
  searchTerm: string;
  statusFilter: string;
  dateFilter: string;
  sortBy: 'created_at' | 'duration' | 'start_time' | 'status';
  sortOrder: 'asc' | 'desc';
}

export interface PaginationState {
  currentPage: number;
  pageSize: number;
  totalRecords: number;
}

export type SortField = 'created_at' | 'duration' | 'start_time' | 'status';

// ============= 配置相关类型 =============

/**
 * 表格列配置
 */
export interface ColumnConfig {
  key: string;                                    // 字段键名
  title: string;                                   // 列标题
  width?: number;                                  // 列宽
  sortable?: boolean;                              // 是否可排序
  filterable?: boolean;                            // 是否可筛选
  align?: 'left' | 'center' | 'right';            // 对齐方式
  formatter?: (value: any, record?: TestRecord) => string | React.ReactNode;  // 格式化器
  hideOnMobile?: boolean;                          // 移动端是否隐藏 (Phase 5)
  hideOnTablet?: boolean;                          // 平板端是否隐藏 (Phase 5)
  priority?: number;                               // 响应式显示优先级 (Phase 5)
}

/**
 * 状态选项
 */
export interface StatusOption {
  value: string;    // 状态值
  label: string;    // 显示标签
  color?: string;   // 状态颜色
}

/**
 * 自定义筛选器
 */
export interface CustomFilter {
  key: string;                    // 筛选键名
  label: string;                  // 筛选标签
  type: 'text' | 'number' | 'select' | 'date' | 'daterange';  // 筛选类型
  placeholder?: string;           // 占位符
  options?: { value: string; label: string }[];  // 下拉选项（select类型）
  defaultValue?: any;             // 默认值
}

/**
 * 自定义操作
 */
export interface CustomAction {
  key: string;                                     // 操作键名
  label: string;                                   // 操作标签
  icon?: React.ReactNode;                          // 图标
  onClick: (record: TestRecord) => void | Promise<void>;  // 点击处理
  visible?: (record: TestRecord) => boolean;       // 是否可见
  disabled?: (record: TestRecord) => boolean;      // 是否禁用
}

/**
 * 功能配置
 */
export interface FeaturesConfig {
  export?: boolean;                  // 是否启用导出
  exportFormats?: ('json' | 'csv' | 'excel')[];  // 导出格式
  batchDelete?: boolean;             // 是否启用批量删除
  detailView?: boolean;              // 是否启用详情查看
  rerun?: boolean;                   // 是否启用重新运行
  search?: boolean;                  // 是否启用搜索
  advancedFilter?: boolean;          // 是否启用高级筛选
  responsive?: boolean;              // 是否启用响应式布局 (Phase 5)
  touchOptimized?: boolean;          // 是否启用触摸优化 (Phase 5)
}

/**
 * 空状态配置
 */
export interface EmptyStateConfig {
  title: string;                     // 标题
  description?: string;              // 描述
  icon?: React.ReactNode;            // 图标
  action?: {                         // 操作按钮
    label: string;
    onClick: () => void;
  };
}

/**
 * 测试历史配置
 */
export interface TestHistoryConfig {
  // 基础配置
  testType: string;                  // 测试类型标识
  apiEndpoint: string;               // API基础路径
  title: string;                     // 页面标题
  description?: string;              // 描述文本

  // 显示配置
  columns: ColumnConfig[];           // 表格列配置
  statusOptions: StatusOption[];     // 状态选项
  defaultPageSize?: number;          // 默认每页数量
  pageSizeOptions?: number[];        // 页面大小选项

  // 功能配置
  features?: FeaturesConfig;         // 功能开关
  customFilters?: CustomFilter[];    // 自定义筛选器
  customActions?: CustomAction[];    // 自定义操作

  // 格式化器
  formatters?: {
    date?: (date: string | Date) => string;
    status?: (status: string) => string;
    duration?: (ms: number) => string;
    number?: (num: number) => string;
    url?: (url: string) => string;
    [key: string]: ((value: any) => string) | undefined;
  };

  // 空状态配置
  emptyState?: EmptyStateConfig;
}

/**
 * TestHistory组件Props
 */
export interface TestHistoryProps {
  config: TestHistoryConfig;                           // 配置对象
  onRecordClick?: (record: TestRecord) => void;        // 记录点击事件
  onRecordDelete?: (id: string) => Promise<void>;      // 记录删除事件
  onBatchDelete?: (ids: string[]) => Promise<void>;    // 批量删除事件
  additionalFilters?: Record<string, any>;             // 额外的筛选条件
  className?: string;                                  // 自定义类名
}


