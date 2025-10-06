/**
 * 测试引擎配置文件
 * 定义各个测试引擎的类型、用途和可见性
 */

const engineConfig = {
  // ============================================
  // 核心用户测试工具 (11个) - 前端可见
  // ============================================
  
  website: {
    type: 'user-tool',
    frontendVisible: true,
    category: 'web-testing',
    description: '综合网站测试工具',
    targetUsers: ['所有用户'],
    priority: 1
  },
  
  stress: {
    type: 'user-tool',
    frontendVisible: true,
    category: 'performance',
    description: '负载压力测试工具',
    targetUsers: ['性能工程师', '所有用户'],
    priority: 1
  },
  
  seo: {
    type: 'user-tool',
    frontendVisible: true,
    category: 'optimization',
    description: 'SEO搜索引擎优化测试',
    targetUsers: ['SEO专员', 'Web开发者'],
    priority: 1
  },
  
  security: {
    type: 'user-tool',
    frontendVisible: true,
    category: 'security',
    description: '安全漏洞扫描测试',
    targetUsers: ['安全工程师', '开发者'],
    priority: 1,
    badge: 'NEW'
  },
  
  performance: {
    type: 'user-tool',
    frontendVisible: true,
    category: 'performance',
    description: '性能指标分析测试',
    targetUsers: ['性能工程师', '前端开发'],
    priority: 1,
    badge: 'NEW'
  },
  
  compatibility: {
    type: 'user-tool',
    frontendVisible: true,
    category: 'compatibility',
    description: '跨浏览器兼容性测试',
    targetUsers: ['前端开发', 'QA工程师'],
    priority: 1
  },
  
  accessibility: {
    type: 'user-tool',
    frontendVisible: true,
    category: 'accessibility',
    description: '无障碍访问测试',
    targetUsers: ['UI/UX设计师', '前端开发'],
    priority: 1,
    badge: 'NEW'
  },
  
  api: {
    type: 'user-tool',
    frontendVisible: true,
    category: 'backend',
    description: 'RESTful API测试',
    targetUsers: ['后端开发', 'API开发者'],
    priority: 1
  },
  
  network: {
    type: 'user-tool',
    frontendVisible: true,
    category: 'network',
    description: '网络性能测试',
    targetUsers: ['网络工程师', 'DevOps'],
    priority: 1
  },
  
  database: {
    type: 'user-tool',
    frontendVisible: true,
    category: 'backend',
    description: '数据库性能测试',
    targetUsers: ['DBA', '后端开发'],
    priority: 1
  },
  
  ux: {
    type: 'user-tool',
    frontendVisible: true,
    category: 'ux',
    description: '用户体验测试',
    targetUsers: ['UX研究员', 'UI设计师'],
    priority: 1
  },
  
  // ============================================
  // 基础设施引擎 (5个) - 后端基础架构
  // ============================================
  
  core: {
    type: 'infrastructure',
    frontendVisible: false,
    category: 'architecture',
    description: '测试引擎核心管理器',
    purpose: '提供所有引擎的核心功能和管理',
    priority: 10
  },
  
  base: {
    type: 'infrastructure',
    frontendVisible: false,
    category: 'architecture',
    description: '所有引擎的基类',
    purpose: '提供引擎基础能力和接口定义',
    priority: 10
  },
  
  shared: {
    type: 'infrastructure',
    frontendVisible: false,
    category: 'architecture',
    description: '共享服务模块',
    purpose: '提供监控、错误处理等共享功能',
    priority: 10
  },
  
  clients: {
    type: 'infrastructure',
    frontendVisible: false,
    category: 'architecture',
    description: 'HTTP客户端工具',
    purpose: '提供HTTP请求能力',
    priority: 10
  },
  
  services: {
    type: 'infrastructure',
    frontendVisible: false,
    category: 'architecture',
    description: '服务验证工具',
    purpose: '提供服务验证和调用能力',
    priority: 10
  },
  
  // ============================================
  // 专业工具API (2个) - 仅提供API接口
  // ============================================
  
  automation: {
    type: 'api-only',
    frontendVisible: false,
    category: 'cicd',
    description: 'Playwright自动化测试引擎',
    purpose: 'CI/CD自动化测试，需要编写测试脚本',
    targetUsers: ['QA工程师', '自动化测试工程师'],
    apiEndpoint: '/api/v1/automation',
    documentation: '/docs/api/automation',
    priority: 5,
    notes: '需要专业知识，通过API调用使用'
  },
  
  regression: {
    type: 'api-only',
    frontendVisible: false,
    category: 'cicd',
    description: '版本回归检测引擎',
    purpose: 'CI/CD版本对比和回归检测',
    targetUsers: ['DevOps工程师', 'CI/CD团队'],
    apiEndpoint: '/api/v1/regression',
    documentation: '/docs/api/regression',
    priority: 5,
    notes: '需要历史测试数据作为基准'
  },
  
  // ============================================
  // 开发者工具 (2个) - 独立模块
  // ============================================
  
  documentation: {
    type: 'developer-tool',
    frontendVisible: false,
    category: 'development',
    description: 'API文档自动生成工具',
    purpose: 'API文档生成和一致性检查',
    targetUsers: ['后端开发', '技术文档工程师'],
    location: 'tools/documentation',
    priority: 3,
    notes: '已移到独立的开发工具模块'
  },
  
  infrastructure: {
    type: 'ops-tool',
    frontendVisible: false,
    category: 'operations',
    description: '基础设施监控工具',
    purpose: '服务器健康检查和资源监控',
    targetUsers: ['运维工程师', 'DevOps'],
    location: 'tools/infrastructure',
    priority: 3,
    notes: '已移到独立的运维工具模块'
  },
  
  // ============================================
  // 已归档引擎 (1个) - 功能重复已移除
  // ============================================
  
  content: {
    type: 'archived',
    frontendVisible: false,
    category: 'deprecated',
    description: '内容质量分析引擎（已归档）',
    reason: '功能与website和seo引擎重叠85%',
    archivedDate: '2025-10-06',
    location: 'engines/_archived/content',
    replacedBy: ['website', 'seo'],
    priority: 0,
    notes: '功能已被其他引擎覆盖，已归档备份'
  }
};

/**
 * 获取所有前端可见的引擎
 */
function getFrontendVisibleEngines() {
  return Object.entries(engineConfig)
    .filter(([_, config]) => config.frontendVisible === true)
    .map(([name, config]) => ({
      name,
      ...config
    }))
    .sort((a, b) => a.priority - b.priority);
}

/**
 * 获取指定类型的引擎
 */
function getEnginesByType(type) {
  return Object.entries(engineConfig)
    .filter(([_, config]) => config.type === type)
    .map(([name, config]) => ({
      name,
      ...config
    }));
}

/**
 * 获取引擎配置
 */
function getEngineConfig(engineName) {
  return engineConfig[engineName] || null;
}

/**
 * 检查引擎是否可用于前端
 */
function isEngineAvailableForFrontend(engineName) {
  const config = engineConfig[engineName];
  return config && config.frontendVisible === true;
}

/**
 * 获取引擎统计信息
 */
function getEngineStats() {
  const allEngines = Object.keys(engineConfig);
  const byType = {};
  
  allEngines.forEach(name => {
    const type = engineConfig[name].type;
    byType[type] = (byType[type] || 0) + 1;
  });
  
  return {
    total: allEngines.length,
    userTools: byType['user-tool'] || 0,
    infrastructure: byType['infrastructure'] || 0,
    apiOnly: byType['api-only'] || 0,
    developerTools: byType['developer-tool'] || 0,
    opsTools: byType['ops-tool'] || 0,
    archived: byType['archived'] || 0,
    frontendVisible: getFrontendVisibleEngines().length
  };
}

module.exports = {
  engineConfig,
  getFrontendVisibleEngines,
  getEnginesByType,
  getEngineConfig,
  isEngineAvailableForFrontend,
  getEngineStats
};

