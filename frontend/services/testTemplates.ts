/**
 * testTemplates.ts - 业务服务层
 *
 * 文件路径: frontend\services\testTemplates.ts
 * 创建时间: 2025-09-25
 */

export interface TestTemplate {
  id: string;
  name: string;
  description: string;
  category: 'ecommerce' | 'blog' | 'corporate' | 'saas' | 'portfolio' | 'news' | 'custom';
  testType:
    | 'stress'
    | 'seo'
    | 'compatibility'
    | 'api'
    | 'security'
    | 'performance'
    | 'comprehensive';
  config: Record<string, unknown>;
  tags: string[];
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  usage: number;
}

export interface TestPreset {
  id: string;
  name: string;
  description: string;
  templates: TestTemplate[];
  isPublic: boolean;
  author: string;
  rating: number;
  downloads: number;
}

// 预定义的测试模板
export const DEFAULT_TEMPLATES: TestTemplate[] = [
  // 电商网站模板
  {
    id: 'ecommerce-comprehensive',
    name: '电商网站全面测试',
    description: '针对电商网站的综合性能、安全性和用户体验测试',
    category: 'ecommerce',
    testType: 'comprehensive',
    config: {
      stress: {
        users: 100,
        duration: 300,
        rampUpTime: 60,
        scenarios: ['browse_products', 'add_to_cart', 'checkout'],
      },
      seo: {
        depth: 'site',
        include_technical: true,
        include_content: true,
        competitor_urls: [],
      },
      security: {
        checkSSL: true,
        checkHeaders: true,
        checkVulnerabilities: true,
        checkPaymentSecurity: true,
      },
      performance: {
        checkCoreWebVitals: true,
        checkLoadTime: true,
        checkImageOptimization: true,
        checkCaching: true,
      },
    },
    tags: ['电商', '购物', '支付', '高流量'],
    isDefault: true,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    usage: 1250,
  },

  // 博客网站模板
  {
    id: 'blog-seo-focused',
    name: '博客SEO优化测试',
    description: '专注于博客网站的SEO优化和内容质量检测',
    category: 'blog',
    testType: 'seo',
    config: {
      depth: 'site',
      include_technical: true,
      include_content: true,
      competitor_urls: [],
    },
    tags: ['博客', 'SEO', '内容', '优化'],
    isDefault: true,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    usage: 890,
  },

  // 企业官网模板
  {
    id: 'corporate-professional',
    name: '企业官网专业测试',
    description: '企业官网的专业性、安全性和性能全面评估',
    category: 'corporate',
    testType: 'comprehensive',
    config: {
      stress: {
        users: 50,
        duration: 180,
        rampUpTime: 30,
        scenarios: ['homepage', 'about', 'contact', 'services'],
      },
      seo: {
        depth: 'site',
        include_technical: true,
        include_content: true,
        competitor_urls: [],
      },
      security: {
        checkSSL: true,
        checkHeaders: true,
        checkPrivacyPolicy: true,
        checkContactSecurity: true,
      },
      compatibility: {
        checkDesktop: true,
        checkMobile: true,
        checkTablet: true,
        browsers: ['chrome', 'firefox', 'safari', 'edge'],
      },
    },
    tags: ['企业', '官网', '专业', '安全'],
    isDefault: true,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    usage: 670,
  },

  // SaaS应用模板
  {
    id: 'saas-performance',
    name: 'SaaS应用性能测试',
    description: 'SaaS应用的高并发性能和API稳定性测试',
    category: 'saas',
    testType: 'stress',
    config: {
      users: 200,
      duration: 600,
      rampUpTime: 120,
      scenarios: ['login', 'dashboard', 'api_calls', 'data_processing'],
      apiEndpoints: [
        { path: '/api/auth/login', method: 'POST', weight: 10 },
        { path: '/api/dashboard', method: 'GET', weight: 30 },
        { path: '/api/data', method: 'GET', weight: 40 },
        { path: '/api/analytics', method: 'GET', weight: 20 },
      ],
      thresholds: {
        responseTime: 500,
        errorRate: 1,
        throughput: 100,
      },
    },
    tags: ['SaaS', '高并发', 'API', '性能'],
    isDefault: true,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    usage: 445,
  },

  // 新闻网站模板
  {
    id: 'news-high-traffic',
    name: '新闻网站高流量测试',
    description: '新闻网站的高流量承载能力和内容加载速度测试',
    category: 'news',
    testType: 'stress',
    config: {
      users: 500,
      duration: 300,
      rampUpTime: 60,
      scenarios: ['homepage', 'article_view', 'category_browse', 'search'],
      loadPattern: 'spike',
      contentTypes: ['text', 'images', 'videos'],
      cacheStrategy: 'aggressive',
      thresholds: {
        responseTime: 200,
        errorRate: 0.5,
        throughput: 1000,
      },
    },
    tags: ['新闻', '高流量', '内容', '速度'],
    isDefault: true,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    usage: 320,
  },

  // 作品集网站模板
  {
    id: 'portfolio-visual',
    name: '作品集视觉优化测试',
    description: '作品集网站的视觉效果、图片优化和移动端体验测试',
    category: 'portfolio',
    testType: 'performance',
    config: {
      checkCoreWebVitals: true,
      checkImageOptimization: true,
      checkMobileExperience: true,
      checkVisualStability: true,
      imageFormats: ['webp', 'avif', 'jpg', 'png'],
      deviceTypes: ['mobile', 'tablet', 'desktop'],
      networkConditions: ['3g', '4g', 'wifi'],
      visualMetrics: {
        firstContentfulPaint: true,
        largestContentfulPaint: true,
        cumulativeLayoutShift: true,
        speedIndex: true,
      },
    },
    tags: ['作品集', '视觉', '图片', '移动端'],
    isDefault: true,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    usage: 280,
  },
];

// 行业最佳实践预设
export const INDUSTRY_PRESETS: TestPreset[] = [
  {
    id: 'ecommerce-best-practices',
    name: '电商行业最佳实践',
    description: '基于电商行业标准的完整测试套件',
    templates: [
      DEFAULT_TEMPLATES[0], // 电商综合测试
      {
        ...DEFAULT_TEMPLATES[0],
        id: 'ecommerce-checkout-flow',
        name: '购物流程专项测试',
        description: '专门测试购物车和结账流程的用户体验',
        config: {
          ...DEFAULT_TEMPLATES[0].config,
          scenarios: ['add_to_cart', 'cart_management', 'checkout', 'payment'],
        },
      },
    ],
    isPublic: true,
    author: 'Test Web Team',
    rating: 4.8,
    downloads: 1500,
  },

  {
    id: 'content-publishing-suite',
    name: '内容发布平台套件',
    description: '适用于博客、新闻、内容管理系统的测试套件',
    templates: [
      DEFAULT_TEMPLATES[1], // 博客SEO测试
      DEFAULT_TEMPLATES[4], // 新闻高流量测试
    ],
    isPublic: true,
    author: 'Test Web Team',
    rating: 4.6,
    downloads: 890,
  },
];

export class TestTemplateService {
  private static readonly STORAGE_KEY = 'test_templates';
  private static readonly CUSTOM_TEMPLATES_KEY = 'custom_test_templates';

  // 获取所有模板
  static getAllTemplates(): TestTemplate[] {
    const customTemplates = this.getCustomTemplates();
    return [...DEFAULT_TEMPLATES, ...customTemplates];
  }

  // 根据类别获取模板
  static getTemplatesByCategory(category: string): TestTemplate[] {
    return this.getAllTemplates().filter(template => template.category === category);
  }

  // 根据测试类型获取模板
  static getTemplatesByTestType(testType: string): TestTemplate[] {
    return this.getAllTemplates().filter(template => template.testType === testType);
  }

  // 获取热门模板
  static getPopularTemplates(limit = 10): TestTemplate[] {
    return this.getAllTemplates()
      .sort((a, b) => b.usage - a.usage)
      .slice(0, limit);
  }

  // 搜索模板
  static searchTemplates(query: string): TestTemplate[] {
    const lowercaseQuery = query.toLowerCase();
    return this.getAllTemplates().filter(
      template =>
        template.name.toLowerCase().includes(lowercaseQuery) ||
        template.description.toLowerCase().includes(lowercaseQuery) ||
        template.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
    );
  }

  // 获取自定义模板
  static getCustomTemplates(): TestTemplate[] {
    try {
      const stored = localStorage.getItem(this.CUSTOM_TEMPLATES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  // 保存自定义模板
  static saveCustomTemplate(
    template: Omit<TestTemplate, 'id' | 'createdAt' | 'updatedAt' | 'usage'>
  ): TestTemplate {
    const newTemplate: TestTemplate = {
      ...template,
      id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      usage: 0,
      isDefault: false,
    };

    const customTemplates = this.getCustomTemplates();
    customTemplates.push(newTemplate);
    localStorage.setItem(this.CUSTOM_TEMPLATES_KEY, JSON.stringify(customTemplates));

    return newTemplate;
  }

  // 更新模板使用次数
  static incrementTemplateUsage(templateId: string): void {
    const customTemplates = this.getCustomTemplates();
    const templateIndex = customTemplates.findIndex(t => t.id === templateId);

    if (templateIndex !== -1) {
      customTemplates[templateIndex].usage++;
      customTemplates[templateIndex].updatedAt = new Date().toISOString();
      localStorage.setItem(this.CUSTOM_TEMPLATES_KEY, JSON.stringify(customTemplates));
    }
  }

  // 删除自定义模板
  static deleteCustomTemplate(templateId: string): boolean {
    const customTemplates = this.getCustomTemplates();
    const filteredTemplates = customTemplates.filter(t => t.id !== templateId);

    if (filteredTemplates.length !== customTemplates.length) {
      localStorage.setItem(this.CUSTOM_TEMPLATES_KEY, JSON.stringify(filteredTemplates));
      return true;
    }

    return false;
  }

  // 导出模板
  static exportTemplate(templateId: string): string | null {
    const template = this.getAllTemplates().find(t => t.id === templateId);
    return template ? JSON.stringify(template, null, 2) : null;
  }

  // 导入模板
  static importTemplate(templateJson: string): TestTemplate | null {
    try {
      const template = JSON.parse(templateJson);
      // 验证模板格式
      if (this.validateTemplate(template)) {
        return this.saveCustomTemplate({
          ...template,
          name: `${template.name} (导入)`,
          isDefault: false,
        });
      }
    } catch {
      // 解析失败
    }
    return null;
  }

  // 验证模板格式
  private static validateTemplate(template: unknown): template is TestTemplate {
    if (!template || typeof template !== 'object') {
      return false;
    }
    const candidate = template as Record<string, unknown>;
    return (
      typeof candidate.name === 'string' &&
      typeof candidate.description === 'string' &&
      typeof candidate.category === 'string' &&
      typeof candidate.testType === 'string' &&
      Boolean(candidate.config) &&
      Array.isArray(candidate.tags)
    );
  }

  // 获取推荐模板
  static getRecommendedTemplates(userHistory: string[] = []): TestTemplate[] {
    // 基于用户历史使用记录推荐相关模板
    const allTemplates = this.getAllTemplates();

    if (userHistory.length === 0) {
      return this.getPopularTemplates(5);
    }

    // 简单的推荐算法：基于标签相似度
    const userTags = new Set<string>();
    userHistory.forEach(templateId => {
      const template = allTemplates.find(t => t.id === templateId);
      if (template) {
        template.tags.forEach(tag => userTags.add(tag));
      }
    });

    return allTemplates
      .filter(template => !userHistory.includes(template.id))
      .map(template => ({
        template,
        score: template.tags.filter(tag => userTags.has(tag)).length,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(item => item.template);
  }
}
