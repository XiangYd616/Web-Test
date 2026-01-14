/**
 * testTypes.ts - 测试类型配置
 */

export type TestType =
  | 'performance'
  | 'security'
  | 'seo'
  | 'api'
  | 'stress'
  | 'network'
  | 'database'
  | 'compatibility'
  | 'ux'
  | 'accessibility';

export interface TestTypeConfig {
  id: TestType;
  name: string;
  description: string;
  icon?: any;
  category: 'web' | 'api' | 'system' | 'ux';
  enabled: boolean;
  color?: string;
  defaultConfig?: Record<string, any>;
  configSchema?: { fields: any[] };
  resultSchema?: { fields: any[] };
}

export const TEST_TYPES: Record<TestType, TestTypeConfig> = {
  performance: {
    id: 'performance',
    name: '性能测试',
    description: '测试网站加载速度和性能指标',
    category: 'web',
    enabled: true,
  },
  security: {
    id: 'security',
    name: '安全测试',
    description: '检测安全漏洞和威胁',
    category: 'web',
    enabled: true,
  },
  seo: {
    id: 'seo',
    name: 'SEO测试',
    description: '分析搜索引擎优化',
    category: 'web',
    enabled: true,
  },
  api: {
    id: 'api',
    name: 'API测试',
    description: '测试API接口的功能和性能',
    category: 'api',
    enabled: true,
  },
  stress: {
    id: 'stress',
    name: '压力测试',
    description: '测试系统在高负载下的表现',
    category: 'system',
    enabled: true,
    icon: undefined as any,
    color: '#ef4444',
    defaultConfig: {},
    configSchema: { fields: [] },
    resultSchema: { fields: [] },
  },
  network: {
    id: 'network',
    name: '网络测试',
    description: '测试网络连接和延迟',
    category: 'system',
    enabled: true,
  },
  database: {
    id: 'database',
    name: '数据库测试',
    description: '测试数据库性能和查询',
    category: 'system',
    enabled: true,
  },
  compatibility: {
    id: 'compatibility',
    name: '兼容性测试',
    description: '测试跨浏览器和设备兼容性',
    category: 'web',
    enabled: true,
  },
  ux: {
    id: 'ux',
    name: '用户体验测试',
    description: '评估用户体验质量',
    category: 'ux',
    enabled: true,
  },
  accessibility: {
    id: 'accessibility',
    name: '可访问性测试',
    description: '检查无障碍访问合规性',
    category: 'ux',
    enabled: true,
  },
};

export const getTestTypeConfig = (type: TestType): TestTypeConfig => {
  return TEST_TYPES[type];
};

export const getEnabledTestTypes = (): TestTypeConfig[] => {
  return Object.values(TEST_TYPES).filter(config => config.enabled);
};

// Export individual test configs for convenience
export const stressTestConfig = TEST_TYPES.stress;
export const performanceTestConfig = TEST_TYPES.performance;
export const securityTestConfig = TEST_TYPES.security;
export const apiTestConfig = TEST_TYPES.api;
