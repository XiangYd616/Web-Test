
import { PERFORMANCE_CONFIG_PRESETS, PerformanceTestProgress, PerformanceTestResult, UnifiedPerformanceConfig } from '../../types/performance.types';
import { PerformanceTestCore } from './performanceTestCore';

const performanceTestCore = new PerformanceTestCore();

// ==================== �����Խӿڶ��� ====================

// ���ݾɵ����ܲ������ýӿ�
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

// ���ݾɵĲ��Խ��Ƚӿ�
export interface LegacyTestProgressCallback {
  onProgress: (progress: number, step: string) => void;
  onComplete: (result: any) => void;
  onError: (error: any) => void;
}

// ==================== ���ܲ����������� ====================

export class PerformanceTestAdapter {
  /**
   * ����ɵ����ܲ��Խӿ�
   */
  static async runLegacyPerformanceTest(
    config: LegacyPerformanceTestConfig,
    callbacks?: LegacyTestProgressCallback
  ): Promise<any> {
    try {
      // ת�����ø�ʽ
      const unifiedConfig = this.convertLegacyConfig(config);

      // ת�����Ȼص�
      const onProgress = callbacks ? this.convertProgressCallback(callbacks) : undefined;

      // ִ�����ܲ���
      const result = await performanceTestCore.runPerformanceTest(
        config.url,
        unifiedConfig,
        {
          onProgress,
          saveResults: true
        }
      );

      // ת�������ʽ�Լ��ݾɽӿ�
      const legacyResult = this.convertResultToLegacy(result);

      // ������ɻص�
      if (callbacks?.onComplete) {
        callbacks?.onComplete(legacyResult);
      }

      return legacyResult;

    } catch (error) {
      // ���ô���ص�
      if (callbacks?.onError) {
        callbacks?.onError(error);
      }
      throw error;
    }
  }

  /**
   * ������վ�����е����ܼ��
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

    // ת��Ϊ��վ���������ĸ�ʽ
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
   * ����SEO�����е����ܼ��
   */
  static async runSEOPerformanceTest(
    url: string,
    options: {
      device?: 'desktop' | 'mobile' | 'both';
      checkMobile?: boolean;
    } = {}
  ): Promise<any> {
    const config: Partial<UnifiedPerformanceConfig> = {
      level: 'basic', // SEO����ʹ�û������ܼ��
      device: options.device || 'desktop',
      pageSpeed: true,
      coreWebVitals: true,
      resourceOptimization: false, // SEO���Բ���Ҫ��ϸ����Դ����
      caching: false,
      compression: false,
      imageOptimization: false,
      mobilePerformance: options.checkMobile || false
    };

    const result = await performanceTestCore.runPerformanceTest(url, config);

    // ת��ΪSEO���������ĸ�ʽ
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
   * ����API�����е����ܼ��
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
      coreWebVitals: false, // API���Բ���ҪCore Web Vitals
      resourceOptimization: false,
      caching: false,
      compression: false,
      imageOptimization: false,
      mobilePerformance: false,
      timeout: options.timeout || 30,
      retries: options.retries || 1
    };

    const result = await performanceTestCore.runPerformanceTest(url, config);

    // ת��ΪAPI���������ĸ�ʽ
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

  // ==================== ˽��ת������ ====================

  /**
   * ת�������õ�������
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
   * ת�����Ȼص�
   */
  private static convertProgressCallback(
    callbacks: LegacyTestProgressCallback
  ): (progress: PerformanceTestProgress) => void {
    return (progress: PerformanceTestProgress) => {
      if (callbacks?.onProgress) {
        callbacks?.onProgress(progress.progress, progress.currentStep);
      }
    };
  }

  /**
   * ת��������ɸ�ʽ
   */
  public static convertResultToLegacy(result: PerformanceTestResult): unknown {
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

// ==================== ��ݵ������� ====================

export async function quickPerformanceTest(
  url: string,
  level: 'basic' | 'standard' | 'comprehensive' = 'standard'
): Promise<any> {
  const config = PERFORMANCE_CONFIG_PRESETS[level];
  const result = await performanceTestCore.runPerformanceTest(url, config);
  return PerformanceTestAdapter.convertResultToLegacy(result);
}

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

// ����������ʵ��
export const _performanceTestAdapter = PerformanceTestAdapter;
