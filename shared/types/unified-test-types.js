/**
 * 统一测试类型定义 - 单一真实来源 (Single Source of Truth)
 * 
 * 此文件是整个系统中测试类型的唯一权威定义
 * 前端和后端都必须从此文件导入测试类型
 * 
 * @version 3.0.0
 * @date 2025-09-19
 */

/**
 * 测试类型枚举
 * 包含系统支持的所有测试类型
 */
const TestType = {
  // 核心测试类型 (已实现并整合)
  PERFORMANCE: 'performance',
  SECURITY: 'security',
  SEO: 'seo',
  API: 'api',
  STRESS: 'stress',
  COMPATIBILITY: 'compatibility',
  UX: 'ux',
  INFRASTRUCTURE: 'infrastructure',
  
  // 扩展测试类型 (需要整合)
  ACCESSIBILITY: 'accessibility',
  DATABASE: 'database',
  NETWORK: 'network',
  WEBSITE: 'website',
  CONTENT: 'content',
  DOCUMENTATION: 'documentation',
  REGRESSION: 'regression',
  
  // 特殊测试类型
  AUTOMATION: 'automation',
  CLIENTS: 'clients',
  SERVICES: 'services'
};

/**
 * 测试状态枚举
 */
const TestStatus = {
  IDLE: 'idle',
  PENDING: 'pending',
  QUEUED: 'queued',
  STARTING: 'starting',
  RUNNING: 'running',
  PAUSED: 'paused',
  STOPPING: 'stopping',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  ERROR: 'error'
};

/**
 * 测试优先级枚举
 */
const TestPriority = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

/**
 * 测试结果等级
 */
const TestGrade = {
  A_PLUS: 'A+',
  A: 'A',
  B_PLUS: 'B+',
  B: 'B',
  C_PLUS: 'C+',
  C: 'C',
  D: 'D',
  F: 'F'
};

/**
 * 测试类型配置映射
 * 定义每个测试类型的元数据
 */
const TEST_TYPE_CONFIG = {
  [TestType.PERFORMANCE]: {
    name: '性能测试',
    description: '测试网站加载速度和性能指标',
    icon: 'zap',
    color: 'blue',
    enabled: true,
    category: 'performance',
    estimatedDuration: 30,
    requiredPermission: 'public'
  },
  [TestType.SECURITY]: {
    name: '安全测试',
    description: '扫描安全漏洞和风险',
    icon: 'shield',
    color: 'red',
    enabled: true,
    category: 'security',
    estimatedDuration: 60,
    requiredPermission: 'user'
  },
  [TestType.SEO]: {
    name: 'SEO测试',
    description: '分析搜索引擎优化情况',
    icon: 'search',
    color: 'green',
    enabled: true,
    category: 'optimization',
    estimatedDuration: 40,
    requiredPermission: 'public'
  },
  [TestType.API]: {
    name: 'API测试',
    description: '测试API接口的功能和性能',
    icon: 'code',
    color: 'purple',
    enabled: true,
    category: 'functional',
    estimatedDuration: 45,
    requiredPermission: 'user'
  },
  [TestType.STRESS]: {
    name: '压力测试',
    description: '模拟高并发访问评估系统性能',
    icon: 'activity',
    color: 'orange',
    enabled: true,
    category: 'performance',
    estimatedDuration: 120,
    requiredPermission: 'premium'
  },
  [TestType.COMPATIBILITY]: {
    name: '兼容性测试',
    description: '检查浏览器和设备兼容性',
    icon: 'monitor',
    color: 'indigo',
    enabled: true,
    category: 'compatibility',
    estimatedDuration: 90,
    requiredPermission: 'user'
  },
  [TestType.UX]: {
    name: '用户体验测试',
    description: '评估用户界面和交互体验',
    icon: 'users',
    color: 'pink',
    enabled: true,
    category: 'user-experience',
    estimatedDuration: 75,
    requiredPermission: 'user'
  },
  [TestType.INFRASTRUCTURE]: {
    name: '基础设施测试',
    description: '测试服务器和网络基础设施',
    icon: 'server',
    color: 'gray',
    enabled: true,
    category: 'infrastructure',
    estimatedDuration: 50,
    requiredPermission: 'admin'
  },
  [TestType.ACCESSIBILITY]: {
    name: '可访问性测试',
    description: '检查网站的无障碍访问性',
    icon: 'eye',
    color: 'teal',
    enabled: true,
    category: 'accessibility',
    estimatedDuration: 35,
    requiredPermission: 'public'
  },
  [TestType.DATABASE]: {
    name: '数据库测试',
    description: '测试数据库连接和性能',
    icon: 'database',
    color: 'brown',
    enabled: true,
    category: 'data',
    estimatedDuration: 50,
    requiredPermission: 'premium'
  },
  [TestType.NETWORK]: {
    name: '网络测试',
    description: '测试网络连接和延迟',
    icon: 'wifi',
    color: 'cyan',
    enabled: true,
    category: 'network',
    estimatedDuration: 35,
    requiredPermission: 'user'
  },
  [TestType.WEBSITE]: {
    name: '网站综合测试',
    description: '全面检测网站各项指标',
    icon: 'globe',
    color: 'lime',
    enabled: true,
    category: 'comprehensive',
    estimatedDuration: 180,
    requiredPermission: 'user'
  },
  [TestType.CONTENT]: {
    name: '内容测试',
    description: '检查网站内容质量和完整性',
    icon: 'file-text',
    color: 'amber',
    enabled: true,
    category: 'content',
    estimatedDuration: 40,
    requiredPermission: 'public'
  },
  [TestType.DOCUMENTATION]: {
    name: '文档测试',
    description: '验证API文档的准确性和完整性',
    icon: 'book',
    color: 'violet',
    enabled: true,
    category: 'documentation',
    estimatedDuration: 30,
    requiredPermission: 'user'
  },
  [TestType.REGRESSION]: {
    name: '回归测试',
    description: '检查新改动是否影响现有功能',
    icon: 'git-branch',
    color: 'olive',
    enabled: true,
    category: 'regression',
    estimatedDuration: 60,
    requiredPermission: 'user'
  },
  [TestType.AUTOMATION]: {
    name: '自动化测试',
    description: '执行自动化测试脚本',
    icon: 'robot',
    color: 'steel',
    enabled: true,
    category: 'automation',
    estimatedDuration: 45,
    requiredPermission: 'premium'
  },
  [TestType.CLIENTS]: {
    name: '客户端测试',
    description: '测试不同客户端的兼容性',
    icon: 'devices',
    color: 'navy',
    enabled: true,
    category: 'clients',
    estimatedDuration: 55,
    requiredPermission: 'user'
  },
  [TestType.SERVICES]: {
    name: '服务测试',
    description: '测试微服务和第三方服务',
    icon: 'layers',
    color: 'maroon',
    enabled: true,
    category: 'services',
    estimatedDuration: 40,
    requiredPermission: 'user'
  }
};

/**
 * 测试状态配置映射
 */
const TEST_STATUS_CONFIG = {
  [TestStatus.IDLE]: {
    name: '空闲',
    color: 'gray',
    icon: 'circle',
    isActive: false,
    canCancel: false
  },
  [TestStatus.PENDING]: {
    name: '等待中',
    color: 'yellow',
    icon: 'clock',
    isActive: true,
    canCancel: true
  },
  [TestStatus.QUEUED]: {
    name: '排队中',
    color: 'orange',
    icon: 'list',
    isActive: true,
    canCancel: true
  },
  [TestStatus.STARTING]: {
    name: '启动中',
    color: 'blue',
    icon: 'play',
    isActive: true,
    canCancel: false
  },
  [TestStatus.RUNNING]: {
    name: '运行中',
    color: 'blue',
    icon: 'activity',
    isActive: true,
    canCancel: true
  },
  [TestStatus.PAUSED]: {
    name: '已暂停',
    color: 'yellow',
    icon: 'pause',
    isActive: true,
    canCancel: true
  },
  [TestStatus.STOPPING]: {
    name: '停止中',
    color: 'orange',
    icon: 'square',
    isActive: true,
    canCancel: false
  },
  [TestStatus.COMPLETED]: {
    name: '已完成',
    color: 'green',
    icon: 'check-circle',
    isActive: false,
    canCancel: false
  },
  [TestStatus.FAILED]: {
    name: '失败',
    color: 'red',
    icon: 'x-circle',
    isActive: false,
    canCancel: false
  },
  [TestStatus.CANCELLED]: {
    name: '已取消',
    color: 'gray',
    icon: 'ban',
    isActive: false,
    canCancel: false
  },
  [TestStatus.ERROR]: {
    name: '错误',
    color: 'red',
    icon: 'alert-circle',
    isActive: false,
    canCancel: false
  }
};

// ==================== 工具函数 ====================

/**
 * 检查测试类型是否有效
 */
function isValidTestType(type) {
  return Object.values(TestType).includes(type);
}

/**
 * 检查测试状态是否有效
 */
function isValidTestStatus(status) {
  return Object.values(TestStatus).includes(status);
}

/**
 * 获取所有测试类型
 */
function getAllTestTypes() {
  return Object.values(TestType);
}

/**
 * 获取启用的测试类型
 */
function getEnabledTestTypes() {
  return Object.entries(TEST_TYPE_CONFIG)
    .filter(([, config]) => config.enabled)
    .map(([type]) => type);
}

/**
 * 获取测试类型配置
 */
function getTestTypeConfig(type) {
  return TEST_TYPE_CONFIG[type];
}

/**
 * 获取测试状态配置
 */
function getTestStatusConfig(status) {
  return TEST_STATUS_CONFIG[status];
}

/**
 * 根据分数获取等级
 */
function scoreToGrade(score) {
  if (score >= 95) return TestGrade.A_PLUS;
  if (score >= 90) return TestGrade.A;
  if (score >= 85) return TestGrade.B_PLUS;
  if (score >= 80) return TestGrade.B;
  if (score >= 75) return TestGrade.C_PLUS;
  if (score >= 70) return TestGrade.C;
  if (score >= 60) return TestGrade.D;
  return TestGrade.F;
}

/**
 * 检查测试状态是否为活动状态
 */
function isActiveStatus(status) {
  const config = TEST_STATUS_CONFIG[status];
  return config ? config.isActive : false;
}

/**
 * 检查测试状态是否可以取消
 */
function canCancelStatus(status) {
  const config = TEST_STATUS_CONFIG[status];
  return config ? config.canCancel : false;
}

// ==================== 导出 ====================

// CommonJS 导出（用于后端）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    // 枚举
    TestType,
    TestStatus,
    TestPriority,
    TestGrade,
    
    // 配置
    TEST_TYPE_CONFIG,
    TEST_STATUS_CONFIG,
    
    // 工具函数
    isValidTestType,
    isValidTestStatus,
    getAllTestTypes,
    getEnabledTestTypes,
    getTestTypeConfig,
    getTestStatusConfig,
    scoreToGrade,
    isActiveStatus,
    canCancelStatus
  };
}

// ES6 导出（用于前端）
export {
  TestType,
  TestStatus,
  TestPriority,
  TestGrade,
  TEST_TYPE_CONFIG,
  TEST_STATUS_CONFIG,
  isValidTestType,
  isValidTestStatus,
  getAllTestTypes,
  getEnabledTestTypes,
  getTestTypeConfig,
  getTestStatusConfig,
  scoreToGrade,
  isActiveStatus,
  canCancelStatus
};

// 默认导出
export default {
  TestType,
  TestStatus,
  TestPriority,
  TestGrade,
  TEST_TYPE_CONFIG,
  TEST_STATUS_CONFIG,
  isValidTestType,
  isValidTestStatus,
  getAllTestTypes,
  getEnabledTestTypes,
  getTestTypeConfig,
  getTestStatusConfig,
  scoreToGrade,
  isActiveStatus,
  canCancelStatus
};
