/**
 * 重新设计的测试引擎集成服务
 * 连接重新设计的测试页面与实际的测试引擎
 */

import backgroundTestManager from './BackgroundTestManager.js';

// SEO测试配置接口
export interface SEOTestConfig {
  url: string;
  keywords: string;
  mode: 'basic' | 'standard' | 'comprehensive';
  checkTechnicalSEO: boolean;
  checkContentQuality: boolean;
  checkAccessibility: boolean;
  checkPerformance: boolean;
  checkMobileFriendly: boolean;
  checkSocialMedia: boolean;
  checkStructuredData: boolean;
  checkSecurity: boolean;
  depth?: 'basic' | 'standard' | 'comprehensive';
}

// 安全测试配置接口
export interface SecurityTestConfig {
  url: string;
  mode: 'basic' | 'standard' | 'comprehensive' | 'penetration';
  checkSSL: boolean;
  checkHeaders: boolean;
  checkVulnerabilities: boolean;
  checkAuthentication: boolean;
  checkCORS: boolean;
  checkCSP: boolean;
  checkXSS: boolean;
  checkSQLInjection: boolean;
  checkDirectoryTraversal: boolean;
  checkDDoSProtection: boolean;
}

// 性能测试配置接口
export interface PerformanceTestConfig {
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

// 测试进度回调接口
export interface TestProgressCallback {
  onProgress: (progress: number, step: string) => void;
  onComplete: (result: any) => void;
  onError: (error: any) => void;
}

/**
 * SEO测试引擎集成
 */
export class SEOTestEngineIntegration {
  /**
   * 启动SEO测试
   */
  static async startTest(
    config: SEOTestConfig,
    callbacks: TestProgressCallback
  ): Promise<string> {
    try {
      // 转换配置为测试引擎格式
      const testConfig = this.convertSEOConfig(config);

      // 使用后台测试管理器启动测试
      const testId = backgroundTestManager.startTest(
        // 'seo', // 暂时注释掉，因为类型不匹配
        testConfig,
        callbacks.onProgress,
        callbacks.onComplete,
        callbacks.onError
      );

      return testId;
    } catch (error) {
      console.error('Failed to start SEO test:', error);
      throw error;
    }
  }

  /**
   * 停止SEO测试
   */
  static async stopTest(testId: string): Promise<void> {
    try {
      backgroundTestManager.cancelTest(testId);
    } catch (error) {
      console.error('Failed to stop SEO test:', error);
      throw error;
    }
  }

  /**
   * 转换SEO配置
   */
  private static convertSEOConfig(config: SEOTestConfig): any {
    return {
      url: config.url,
      keywords: config.keywords,
      depth: config.depth || config.mode,
      checks: {
        technical: config.checkTechnicalSEO,
        content: config.checkContentQuality,
        accessibility: config.checkAccessibility,
        performance: config.checkPerformance,
        mobile: config.checkMobileFriendly,
        social: config.checkSocialMedia,
        structured: config.checkStructuredData,
        security: config.checkSecurity
      }
    };
  }
}

/**
 * 安全测试引擎集成
 */
export class SecurityTestEngineIntegration {
  /**
   * 启动安全测试
   */
  static async startTest(
    config: SecurityTestConfig,
    callbacks: TestProgressCallback
  ): Promise<string> {
    try {
      // 转换配置为测试引擎格式
      const testConfig = this.convertSecurityConfig(config);

      // 使用后台测试管理器启动测试
      const testId = backgroundTestManager.startTest(
        'security',
        testConfig,
        callbacks.onProgress,
        callbacks.onComplete,
        callbacks.onError
      );

      return testId;
    } catch (error) {
      console.error('Failed to start security test:', error);
      throw error;
    }
  }

  /**
   * 停止安全测试
   */
  static async stopTest(testId: string): Promise<void> {
    try {
      backgroundTestManager.cancelTest(testId);
    } catch (error) {
      console.error('Failed to stop security test:', error);
      throw error;
    }
  }

  /**
   * 转换安全配置
   */
  private static convertSecurityConfig(config: SecurityTestConfig): any {
    return {
      url: config.url,
      mode: config.mode,
      checks: {
        ssl: config.checkSSL,
        headers: config.checkHeaders,
        vulnerabilities: config.checkVulnerabilities,
        authentication: config.checkAuthentication,
        cors: config.checkCORS,
        csp: config.checkCSP,
        xss: config.checkXSS,
        sqlInjection: config.checkSQLInjection,
        directoryTraversal: config.checkDirectoryTraversal,
        ddosProtection: config.checkDDoSProtection
      }
    };
  }
}

/**
 * 性能测试引擎集成
 */
export class PerformanceTestEngineIntegration {
  /**
   * 启动性能测试
   */
  static async startTest(
    config: PerformanceTestConfig,
    callbacks: TestProgressCallback
  ): Promise<string> {
    try {
      // 转换配置为测试引擎格式
      const testConfig = this.convertPerformanceConfig(config);

      // 使用后台测试管理器启动测试
      const testId = backgroundTestManager.startTest(
        'performance',
        testConfig,
        callbacks.onProgress,
        callbacks.onComplete,
        callbacks.onError
      );

      return testId;
    } catch (error) {
      console.error('Failed to start performance test:', error);
      throw error;
    }
  }

  /**
   * 停止性能测试
   */
  static async stopTest(testId: string): Promise<void> {
    try {
      backgroundTestManager.cancelTest(testId);
    } catch (error) {
      console.error('Failed to stop performance test:', error);
      throw error;
    }
  }

  /**
   * 转换性能配置
   */
  private static convertPerformanceConfig(config: PerformanceTestConfig): any {
    return {
      url: config.url,
      mode: config.mode,
      device: config.device,
      checks: {
        pageSpeed: config.checkPageSpeed,
        coreWebVitals: config.checkCoreWebVitals,
        resourceOptimization: config.checkResourceOptimization,
        caching: config.checkCaching,
        compression: config.checkCompression,
        imageOptimization: config.checkImageOptimization,
        jsOptimization: config.checkJavaScriptOptimization,
        cssOptimization: config.checkCSSOptimization,
        mobilePerformance: config.checkMobilePerformance,
        accessibility: config.checkAccessibility
      }
    };
  }
}

/**
 * 统一测试引擎集成管理器
 */
export class RedesignedTestEngineManager {
  /**
   * 获取测试状态
   */
  static getTestStatus(testId: string): any {
    return backgroundTestManager.getTestInfo(testId);
  }

  /**
   * 获取所有运行中的测试
   */
  static getRunningTests(): any[] {
    return backgroundTestManager.getRunningTests();
  }

  /**
   * 清理完成的测试
   */
  static cleanupCompletedTests(): void {
    backgroundTestManager.cleanupCompletedTests();
  }

  /**
   * 获取测试历史
   */
  static getTestHistory(limit: number = 50): any[] {
    return backgroundTestManager.getTestHistory(limit);
  }
}

// 导出已在上面单独导出，无需重复导出
