export type ImpactRange = [number, number];

export type ImpactRanges = {
  low: ImpactRange;
  medium: ImpactRange;
  high: ImpactRange;
};

export interface RecommendationTemplate {
  id: string;
  category: string;
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  effort: 'low' | 'medium' | 'high';
  impactRanges: ImpactRanges;
  examples: Array<{ title: string; language: string; code: string; explanation: string }>;
  implementation: Array<{ step: number; action: string; details: string; estimatedTime: string }>;
  resources: Array<{
    title: string;
    type: 'documentation' | 'tool' | 'example' | 'guide';
    url: string;
    description: string;
  }>;
}

export type RecommendationTemplateMap = Record<string, RecommendationTemplate>;

export const defaultRecommendationTemplates: RecommendationTemplateMap = {
  'meta-title-optimization': {
    id: 'meta-title-optimization',
    category: 'meta',
    title: '优化页面标题',
    description: '改进标题长度和内容质量以提高搜索排名和点击率',
    priority: 'high',
    effort: 'low',
    impactRanges: {
      low: [5, 10],
      medium: [10, 20],
      high: [20, 35],
    },
    examples: [
      {
        title: '标题优化示例',
        language: 'html',
        code: '<title>优化后的页面标题 - 品牌名称</title>',
        explanation: '标题长度30-60字符，包含主要关键词，具有吸引力',
      },
    ],
    implementation: [
      {
        step: 1,
        action: '分析当前标题',
        details: '检查标题长度、关键词使用和吸引力',
        estimatedTime: '5分钟',
      },
      {
        step: 2,
        action: '重写标题',
        details: '创建符合SEO最佳实践的新标题',
        estimatedTime: '10分钟',
      },
      {
        step: 3,
        action: '测试效果',
        details: '监控搜索排名和点击率变化',
        estimatedTime: '持续监控',
      },
    ],
    resources: [
      {
        title: 'Google标题优化指南',
        type: 'documentation',
        url: 'https://developers.google.com/search/docs/advanced/appearance/title-link',
        description: 'Google官方标题优化最佳实践',
      },
    ],
  },
  'meta-description-optimization': {
    id: 'meta-description-optimization',
    category: 'meta',
    title: '优化Meta描述',
    description: '改进描述内容以提高搜索结果展示效果和点击率',
    priority: 'high',
    effort: 'low',
    impactRanges: {
      low: [5, 10],
      medium: [10, 18],
      high: [18, 28],
    },
    examples: [
      {
        title: '描述优化示例',
        language: 'html',
        code: '<meta name="description" content="这是一个优化的页面描述，长度在120-160字符之间，包含关键词和吸引人的内容。">',
        explanation: '描述长度120-160字符，包含关键词，具有吸引力',
      },
    ],
    implementation: [
      {
        step: 1,
        action: '分析当前描述',
        details: '检查描述长度、关键词和吸引力',
        estimatedTime: '5分钟',
      },
      {
        step: 2,
        action: '重写描述',
        details: '创建符合SEO最佳实践的新描述',
        estimatedTime: '10分钟',
      },
    ],
    resources: [
      {
        title: 'Meta描述优化指南',
        type: 'documentation',
        url: 'https://moz.com/learn/seo/meta-description',
        description: 'Meta描述优化最佳实践',
      },
    ],
  },
  'content-length-optimization': {
    id: 'content-length-optimization',
    category: 'content',
    title: '增加内容长度',
    description: '扩展内容长度以提供更全面的信息和更好的SEO效果',
    priority: 'medium',
    effort: 'medium',
    impactRanges: {
      low: [6, 12],
      medium: [12, 20],
      high: [20, 30],
    },
    examples: [
      {
        title: '内容扩展示例',
        language: 'markdown',
        code: '# 原始内容\n简短介绍...\n\n# 扩展内容\n## 详细说明\n更详细的解释和背景信息...\n\n## 实例分析\n具体案例和数据支持...\n\n## 常见问题\n用户可能关心的问题解答...\n\n## 总结\n内容总结和行动建议...',
        explanation: '通过添加详细说明、实例分析和常见问题来扩展内容',
      },
    ],
    implementation: [
      {
        step: 1,
        action: '内容规划',
        details: '确定需要扩展的内容部分',
        estimatedTime: '15分钟',
      },
      {
        step: 2,
        action: '内容扩展',
        details: '添加详细说明、实例和案例分析',
        estimatedTime: '1-2小时',
      },
      {
        step: 3,
        action: '内容优化',
        details: '确保内容质量和可读性',
        estimatedTime: '30分钟',
      },
    ],
    resources: [
      {
        title: '内容长度最佳实践',
        type: 'documentation',
        url: 'https://backlinko.com/hub/content/seo-content-length',
        description: 'SEO内容长度研究和建议',
      },
    ],
  },
  'content-readability-optimization': {
    id: 'content-readability-optimization',
    category: 'content-quality',
    title: '改善内容可读性',
    description: '优化句子结构、段落长度和语言表达以提高可读性',
    priority: 'medium',
    effort: 'medium',
    impactRanges: {
      low: [5, 10],
      medium: [10, 18],
      high: [18, 28],
    },
    examples: [
      {
        title: '可读性优化示例',
        language: 'markdown',
        code: '# 改善前\n这是一个非常长的句子，包含了太多的技术术语和复杂的概念，让读者难以理解和消化。\n\n# 改善后\n这是第一个句子。它使用简单的语言表达概念。\n\n这是第二个句子。它分解了复杂的思想。\n\n使用短句提高可读性。',
        explanation: '使用短句、简单词汇和清晰的段落结构',
      },
    ],
    implementation: [
      {
        step: 1,
        action: '可读性分析',
        details: '使用工具分析当前内容的可读性指标',
        estimatedTime: '10分钟',
      },
      {
        step: 2,
        action: '句子优化',
        details: '拆分长句，简化复杂表达',
        estimatedTime: '30分钟',
      },
      {
        step: 3,
        action: '段落优化',
        details: '调整段落长度和结构',
        estimatedTime: '20分钟',
      },
    ],
    resources: [
      {
        title: '可读性测试工具',
        type: 'tool',
        url: 'https://hemingwayapp.com/',
        description: '免费的可读性分析和优化工具',
      },
    ],
  },
  'internal-link-optimization': {
    id: 'internal-link-optimization',
    category: 'links',
    title: '优化内部链接结构',
    description: '改善内部链接以提高网站结构和用户体验',
    priority: 'medium',
    effort: 'medium',
    impactRanges: {
      low: [4, 8],
      medium: [8, 15],
      high: [15, 25],
    },
    examples: [
      {
        title: '内部链接优化示例',
        language: 'html',
        code: '<nav>\n  <ul>\n    <li><a href="/" title="首页">首页</a></li>\n    <li><a href="/services" title="服务">服务</a></li>\n    <li><a href="/about" title="关于我们">关于我们</a></li>\n  </ul>\n</nav>\n\n<!-- 内容中的相关链接 -->\n<p>了解更多关于<a href="/services/seo" title="SEO优化服务">SEO优化</a>的信息。</p>',
        explanation: '使用描述性锚文本，确保链接有效性',
      },
    ],
    implementation: [
      {
        step: 1,
        action: '链接审计',
        details: '检查所有内部链接的有效性和锚文本',
        estimatedTime: '30分钟',
      },
      {
        step: 2,
        action: '链接优化',
        details: '修复无效链接，改善锚文本',
        estimatedTime: '1小时',
      },
      {
        step: 3,
        action: '结构优化',
        details: '优化链接结构和层次',
        estimatedTime: '45分钟',
      },
    ],
    resources: [
      {
        title: '内部链接优化指南',
        type: 'documentation',
        url: 'https://moz.com/learn/seo/internal-links',
        description: '内部链接最佳实践和策略',
      },
    ],
  },
  'mobile-viewport-optimization': {
    id: 'mobile-viewport-optimization',
    category: 'mobile',
    title: '添加移动端视口配置',
    description: '添加viewport meta标签确保移动端正确显示',
    priority: 'critical',
    effort: 'low',
    impactRanges: {
      low: [8, 15],
      medium: [15, 25],
      high: [25, 40],
    },
    examples: [
      {
        title: '视口配置示例',
        language: 'html',
        code: '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">',
        explanation: '设置viewport为设备宽度，禁用缩放',
      },
    ],
    implementation: [
      {
        step: 1,
        action: '添加meta标签',
        details: '在HTML head中添加viewport meta标签',
        estimatedTime: '5分钟',
      },
      {
        step: 2,
        action: '测试显示效果',
        details: '在不同移动设备上测试显示效果',
        estimatedTime: '15分钟',
      },
    ],
    resources: [
      {
        title: '移动端视口配置指南',
        type: 'documentation',
        url: 'https://developers.google.com/web/fundamentals/design-and-ux/responsive/',
        description: 'Google移动端最佳实践',
      },
    ],
  },
  'structured-data-jsonld': {
    id: 'structured-data-jsonld',
    category: 'structured-data',
    title: '添加JSON-LD结构化数据',
    description: '使用JSON-LD格式添加结构化数据以提高搜索结果显示',
    priority: 'medium',
    effort: 'medium',
    impactRanges: {
      low: [5, 10],
      medium: [10, 18],
      high: [18, 28],
    },
    examples: [
      {
        title: 'JSON-LD示例',
        language: 'json',
        code: '{\n  "@context": "https://schema.org",\n  "@type": "Article",\n  "headline": "文章标题",\n  "author": {\n    "@type": "Person",\n    "name": "作者姓名"\n  },\n  "datePublished": "2024-01-01",\n  "image": "https://example.com/image.jpg",\n  "publisher": {\n    "@type": "Organization",\n    "name": "发布者名称"\n  }\n}',
        explanation: '使用JSON-LD格式定义文章结构化数据',
      },
    ],
    implementation: [
      {
        step: 1,
        action: '选择Schema类型',
        details: '根据内容类型选择合适的Schema.org类型',
        estimatedTime: '10分钟',
      },
      {
        step: 2,
        action: '创建JSON-LD',
        details: '编写符合Schema.org规范的结构化数据',
        estimatedTime: '30分钟',
      },
      {
        step: 3,
        action: '添加到页面',
        details: '将JSON-LD添加到HTML head中',
        estimatedTime: '5分钟',
      },
    ],
    resources: [
      {
        title: 'Schema.org文档',
        type: 'documentation',
        url: 'https://schema.org/',
        description: 'Schema.org完整类型文档',
      },
    ],
  },
  'performance-load-time': {
    id: 'performance-load-time',
    category: 'performance',
    title: '优化页面加载速度',
    description: '减少页面加载时间以提高用户体验和搜索排名',
    priority: 'high',
    effort: 'high',
    impactRanges: {
      low: [6, 12],
      medium: [12, 20],
      high: [20, 35],
    },
    examples: [
      {
        title: '图片优化示例',
        language: 'html',
        code: '<img src="image.webp" alt="描述" loading="lazy" width="800" height="600">\n\n<!-- 响应式图片 -->\n<picture>\n  <source srcset="image-large.webp" media="(min-width: 768px)">\n  <source srcset="image-small.webp" media="(max-width: 767px)">\n  <img src="image-fallback.jpg" alt="描述">\n</picture>',
        explanation: '使用现代图片格式和懒加载技术',
      },
    ],
    implementation: [
      {
        step: 1,
        action: '性能分析',
        details: '使用PageSpeed Insights分析性能瓶颈',
        estimatedTime: '15分钟',
      },
      {
        step: 2,
        action: '图片优化',
        details: '压缩图片，使用现代格式',
        estimatedTime: '1-2小时',
      },
      {
        step: 3,
        action: '代码优化',
        details: '压缩CSS/JS，启用缓存',
        estimatedTime: '2-3小时',
      },
    ],
    resources: [
      {
        title: 'PageSpeed Insights',
        type: 'tool',
        url: 'https://pagespeed.web.dev/',
        description: 'Google免费性能分析工具',
      },
    ],
  },
};

export const validateRecommendationTemplates = (templates: RecommendationTemplateMap) => {
  const errors: string[] = [];
  Object.entries(templates).forEach(([key, value]) => {
    if (!value.id || !value.title || !value.category) {
      errors.push(`模板 ${key} 缺少必要字段`);
      return;
    }
    if (!value.examples?.length || !value.implementation?.length || !value.resources?.length) {
      errors.push(`模板 ${key} 示例/实施步骤/资源配置为空`);
    }
    const ranges = value.impactRanges;
    if (!ranges?.low || !ranges?.medium || !ranges?.high) {
      errors.push(`模板 ${key} 缺少影响范围配置`);
    }
  });
  return {
    isValid: errors.length === 0,
    errors,
  };
};
