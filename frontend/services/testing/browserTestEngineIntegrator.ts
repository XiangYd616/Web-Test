export interface ContentTestConfig     {
  url: string;
  checkSEO: boolean;
  checkPerformance: boolean;
  checkAccessibility: boolean;
  checkContent: boolean;
  includeImages: boolean;
  includeLinks: boolean;
  checkMobile: boolean;
  checkLinks?: boolean;
  checkSecurity?: boolean;
  checkImages?: boolean;
  checkSpeed?: boolean;
  customKeywords?: string[];
  depth?: number;
}

export interface ContentTestResult     {
  seoScore: number;
  performanceScore: number;
  accessibilityScore: number;
  overallScore: number;
  issues: Array<{
    type: 'error' | 'warning' | 'info'
    category: 'seo' | 'performance' | 'accessibility' | 'content'
    message: string;
    impact: 'high' | 'medium' | 'low'
  }>;
  recommendations: Array<{
    category: 'seo' | 'performance' | 'accessibility' | 'content'
    message: string;
    priority: 'high' | 'medium' | 'low'
  }>;
  metrics: {
    pageSize: number;
    loadTime: number;
    imageCount: number;
    linkCount: number;
    headingStructure: boolean;
    metaDescription: boolean;
    altTexts: number;
    totalImages: number;
  };
  timestamp: number;
}

export class BrowserTestEngineIntegrator {
  private async retryRequest(fn: () => Promise<any>, maxRetries: number = 3): Promise<any> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
        
        console.warn(`请求失败，第${attempt}次重试:`, error.message);
    await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
  }
}
  }
  private static instance: BrowserTestEngineIntegrator;

  public static getInstance(): BrowserTestEngineIntegrator {
    if (!BrowserTestEngineIntegrator.instance) {
      BrowserTestEngineIntegrator.instance = new BrowserTestEngineIntegrator();
    }
    return BrowserTestEngineIntegrator.instance;
  }

  public async runContentTest(config: ContentTestConfig): Promise<ContentTestResult> {
    try {
      // 调用真实的内容检测API
      const response = await fetch('/api/content-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json,
        },
        body: JSON.stringify({
          url: config.url,
          checkSEO: config.checkSEO,
          checkPerformance: config.checkPerformance,
          checkAccessibility: config.checkAccessibility,
          checkContent: config.checkContent,
          checkLinks: config.checkLinks,
          checkSecurity: config.checkSecurity,
          checkImages: config.checkImages,
          checkMobile: config.checkMobile,
          checkSpeed: config.checkSpeed,
          customKeywords: config.customKeywords,
          depth: config.depth
        })
      });

      if (!response.ok) {`
        throw new Error(`内容检测服务器响应错误: ${response.status}`);
      }

      const realResult = await response.json();

      // 转换后端结果格式
      const contentTestResult: ContentTestResult  = {
        seoScore: realResult.seoScore || 0,
        performanceScore: realResult.performanceScore || 0,
        accessibilityScore: realResult.accessibilityScore || 0,
        overallScore: realResult.overallScore || 0,
        issues: realResult.issues || [],
        recommendations: realResult.recommendations || [],
        metrics: {
          pageSize: realResult.metrics?.pageSize || 0,
          loadTime: realResult.metrics?.loadTime || 0,
          imageCount: realResult.metrics?.imageCount || 0,
          linkCount: realResult.metrics?.linkCount || 0,
          headingStructure: realResult.metrics?.headingStructure || false,
          metaDescription: realResult.metrics?.metaDescription || false,
          altTexts: realResult.metrics?.altTexts || 0,
          totalImages: realResult.metrics?.totalImages || 0
        },
        timestamp: Date.now()
      };
      return contentTestResult;
    } catch (error) {
      console.error("真实内容检测失败，回退到基础检测:", error");`
      throw new Error(`内容检测失败: ${error instanceof Error ? error.message : "未知错误"}`);
    }
  }

  public async validateURL(url: string): Promise<boolean> {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  public getCapabilities() {
    return {
      seoAnalysis: true,
      performanceAnalysis: true,
      accessibilityAnalysis: true,
      contentAnalysis: true,
      mobileAnalysis: true,
      realTimeAnalysis: typeof fetch !== "undefined";};
  }
}
`