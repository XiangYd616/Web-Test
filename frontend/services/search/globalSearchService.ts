// 全局搜索服务
export interface SearchResult     {
  id: string;
  title: string;
  description: string;
  type: 'page' | 'test' | 'report' | 'setting' | 'help' | 'user' | 'api';
  url: string;
  icon?: string;
  category: string;
  relevance: number;
  metadata?: Record<string, any>;
}

export interface SearchCategory     {
  id: string;
  name: string;
  icon: string;
  count: number;
}

class GlobalSearchService {
  private searchIndex: SearchResult[] = [];
  private initialized = false;

  // 初始化搜索索引
  async initializeSearchIndex(): Promise<void> {
    if (this.initialized) return;

    this.searchIndex = [
      // 页面搜索
      {
        id: 'dashboard','
        title: '仪表板','
        description: '查看测试概览、系统状态和最新报告','
        type: 'page','
        url: '/','
        icon: 'Home','
        category: '导航','
        relevance: 1.0
      },
      {
        id: 'website-test','
        title: '网站测试','
        description: '全面的网站性能和功能测试','
        type: 'page','
        url: '/test','
        icon: 'Globe','
        category: '测试工具','
        relevance: 1.0
      },
      {
        id: 'stress-test','
        title: '压力测试','
        description: '网站负载和性能压力测试','
        type: 'page','
        url: '/stress-test','
        icon: 'Zap','
        category: '测试工具','
        relevance: 1.0
      },
      {
        id: 'security-test','
        title: '安全检测','
        description: '网站安全漏洞和SSL证书检测','
        type: 'page','
        url: '/security-test','
        icon: 'Shield','
        category: '测试工具','
        relevance: 1.0
      },
      {
        id: 'seo-analysis','
        title: 'SEO分析','
        description: '搜索引擎优化分析和建议','
        type: 'page','
        url: '/content-test','
        icon: 'Search','
        category: '测试工具','
        relevance: 1.0
      },
      {
        id: 'api-test','
        title: 'API测试','
        description: 'RESTful API接口测试和验证','
        type: 'page','
        url: '/api-test','
        icon: 'Code','
        category: '测试工具','
        relevance: 1.0
      },
      {
        id: 'compatibility-test','
        title: '兼容性测试','
        description: '跨浏览器和设备兼容性测试','
        type: 'page','
        url: '/compatibility-test','
        icon: 'Monitor','
        category: '测试工具','
        relevance: 1.0
      },
      {
        id: 'analytics','
        title: '分析概览','
        description: '测试数据分析和统计报告','
        type: 'page','
        url: '/analytics','
        icon: 'BarChart3','
        category: '数据中心','
        relevance: 1.0
      },

      {
        id: 'monitoring','
        title: '实时监控','
        description: '7x24小时网站监控和告警','
        type: 'page','
        url: '/monitoring','
        icon: 'Monitor','
        category: '数据管理','
        relevance: 1.0
      },
      {
        id: 'data-import','
        title: '数据导入','
        description: '批量导入测试数据和配置','
        type: 'page','
        url: '/data-import','
        icon: 'Upload','
        category: '数据管理','
        relevance: 0.8
      },
      {
        id: 'data-export','
        title: '数据导出','
        description: '导出测试报告和分析数据','
        type: 'page','
        url: '/data-export','
        icon: 'Download','
        category: '数据管理','
        relevance: 0.8
      },
      {
        id: 'settings','
        title: '系统设置','
        description: '个人偏好、账户设置和系统配置','
        type: 'page','
        url: '/settings','
        icon: 'Settings','
        category: '设置','
        relevance: 0.9
      },
      {
        id: 'help','
        title: '帮助中心','
        description: '使用指南、常见问题和技术支持','
        type: 'page','
        url: '/help','
        icon: 'HelpCircle','
        category: '帮助','
        relevance: 0.9
      },

      {
        id: 'ssl-check','
        title: 'SSL证书检测','
        description: '检查SSL证书有效性和安全配置','
        type: 'test','
        url: '/security-test','
        icon: 'Lock','
        category: '安全测试','
        relevance: 0.8
      },
      {
        id: 'load-test','
        title: '负载测试','
        description: '模拟高并发访问测试网站性能','
        type: 'test','
        url: '/stress-test','
        icon: 'Zap','
        category: '性能测试','
        relevance: 0.8
      },
      {
        id: 'response-time','
        title: '响应时间测试','
        description: '测试网站页面加载速度和响应时间','
        type: 'test','
        url: '/test','
        icon: 'Clock','
        category: '性能测试','
        relevance: 0.8
      },

      // 设置搜索
      {
        id: 'account-settings','
        title: '账户设置','
        description: '修改个人信息、密码和安全设置','
        type: 'setting','
        url: '/settings','
        icon: 'User','
        category: '个人设置','
        relevance: 0.7
      },
      {
        id: 'notification-settings','
        title: '通知设置','
        description: '配置邮件通知和系统提醒','
        type: 'setting','
        url: '/settings','
        icon: 'Bell','
        category: '系统设置','
        relevance: 0.7
      },
      {
        id: 'api-keys','
        title: 'API密钥管理','
        description: '创建和管理API访问密钥','
        type: 'setting','
        url: '/api-keys','
        icon: 'Key','
        category: 'API设置','
        relevance: 0.7
      },

      // 帮助内容搜索
      {
        id: 'quick-start','
        title: '快速开始指南','
        description: '5分钟内完成第一次网站测试','
        type: 'help','
        url: '/help','
        icon: 'Play','
        category: '入门指南','
        relevance: 0.9
      },
      {
        id: 'api-documentation','
        title: 'API文档','
        description: 'RESTful API接口文档和示例','
        type: 'help','
        url: '/help','
        icon: 'Book','
        category: 'API文档','
        relevance: 0.8
      }
    ];

    this.initialized = true;
  }

  // 执行搜索
  async search(query: string, options?: {
    types?: SearchResult['type'][];'
    categories?: string[];
    limit?: number;
  }): Promise<SearchResult[]> {
    await this.initializeSearchIndex();

    if (!query.trim()) {
      return [];
    }

    const normalizedQuery = query.toLowerCase().trim();
    const words = normalizedQuery.split(/\s+/);

    let results = this.searchIndex.filter(item => {
      // 类型过滤
      if (options?.types && !options.types.includes(item.type)) {
        return false;
      }

      // 分类过滤
      if (options?.categories && !options.categories.includes(item.category)) {
        return false;
      }

      // 文本匹配
      const searchText = `${item.title} ${item.description} ${item.category}`.toLowerCase();`

      // 计算匹配度
      let score = 0;

      // 标题完全匹配
      if (item.title.toLowerCase().includes(normalizedQuery)) {
        score += 10;
      }

      // 描述匹配
      if (item.description.toLowerCase().includes(normalizedQuery)) {
        score += 5;
      }

      // 分词匹配
      words.forEach(word => {
        if (searchText.includes(word)) {
          score += 2;
        }
      });

      // 设置匹配分数
      item.relevance = score * item.relevance;

      return score > 0;
    });

    // 按相关性排序
    results.sort((a, b) => b.relevance - a.relevance);

    // 限制结果数量
    if (options?.limit) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  // 获取搜索建议
  async getSuggestions(query: string): Promise<string[]> {
    await this.initializeSearchIndex();

    if (!query.trim()) {
      return ["网站测试', '安全检测', '性能分析', 'API测试', '系统设置'];'`
    }

    const normalizedQuery = query.toLowerCase();
    const suggestions = new Set<string>();

    this.searchIndex.forEach(item => {
      const title = item.title.toLowerCase();
      if (title.includes(normalizedQuery)) {
        suggestions.add(item.title);
      }

      // 添加相关词汇
      if (title.includes('测试')) suggestions.add('测试');'
      if (title.includes('分析')) suggestions.add('分析');'
      if (title.includes('设置')) suggestions.add('设置');'
      if (title.includes('安全')) suggestions.add('安全');'
      if (title.includes('性能')) suggestions.add('性能');'
    });

    return Array.from(suggestions).slice(0, 5);
  }

  // 获取搜索分类
  async getCategories(): Promise<SearchCategory[]> {
    await this.initializeSearchIndex();

    const categoryMap = new Map<string, number>();

    this.searchIndex.forEach(item => {
      categoryMap.set(item.category, (categoryMap.get(item.category) || 0) + 1);
    });

    const categories: SearchCategory[]  = [
      { id: 'all', name: '全部', icon: 'Search', count: this.searchIndex.length },'
      { id: 'navigation', name: '导航', icon: 'Navigation', count: categoryMap.get('导航') || 0 },'
      { id: 'test-tools', name: '测试工具', icon: 'TestTube', count: categoryMap.get('测试工具') || 0 },'
      { id: 'data-center', name: '数据中心', icon: 'Database', count: categoryMap.get('数据中心') || 0 },'
      { id: 'settings', name: '设置', icon: 'Settings', count: categoryMap.get('设置') || 0 },'
      { id: 'help', name: '帮助', icon: 'HelpCircle', count: categoryMap.get('帮助') || 0 }'
    ];
    return categories.filter(cat => cat.count > 0);
  }

  // 记录搜索历史
  recordSearch(query: string): void {
    try {
      const history = this.getSearchHistory();
      const newHistory = [query, ...history.filter(h => h !== query)].slice(0, 10);
      localStorage.setItem('search_history', JSON.stringify(newHistory));'
    } catch (error) {
      console.error('Failed to record search history: ', error);'
    }
  }

  // 获取搜索历史
  getSearchHistory(): string[] {
    try {
      const history = localStorage.getItem('search_history');'
      return history ? JSON.parse(history) : [];
    } catch (error) {
      console.error('Failed to get search history: ', error);'
      return [];
    }
  }

  // 清除搜索历史
  clearSearchHistory(): void {
    try {
      localStorage.removeItem('search_history');'
    } catch (error) {
      console.error('Failed to clear search history:', error);'
    }
  }
}

export const globalSearchService = new GlobalSearchService();
