export interface TestTemplate     {
  id: string;
  name: string;
  description: string;
  category: 'stress' | 'load' | 'spike' | 'volume' | 'endurance
  config: {
    users: number;
    duration: number;
    rampUp: number;
    testType: 'gradual' | 'spike' | 'constant' | 'stress
    method: 'GET' | 'POST' | 'PUT' | 'DELETE
    timeout: number;
    thinkTime: number;
    warmupDuration: number;
  };
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced
}

export const stressTestTemplates: TestTemplate[] = [
  {
    id: 'light-load',
    name: '轻量测试',
    description: '适合初次测试或小型网站的轻量级压力测试',
    category: 'load',
    config: {
      users: 5,
      duration: 30,
      rampUp: 5,
      testType: 'gradual',
      method: 'GET',
      timeout: 30,
      thinkTime: 1,
      warmupDuration: 0
    },
    tags: ['初学者', '快速测试', '小型网站'],
    difficulty: 'beginner
  },
  {
    id: 'medium-load',
    name: '中等负载',
    description: '标准的负载测试，适合大多数网站的日常测试',
    category: 'load',
    config: {
      users: 20,
      duration: 60,
      rampUp: 10,
      testType: 'gradual',
      method: 'GET',
      timeout: 30,
      thinkTime: 1,
      warmupDuration: 5
    },
    tags: ['标准测试', '中型网站', '日常监控'],
    difficulty: 'intermediate
  },
  {
    id: 'heavy-load',
    name: '重负载测试',
    description: '高强度压力测试，用于测试系统在高负载下的表现',
    category: 'stress',
    config: {
      users: 50,
      duration: 120,
      rampUp: 20,
      testType: 'stress',
      method: 'GET',
      timeout: 30,
      thinkTime: 2,
      warmupDuration: 10
    },
    tags: ['高负载', '压力测试', '性能极限'],
    difficulty: 'advanced
  },
  {
    id: 'spike-test',
    name: '峰值测试',
    description: '模拟突发流量，测试系统应对流量激增的能力',
    category: 'spike',
    config: {
      users: 100,
      duration: 60,
      rampUp: 5,
      testType: 'spike',
      method: 'GET',
      timeout: 30,
      thinkTime: 0,
      warmupDuration: 0
    },
    tags: ['突发流量', '峰值测试', '弹性测试'],
    difficulty: 'advanced
  },
  {
    id: 'endurance-test',
    name: '耐久性测试',
    description: '长时间运行测试，检查系统的稳定性和内存泄漏',
    category: 'endurance',
    config: {
      users: 15,
      duration: 300,
      rampUp: 30,
      testType: 'constant',
      method: 'GET',
      timeout: 45,
      thinkTime: 3,
      warmupDuration: 15
    },
    tags: ['长时间测试', '稳定性', '内存泄漏'],
    difficulty: 'advanced
  },
  {
    id: 'api-load-test',
    name: 'API负载测试',
    description: '专门针对API接口的负载测试模板',
    category: 'load',
    config: {
      users: 30,
      duration: 90,
      rampUp: 15,
      testType: 'gradual',
      method: 'POST',
      timeout: 20,
      thinkTime: 0.5,
      warmupDuration: 5
    },
    tags: ['API测试', 'REST接口', '后端测试'],
    difficulty: 'intermediate
  },
  {
    id: 'mobile-optimized',
    name: '移动端优化测试',
    description: '模拟移动设备的网络条件和使用模式',
    category: 'load',
    config: {
      users: 25,
      duration: 45,
      rampUp: 8,
      testType: 'gradual',
      method: 'GET',
      timeout: 60,
      thinkTime: 2,
      warmupDuration: 3
    },
    tags: ['移动端', '慢网络', '用户体验'],
    difficulty: 'intermediate
  },
  {
    id: 'e-commerce-peak',
    name: '电商峰值测试',
    description: '模拟电商网站在促销活动期间的高并发场景',
    category: 'spike',
    config: {
      users: 200,
      duration: 180,
      rampUp: 10,
      testType: 'spike',
      method: 'GET',
      timeout: 25,
      thinkTime: 1,
      warmupDuration: 5
    },
    tags: ['电商', '促销活动', '高并发'],
    difficulty: 'advanced
  }
];

export const getTemplateById = (id: string): TestTemplate | undefined  => {
  return stressTestTemplates.find(template => template.id === id);
};

export const getTemplatesByCategory = (category: TestTemplate['category']): TestTemplate[]  => {
  return stressTestTemplates.filter(template => template.category === category);
};

export const getTemplatesByDifficulty = (difficulty: TestTemplate['difficulty']): TestTemplate[]  => {
  return stressTestTemplates.filter(template => template.difficulty === difficulty);
};

export const searchTemplates = (query: string): TestTemplate[]  => {
  const lowercaseQuery = query.toLowerCase();
  return stressTestTemplates.filter(template =>
    template.name.toLowerCase().includes(lowercaseQuery) ||
    template.description.toLowerCase().includes(lowercaseQuery) ||
    template.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
  );
};

export const getRecommendedTemplates = (userLevel: 'beginner' | 'intermediate' | 'advanced'): TestTemplate[]  => {
  const levelOrder = { beginner: 1, intermediate: 2, advanced: 3 };
  const userLevelValue = levelOrder[userLevel];

  return stressTestTemplates.filter(template => {
    const templateLevelValue = levelOrder[template.difficulty];
    return templateLevelValue <= userLevelValue + 1; // 允许稍微高一级的模板
  });
};

export const getTemplateCategories = (): Array<{ value: TestTemplate['category'], label: string, description: string }> => {
  return [
    { value: 'load', label: '负载测试', description: '测试系统在预期负载下的表现' },
    { value: 'stress', label: '压力测试', description: '测试系统在极限负载下的表现' },
    { value: 'spike', label: '峰值测试', description: '测试系统应对突发流量的能力' },
    { value: 'volume', label: '容量测试', description: '测试系统处理大量数据的能力' },
    { value: 'endurance', label: '耐久性测试', description: '测试系统长时间运行的稳定性' }
  ];
};
