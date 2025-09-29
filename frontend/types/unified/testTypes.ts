// 统一测试类型定义
export enum TestType {
  STRESS = 'stress',
  PERFORMANCE = 'performance',
  SECURITY = 'security',
  COMPATIBILITY = 'compatibility',
  SEO = 'seo',
  UX = 'ux',
  API = 'api',
  DATABASE = 'database',
  NETWORK = 'network',
  WEBSITE = 'website'
}

export enum TestStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  PAUSED = 'paused'
}

export enum TestStatusType {
  IDLE = 'idle',
  PREPARING = 'preparing',
  EXECUTING = 'executing',
  ANALYZING = 'analyzing',
  COMPLETED = 'completed',
  ERROR = 'error'
}

// 导出类型别名以保持兼容性
export type TestTypeEnum = TestType;
export type TestStatusEnum = TestStatus;

// 测试执行接口
export interface TestExecution {
  id: string;
  testType: TestType;
  status: TestStatus;
  startTime: string;
  endTime?: string;
  duration?: number;
  progress: number;
  results?: unknown;
  error?: string;
  config?: unknown;
  metadata?: Record<string, any>;
}

// 测试历史接口
export interface TestHistory {
  tests: TestExecution[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// 类型验证函数
export function isValidTestType(type: string): type is TestType {
  return Object.values(TestType).includes(type as TestType);
}

export function isValidTestStatus(status: string): status is TestStatus {
  return Object.values(TestStatus).includes(status as TestStatus);
}

// 测试类型配置
export const TEST_TYPE_CONFIG = {
  [TestType.STRESS]: {
    name: '压力测试',
    description: '测试系统在高负载下的性能表现',
    enabled: true,
    category: 'performance'
  },
  [TestType.PERFORMANCE]: {
    name: '性能测试',
    description: '测试系统的响应时间和吞吐量',
    enabled: true,
    category: 'performance'
  },
  [TestType.SECURITY]: {
    name: '安全测试',
    description: '检测系统的安全漏洞和风险',
    enabled: true,
    category: 'security'
  },
  [TestType.COMPATIBILITY]: {
    name: '兼容性测试',
    description: '测试系统在不同环境下的兼容性',
    enabled: true,
    category: 'compatibility'
  },
  [TestType.SEO]: {
    name: 'SEO测试',
    description: '检测网站的搜索引擎优化情况',
    enabled: true,
    category: 'optimization'
  },
  [TestType.UX]: {
    name: '用户体验测试',
    description: '评估用户界面和交互体验',
    enabled: true,
    category: 'user-experience'
  },
  [TestType.API]: {
    name: 'API测试',
    description: '测试API接口的功能和性能',
    enabled: true,
    category: 'functional'
  },
  [TestType.DATABASE]: {
    name: '数据库测试',
    description: '测试数据库的性能和数据完整性',
    enabled: true,
    category: 'data'
  },
  [TestType.NETWORK]: {
    name: '网络测试',
    description: '测试网络连接和传输性能',
    enabled: true,
    category: 'network'
  },
  [TestType.WEBSITE]: {
    name: '网站测试',
    description: '测试网站的整体功能和性能',
    enabled: true,
    category: 'functional'
  }
} as const;

// 获取可用的测试类型
export function getAvailableTestTypes(): TestType[] {
  return Object.values(TestType);
}

// 获取启用的测试类型
export function getEnabledTestTypes(): TestType[] {
  return Object.entries(TEST_TYPE_CONFIG)
    .filter(([, config]) => config?.enabled)
    .map(([type]) => type as TestType);
}

// 获取测试状态信息
export function getTestStatusInfo(status: TestStatus) {
  const statusInfo = {
    [TestStatus.PENDING]: { name: '等待中', color: 'gray', icon: 'clock' },
    [TestStatus.RUNNING]: { name: '运行中', color: 'blue', icon: 'play' },
    [TestStatus.COMPLETED]: { name: '已完成', color: 'green', icon: 'check' },
    [TestStatus.FAILED]: { name: '失败', color: 'red', icon: 'x' },
    [TestStatus.CANCELLED]: { name: '已取消', color: 'orange', icon: 'stop' },
    [TestStatus.PAUSED]: { name: '已暂停', color: 'yellow', icon: 'pause' }
  };
  return statusInfo[status] || statusInfo[TestStatus.PENDING];
}

// 获取测试类型配置
export function getTestTypeConfig(type: TestType) {
  return TEST_TYPE_CONFIG[type];
}

// 默认导出
export default {
  TestType,
  TestStatus,
  TestStatusType,
  isValidTestType,
  isValidTestStatus,
  getAvailableTestTypes,
  getEnabledTestTypes,
  getTestStatusInfo,
  getTestTypeConfig,
  TEST_TYPE_CONFIG
};
