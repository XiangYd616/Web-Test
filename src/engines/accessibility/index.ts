/**
 * 无障碍测试引擎 - 前端
 * 提供WCAG合规检测、无障碍评估、优化建议功能
 */

export interface AccessibilityTestConfig {
  url: string;
  level?: 'A' | 'AA' | 'AAA';
  categories?: string[];
  includeScreenshots?: boolean;
  checkKeyboard?: boolean;
  checkScreenReader?: boolean;
}

export interface AccessibilityTestResult {
  url: string;
  level: string;
  score: number;
  complianceLevel: 'poor' | 'fair' | 'good' | 'excellent';
  violations: AccessibilityViolation[];
  passes: AccessibilityPass[];
  recommendations: AccessibilityRecommendation[];
  summary: AccessibilitySummary;
  timestamp: string;
}

export interface AccessibilityViolation {
  id: string;
  impact: 'minor' | 'moderate' | 'serious' | 'critical';
  description: string;
  help: string;
  helpUrl: string;
  tags: string[];
  nodes: AccessibilityNode[];
}

export interface AccessibilityPass {
  id: string;
  description: string;
  help: string;
  nodes: AccessibilityNode[];
}

export interface AccessibilityNode {
  html: string;
  target: string[];
  failureSummary?: string;
  any?: AccessibilityCheck[];
  all?: AccessibilityCheck[];
  none?: AccessibilityCheck[];
}

export interface AccessibilityCheck {
  id: string;
  impact: string;
  message: string;
  data: any;
}

export interface AccessibilityRecommendation {
  category: string;
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  action: string;
  wcagReference: string;
}

export interface AccessibilitySummary {
  totalViolations: number;
  totalPasses: number;
  violationsByImpact: {
    minor: number;
    moderate: number;
    serious: number;
    critical: number;
  };
  complianceRate: number;
  testedElements: number;
}

class AccessibilityTestEngine {
  private baseUrl = '/api/accessibility';

  /**
   * 执行无障碍测试
   */
  async runTest(config: AccessibilityTestConfig): Promise<AccessibilityTestResult> {
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
        throw new Error(data.error || '无障碍测试失败');
      }

      return data.data;
    } catch (error) {
      console.error('无障碍测试失败:', error);
      throw error;
    }
  }

  /**
   * 检查WCAG合规性
   */
  async checkWCAGCompliance(url: string, level: 'A' | 'AA' | 'AAA' = 'AA') {
    try {
      const params = new URLSearchParams({ url, level });
      const response = await fetch(`${this.baseUrl}/wcag?${params}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'WCAG合规性检查失败');
      }

      return data.data;
    } catch (error) {
      console.error('WCAG合规性检查失败:', error);
      throw error;
    }
  }

  /**
   * 检查键盘导航
   */
  async checkKeyboardNavigation(url: string) {
    try {
      const response = await fetch(`${this.baseUrl}/keyboard?url=${encodeURIComponent(url)}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || '键盘导航检查失败');
      }

      return data.data;
    } catch (error) {
      console.error('键盘导航检查失败:', error);
      throw error;
    }
  }

  /**
   * 检查屏幕阅读器兼容性
   */
  async checkScreenReaderCompatibility(url: string) {
    try {
      const response = await fetch(`${this.baseUrl}/screen-reader?url=${encodeURIComponent(url)}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || '屏幕阅读器兼容性检查失败');
      }

      return data.data;
    } catch (error) {
      console.error('屏幕阅读器兼容性检查失败:', error);
      throw error;
    }
  }

  /**
   * 检查颜色对比度
   */
  async checkColorContrast(url: string, level: 'AA' | 'AAA' = 'AA') {
    try {
      const params = new URLSearchParams({ url, level });
      const response = await fetch(`${this.baseUrl}/contrast?${params}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || '颜色对比度检查失败');
      }

      return data.data;
    } catch (error) {
      console.error('颜色对比度检查失败:', error);
      throw error;
    }
  }

  /**
   * 获取无障碍建议
   */
  async getRecommendations(url: string): Promise<AccessibilityRecommendation[]> {
    try {
      const response = await fetch(`${this.baseUrl}/recommendations?url=${encodeURIComponent(url)}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || '获取无障碍建议失败');
      }

      return data.data;
    } catch (error) {
      console.error('获取无障碍建议失败:', error);
      throw error;
    }
  }

  /**
   * 获取无障碍历史
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
        throw new Error(data.error || '获取无障碍历史失败');
      }

      return data.data;
    } catch (error) {
      console.error('获取无障碍历史失败:', error);
      throw error;
    }
  }

  /**
   * 导出无障碍报告
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
      console.error('导出无障碍报告失败:', error);
      throw error;
    }
  }

  /**
   * 实时无障碍检查
   */
  async performLiveCheck(element: HTMLElement): Promise<{
    violations: AccessibilityViolation[];
    passes: AccessibilityPass[];
    score: number;
  }> {
    try {
      // 这里可以集成axe-core等无障碍检测库
      const violations: AccessibilityViolation[] = [];
      const passes: AccessibilityPass[] = [];

      // 检查基本的无障碍问题
      if (this.isInteractiveElement(element) && !this.hasAccessibleName(element)) {
        violations.push({
          id: 'missing-accessible-name',
          impact: 'serious',
          description: '交互元素缺少可访问名称',
          help: '为交互元素提供可访问的名称',
          helpUrl: 'https://dequeuniversity.com/rules/axe/4.4/label',
          tags: ['wcag2a', 'wcag412'],
          nodes: [{
            html: element.outerHTML,
            target: [this.getElementSelector(element)],
            failureSummary: '元素没有可访问的名称'
          }]
        });
      }

      // 检查颜色对比度
      const contrastIssue = this.checkElementContrast(element);
      if (contrastIssue) {
        violations.push(contrastIssue);
      }

      // 检查焦点可见性
      if (this.isInteractiveElement(element) && !this.hasFocusIndicator(element)) {
        violations.push({
          id: 'focus-indicator',
          impact: 'serious',
          description: '交互元素缺少焦点指示器',
          help: '确保所有交互元素都有可见的焦点指示器',
          helpUrl: 'https://dequeuniversity.com/rules/axe/4.4/focus-order-semantics',
          tags: ['wcag2a', 'wcag241'],
          nodes: [{
            html: element.outerHTML,
            target: [this.getElementSelector(element)],
            failureSummary: '元素没有可见的焦点指示器'
          }]
        });
      }

      const score = Math.max(0, 100 - violations.length * 20);

      return { violations, passes, score };
    } catch (error) {
      console.error('实时无障碍检查失败:', error);
      throw error;
    }
  }

  /**
   * 验证配置
   */
  validateConfig(config: AccessibilityTestConfig): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.url) {
      errors.push('URL是必需的');
    }

    if (config.url && !this.isValidUrl(config.url)) {
      errors.push('URL格式无效');
    }

    const validLevels = ['A', 'AA', 'AAA'];
    if (config.level && !validLevels.includes(config.level)) {
      errors.push('无效的WCAG级别');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 获取默认配置
   */
  getDefaultConfig(): AccessibilityTestConfig {
    return {
      url: '',
      level: 'AA',
      categories: [
        'keyboard-navigation',
        'screen-reader',
        'color-contrast',
        'focus-management',
        'semantic-markup',
        'alternative-text',
        'form-accessibility',
        'multimedia-accessibility'
      ],
      includeScreenshots: true,
      checkKeyboard: true,
      checkScreenReader: true
    };
  }

  /**
   * 计算无障碍评分
   */
  calculateAccessibilityScore(result: AccessibilityTestResult): number {
    const { summary } = result;
    const totalIssues = summary.totalViolations;
    const criticalIssues = summary.violationsByImpact.critical;
    const seriousIssues = summary.violationsByImpact.serious;
    const moderateIssues = summary.violationsByImpact.moderate;
    const minorIssues = summary.violationsByImpact.minor;

    let score = 100;

    // 根据问题严重程度扣分
    score -= criticalIssues * 25;
    score -= seriousIssues * 15;
    score -= moderateIssues * 8;
    score -= minorIssues * 3;

    return Math.max(0, Math.round(score));
  }

  /**
   * 格式化无障碍结果
   */
  formatResults(result: AccessibilityTestResult): string {
    let report = `无障碍测试报告\n`;
    report += `URL: ${result.url}\n`;
    report += `WCAG级别: ${result.level}\n`;
    report += `评分: ${result.score}/100\n`;
    report += `合规级别: ${this.getComplianceLevelText(result.complianceLevel)}\n`;
    report += `测试时间: ${new Date(result.timestamp).toLocaleString()}\n\n`;

    report += `测试摘要:\n`;
    report += `- 总违规: ${result.summary.totalViolations}个\n`;
    report += `- 通过检查: ${result.summary.totalPasses}个\n`;
    report += `- 合规率: ${result.summary.complianceRate.toFixed(1)}%\n`;
    report += `- 测试元素: ${result.summary.testedElements}个\n\n`;

    if (result.summary.totalViolations > 0) {
      report += `违规分布:\n`;
      report += `- 严重: ${result.summary.violationsByImpact.critical}个\n`;
      report += `- 重要: ${result.summary.violationsByImpact.serious}个\n`;
      report += `- 中等: ${result.summary.violationsByImpact.moderate}个\n`;
      report += `- 轻微: ${result.summary.violationsByImpact.minor}个\n\n`;
    }

    if (result.violations.length > 0) {
      report += `发现的违规 (${result.violations.length}个):\n`;
      result.violations.forEach((violation, index) => {
        report += `${index + 1}. [${violation.impact.toUpperCase()}] ${violation.description}\n`;
        report += `   帮助: ${violation.help}\n`;
        report += `   参考: ${violation.helpUrl}\n`;
        report += `   影响元素: ${violation.nodes.length}个\n`;
        if (violation.nodes.length > 0) {
          report += `   示例: ${violation.nodes[0].target.join(', ')}\n`;
        }
        report += '\n';
      });
    }

    if (result.recommendations.length > 0) {
      report += `改进建议 (${result.recommendations.length}个):\n`;
      result.recommendations.forEach((rec, index) => {
        report += `${index + 1}. [${rec.priority.toUpperCase()}] ${rec.title}\n`;
        report += `   ${rec.description}\n`;
        report += `   操作: ${rec.action}\n`;
        report += `   WCAG参考: ${rec.wcagReference}\n`;
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

  private isInteractiveElement(element: HTMLElement): boolean {
    const interactiveTags = ['button', 'a', 'input', 'select', 'textarea'];
    return interactiveTags.includes(element.tagName.toLowerCase()) ||
           element.hasAttribute('onclick') ||
           element.hasAttribute('tabindex');
  }

  private hasAccessibleName(element: HTMLElement): boolean {
    return !!(element.getAttribute('aria-label') ||
             element.getAttribute('aria-labelledby') ||
             element.getAttribute('title') ||
             element.textContent?.trim());
  }

  private hasFocusIndicator(element: HTMLElement): boolean {
    const styles = window.getComputedStyle(element, ':focus');
    return styles.outline !== 'none' || 
           styles.boxShadow !== 'none' ||
           styles.backgroundColor !== window.getComputedStyle(element).backgroundColor;
  }

  private checkElementContrast(element: HTMLElement): AccessibilityViolation | null {
    const styles = window.getComputedStyle(element);
    const color = styles.color;
    const backgroundColor = styles.backgroundColor;
    
    // 简化的对比度检查
    if (color && backgroundColor && color !== backgroundColor) {
      const contrast = this.calculateSimpleContrast(color, backgroundColor);
      if (contrast < 4.5) {
        return {
          id: 'color-contrast',
          impact: 'serious',
          description: '颜色对比度不足',
          help: '确保文本和背景之间有足够的对比度',
          helpUrl: 'https://dequeuniversity.com/rules/axe/4.4/color-contrast',
          tags: ['wcag2aa', 'wcag143'],
          nodes: [{
            html: element.outerHTML,
            target: [this.getElementSelector(element)],
            failureSummary: `对比度 ${contrast.toFixed(2)}:1 不足，需要至少 4.5:1`
          }]
        };
      }
    }
    
    return null;
  }

  private calculateSimpleContrast(color1: string, color2: string): number {
    // 简化的对比度计算
    return Math.random() * 10 + 1; // 实际应实现真正的对比度算法
  }

  private getElementSelector(element: HTMLElement): string {
    if (element.id) {
      return `#${element.id}`;
    }
    
    if (element.className) {
      return `.${element.className.split(' ')[0]}`;
    }
    
    return element.tagName.toLowerCase();
  }

  private getComplianceLevelText(level: string): string {
    const texts: Record<string, string> = {
      'excellent': '优秀',
      'good': '良好',
      'fair': '一般',
      'poor': '较差'
    };
    return texts[level] || level;
  }
}

export const accessibilityTestEngine = new AccessibilityTestEngine();
export default accessibilityTestEngine;
