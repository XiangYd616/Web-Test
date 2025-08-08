/**
 * 兼容性测试引擎 - 前端
 * 提供浏览器兼容性、设备兼容性、响应式设计测试功能
 */

export interface CompatibilityTestConfig {
  url: string;
  browsers?: BrowserConfig[];
  devices?: DeviceConfig[];
  viewports?: ViewportConfig[];
  features?: string[];
  includeScreenshots?: boolean;
}

export interface BrowserConfig {
  name: string;
  version: string;
  platform: string;
}

export interface DeviceConfig {
  name: string;
  type: 'desktop' | 'tablet' | 'mobile';
  userAgent: string;
  viewport: {
    width: number;
    height: number;
  };
}

export interface ViewportConfig {
  name: string;
  width: number;
  height: number;
  devicePixelRatio?: number;
}

export interface CompatibilityTestResult {
  url: string;
  overallScore: number;
  browserResults: BrowserTestResult[];
  deviceResults: DeviceTestResult[];
  responsiveResults: ResponsiveTestResult[];
  featureSupport: FeatureSupportResult[];
  issues: CompatibilityIssue[];
  recommendations: CompatibilityRecommendation[];
  timestamp: string;
}

export interface BrowserTestResult {
  browser: BrowserConfig;
  score: number;
  success: boolean;
  loadTime: number;
  errors: string[];
  warnings: string[];
  screenshot?: string;
  features: Record<string, boolean>;
}

export interface DeviceTestResult {
  device: DeviceConfig;
  score: number;
  success: boolean;
  loadTime: number;
  layoutIssues: LayoutIssue[];
  touchIssues: TouchIssue[];
  screenshot?: string;
}

export interface ResponsiveTestResult {
  viewport: ViewportConfig;
  score: number;
  layoutScore: number;
  readabilityScore: number;
  usabilityScore: number;
  issues: ResponsiveIssue[];
  screenshot?: string;
}

export interface FeatureSupportResult {
  feature: string;
  supported: boolean;
  browserSupport: Record<string, boolean>;
  fallbackAvailable: boolean;
  impact: 'low' | 'medium' | 'high';
}

export interface CompatibilityIssue {
  type: string;
  severity: 'low' | 'medium' | 'high';
  browser?: string;
  device?: string;
  viewport?: string;
  message: string;
  element?: string;
  recommendation?: string;
}

export interface LayoutIssue {
  type: string;
  element: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
}

export interface TouchIssue {
  type: string;
  element: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
}

export interface ResponsiveIssue {
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  affectedElements: string[];
}

export interface CompatibilityRecommendation {
  category: string;
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  action: string;
  affectedBrowsers?: string[];
  affectedDevices?: string[];
}

class CompatibilityTestEngine {
  private baseUrl = '/api/compatibility';

  /**
   * 执行兼容性测试
   */
  async runTest(config: CompatibilityTestConfig): Promise<CompatibilityTestResult> {
    try {
      const response = await fetch(`${this.baseUrl}/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || '兼容性测试失败');
      }

      return data.data;
    } catch (error) {
      console.error('兼容性测试失败:', error);
      throw error;
    }
  }

  /**
   * 测试浏览器兼容性
   */
  async testBrowserCompatibility(url: string, browsers: BrowserConfig[]) {
    try {
      const response = await fetch(`${this.baseUrl}/browsers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url, browsers })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || '浏览器兼容性测试失败');
      }

      return data.data;
    } catch (error) {
      console.error('浏览器兼容性测试失败:', error);
      throw error;
    }
  }

  /**
   * 测试设备兼容性
   */
  async testDeviceCompatibility(url: string, devices: DeviceConfig[]) {
    try {
      const response = await fetch(`${this.baseUrl}/devices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url, devices })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || '设备兼容性测试失败');
      }

      return data.data;
    } catch (error) {
      console.error('设备兼容性测试失败:', error);
      throw error;
    }
  }

  /**
   * 测试响应式设计
   */
  async testResponsiveDesign(url: string, viewports: ViewportConfig[]) {
    try {
      const response = await fetch(`${this.baseUrl}/responsive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url, viewports })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || '响应式设计测试失败');
      }

      return data.data;
    } catch (error) {
      console.error('响应式设计测试失败:', error);
      throw error;
    }
  }

  /**
   * 检查功能支持
   */
  async checkFeatureSupport(url: string, features: string[]) {
    try {
      const response = await fetch(`${this.baseUrl}/features`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url, features })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || '功能支持检查失败');
      }

      return data.data;
    } catch (error) {
      console.error('功能支持检查失败:', error);
      throw error;
    }
  }

  /**
   * 获取兼容性历史
   */
  async getHistory(pagination: { page: number; limit: number } = { page: 1, limit: 20 }) {
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString()
      });

      const response = await fetch(`${this.baseUrl}/history?${params}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || '获取兼容性历史失败');
      }

      return data.data;
    } catch (error) {
      console.error('获取兼容性历史失败:', error);
      throw error;
    }
  }

  /**
   * 导出兼容性报告
   */
  async exportReport(testId: string, format: 'json' | 'html' | 'pdf' = 'html'): Promise<string> {
    try {
      const params = new URLSearchParams({ format });
      const response = await fetch(`${this.baseUrl}/${testId}/export?${params}`);

      if (format === 'json') {
        const data = await response.json();
        return data.success ? data.downloadUrl : '';
      } else {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        return url;
      }
    } catch (error) {
      console.error('导出兼容性报告失败:', error);
      throw error;
    }
  }

  /**
   * 验证配置
   */
  validateConfig(config: CompatibilityTestConfig): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.url) {
      errors.push('URL是必需的');
    }

    if (config.url && !this.isValidUrl(config.url)) {
      errors.push('URL格式无效');
    }

    if (config.browsers && config.browsers.length === 0) {
      errors.push('至少需要指定一个浏览器');
    }

    if (config.devices && config.devices.length === 0) {
      errors.push('至少需要指定一个设备');
    }

    if (config.viewports && config.viewports.length === 0) {
      errors.push('至少需要指定一个视口');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 获取默认配置
   */
  getDefaultConfig(): CompatibilityTestConfig {
    return {
      url: '',
      browsers: this.getDefaultBrowsers(),
      devices: this.getDefaultDevices(),
      viewports: this.getDefaultViewports(),
      features: this.getDefaultFeatures(),
      includeScreenshots: true
    };
  }

  /**
   * 获取默认浏览器列表
   */
  getDefaultBrowsers(): BrowserConfig[] {
    return [
      { name: 'Chrome', version: 'latest', platform: 'Windows' },
      { name: 'Firefox', version: 'latest', platform: 'Windows' },
      { name: 'Safari', version: 'latest', platform: 'macOS' },
      { name: 'Edge', version: 'latest', platform: 'Windows' }
    ];
  }

  /**
   * 获取默认设备列表
   */
  getDefaultDevices(): DeviceConfig[] {
    return [
      {
        name: 'iPhone 12',
        type: 'mobile',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        viewport: { width: 390, height: 844 }
      },
      {
        name: 'iPad',
        type: 'tablet',
        userAgent: 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)',
        viewport: { width: 768, height: 1024 }
      },
      {
        name: 'Desktop',
        type: 'desktop',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        viewport: { width: 1920, height: 1080 }
      }
    ];
  }

  /**
   * 获取默认视口列表
   */
  getDefaultViewports(): ViewportConfig[] {
    return [
      { name: 'Mobile', width: 375, height: 667 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Desktop', width: 1200, height: 800 },
      { name: 'Large Desktop', width: 1920, height: 1080 }
    ];
  }

  /**
   * 获取默认功能列表
   */
  getDefaultFeatures(): string[] {
    return [
      'flexbox',
      'grid',
      'css-variables',
      'fetch',
      'promises',
      'arrow-functions',
      'template-literals',
      'destructuring',
      'modules'
    ];
  }

  /**
   * 计算兼容性评分
   */
  calculateCompatibilityScore(result: CompatibilityTestResult): number {
    let totalScore = 0;
    let totalTests = 0;

    // 浏览器兼容性评分
    if (result.browserResults.length > 0) {
      const browserScore = result.browserResults.reduce((sum, br) => sum + br.score, 0) / result.browserResults.length;
      totalScore += browserScore * 0.4;
      totalTests += 0.4;
    }

    // 设备兼容性评分
    if (result.deviceResults.length > 0) {
      const deviceScore = result.deviceResults.reduce((sum, dr) => sum + dr.score, 0) / result.deviceResults.length;
      totalScore += deviceScore * 0.3;
      totalTests += 0.3;
    }

    // 响应式设计评分
    if (result.responsiveResults.length > 0) {
      const responsiveScore = result.responsiveResults.reduce((sum, rr) => sum + rr.score, 0) / result.responsiveResults.length;
      totalScore += responsiveScore * 0.3;
      totalTests += 0.3;
    }

    return totalTests > 0 ? Math.round(totalScore / totalTests) : 0;
  }

  /**
   * 格式化兼容性结果
   */
  formatResults(result: CompatibilityTestResult): string {
    let report = `兼容性测试报告\n`;
    report += `URL: ${result.url}\n`;
    report += `总体评分: ${result.overallScore}/100\n`;
    report += `测试时间: ${new Date(result.timestamp).toLocaleString()}\n\n`;

    // 浏览器兼容性
    if (result.browserResults.length > 0) {
      report += `浏览器兼容性 (${result.browserResults.length}个浏览器):\n`;
      result.browserResults.forEach(br => {
        const status = br.success ? '✓' : '✗';
        report += `${status} ${br.browser.name} ${br.browser.version} - ${br.score}/100 (${br.loadTime}ms)\n`;
        if (br.errors.length > 0) {
          br.errors.forEach(error => {
            report += `  错误: ${error}\n`;
          });
        }
      });
      report += '\n';
    }

    // 设备兼容性
    if (result.deviceResults.length > 0) {
      report += `设备兼容性 (${result.deviceResults.length}个设备):\n`;
      result.deviceResults.forEach(dr => {
        const status = dr.success ? '✓' : '✗';
        report += `${status} ${dr.device.name} - ${dr.score}/100 (${dr.loadTime}ms)\n`;
        if (dr.layoutIssues.length > 0) {
          report += `  布局问题: ${dr.layoutIssues.length}个\n`;
        }
        if (dr.touchIssues.length > 0) {
          report += `  触摸问题: ${dr.touchIssues.length}个\n`;
        }
      });
      report += '\n';
    }

    // 响应式设计
    if (result.responsiveResults.length > 0) {
      report += `响应式设计 (${result.responsiveResults.length}个视口):\n`;
      result.responsiveResults.forEach(rr => {
        report += `${rr.viewport.name} (${rr.viewport.width}x${rr.viewport.height}) - ${rr.score}/100\n`;
        report += `  布局: ${rr.layoutScore}/100, 可读性: ${rr.readabilityScore}/100, 可用性: ${rr.usabilityScore}/100\n`;
      });
      report += '\n';
    }

    // 功能支持
    if (result.featureSupport.length > 0) {
      report += `功能支持:\n`;
      result.featureSupport.forEach(fs => {
        const status = fs.supported ? '✓' : '✗';
        report += `${status} ${fs.feature} (影响: ${fs.impact})\n`;
      });
      report += '\n';
    }

    // 问题和建议
    if (result.issues.length > 0) {
      report += `发现的问题 (${result.issues.length}个):\n`;
      result.issues.forEach((issue, index) => {
        report += `${index + 1}. [${issue.severity.toUpperCase()}] ${issue.message}\n`;
        if (issue.browser) report += `   浏览器: ${issue.browser}\n`;
        if (issue.device) report += `   设备: ${issue.device}\n`;
        if (issue.recommendation) report += `   建议: ${issue.recommendation}\n`;
      });
      report += '\n';
    }

    if (result.recommendations.length > 0) {
      report += `优化建议 (${result.recommendations.length}个):\n`;
      result.recommendations.forEach((rec, index) => {
        report += `${index + 1}. [${rec.priority.toUpperCase()}] ${rec.title}\n`;
        report += `   ${rec.description}\n`;
        report += `   操作: ${rec.action}\n`;
      });
    }

    return report;
  }

  /**
   * 私有辅助方法
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}

export const compatibilityTestEngine = new CompatibilityTestEngine();
export default compatibilityTestEngine;
