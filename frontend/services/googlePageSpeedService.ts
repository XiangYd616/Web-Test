
export interface PageSpeedMetrics {
  // Core Web Vitals
  lcp: number | null;  // Largest Contentful Paint
  fid: number | null;  // First Input Delay
  cls: number | null;  // Cumulative Layout Shift

  // 其他性能指标
  fcp: number | null;  // First Contentful Paint
  ttfb: number | null; // Time to First Byte
  si: number | null;   // Speed Index

  // 评分
  performanceScore: number | null;

  // 机会和诊断
  opportunities: Array<{
    id: string;
    title: string;
    description: string;
    savings: number;
    impact: 'high' | 'medium' | 'low';
  }>;

  diagnostics: Array<{
    id: string;
    title: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
  }>;
}

export interface PageSpeedResult {
  desktop: PageSpeedMetrics;
  mobile: PageSpeedMetrics;
  url: string;
  timestamp: number;
}

class GooglePageSpeedService {
  private readonly API_KEY = process.env.REACT_APP_GOOGLE_PAGESPEED_API_KEY;
  private readonly BASE_URL = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';

  /**
   * 分析页面性能 (桌面端和移动端)
   */
  async analyzePageSpeed(url: string): Promise<PageSpeedResult> {
    if (!this.API_KEY) {
      // 如果没有API Key，返回模拟数据
      return this.getMockData(url);
    }

    try {
      const [desktopResult, mobileResult] = await Promise.all([
        this.fetchPageSpeedData(url, 'desktop'),
        this.fetchPageSpeedData(url, 'mobile')
      ]);

      return {
        desktop: this.parseMetrics(desktopResult),
        mobile: this.parseMetrics(mobileResult),
        url,
        timestamp: Date.now()
      };
    } catch (error) {
      console.warn('PageSpeed API failed, using mock data:', error);
      return this.getMockData(url);
    }
  }

  /**
   * 获取单个设备类型的PageSpeed数据
   */
  private async fetchPageSpeedData(url: string, strategy: 'desktop' | 'mobile') {
    const params = new URLSearchParams({
      url,
      key: this.API_KEY!,
      strategy,
      category: 'performance',
      locale: 'zh_CN'
    });


    /**

     * if功能函数

     * @param {Object} params - 参数对象

     * @returns {Promise<Object>} 返回结果

     */
    const response = await fetch(`${this.BASE_URL}?${params}`);

    if (!response.ok) {
      throw new Error(`PageSpeed API error: ${response.status}`);
    }

    return response.json();
  }

  /**
   * 解析PageSpeed API响应数据
   */
  private parseMetrics(data: unknown): PageSpeedMetrics {
    const lighthouse = data.lighthouseResult;
    const audits = lighthouse?.audits || {};

    // Core Web Vitals
    const lcp = audits['largest-contentful-paint']?.numericValue || null;
    const fid = audits['max-potential-fid']?.numericValue || null;
    const cls = audits['cumulative-layout-shift']?.numericValue || null;

    // 其他性能指标
    const fcp = audits['first-contentful-paint']?.numericValue || null;
    const ttfb = audits['server-response-time']?.numericValue || null;
    const si = audits['speed-index']?.numericValue || null;

    // 性能评分
    const performanceScore = lighthouse?.categories?.performance?.score
      ? Math.round(lighthouse?.categories.performance?.score * 100)
      : null;

    // 优化机会
    const opportunities = this.parseOpportunities(audits);

    // 诊断信息
    const diagnostics = this.parseDiagnostics(audits);

    return {
      lcp: lcp ? Math.round(lcp) : null,
      fid: fid ? Math.round(fid) : null,
      cls: cls ? Math.round(cls * 1000) / 1000 : null,
      fcp: fcp ? Math.round(fcp) : null,
      ttfb: ttfb ? Math.round(ttfb) : null,
      si: si ? Math.round(si) : null,
      performanceScore,
      opportunities,
      diagnostics
    };
  }

  /**
   * 解析优化机会
   */
  private parseOpportunities(audits: unknown): PageSpeedMetrics['opportunities'] {
    const opportunityKeys = [
      'unused-css-rules',
      'unused-javascript',
      'modern-image-formats',
      'offscreen-images',
      'render-blocking-resources'
    ];

    return opportunityKeys
      .map(key => {
        const audit = audits[key];
        if (!audit || audit.score === 1) return null;

        return {
          id: key,
          title: audit.title,
          description: audit.description,
          savings: audit.details?.overallSavingsMs || 0,
          impact: this.getImpactLevel(audit.details?.overallSavingsMs || 0)
        };
      })
      .filter(Boolean) as PageSpeedMetrics['opportunities'];
  }

  /**
   * 解析诊断信息
   */
  private parseDiagnostics(audits: unknown): PageSpeedMetrics['diagnostics'] {
    const diagnosticKeys = [
      'dom-size',
      'critical-request-chains',
      'mainthread-work-breakdown',
      'bootup-time'
    ];

    return diagnosticKeys
      .map(key => {
        const audit = audits[key];
        if (!audit || audit.score === 1) return null;

        return {
          id: key,
          title: audit.title,
          description: audit.description,
          impact: this.getImpactLevel(audit.numericValue || 0)
        };
      })
      .filter(Boolean) as PageSpeedMetrics['diagnostics'];
  }

  /**
   * 根据数值确定影响级别
   */
  private getImpactLevel(value: number): 'high' | 'medium' | 'low' {
    if (value > 1000) return 'high';
    if (value > 500) return 'medium';
    return 'low';
  }

  /**
   * 生成模拟数据 (当API不可用时)
   */
  private getMockData(url: string): PageSpeedResult {
    const generateMockMetrics = (isMobile: boolean): PageSpeedMetrics => ({
      lcp: 2500 + Math.random() * 2000,
      fid: 100 + Math.random() * 200,
      cls: Math.random() * 0.25,
      fcp: 1800 + Math.random() * 1000,
      ttfb: 200 + Math.random() * 300,
      si: 3000 + Math.random() * 2000,
      performanceScore: Math.round(60 + Math.random() * 30),
      opportunities: [
        {
          id: 'unused-css-rules',
          title: '移除未使用的CSS',
          description: '减少未使用的规则可以减少字节消耗',
          savings: Math.round(500 + Math.random() * 1000),
          impact: 'medium'
        }
      ],
      diagnostics: [
        {
          id: 'dom-size',
          title: 'DOM大小过大',
          description: '考虑减少DOM节点数量',
          impact: 'medium'
        }
      ]
    });

    return {
      desktop: generateMockMetrics(false),
      mobile: generateMockMetrics(true),
      url,
      timestamp: Date.now()
    };
  }

  /**
   * 评估Core Web Vitals等级
   */
  static evaluateWebVitals(metrics: PageSpeedMetrics) {
    const evaluations = {
      lcp: metrics.lcp ? (metrics.lcp <= 2500 ? 'good' : metrics.lcp <= 4000 ? 'needs-improvement' : 'poor') : 'unknown',
      fid: metrics.fid ? (metrics.fid <= 100 ? 'good' : metrics.fid <= 300 ? 'needs-improvement' : 'poor') : 'unknown',
      cls: metrics.cls ? (metrics.cls <= 0.1 ? 'good' : metrics.cls <= 0.25 ? 'needs-improvement' : 'poor') : 'unknown'
    };

    return evaluations;
  }
}

export const _googlePageSpeedService = new GooglePageSpeedService();
