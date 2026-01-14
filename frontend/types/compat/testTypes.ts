// Unified Test Types
// Centralized test type definitions

export type TestType = 
  | 'stress'
  | 'performance'
  | 'api'
  | 'security'
  | 'seo'
  | 'accessibility'
  | 'content'
  | 'infrastructure'
  | 'documentation'
  | 'ux'
  | 'integration';

export type TestStatus = 
  | 'idle'
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'paused';

export type TestStatusType = TestStatus;

export interface TestTypeConfig {
  name: string;
  displayName: string;
  description?: string;
  icon?: string;
  enabled: boolean;
  category?: string;
}

export const TEST_TYPE_CONFIG: Record<TestType, TestTypeConfig> = {
  stress: {
    name: 'stress',
    displayName: '鍘嬪姏娴嬭瘯',
    description: '娴嬭瘯绯荤粺鎵胯浇鑳藉姏',
    icon: 'activity',
    enabled: true,
    category: 'performance',
  },
  performance: {
    name: 'performance',
    displayName: '鎬ц兘娴嬭瘯',
    description: '娴嬭瘯椤甸潰鍔犺浇鎬ц兘',
    icon: 'zap',
    enabled: true,
    category: 'performance',
  },
  api: {
    name: 'api',
    displayName: 'API娴嬭瘯',
    description: '娴嬭瘯API鎺ュ彛',
    icon: 'code',
    enabled: true,
    category: 'functional',
  },
  security: {
    name: 'security',
    displayName: '瀹夊叏娴嬭瘯',
    description: '瀹夊叏婕忔礊鎵弿',
    icon: 'shield',
    enabled: true,
    category: 'security',
  },
  seo: {
    name: 'seo',
    displayName: 'SEO娴嬭瘯',
    description: 'SEO浼樺寲鍒嗘瀽',
    icon: 'search',
    enabled: true,
    category: 'optimization',
  },
  accessibility: {
    name: 'accessibility',
    displayName: '可访问性测试',
    description: 'WCAG标准检查',
    icon: 'eye',
    enabled: true,
    category: 'quality',
  },
  content: {
    name: 'content',
    displayName: '内容测试',
    description: '内容质量检查',
    icon: 'file-text',
    enabled: true,
    category: 'quality',
  },
  infrastructure: {
    name: 'infrastructure',
    displayName: '基础设施测试',
    description: '服务器配置检查',
    icon: 'server',
    enabled: true,
    category: 'infrastructure',
  },
  documentation: {
    name: 'documentation',
    displayName: '文档测试',
    description: '文档完整性检查',
    icon: 'book',
    enabled: true,
    category: 'quality',
  },
  ux: {
    name: 'ux',
    displayName: '鐢ㄦ埛浣撻獙娴嬭瘯',
    description: 'UX浼樺寲寤鸿',
    icon: 'users',
    enabled: true,
    category: 'quality',
  },
  integration: {
    name: 'integration',
    displayName: '闆嗘垚娴嬭瘯',
    description: '绯荤粺闆嗘垚娴嬭瘯',
    icon: 'git-merge',
    enabled: true,
    category: 'functional',
  },
};

export function getAvailableTestTypes(): TestType[] {
  return Object.keys(TEST_TYPE_CONFIG) as TestType[];
}

export function getEnabledTestTypes(): TestType[] {
  return Object.entries(TEST_TYPE_CONFIG)
    .filter(([_, config]) => config.enabled)
    .map(([type]) => type as TestType);
}

export function isValidTestType(type: string): type is TestType {
  return type in TEST_TYPE_CONFIG;
}

export function isValidTestStatus(status: string): status is TestStatus {
  return ['idle', 'pending', 'running', 'completed', 'failed', 'cancelled', 'paused'].includes(status);
}

export function getTestTypeConfig(type: TestType): TestTypeConfig | undefined {
  return TEST_TYPE_CONFIG[type];
}

export interface TestStatusInfo {
  status: TestStatus;
  message?: string;
  progress?: number;
  timestamp?: number;
}

export function getTestStatusInfo(status: TestStatus): TestStatusInfo {
  return {
    status,
    timestamp: Date.now(),
  };
}

export interface TestExecution {
  id: string;
  type: TestType;
  status: TestStatus;
  startTime?: number;
  endTime?: number;
  result?: any;
  progress?: number;
  error?: string;
  config?: any;
  testType?: TestType;
  results?: any;
}

export interface TestHistory {
  executions?: TestExecution[];
  tests?: any[];
  total: number;
  page?: number;
  pageSize?: number;
  hasMore?: boolean;
}

export {};
