/**
 * 📊 分析核心服务
 * 统一所有测试结果分析和建议生成功能
 */

interface ScoreWeights {
  performance: {
    coreWebVitals: number;
    pageSpeed: number;
    resources: number;
    caching: number;
  };
  security: {
    ssl: number;
    headers: number;
    vulnerabilities: number;
    cookies: number;
  };
  api: {
    functionality: number;
    performance: number;
    security: number;
    reliability: number;
  };
  seo: {
    content: number;
    technical: number;
    structure: number;
    performance: number;
  };
  accessibility: {
    navigation: number;
    content: number;
    visual: number;
    compatibility: number;
  };
}

interface AnalysisResult {
  id: string;
  testType: string;
  url: string;
  timestamp: Date;
  overallScore: number;
  categoryScores: Record<string, number>;
  issues: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    description: string;
    recommendation: string;
    impact: number;
  }>;
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    expectedImpact: number;
    effort: 'low' | 'medium' | 'high';
    category: string;
  }>;
  metrics: Record<string, unknown>;
  summary: {
    status: 'excellent' | 'good' | 'fair' | 'poor';
    grade: 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'F';
    passRate: number;
    issuesCount: number;
  };
}

interface AnalysisHistory {
  id: string;
  url: string;
  testType: string;
  timestamp: Date;
  score: number;
  grade: string;
  trend: 'improving' | 'declining' | 'stable';
}

class AnalysisCore {
  private name: string;
  private analysisHistory: AnalysisHistory[];
  private scoreWeights: ScoreWeights;

  constructor() {
    this.name = 'analysis-core';
    this.analysisHistory = [];

    // 评分权重配置
    this.scoreWeights = {
      performance: {
        coreWebVitals: 0.4,
        pageSpeed: 0.3,
        resources: 0.2,
        caching: 0.1,
      },
      security: {
        ssl: 0.3,
        headers: 0.25,
        vulnerabilities: 0.3,
        cookies: 0.15,
      },
      api: {
        functionality: 0.4,
        performance: 0.3,
        security: 0.2,
        reliability: 0.1,
      },
      seo: {
        content: 0.3,
        technical: 0.25,
        structure: 0.25,
        performance: 0.2,
      },
      accessibility: {
        navigation: 0.25,
        content: 0.3,
        visual: 0.25,
        compatibility: 0.2,
      },
    };
  }

  /**
   * 分析测试结果
   */
  async analyze(testData: {
    testType: string;
    url: string;
    results: Record<string, unknown>;
    metrics: Record<string, unknown>;
  }): Promise<AnalysisResult> {
    const { testType, url, results, metrics } = testData;
    const analysisId = this.generateId();

    try {
      // 根据测试类型选择分析方法
      let analysis: AnalysisResult;

      switch (testType) {
        case 'performance':
          analysis = await this.analyzePerformance(analysisId, url, results, metrics);
          break;
        case 'security':
          analysis = await this.analyzeSecurity(analysisId, url, results, metrics);
          break;
        case 'seo':
          analysis = await this.analyzeSEO(analysisId, url, results, metrics);
          break;
        case 'accessibility':
          analysis = await this.analyzeAccessibility(analysisId, url, results, metrics);
          break;
        case 'api':
          analysis = await this.analyzeAPI(analysisId, url, results, metrics);
          break;
        default:
          analysis = await this.analyzeGeneric(analysisId, testType, url, results, metrics);
      }

      // 添加到历史记录
      this.addToHistory(analysis);

      return analysis;
    } catch (error) {
      throw new Error(`分析失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 性能分析
   */
  private async analyzePerformance(
    id: string,
    url: string,
    results: Record<string, unknown>,
    metrics: Record<string, unknown>
  ): Promise<AnalysisResult> {
    const issues = [];
    const recommendations = [];
    const categoryScores = {};

    // Core Web Vitals 分析
    const webVitals = metrics.webVitals as Record<string, unknown>;
    if (webVitals) {
      const lcpScore = this.calculateScore(webVitals.lcp as number, [2500, 4000]);
      const fidScore = this.calculateScore(webVitals.fid as number, [100, 300]);
      const clsScore = this.calculateScore(webVitals.cls as number, [0.1, 0.25]);

      categoryScores.coreWebVitals = (lcpScore + fidScore + clsScore) / 3;

      if (lcpScore < 70) {
        issues.push({
          type: 'performance',
          severity: 'high',
          title: 'Largest Contentful Paint 过慢',
          description: `LCP 为 ${webVitals.lcp}ms，超过建议的2.5秒`,
          recommendation: '优化图片加载、减少服务器响应时间、消除渲染阻塞资源',
          impact: 100 - lcpScore,
        });
      }

      if (fidScore < 70) {
        issues.push({
          type: 'performance',
          severity: 'medium',
          title: 'First Input Delay 过长',
          description: `FID 为 ${webVitals.fid}ms，超过建议的100ms`,
          recommendation: '减少JavaScript执行时间、优化主线程工作',
          impact: 100 - fidScore,
        });
      }

      if (clsScore < 70) {
        issues.push({
          type: 'performance',
          severity: 'medium',
          title: 'Cumulative Layout Shift 过高',
          description: `CLS 为 ${webVitals.cls}，超过建议的0.1`,
          recommendation: '为图片和视频设置尺寸属性、避免动态插入内容',
          impact: 100 - clsScore,
        });
      }
    }

    // 资源分析
    const resources = metrics.resources as Record<string, unknown>;
    if (resources) {
      const totalSize = (resources.totalSize as number) || 0;
      const requestCount = (resources.requestCount as number) || 0;

      categoryScores.resources = this.calculateResourceScore(totalSize, requestCount);

      if (totalSize > 3 * 1024 * 1024) {
        // 3MB
        issues.push({
          type: 'performance',
          severity: 'medium',
          title: '页面资源过大',
          description: `总资源大小为 ${(totalSize / 1024 / 1024).toFixed(2)}MB`,
          recommendation: '压缩图片、使用WebP格式、启用Gzip压缩',
          impact: Math.min(50, (totalSize - 3 * 1024 * 1024) / (1024 * 1024)),
        });
      }

      if (requestCount > 100) {
        issues.push({
          type: 'performance',
          severity: 'low',
          title: 'HTTP请求数过多',
          description: `总请求数为 ${requestCount}个`,
          recommendation: '合并CSS/JS文件、使用CSS Sprites、内联关键CSS',
          impact: Math.min(30, (requestCount - 100) / 10),
        });
      }
    }

    // 计算总体分数
    const overallScore = this.calculateOverallScore(categoryScores, this.scoreWeights.performance);

    // 生成建议
    recommendations.push(...this.generateRecommendations(issues, 'performance'));

    return this.buildAnalysisResult(
      id,
      'performance',
      url,
      overallScore,
      categoryScores,
      issues,
      recommendations,
      metrics
    );
  }

  /**
   * 安全分析
   */
  private async analyzeSecurity(
    id: string,
    url: string,
    results: Record<string, unknown>,
    metrics: Record<string, unknown>
  ): Promise<AnalysisResult> {
    const issues = [];
    const recommendations = [];
    const categoryScores = {};

    // SSL/TLS 分析
    const ssl = metrics.ssl as Record<string, unknown>;
    if (ssl) {
      const sslScore = ssl.enabled ? 100 : 0;
      categoryScores.ssl = sslScore;

      if (!ssl.enabled) {
        issues.push({
          type: 'security',
          severity: 'critical',
          title: '未启用HTTPS',
          description: '网站未使用SSL/TLS加密',
          recommendation: '安装SSL证书、配置HTTPS重定向',
          impact: 100,
        });
      }
    }

    // 安全头分析
    const headers = metrics.headers as Record<string, unknown>;
    if (headers) {
      const securityHeaders = [
        'X-Frame-Options',
        'X-Content-Type-Options',
        'X-XSS-Protection',
        'Strict-Transport-Security',
      ];
      const missingHeaders = securityHeaders.filter(
        header => !(headers as Record<string, string>)[header]
      );

      categoryScores.headers =
        ((securityHeaders.length - missingHeaders.length) / securityHeaders.length) * 100;

      if (missingHeaders.length > 0) {
        issues.push({
          type: 'security',
          severity: 'high',
          title: '缺少安全HTTP头',
          description: `缺少安全头: ${missingHeaders.join(', ')}`,
          recommendation: '配置安全HTTP头以防止XSS、点击劫持等攻击',
          impact: missingHeaders.length * 15,
        });
      }
    }

    // 漏洞分析
    const vulnerabilities = metrics.vulnerabilities as Record<string, unknown>;
    if (vulnerabilities) {
      const vulnScore = this.calculateVulnerabilityScore(vulnerabilities);
      categoryScores.vulnerabilities = vulnScore;

      if (vulnerabilities.xss) {
        issues.push({
          type: 'security',
          severity: 'high',
          title: '发现XSS漏洞',
          description: '网站存在跨站脚本攻击漏洞',
          recommendation: '实施输入验证、输出编码、使用CSP策略',
          impact: 80,
        });
      }

      if (vulnerabilities.sqlInjection) {
        issues.push({
          type: 'security',
          severity: 'critical',
          title: '发现SQL注入漏洞',
          description: '网站存在SQL注入攻击漏洞',
          recommendation: '使用参数化查询、输入验证、最小权限原则',
          impact: 100,
        });
      }
    }

    // 计算总体分数
    const overallScore = this.calculateOverallScore(categoryScores, this.scoreWeights.security);

    // 生成建议
    recommendations.push(...this.generateRecommendations(issues, 'security'));

    return this.buildAnalysisResult(
      id,
      'security',
      url,
      overallScore,
      categoryScores,
      issues,
      recommendations,
      metrics
    );
  }

  /**
   * SEO分析
   */
  private async analyzeSEO(
    id: string,
    url: string,
    results: Record<string, unknown>,
    metrics: Record<string, unknown>
  ): Promise<AnalysisResult> {
    const issues = [];
    const recommendations = [];
    const categoryScores = {};

    // 内容分析
    const content = metrics.content as Record<string, unknown>;
    if (content) {
      const titleScore = content.title ? 100 : 0;
      const descriptionScore = content.description ? 100 : 0;
      const h1Score = content.h1 ? 100 : 0;

      categoryScores.content = (titleScore + descriptionScore + h1Score) / 3;

      if (!content.title) {
        issues.push({
          type: 'seo',
          severity: 'high',
          title: '缺少页面标题',
          description: '页面没有设置title标签',
          recommendation: '添加描述性的页面标题，包含主要关键词',
          impact: 50,
        });
      }

      if (!content.description) {
        issues.push({
          type: 'seo',
          severity: 'medium',
          title: '缺少页面描述',
          description: '页面没有设置meta description',
          recommendation: '添加150-160字符的页面描述，包含主要关键词',
          impact: 30,
        });
      }

      if (!content.h1) {
        issues.push({
          type: 'seo',
          severity: 'medium',
          title: '缺少H1标题',
          description: '页面没有H1标题标签',
          recommendation: '添加唯一的H1标题，包含主要关键词',
          impact: 25,
        });
      }
    }

    // 技术SEO分析
    const technical = metrics.technical as Record<string, unknown>;
    if (technical) {
      const canonicalScore = technical.canonical ? 100 : 0;
      const robotsScore = technical.robots ? 100 : 0;
      const sitemapScore = technical.sitemap ? 100 : 0;

      categoryScores.technical = (canonicalScore + robotsScore + sitemapScore) / 3;

      if (!technical.canonical) {
        issues.push({
          type: 'seo',
          severity: 'medium',
          title: '缺少canonical标签',
          description: '页面没有设置canonical URL',
          recommendation: '添加canonical标签防止重复内容问题',
          impact: 20,
        });
      }

      if (!technical.robots) {
        issues.push({
          type: 'seo',
          severity: 'low',
          title: '缺少robots.txt',
          description: '网站没有robots.txt文件',
          recommendation: '创建robots.txt文件控制搜索引擎抓取',
          impact: 15,
        });
      }
    }

    // 计算总体分数
    const overallScore = this.calculateOverallScore(categoryScores, this.scoreWeights.seo);

    // 生成建议
    recommendations.push(...this.generateRecommendations(issues, 'seo'));

    return this.buildAnalysisResult(
      id,
      'seo',
      url,
      overallScore,
      categoryScores,
      issues,
      recommendations,
      metrics
    );
  }

  /**
   * 可访问性分析
   */
  private async analyzeAccessibility(
    id: string,
    url: string,
    results: Record<string, unknown>,
    metrics: Record<string, unknown>
  ): Promise<AnalysisResult> {
    const issues = [];
    const recommendations = [];
    const categoryScores = {};

    // 导航分析
    const navigation = metrics.navigation as Record<string, unknown>;
    if (navigation) {
      const keyboardScore = navigation.keyboard ? 100 : 0;
      const focusScore = navigation.focus ? 100 : 0;

      categoryScores.navigation = (keyboardScore + focusScore) / 2;

      if (!navigation.keyboard) {
        issues.push({
          type: 'accessibility',
          severity: 'high',
          title: '键盘导航不可用',
          description: '网站不支持键盘导航',
          recommendation: '确保所有交互元素都可以通过键盘访问',
          impact: 60,
        });
      }

      if (!navigation.focus) {
        issues.push({
          type: 'accessibility',
          severity: 'medium',
          title: '焦点管理问题',
          description: '网站焦点管理不完善',
          recommendation: '实现正确的焦点顺序和可见焦点指示器',
          impact: 40,
        });
      }
    }

    // 内容分析
    const content = metrics.content as Record<string, unknown>;
    if (content) {
      const altScore = content.altText ? 100 : 0;
      const headingScore = content.headings ? 100 : 0;

      categoryScores.content = (altScore + headingScore) / 2;

      if (!content.altText) {
        issues.push({
          type: 'accessibility',
          severity: 'medium',
          title: '图片缺少alt属性',
          description: `${content.missingAlt || 0}个图片缺少alt属性`,
          recommendation: '为所有有意义的图片添加描述性alt属性',
          impact: 30,
        });
      }

      if (!content.headings) {
        issues.push({
          type: 'accessibility',
          severity: 'medium',
          title: '标题结构问题',
          description: '页面标题结构不正确',
          recommendation: '使用语义化的标题结构(H1-H6)',
          impact: 25,
        });
      }
    }

    // 计算总体分数
    const overallScore = this.calculateOverallScore(
      categoryScores,
      this.scoreWeights.accessibility
    );

    // 生成建议
    recommendations.push(...this.generateRecommendations(issues, 'accessibility'));

    return this.buildAnalysisResult(
      id,
      'accessibility',
      url,
      overallScore,
      categoryScores,
      issues,
      recommendations,
      metrics
    );
  }

  /**
   * API分析
   */
  private async analyzeAPI(
    id: string,
    url: string,
    results: Record<string, unknown>,
    metrics: Record<string, unknown>
  ): Promise<AnalysisResult> {
    const issues = [];
    const recommendations = [];
    const categoryScores = {};

    // 功能性分析
    const functionality = metrics.functionality as Record<string, unknown>;
    if (functionality) {
      const endpointScore = functionality.endpoints ? 100 : 0;
      const methodScore = functionality.methods ? 100 : 0;

      categoryScores.functionality = (endpointScore + methodScore) / 2;

      if (!functionality.endpoints) {
        issues.push({
          type: 'api',
          severity: 'high',
          title: 'API端点缺失',
          description: 'API缺少必要的端点',
          recommendation: '实现完整的RESTful API端点',
          impact: 70,
        });
      }

      if (!functionality.methods) {
        issues.push({
          type: 'api',
          severity: 'medium',
          title: 'HTTP方法不完整',
          description: 'API缺少必要的HTTP方法',
          recommendation: '支持GET、POST、PUT、DELETE等HTTP方法',
          impact: 40,
        });
      }
    }

    // 性能分析
    const performance = metrics.performance as Record<string, unknown>;
    if (performance) {
      const responseTimeScore = this.calculateScore(
        performance.averageResponseTime as number,
        [200, 1000]
      );
      const throughputScore = performance.throughput ? 100 : 0;

      categoryScores.performance = (responseTimeScore + throughputScore) / 2;

      if ((performance.averageResponseTime as number) > 1000) {
        issues.push({
          type: 'api',
          severity: 'medium',
          title: 'API响应时间过慢',
          description: `平均响应时间为${performance.averageResponseTime}ms`,
          recommendation: '优化数据库查询、添加缓存、使用CDN',
          impact: 50,
        });
      }
    }

    // 安全分析
    const security = metrics.security as Record<string, unknown>;
    if (security) {
      const authScore = security.authentication ? 100 : 0;
      const corsScore = security.cors ? 100 : 0;

      categoryScores.security = (authScore + corsScore) / 2;

      if (!security.authentication) {
        issues.push({
          type: 'api',
          severity: 'high',
          title: '缺少身份验证',
          description: 'API缺少身份验证机制',
          recommendation: '实现JWT、OAuth等身份验证机制',
          impact: 80,
        });
      }

      if (!security.cors) {
        issues.push({
          type: 'api',
          severity: 'medium',
          title: '缺少CORS配置',
          description: 'API没有配置CORS',
          recommendation: '配置适当的CORS策略',
          impact: 30,
        });
      }
    }

    // 计算总体分数
    const overallScore = this.calculateOverallScore(categoryScores, this.scoreWeights.api);

    // 生成建议
    recommendations.push(...this.generateRecommendations(issues, 'api'));

    return this.buildAnalysisResult(
      id,
      'api',
      url,
      overallScore,
      categoryScores,
      issues,
      recommendations,
      metrics
    );
  }

  /**
   * 通用分析
   */
  private async analyzeGeneric(
    id: string,
    testType: string,
    url: string,
    results: Record<string, unknown>,
    metrics: Record<string, unknown>
  ): Promise<AnalysisResult> {
    const issues = [];
    const recommendations = [];
    const categoryScores = {};

    // 基础评分
    const score = (metrics.score as number) || 0;
    categoryScores.general = score;

    if (score < 70) {
      issues.push({
        type: 'general',
        severity: 'medium',
        title: '测试分数较低',
        description: `测试分数为${score}分`,
        recommendation: '根据测试结果优化相关方面',
        impact: 100 - score,
      });
    }

    // 生成建议
    recommendations.push(...this.generateRecommendations(issues, 'general'));

    return this.buildAnalysisResult(
      id,
      testType,
      url,
      score,
      categoryScores,
      issues,
      recommendations,
      metrics
    );
  }

  /**
   * 计算分数
   */
  private calculateScore(value: number, thresholds: number[]): number {
    if (value <= thresholds[0]) return 100;
    if (value <= thresholds[1]) {
      return 100 - ((value - thresholds[0]) / (thresholds[1] - thresholds[0])) * 30;
    }
    return Math.max(0, 70 - ((value - thresholds[1]) / thresholds[1]) * 70);
  }

  /**
   * 计算资源分数
   */
  private calculateResourceScore(totalSize: number, requestCount: number): number {
    const sizeScore = this.calculateScore(totalSize, [1024 * 1024, 3 * 1024 * 1024]); // 1MB, 3MB
    const requestScore = this.calculateScore(requestCount, [50, 100]);
    return (sizeScore + requestScore) / 2;
  }

  /**
   * 计算漏洞分数
   */
  private calculateVulnerabilityScore(vulnerabilities: Record<string, unknown>): number {
    const vulnCount = Object.values(vulnerabilities).filter(Boolean).length;
    return Math.max(0, 100 - vulnCount * 25);
  }

  /**
   * 计算总体分数
   */
  private calculateOverallScore(
    categoryScores: Record<string, number>,
    weights: Record<string, Record<string, number>>
  ): number {
    let totalScore = 0;
    let totalWeight = 0;

    for (const [category, score] of Object.entries(categoryScores)) {
      const categoryWeights = weights[category as keyof typeof weights];
      if (categoryWeights) {
        for (const [subCategory, weight] of Object.entries(categoryWeights)) {
          if (subCategory === category) {
            totalScore += score * weight;
            totalWeight += weight;
          }
        }
      }
    }

    return totalWeight > 0 ? totalScore / totalWeight : 0;
  }

  /**
   * 生成建议
   */
  private generateRecommendations(issues: Array<any>, category: string): Array<any> {
    return issues.map(issue => ({
      priority: this.getPriority(issue.severity),
      title: issue.title,
      description: issue.recommendation,
      expectedImpact: issue.impact,
      effort: this.getEffort(issue.type, category),
      category,
    }));
  }

  /**
   * 获取优先级
   */
  private getPriority(severity: string): 'high' | 'medium' | 'low' {
    switch (severity) {
      case 'critical':
      case 'high':
        return 'high';
      case 'medium':
        return 'medium';
      case 'low':
        return 'low';
      default:
        return 'medium';
    }
  }

  /**
   * 获取工作量
   */
  private getEffort(type: string, category: string): 'low' | 'medium' | 'high' {
    // 简单的工作量评估逻辑
    if (type.includes('header') || type.includes('meta')) return 'low';
    if (type.includes('ssl') || type.includes('auth')) return 'high';
    return 'medium';
  }

  /**
   * 构建分析结果
   */
  private buildAnalysisResult(
    id: string,
    testType: string,
    url: string,
    overallScore: number,
    categoryScores: Record<string, number>,
    issues: Array<any>,
    recommendations: Array<any>,
    metrics: Record<string, unknown>
  ): AnalysisResult {
    const status = this.getStatus(overallScore);
    const grade = this.getGrade(overallScore);
    const passRate =
      issues.length === 0
        ? 100
        : ((issues.length -
            issues.filter(i => i.severity === 'critical' || i.severity === 'high').length) /
            issues.length) *
          100;

    return {
      id,
      testType,
      url,
      timestamp: new Date(),
      overallScore,
      categoryScores,
      issues,
      recommendations,
      metrics,
      summary: {
        status,
        grade,
        passRate,
        issuesCount: issues.length,
      },
    };
  }

  /**
   * 获取状态
   */
  private getStatus(score: number): 'excellent' | 'good' | 'fair' | 'poor' {
    if (score >= 90) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 50) return 'fair';
    return 'poor';
  }

  /**
   * 获取等级
   */
  private getGrade(score: number): string {
    if (score >= 97) return 'A+';
    if (score >= 93) return 'A';
    if (score >= 90) return 'A-';
    if (score >= 87) return 'B+';
    if (score >= 83) return 'B';
    if (score >= 80) return 'B-';
    if (score >= 77) return 'C+';
    if (score >= 73) return 'C';
    if (score >= 70) return 'C-';
    if (score >= 67) return 'D+';
    if (score >= 63) return 'D';
    return 'F';
  }

  /**
   * 添加到历史记录
   */
  private addToHistory(analysis: AnalysisResult): void {
    const history: AnalysisHistory = {
      id: analysis.id,
      url: analysis.url,
      testType: analysis.testType,
      timestamp: analysis.timestamp,
      score: analysis.overallScore,
      grade: analysis.summary.grade,
      trend: this.calculateTrend(analysis),
    };

    this.analysisHistory.push(history);

    // 保持历史记录在合理范围内
    if (this.analysisHistory.length > 1000) {
      this.analysisHistory.shift();
    }
  }

  /**
   * 计算趋势
   */
  private calculateTrend(analysis: AnalysisResult): 'improving' | 'declining' | 'stable' {
    const urlHistory = this.analysisHistory
      .filter(h => h.url === analysis.url && h.testType === analysis.testType)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (urlHistory.length < 2) return 'stable';

    const previousScore = urlHistory[0].score;
    const currentScore = analysis.overallScore;

    if (currentScore > previousScore + 5) return 'improving';
    if (currentScore < previousScore - 5) return 'declining';
    return 'stable';
  }

  /**
   * 生成ID
   */
  private generateId(): string {
    return `analysis_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * 获取分析历史
   */
  getHistory(
    options: {
      url?: string;
      testType?: string;
      limit?: number;
    } = {}
  ): AnalysisHistory[] {
    let history = [...this.analysisHistory];

    if (options.url) {
      history = history.filter(h => h.url === options.url);
    }

    if (options.testType) {
      history = history.filter(h => h.testType === options.testType);
    }

    history.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return options.limit ? history.slice(0, options.limit) : history;
  }

  /**
   * 获取统计信息
   */
  getStats() {
    const total = this.analysisHistory.length;
    const byType = this.analysisHistory.reduce(
      (acc, h) => {
        acc[h.testType] = (acc[h.testType] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const averageScore =
      total > 0 ? this.analysisHistory.reduce((sum, h) => sum + h.score, 0) / total : 0;

    const recent = this.analysisHistory
      .filter(h => h.timestamp > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
      .sort((a, b) => b.score - a.score);

    return {
      total,
      byType,
      averageScore,
      recentTop: recent.slice(0, 10),
      trends: this.calculateTrends(),
    };
  }

  /**
   * 计算趋势
   */
  private calculateTrends() {
    const trends = {};

    for (const testType of ['performance', 'security', 'seo', 'accessibility', 'api']) {
      const typeHistory = this.analysisHistory.filter(h => h.testType === testType);
      if (typeHistory.length >= 2) {
        const recent = typeHistory.slice(0, 10);
        const older = typeHistory.slice(10, 20);

        const recentAvg = recent.reduce((sum, h) => sum + h.score, 0) / recent.length;
        const olderAvg = older.reduce((sum, h) => sum + h.score, 0) / older.length;

        trends[testType] = {
          direction: recentAvg > olderAvg ? 'improving' : 'declining',
          change: recentAvg - olderAvg,
          recent: recentAvg,
          older: olderAvg,
        };
      }
    }

    return trends;
  }
}

export default AnalysisCore;
