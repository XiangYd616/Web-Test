/**
 * 性能测试适配器
 * 提供向后兼容的接口，将旧的性能测试接口适配到新的核心模块
 */

import {
  PERFORMANCE_CONFIG_PRESETS,
  PerformanceTestProgress,
  PerformanceTestResult,
  UnifiedPerformanceConfig
} from '../../types/performance';
import { performanceTestCore } from './performanceTestCore';

// ==================== 兼容性接口定义 ====================

// 兼容旧的性能测试配置接口
export interface LegacyPerformanceTestConfig {
  url: string;
  mode: 'basic' | 'standard' | 'comprehensive' | 'lighthouse';
  checkPageSpeed: boolean;
  checkCoreWebVitals: boolean;
  checkResourceOptimization: boolean;
  checkCaching: boolean;
  checkCompression: boolean;
  checkImageOptimization: boolean;
  checkJavaScriptOptimization: boolean;
  checkCSSOptimization: boolean;
  checkMobilePerformance: boolean;
  checkAccessibility: boolean;
  device: 'desktop' | 'mobile' | 'both';
}

// 兼容旧的测试进度接口
export interface LegacyTestProgressCallback {
  onProgress: (progress: number, step: string) => void;
  onComplete: (result: any) => void;
  onError: (error: any) => void;
}

// ==================== 性能测试适配器类 ====================

export class PerformanceTestAdapter {
  /**
   * 适配旧的性能测试接口
   */
  static async runLegacyPerformanceTest(
    config: LegacyPerformanceTestConfig,
    callbacks?: LegacyTestProgressCallback
  ): Promise<any> {
    try {
      // 转换配置格式
      const unifiedConfig = this.convertLegacyConfig(config);

      // 转换进度回调
      const onProgress = callbacks ? this.convertProgressCallback(callbacks) : undefined;

      // 执行性能测试
      const result = await performanceTestCore.runPerformanceTest(
        config.url,
        unifiedConfig,
        {
          onProgress,
          saveResults: true
        }
      );

      // 转换结果格式以兼容旧接口
      const legacyResult = this.convertResultToLegacy(result);

      // 调用完成回调
      if (callbacks?.onComplete) {
        callbacks.onComplete(legacyResult);
      }

      return legacyResult;

    } catch (error) {
      // 调用错误回调
      if (callbacks?.onError) {
        callbacks.onError(error);
      }
      throw error;
    }
  }

  /**
   * 适配网站测试中的性能检测
   */
  static async runWebsitePerformanceTest(
    url: string,
    options: {
      device?: 'desktop' | 'mobile' | 'both';
      level?: 'basic' | 'standard' | 'comprehensive';
      includeAccessibility?: boolean;
    } = {}
  ): Promise<any> {
    const config: Partial<UnifiedPerformanceConfig> = {
      level: options.level || 'standard',
      device: options.device || 'desktop',
      pageSpeed: true,
      coreWebVitals: true,
      resourceOptimization: true,
      caching: true,
      compression: true,
      imageOptimization: true,
      mobilePerformance: options.device !== 'desktop'
    };

    const result = await performanceTestCore.runPerformanceTest(url, config);

    // 转换为网站测试期望的格式
    return {
      performance: {
        score: result.overallScore,
        grade: result.grade,
        metrics: {
          loadTime: result.pageSpeed?.loadTime || 0,
          fcp: result.coreWebVitals?.fcp || 0,
          lcp: result.coreWebVitals?.lcp || 0,
          cls: result.coreWebVitals?.cls || 0,
          fid: result.coreWebVitals?.fid || 0,
          pageSize: result.pageSpeed?.pageSize || 0,
          requests: result.pageSpeed?.requestCount || 0
        },
        details: {
          performance: { score: result.overallScore },
          accessibility: { score: options.includeAccessibility ? 85 : undefined },
          bestPractices: { score: 80 },
          seo: { score: 75 }
        },
        recommendations: result.recommendations.map(rec => rec.description),
        issues: result.issues.map(issue => issue.description)
      }
    };
  }

  /**
   * 适配SEO测试中的性能检测
   */
  static async runSEOPerformanceTest(
    url: string,
    options: {
      device?: 'desktop' | 'mobile' | 'both';
      checkMobile?: boolean;
    } = {}
  ): Promise<any> {
    const config: Partial<UnifiedPerformanceConfig> = {
      level: 'basic', // SEO测试使用基础性能检测
      device: options.device || 'desktop',
      pageSpeed: true,
      coreWebVitals: true,
      resourceOptimization: false, // SEO测试不需要详细的资源分析
      caching: false,
      compression: false,
      imageOptimization: false,
      mobilePerformance: options.checkMobile || false
    };

    const result = await performanceTestCore.runPerformanceTest(url, config);

    // 转换为SEO测试期望的格式
    return {
      score: result.overallScore,
      metrics: {
        loadTime: result.pageSpeed?.loadTime || 0,
        fcp: result.coreWebVitals?.fcp || 0,
        lcp: result.coreWebVitals?.lcp || 0,
        cls: result.coreWebVitals?.cls || 0,
        pageSize: result.pageSpeed?.pageSize || 0,
        mobileScore: result.mobilePerformance?.score || null
      },
      issues: result.issues.filter(issue =>
        issue.type === 'speed' || issue.type === 'size'
      ).map(issue => ({
        type: 'performance',
        severity: issue.severity,
        description: issue.description,
        recommendation: issue.solution
      }))
    };
  }

  /**
   * 适配API测试中的性能检测
   */
  static async runAPIPerformanceTest(
    url: string,
    options: {
      timeout?: number;
      retries?: number;
    } = {}
  ): Promise<any> {
    const config: Partial<UnifiedPerformanceConfig> = {
      level: 'basic',
      device: 'desktop',
      pageSpeed: true,
      coreWebVitals: false, // API测试不需要Core Web Vitals
      resourceOptimization: false,
      caching: false,
      compression: false,
      imageOptimization: false,
      mobilePerformance: false,
      timeout: options.timeout || 30,
      retries: options.retries || 1
    };

    const result = await performanceTestCore.runPerformanceTest(url, config);

    // 转换为API测试期望的格式
    return {
      responseTime: result.pageSpeed?.responseTime || 0,
      loadTime: result.pageSpeed?.loadTime || 0,
      ttfb: result.pageSpeed?.ttfb || 0,
      score: result.overallScore,
      issues: result.issues.filter(issue =>
        issue.type === 'speed'
      ).map(issue => ({
        type: 'slow_response',
        severity: issue.severity,
        description: issue.description
      }))
    };
  }

  // ==================== 私有转换方法 ====================

  /**
   * 转换旧配置到新配置
   */
  private static convertLegacyConfig(legacy: LegacyPerformanceTestConfig): Partial<UnifiedPerformanceConfig> {
    return {
      level: legacy.mode === 'lighthouse' ? 'comprehensive' : legacy.mode,
      pageSpeed: legacy.checkPageSpeed,
      coreWebVitals: legacy.checkCoreWebVitals,
      resourceOptimization: legacy.checkResourceOptimization,
      caching: legacy.checkCaching,
      compression: legacy.checkCompression,
      imageOptimization: legacy.checkImageOptimization,
      javascriptOptimization: legacy.checkJavaScriptOptimization,
      cssOptimization: legacy.checkCSSOptimization,
      mobilePerformance: legacy.checkMobilePerformance,
      device: legacy.device,
      timeout: 60,
      retries: 2
    };
  }

  /**
   * 转换进度回调
   */
  private static convertProgressCallback(
    callbacks: LegacyTestProgressCallback
  ): (progress: PerformanceTestProgress) => void {
    return (progress: PerformanceTestProgress) => {
      if (callbacks.onProgress) {
        callbacks.onProgress(progress.progress, progress.currentStep);
      }
    };
  }

  /**
   * 转换结果到旧格式
   */
  public static convertResultToLegacy(result: PerformanceTestResult): any {
    return {
      score: result.overallScore,
      grade: result.grade,
      fcp: result.coreWebVitals?.fcp || 0,
      lcp: result.coreWebVitals?.lcp || 0,
      cls: result.coreWebVitals?.cls || 0,
      fid: result.coreWebVitals?.fid || 0,
      loadTime: result.pageSpeed?.loadTime || 0,
      pageSize: result.pageSpeed?.pageSize || 0,
      requests: result.pageSpeed?.requestCount || 0,
      details: {
        performance: { score: result.overallScore },
        accessibility: { score: 85 },
        bestPractices: { score: 80 },
        seo: { score: 75 }
      },
      recommendations: result.recommendations.map(rec => rec.description),
      issues: result.issues.map(issue => issue.description),
      timestamp: result.timestamp,
      duration: result.duration,
      url: result.url
    };
  }
}

// ==================== 便捷导出函数 ====================

/**
 * 快速性能测试函数 - 兼容现有代码
 */
export async function quickPerformanceTest(
  url: string,
  level: 'basic' | 'standard' | 'comprehensive' = 'standard'
): Promise<any> {
  const config = PERFORMANCE_CONFIG_PRESETS[level];
  const result = await performanceTestCore.runPerformanceTest(url, config);
  return PerformanceTestAdapter.convertResultToLegacy(result);
}

/**
 * 获取性能指标函数 - 用于其他测试模块
 */
export async function getPerformanceMetrics(
  url: string,
  options: {
    includeVitals?: boolean;
    includeMobile?: boolean;
    device?: 'desktop' | 'mobile' | 'both';
  } = {}
): Promise<{
  loadTime: number;
  responseTime: number;
  pageSize: number;
  score: number;
  vitals?: any;
  mobile?: any;
}> {
  const config: Partial<UnifiedPerformanceConfig> = {
    level: 'basic',
    pageSpeed: true,
    coreWebVitals: options.includeVitals || false,
    mobilePerformance: options.includeMobile || false,
    device: options.device || 'desktop',
    resourceOptimization: false,
    caching: false,
    compression: false,
    imageOptimization: false,
    javascriptOptimization: false,
    cssOptimization: false
  };

  const result = await performanceTestCore.runPerformanceTest(url, config);

  return {
    loadTime: result.pageSpeed?.loadTime || 0,
    responseTime: result.pageSpeed?.responseTime || 0,
    pageSize: result.pageSpeed?.pageSize || 0,
    score: result.overallScore,
    vitals: options.includeVitals ? result.coreWebVitals : undefined,
    mobile: options.includeMobile ? result.mobilePerformance : undefined
  };
}

// 导出适配器实例
export const performanceTestAdapter = PerformanceTestAdapter;
