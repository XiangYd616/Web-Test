/**
 * seoAnalysisEngine.ts
 * SEO 分析引擎
 */

import { apiClient } from './api/client';

export interface SEOAnalysisResult {
  score: number;
  issues: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    message: string;
    fix?: string;
    impact?: string;
  }>;
  recommendations: string[];
  performance?: {
    loadTime: number;
    firstContentfulPaint: number;
    largestContentfulPaint: number;
  };
  technical?: {
    canonical: boolean;
    robots: boolean;
    sitemap: boolean;
  };
  contentQuality?: {
    score?: number;
    readability?: number;
    keywordDensity?: number;
    headingStructure?: boolean;
    imageOptimization?: number;
    internalLinks?: number;
    externalLinks?: number;
    contentLength?: number;
    titleTag?: string;
    metaDescription?: string;
    headings?: unknown;
    content?: unknown;
    images?: unknown;
    links?: unknown;
  };
  accessibility?: {
    score?: number;
    issues?: string[];
  };
  structuredData?: {
    score?: number;
    present?: boolean;
    types?: string[];
    errors?: string[];
    schemas?: unknown[];
    jsonLd?: unknown;
    microdata?: unknown;
    issues?: string[];
  };
  metadata?: {
    title?: string;
    description?: string;
    keywords?: string[];
    [key: string]: unknown;
  };
  socialMedia?: {
    score?: number;
    ogTags?: unknown;
    twitterCards?: unknown;
    [key: string]: unknown;
  };
}

export class SEOAnalysisEngine {
  private stopped = false;
  private readonly pollInterval = 2000;
  private readonly maxWaitTime = 2 * 60 * 1000;

  async analyzeSEO(
    url: string,
    options?: Record<string, unknown>,
    onProgress?: (progress: number, step: string) => void
  ): Promise<SEOAnalysisResult> {
    this.stopped = false;
    if (onProgress) {
      onProgress(5, '准备SEO分析...');
    }

    const authHeader = this.getAuthHeader();

    const response = await apiClient
      .getInstance()
      .post('/test/seo', { url, ...options }, { headers: authHeader });
    const payload = (response?.data?.data ?? response?.data) as Record<string, unknown>;

    const testId =
      (payload as { testId?: string }).testId ||
      (payload as { test_id?: string }).test_id ||
      (payload as { id?: string }).id;
    const maybeResults =
      (payload as { results?: Record<string, unknown> }).results ||
      (payload as { data?: Record<string, unknown> }).data;
    if (maybeResults) {
      return this.mapSeoResult(maybeResults);
    }

    if (!testId) {
      throw new Error('无法获取SEO测试任务ID');
    }

    if (onProgress) {
      onProgress(20, 'SEO分析已启动，等待结果...');
    }

    const result = await this.pollForResult(testId, onProgress);
    return this.mapSeoResult(result);
  }

  async analyze(url: string): Promise<SEOAnalysisResult> {
    return this.analyzeSEO(url, { depth: 1 });
  }

  async analyzeContent(html: string): Promise<SEOAnalysisResult> {
    const text = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<[^>]+>/g, ' ');
    const words = text.trim().split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    const h1Count = (html.match(/<h1[\s>]/gi) || []).length;
    const h2Count = (html.match(/<h2[\s>]/gi) || []).length;

    const issues: SEOAnalysisResult['issues'] = [];
    const recommendations: string[] = [];
    let score = 100;

    if (wordCount < 150) {
      score -= 30;
      issues.push({
        type: 'content',
        severity: 'high',
        message: '页面内容较少，可能影响SEO表现',
        fix: '补充高质量内容，提升页面信息密度。',
      });
      recommendations.push('增加正文内容至150字以上。');
    }

    if (h1Count !== 1) {
      score -= 15;
      issues.push({
        type: 'headings',
        severity: 'medium',
        message: `H1标签数量为${h1Count}，建议保持唯一`,
        fix: '确保页面只有一个H1用于描述核心主题。',
      });
    }

    if (h2Count === 0) {
      score -= 10;
      issues.push({
        type: 'headings',
        severity: 'low',
        message: '页面缺少H2标题结构',
        fix: '使用H2/H3组织内容层级。',
      });
    }

    score = Math.max(0, Math.min(100, score));

    return {
      score,
      issues,
      recommendations,
      contentQuality: {
        score,
        contentLength: wordCount,
        headingStructure: h1Count === 1 && h2Count > 0,
      },
    };
  }

  stopAnalysis() {
    this.stopped = true;
  }

  private async pollForResult(
    testId: string,
    onProgress?: (progress: number, step: string) => void
  ): Promise<Record<string, unknown>> {
    const startTime = Date.now();

    while (Date.now() - startTime < this.maxWaitTime) {
      if (this.stopped) {
        throw new Error('SEO分析已停止');
      }

      const statusResponse = await apiClient
        .getInstance()
        .get(`/test/${testId}/status`, { headers: this.getAuthHeader() });
      const statusPayload = (statusResponse?.data?.data ?? statusResponse?.data) as {
        status?: string;
        progress?: number;
        message?: string;
        error?: string;
      };

      const status = statusPayload?.status;
      if (onProgress && statusPayload?.progress !== undefined) {
        onProgress(Number(statusPayload.progress), statusPayload.message || 'SEO分析进行中...');
      }

      if (status === 'completed') {
        const resultResponse = await apiClient
          .getInstance()
          .get(`/test/${testId}/result`, { headers: this.getAuthHeader() });
        const resultPayload = (resultResponse?.data?.data ?? resultResponse?.data) as Record<
          string,
          unknown
        >;
        return resultPayload?.results || resultPayload;
      }

      if (status === 'failed' || status === 'cancelled') {
        throw new Error(statusPayload?.error || 'SEO测试未成功完成');
      }

      await new Promise(resolve => setTimeout(resolve, this.pollInterval));
    }

    throw new Error('SEO分析超时，请稍后重试');
  }

  private mapSeoResult(result: Record<string, unknown>): SEOAnalysisResult {
    const checks = (result as { checks?: Record<string, unknown> }).checks || {};
    const summary =
      (result as { summary?: { score?: number; recommendations?: unknown[] } }).summary || {};
    const issues: SEOAnalysisResult['issues'] = [];
    const recommendations: string[] = [];

    Object.entries(checks).forEach(([key, value]) => {
      const check = value as { issues?: string[]; score?: number; status?: string };
      if (check?.issues?.length) {
        check.issues.forEach(issue => {
          issues.push({
            type: key,
            severity:
              check.status === 'failed' ? 'high' : check.status === 'warning' ? 'medium' : 'low',
            message: issue,
          });
        });
      }
    });

    if (summary?.recommendations?.length) {
      recommendations.push(...summary.recommendations.map(item => String(item)));
    }

    return {
      score: summary?.score ?? (result as { score?: number }).score ?? 0,
      issues,
      recommendations,
      technical: {
        canonical: Boolean(checks?.meta?.details?.canonical),
        robots: Boolean(checks?.robots?.details?.exists),
        sitemap: Boolean(checks?.sitemap?.details?.exists),
      },
    };
  }

  private getAuthHeader(): Record<string, string> {
    if (typeof window === 'undefined') return {};
    const token =
      localStorage.getItem('authToken') ||
      sessionStorage.getItem('authToken') ||
      localStorage.getItem('auth_token') ||
      localStorage.getItem('token');

    return token ? { Authorization: `Bearer ${token}` } : {};
  }
}

// 导出实例
export const seoAnalysisEngine = new SEOAnalysisEngine();
