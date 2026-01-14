/**
 * 统一测试类型定义
 * 这是项目中所有测试类型的权威定义文件
 * 
 * 版本: v2.0.0
 * 创建时间: 2024-01-15
 * 
 * 合并来源:
 * - frontend/types/test.ts (旧版本，6种类型)
 * - frontend/types/testHistory.ts (枚举版本，9种类型)  
 * - frontend/types/api/client.types.ts (新版本，9种类型)
 */

// ==================== 核心测试类型 ====================

/**
 * 测试类型枚举
 * 定义了系统支持的所有测试类型
 */
export enum TestTypeEnum {
  /** 性能测试 - 检测网站加载速度和性能指标 */
  PERFORMANCE = 'performance',

  /** 安全测试 - 扫描安全漏洞和风险 */
  SECURITY = 'security',

  /** API测试 - 测试API端点的功能和性能 */
  API = 'api',

  /** 兼容性测试 - 检查浏览器和设备兼容性 */
  COMPATIBILITY = 'compatibility',

  /** 压力测试 - 模拟高并发访问以评估系统性能 */
  STRESS = 'stress',

  /** SEO测试 - 分析搜索引擎优化情况 */
  SEO = 'seo',

  /** 网络测试 - 测试网络连接和延迟 */
  NETWORK = 'network',

  /** 数据库测试 - 检查数据库连接和性能 */
  DATABASE = 'database',

  /** 网站综合测试 - 全面检测网站各项指标 */
  WEBSITE = 'website',

  /** UX测试 - 评估用户体验和可访问性 */
  UX = 'ux'
}

/**
 * 测试类型联合类型
 * 用于类型检查和参数传递
 */
export type TestType =
  | 'performance'
  | 'security'
  | 'api'
  | 'compatibility'
  | 'stress'
  | 'seo'
  | 'network'
  | 'database'
  | 'website'
  | 'ux';

/**
 * 测试状态枚举
 * 定义了测试执行过程中的所有可能状态
 */
export enum TestStatusEnum {
  /** 空闲状态 - 测试尚未开始 */
  IDLE = 'idle',

  /** 等待状态 - 测试在队列中等待 */
  PENDING = 'pending',

  /** 排队状态 - 测试在队列中等待（别名） */
  QUEUED = 'queued',

  /** 启动中 - 测试正在初始化 */
  STARTING = 'starting',

  /** 运行中 - 测试正在执行 */
  RUNNING = 'running',

  /** 停止中 - 测试正在停止 */
  STOPPING = 'stopping',

  /** 已完成 - 测试成功完成 */
  COMPLETED = 'completed',

  /** 已取消 - 测试被用户取消 */
  CANCELLED = 'cancelled',

  /** 已失败 - 测试执行失败 */
  FAILED = 'failed'
}

/**
 * 测试状态联合类型
 * 用于类型检查和参数传递
 */
export type TestStatus =
  | 'idle'
  | 'pending'
  | 'queued'
  | 'starting'
  | 'running'
  | 'stopping'
  | 'completed'
  | 'cancelled'
  | 'failed';

// ==================== 测试类型配置映射 ====================

/**
 * 测试类型配置信息
 * 包含每种测试类型的元数据
 */
export interface TestTypeConfig {
  /** 显示名称 */
  label: string;
  /** 描述信息 */
  description: string;
  /** 图标名称 */
  icon: string;
  /** 主题颜色 */
  color: string;
  /** 是否启用 */
  enabled: boolean;
  /** 预估执行时间（秒） */
  estimatedDuration: number;
  /** 所需权限级别 */
  requiredPermission: 'public' | 'user' | 'premium' | 'admin';
}

/**
 * 测试类型配置映射
 * 为每种测试类型提供详细的配置信息
 */
export const TEST_TYPE_CONFIG: Record<TestType, TestTypeConfig> = {
  performance: {
    label: '性能测试',
    description: '检测网站加载速度和性能指标',
    icon: 'zap',
    color: 'blue',
    enabled: true,
    estimatedDuration: 30,
    requiredPermission: 'public'
  },
  security: {
    label: '安全测试',
    description: '扫描安全漏洞和风险',
    icon: 'shield',
    color: 'red',
    enabled: true,
    estimatedDuration: 60,
    requiredPermission: 'user'
  },
  api: {
    label: 'API测试',
    description: '测试API端点的功能和性能',
    icon: 'code',
    color: 'green',
    enabled: true,
    estimatedDuration: 45,
    requiredPermission: 'user'
  },
  compatibility: {
    label: '兼容性测试',
    description: '检查浏览器和设备兼容性',
    icon: 'monitor',
    color: 'purple',
    enabled: true,
    estimatedDuration: 90,
    requiredPermission: 'user'
  },
  stress: {
    label: '压力测试',
    description: '模拟高并发访问以评估系统性能',
    icon: 'activity',
    color: 'orange',
    enabled: true,
    estimatedDuration: 120,
    requiredPermission: 'premium'
  },
  seo: {
    label: 'SEO测试',
    description: '分析搜索引擎优化情况',
    icon: 'search',
    color: 'indigo',
    enabled: true,
    estimatedDuration: 40,
    requiredPermission: 'public'
  },
  network: {
    label: '网络测试',
    description: '测试网络连接和延迟',
    icon: 'wifi',
    color: 'cyan',
    enabled: true,
    estimatedDuration: 35,
    requiredPermission: 'user'
  },
  database: {
    label: '数据库测试',
    description: '检查数据库连接和性能',
    icon: 'database',
    color: 'teal',
    enabled: true,
    estimatedDuration: 50,
    requiredPermission: 'premium'
  },
  website: {
    label: '网站综合测试',
    description: '全面检测网站各项指标',
    icon: 'globe',
    color: 'gray',
    enabled: true,
    estimatedDuration: 180,
    requiredPermission: 'user'
  },
  ux: {
    label: 'UX测试',
    description: '评估用户体验和可访问性',
    icon: 'eye',
    color: 'pink',
    enabled: true,
    estimatedDuration: 75,
    requiredPermission: 'user'
  }
};

// ==================== 工具函数 ====================

/**
 * 检查测试类型是否有效
 */
export function isValidTestType(type: string): type is TestType {
  const validTypes = ['stress', 'security', 'api', 'performance', 'compatibility', 'seo', 'database', 'network', 'ux', 'website'];
  return validTypes.includes(type);
}

/**
 * 检查测试状态是否有效
 */
export function isValidTestStatus(status: string): status is TestStatus {
  const validStatuses = ['pending', 'running', 'completed', 'failed', 'cancelled', 'starting'];
  return validStatuses.includes(status);
}

/**
 * 获取测试类型的配置信息
 */
export function getTestTypeConfig(type: TestType): TestTypeConfig {
  return TEST_TYPE_CONFIG[type];
}

/**
 * 获取所有启用的测试类型
 */
export function getEnabledTestTypes(): TestType[] {
  return Object.entries(TEST_TYPE_CONFIG)
    .filter(([, config]) => config.enabled)
    .map(([type]) => type as TestType);
}

/**
 * 根据权限级别获取可用的测试类型
 */
export function getAvailableTestTypes(permission: 'public' | 'user' | 'premium' | 'admin'): TestType[] {
  const permissionLevels = ['public', 'user', 'premium', 'admin'];
  const userLevel = permissionLevels.indexOf(permission);

  return Object.entries(TEST_TYPE_CONFIG)
    .filter(([, config]) => {
      const requiredLevel = permissionLevels.indexOf(config.requiredPermission);
      return config.enabled && userLevel >= requiredLevel;
    })
    .map(([type]) => type as TestType);
}

/**
 * 获取测试状态的显示信息
 */
export function getTestStatusInfo(status: TestStatus): { label: string; color: string; icon: string } {
  const statusMap = {
    idle: { label: '准备就绪', color: 'gray', icon: 'circle' },
    pending: { label: '等待中', color: 'yellow', icon: 'clock' },
    queued: { label: '排队中', color: 'orange', icon: 'clock' },
    starting: { label: '启动中', color: 'blue', icon: 'play' },
    running: { label: '运行中', color: 'blue', icon: 'activity' },
    stopping: { label: '停止中', color: 'orange', icon: 'square' },
    completed: { label: '已完成', color: 'green', icon: 'check-circle' },
    cancelled: { label: '已取消', color: 'orange', icon: 'x-circle' },
    failed: { label: '已失败', color: 'red', icon: 'alert-circle' }
  };

  return statusMap[status];
}

// ==================== 类型导出 ====================

// 导出所有类型和枚举
export {
  TestStatusEnum as TestStatusEnumeration, TestTypeEnum as TestTypeEnumeration
};

// 兼容性导出（用于渐进式迁移）
export type TestStatusType = TestStatus;
export type TestTypeType = TestType;
