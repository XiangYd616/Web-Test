export type ImpactRange = [number, number];

export interface ImpactRangeSet {
  traffic: ImpactRange;
  ranking: ImpactRange;
  ctr: ImpactRange;
  conversions: ImpactRange;
  timeframe: string;
  confidence: number;
}

export interface OptimizationTemplate {
  patterns: string[];
  rules: {
    minLength?: number;
    maxLength?: number;
    includeKeyword?: boolean;
    includeBrand?: boolean;
    avoidStuffing?: boolean;
    minSentences?: number;
    maxSentences?: number;
    includeCallToAction?: boolean;
    includeAlt?: boolean;
    includeCaption?: boolean;
    optimizeSize?: boolean;
    includeAnchor?: boolean;
    includeTitle?: boolean;
    avoidBroken?: boolean;
  };
}

export interface OptimizationTemplates {
  title: OptimizationTemplate;
  metaDescription: OptimizationTemplate;
  headings: OptimizationTemplate;
  content: OptimizationTemplate;
  images: OptimizationTemplate;
  links: OptimizationTemplate;
}

export interface ImplementationStep {
  step: number;
  action: string;
  details: string;
  code?: string;
  estimatedTime: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface CodeExample {
  title: string;
  language: string;
  code: string;
  explanation: string;
  before?: string;
  after?: string;
}

export interface ImpactEstimate {
  traffic: number;
  ranking: number;
  ctr: number;
  conversions: number;
  timeframe: string;
  confidence: number;
}

export interface OptimizationSuggestionTemplate {
  id: string;
  category: string;
  title: string;
  description: string;
  current: string;
  suggested: string;
  improvement: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  effort: 'low' | 'medium' | 'high';
  impactRanges: {
    low: ImpactRangeSet;
    medium: ImpactRangeSet;
    high: ImpactRangeSet;
  };
  implementation: ImplementationStep[];
  examples: CodeExample[];
}

export type OptimizationSuggestionTemplateMap = Record<string, OptimizationSuggestionTemplate>;

export const defaultOptimizationTemplates: OptimizationTemplates = {
  title: {
    patterns: [
      '主要关键词 - 次要关键词 | 品牌名',
      '如何 [动作] [主题] - [年份] 完整指南',
      '[数字] 个 [主题] [技巧/方法/策略] [年份]',
      '[主题] 完整指南：[具体内容] [年份]',
    ],
    rules: {
      minLength: 30,
      maxLength: 60,
      includeKeyword: true,
      includeBrand: true,
      avoidStuffing: true,
    },
  },
  metaDescription: {
    patterns: [
      '了解 [主题] 的 [数字] 个关键要点。[具体价值] [行动号召]',
      '发现 [主题] 的最佳实践。[具体收益] 立即开始！',
      '[问题] 我们提供 [解决方案]。[具体结果] [行动号召]',
    ],
    rules: {
      minLength: 120,
      maxLength: 160,
      includeKeyword: true,
      includeCallToAction: true,
      minSentences: 2,
      maxSentences: 4,
    },
  },
  headings: {
    patterns: [
      '[主题]：[具体内容]',
      '如何 [动作] [主题]',
      '[主题] 的 [数字] 个 [方面]',
      '[主题] 最佳实践',
    ],
    rules: {
      minLength: 10,
      maxLength: 70,
      includeKeyword: false,
      avoidStuffing: true,
    },
  },
  content: {
    patterns: [
      '[引言] [主体内容] [结论]',
      '[问题] [分析] [解决方案] [总结]',
      '[概述] [详细说明] [实例] [建议]',
    ],
    rules: {
      minLength: 300,
      includeKeyword: true,
      minSentences: 10,
      avoidStuffing: true,
    },
  },
  images: {
    patterns: ['[主题] 相关图片', '[主题] 示意图', '[主题] 流程图'],
    rules: {
      includeAlt: true,
      includeCaption: true,
      optimizeSize: true,
    },
  },
  links: {
    patterns: ['[相关资源]', '[进一步阅读]', '[参考链接]'],
    rules: {
      includeAnchor: true,
      includeTitle: true,
      avoidBroken: true,
    },
  },
};

export const defaultOptimizationSuggestionTemplates: OptimizationSuggestionTemplateMap = {
  'title-length': {
    id: 'title-length',
    category: 'meta',
    title: '优化标题长度',
    description: '当前标题长度{currentLength}字符，建议调整为{minLength}-{maxLength}字符',
    current: '{currentTitle}',
    suggested: '{suggestedTitle}',
    improvement: '提高搜索结果显示效果和点击率',
    priority: 'high',
    effort: 'low',
    impactRanges: {
      low: {
        traffic: [6, 10],
        ranking: [4, 8],
        ctr: [8, 12],
        conversions: [3, 6],
        timeframe: '2-4周',
        confidence: 0.7,
      },
      medium: {
        traffic: [10, 18],
        ranking: [8, 12],
        ctr: [12, 20],
        conversions: [5, 8],
        timeframe: '2-4周',
        confidence: 0.8,
      },
      high: {
        traffic: [18, 25],
        ranking: [12, 18],
        ctr: [20, 30],
        conversions: [8, 12],
        timeframe: '2-4周',
        confidence: 0.85,
      },
    },
    implementation: [
      {
        step: 1,
        action: '分析当前标题',
        details: '检查标题长度、关键词使用和品牌展示',
        estimatedTime: '5分钟',
        difficulty: 'easy',
      },
      {
        step: 2,
        action: '重写标题',
        details: '使用优化模板创建新标题',
        estimatedTime: '10分钟',
        difficulty: 'easy',
      },
    ],
    examples: [
      {
        title: '标题优化示例',
        language: 'html',
        code: '<title>SEO优化技巧 - 提升排名指南 | 品牌名</title>',
        explanation: '包含关键词、符合长度要求、展示品牌',
      },
    ],
  },
  'title-keyword': {
    id: 'title-keyword',
    category: 'meta',
    title: '添加关键词到标题',
    description: '标题应包含主要关键词“{primaryKeyword}”以提高搜索排名',
    current: '{currentTitle}',
    suggested: '{suggestedTitle}',
    improvement: '提高搜索排名和相关性',
    priority: 'high',
    effort: 'low',
    impactRanges: {
      low: {
        traffic: [6, 10],
        ranking: [6, 10],
        ctr: [6, 12],
        conversions: [3, 6],
        timeframe: '2-4周',
        confidence: 0.7,
      },
      medium: {
        traffic: [10, 18],
        ranking: [10, 14],
        ctr: [12, 18],
        conversions: [5, 9],
        timeframe: '2-4周',
        confidence: 0.8,
      },
      high: {
        traffic: [18, 25],
        ranking: [14, 20],
        ctr: [18, 25],
        conversions: [8, 12],
        timeframe: '2-4周',
        confidence: 0.85,
      },
    },
    implementation: [
      {
        step: 1,
        action: '确定主要关键词',
        details: '选择最相关的关键词',
        estimatedTime: '5分钟',
        difficulty: 'easy',
      },
      {
        step: 2,
        action: '重写标题',
        details: '自然地融入关键词',
        estimatedTime: '10分钟',
        difficulty: 'easy',
      },
    ],
    examples: [
      {
        title: '关键词优化示例',
        language: 'html',
        code: '<title>SEO优化服务 - 专业排名提升 | 品牌名</title>',
        explanation: '自然融入主要关键词',
      },
    ],
  },
  'meta-description-length': {
    id: 'meta-description-length',
    category: 'meta',
    title: '优化Meta描述长度',
    description: '当前描述长度{currentLength}字符，建议调整为{minLength}-{maxLength}字符',
    current: '{currentDescription}',
    suggested: '{suggestedDescription}',
    improvement: '提高搜索结果展示效果和点击率',
    priority: 'high',
    effort: 'low',
    impactRanges: {
      low: {
        traffic: [5, 8],
        ranking: [3, 6],
        ctr: [8, 15],
        conversions: [3, 6],
        timeframe: '1-3周',
        confidence: 0.7,
      },
      medium: {
        traffic: [8, 14],
        ranking: [6, 10],
        ctr: [15, 22],
        conversions: [5, 9],
        timeframe: '1-3周',
        confidence: 0.75,
      },
      high: {
        traffic: [14, 20],
        ranking: [10, 14],
        ctr: [22, 30],
        conversions: [8, 12],
        timeframe: '1-3周',
        confidence: 0.8,
      },
    },
    implementation: [
      {
        step: 1,
        action: '分析当前描述',
        details: '检查描述长度、内容和吸引力',
        estimatedTime: '5分钟',
        difficulty: 'easy',
      },
      {
        step: 2,
        action: '重写描述',
        details: '使用优化模板创建新描述',
        estimatedTime: '15分钟',
        difficulty: 'easy',
      },
    ],
    examples: [
      {
        title: 'Meta描述优化示例',
        language: 'html',
        code: '<meta name="description" content="了解SEO优化的10个关键技巧。提升网站排名和流量，立即开始优化！">',
        explanation: '符合长度要求，包含关键词和行动号召',
      },
    ],
  },
  'heading-structure': {
    id: 'heading-structure',
    category: 'content',
    title: '优化标题结构',
    description: '页面应有且仅有一个H1标题，当前有{h1Count}个',
    current: '{h1Count}个H1标题',
    suggested: '1个H1标题，清晰的层次结构',
    improvement: '提高内容结构和SEO效果',
    priority: 'medium',
    effort: 'medium',
    impactRanges: {
      low: {
        traffic: [4, 8],
        ranking: [6, 10],
        ctr: [3, 6],
        conversions: [3, 5],
        timeframe: '2-3周',
        confidence: 0.65,
      },
      medium: {
        traffic: [8, 12],
        ranking: [10, 14],
        ctr: [6, 10],
        conversions: [5, 8],
        timeframe: '2-3周',
        confidence: 0.7,
      },
      high: {
        traffic: [12, 18],
        ranking: [14, 20],
        ctr: [10, 14],
        conversions: [8, 12],
        timeframe: '2-3周',
        confidence: 0.75,
      },
    },
    implementation: [
      {
        step: 1,
        action: '检查标题结构',
        details: '识别所有H1-H6标题',
        estimatedTime: '10分钟',
        difficulty: 'easy',
      },
      {
        step: 2,
        action: '重构标题',
        details: '确保只有一个H1，层次清晰',
        estimatedTime: '20分钟',
        difficulty: 'medium',
      },
    ],
    examples: [
      {
        title: '标题结构示例',
        language: 'html',
        code: '<h1>主标题</h1>\n<h2>二级标题</h2>\n<h3>三级标题</h3>',
        explanation: '清晰的标题层次结构',
      },
    ],
  },
  'content-length': {
    id: 'content-length',
    category: 'content',
    title: '增加内容长度',
    description: '当前内容{wordCount}字，建议增加到{minLength}字以上',
    current: '{wordCount}字',
    suggested: '{minLength}字以上',
    improvement: '提高内容价值和SEO排名',
    priority: 'medium',
    effort: 'medium',
    impactRanges: {
      low: {
        traffic: [8, 12],
        ranking: [10, 14],
        ctr: [4, 8],
        conversions: [5, 8],
        timeframe: '3-6周',
        confidence: 0.7,
      },
      medium: {
        traffic: [12, 18],
        ranking: [14, 20],
        ctr: [8, 12],
        conversions: [8, 12],
        timeframe: '3-6周',
        confidence: 0.75,
      },
      high: {
        traffic: [18, 25],
        ranking: [20, 28],
        ctr: [12, 18],
        conversions: [12, 16],
        timeframe: '3-6周',
        confidence: 0.8,
      },
    },
    implementation: [
      {
        step: 1,
        action: '内容规划',
        details: '确定需要扩展的内容部分',
        estimatedTime: '15分钟',
        difficulty: 'medium',
      },
      {
        step: 2,
        action: '内容扩展',
        details: '添加详细说明、实例和分析',
        estimatedTime: '1-2小时',
        difficulty: 'medium',
      },
    ],
    examples: [
      {
        title: '内容扩展示例',
        language: 'markdown',
        code: '# 原始内容\n简短介绍...\n\n# 扩展内容\n## 详细说明\n更详细的解释...\n\n## 实例分析\n具体案例...\n\n## 总结\n内容总结...',
        explanation: '通过添加详细内容扩展文章',
      },
    ],
  },
  'image-alt': {
    id: 'image-alt',
    category: 'content',
    title: '添加图片Alt属性',
    description: '{missingAltCount}张图片缺少alt属性',
    current: '缺少alt属性',
    suggested: '为所有图片添加描述性alt属性',
    improvement: '提高可访问性和SEO效果',
    priority: 'medium',
    effort: 'low',
    impactRanges: {
      low: {
        traffic: [3, 6],
        ranking: [4, 8],
        ctr: [2, 5],
        conversions: [2, 4],
        timeframe: '1-2周',
        confidence: 0.6,
      },
      medium: {
        traffic: [6, 10],
        ranking: [8, 12],
        ctr: [5, 8],
        conversions: [4, 6],
        timeframe: '1-2周',
        confidence: 0.65,
      },
      high: {
        traffic: [10, 15],
        ranking: [12, 16],
        ctr: [8, 12],
        conversions: [6, 9],
        timeframe: '1-2周',
        confidence: 0.7,
      },
    },
    implementation: [
      {
        step: 1,
        action: '识别图片',
        details: '找出所有缺少alt属性的图片',
        estimatedTime: '10分钟',
        difficulty: 'easy',
      },
      {
        step: 2,
        action: '添加alt属性',
        details: '为每张图片添加描述性alt文本',
        estimatedTime: '15分钟',
        difficulty: 'easy',
      },
    ],
    examples: [
      {
        title: 'Alt属性示例',
        language: 'html',
        code: '<img src="seo-chart.jpg" alt="SEO优化效果图表显示排名提升趋势">',
        explanation: '添加描述性的alt属性',
      },
    ],
  },
  'internal-links': {
    id: 'internal-links',
    category: 'links',
    title: '优化内部链接',
    description: '检测到{issueCount}个内部链接问题，需优化结构和锚文本',
    current: '存在链接问题',
    suggested: '优化链接结构，改善用户体验',
    improvement: '提高网站结构和权重分配',
    priority: 'medium',
    effort: 'medium',
    impactRanges: {
      low: {
        traffic: [6, 10],
        ranking: [8, 12],
        ctr: [4, 6],
        conversions: [3, 6],
        timeframe: '2-4周',
        confidence: 0.65,
      },
      medium: {
        traffic: [10, 15],
        ranking: [12, 18],
        ctr: [6, 10],
        conversions: [6, 9],
        timeframe: '2-4周',
        confidence: 0.7,
      },
      high: {
        traffic: [15, 22],
        ranking: [18, 24],
        ctr: [10, 14],
        conversions: [9, 12],
        timeframe: '2-4周',
        confidence: 0.75,
      },
    },
    implementation: [
      {
        step: 1,
        action: '链接审计',
        details: '检查所有内部链接的有效性',
        estimatedTime: '20分钟',
        difficulty: 'medium',
      },
      {
        step: 2,
        action: '链接优化',
        details: '修复无效链接，改善锚文本',
        estimatedTime: '30分钟',
        difficulty: 'medium',
      },
    ],
    examples: [
      {
        title: '内部链接示例',
        language: 'html',
        code: '<a href="/seo-guide" title="SEO优化完整指南">SEO优化指南</a>',
        explanation: '使用描述性锚文本和标题',
      },
    ],
  },
};

export const validateOptimizationTemplates = (templates: OptimizationTemplates) => {
  const errors: string[] = [];
  if (!templates?.title || !templates?.metaDescription || !templates?.content) {
    errors.push('缺少基础优化模板配置');
  }
  return { isValid: errors.length === 0, errors };
};

export const validateOptimizationSuggestionTemplates = (
  templates: OptimizationSuggestionTemplateMap
) => {
  const errors: string[] = [];
  Object.entries(templates).forEach(([key, value]) => {
    if (!value.id || !value.title || !value.category) {
      errors.push(`优化建议模板 ${key} 缺少必要字段`);
      return;
    }
    if (!value.examples?.length || !value.implementation?.length) {
      errors.push(`优化建议模板 ${key} 示例/实施步骤为空`);
    }
    const ranges = value.impactRanges;
    if (!ranges?.low || !ranges?.medium || !ranges?.high) {
      errors.push(`优化建议模板 ${key} 缺少影响范围配置`);
    }
  });
  return { isValid: errors.length === 0, errors };
};
