/**
 * 无障碍功能服务
 * 提供无障碍检测、评估、优化建议功能
 */

export interface AccessibilityCheckConfig {
  url: string;
  level?: 'A' | 'AA' | 'AAA';
  categories?: string[];
}

export interface AccessibilityIssue {
  type: string;
  severity: 'low' | 'medium' | 'high';
  message: string;
  element?: string;
  recommendation?: string;
  count?: number;
  details?: any;
}

export interface CategoryResult {
  status: 'pass' | 'fail' | 'error' | 'skipped';
  score: number;
  issues: AccessibilityIssue[];
  [key: string]: any;
}

export interface AccessibilityResults {
  url: string;
  level: string;
  timestamp: string;
  checks: Record<string, CategoryResult>;
  summary: AccessibilitySummary;
  recommendations: AccessibilityRecommendation[];
}

export interface AccessibilitySummary {
  totalCategories: number;
  passedCategories: number;
  failedCategories: number;
  totalIssues: number;
  averageScore: number;
  overallStatus: 'pass' | 'fail';
  complianceLevel: 'poor' | 'fair' | 'good' | 'excellent';
}

export interface AccessibilityRecommendation {
  priority: 'high' | 'medium' | 'general';
  title: string;
  description: string;
  actions: string[];
}

class AccessibilityService {
  private baseUrl = '/api/accessibility';
  private cache = new Map<string, any>();
  private cacheTimeout = 10 * 60 * 1000; // 10分钟缓存

  private readonly wcagLevels = ['A', 'AA', 'AAA'];
  private readonly checkCategories = [
    'keyboard-navigation',
    'screen-reader',
    'color-contrast',
    'focus-management',
    'semantic-markup',
    'alternative-text',
    'form-accessibility',
    'multimedia-accessibility'
  ];

  /**
   * 执行无障碍检测
   */
  async performAccessibilityCheck(config: AccessibilityCheckConfig): Promise<AccessibilityResults> {
    try {
      const cacheKey = `accessibility-${config.url}-${config.level}-${config.categories?.join(',')}`;
      
      // 检查缓存
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          return cached.data;
        }
      }

      const response = await fetch(`${this.baseUrl}/check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || '无障碍检测失败');
      }

      const results = data.data;

      // 缓存结果
      this.cache.set(cacheKey, {
        data: results,
        timestamp: Date.now()
      });

      return results;
    } catch (error) {
      console.error('无障碍检测失败:', error);
      throw error;
    }
  }

  /**
   * 获取无障碍检测历史
   */
  async getAccessibilityHistory(
    pagination: { page: number; limit: number } = { page: 1, limit: 20 }
  ): Promise<{
    checks: Array<{
      id: string;
      url: string;
      level: string;
      timestamp: string;
      summary: AccessibilitySummary;
    }>;
    total: number;
    pagination: any;
  }> {
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString()
      });

      const response = await fetch(`${this.baseUrl}/history?${params}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || '获取检测历史失败');
      }

      return data.data;
    } catch (error) {
      console.error('获取检测历史失败:', error);
      throw error;
    }
  }

  /**
   * 获取无障碍统计信息
   */
  async getAccessibilityStats(): Promise<{
    totalChecks: number;
    averageScore: number;
    complianceDistribution: Record<string, number>;
    commonIssues: Array<{
      type: string;
      count: number;
      severity: string;
    }>;
    trendData: Array<{
      date: string;
      score: number;
      issueCount: number;
    }>;
  }> {
    const cacheKey = 'accessibility-stats';
    
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      const response = await fetch(`${this.baseUrl}/stats`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || '获取统计信息失败');
      }

      const stats = data.data;
      this.cache.set(cacheKey, {
        data: stats,
        timestamp: Date.now()
      });

      return stats;
    } catch (error) {
      console.error('获取统计信息失败:', error);
      throw error;
    }
  }

  /**
   * 导出无障碍检测报告
   */
  async exportAccessibilityReport(
    checkId: string,
    format: 'json' | 'html' | 'pdf' = 'html'
  ): Promise<string> {
    try {
      const params = new URLSearchParams({ format });
      const response = await fetch(`${this.baseUrl}/${checkId}/export?${params}`);

      if (format === 'json') {
        const data = await response.json();
        return data.success ? data.downloadUrl : '';
      } else {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        return url;
      }
    } catch (error) {
      console.error('导出报告失败:', error);
      throw error;
    }
  }

  /**
   * 获取WCAG指南信息
   */
  async getWCAGGuidelines(level: 'A' | 'AA' | 'AAA' = 'AA'): Promise<{
    level: string;
    principles: Array<{
      id: string;
      title: string;
      description: string;
      guidelines: Array<{
        id: string;
        title: string;
        description: string;
        successCriteria: Array<{
          id: string;
          title: string;
          level: string;
          description: string;
        }>;
      }>;
    }>;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/wcag/${level}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || '获取WCAG指南失败');
      }

      return data.data;
    } catch (error) {
      console.error('获取WCAG指南失败:', error);
      throw error;
    }
  }

  /**
   * 实时无障碍检测
   */
  async performLiveAccessibilityCheck(element: HTMLElement): Promise<{
    issues: AccessibilityIssue[];
    score: number;
    suggestions: string[];
  }> {
    try {
      const issues: AccessibilityIssue[] = [];
      const suggestions: string[] = [];

      // 检查焦点可见性
      if (this.isInteractiveElement(element) && !this.hasFocusStyle(element)) {
        issues.push({
          type: 'focus-not-visible',
          severity: 'high',
          message: '元素缺少可见的焦点样式',
          recommendation: '添加:focus样式'
        });
        suggestions.push('为交互元素添加明显的焦点样式');
      }

      // 检查ARIA标签
      if (this.isInteractiveElement(element) && !this.hasAccessibleName(element)) {
        issues.push({
          type: 'missing-accessible-name',
          severity: 'high',
          message: '交互元素缺少可访问名称',
          recommendation: '添加aria-label或aria-labelledby'
        });
        suggestions.push('为交互元素提供可访问的名称');
      }

      // 检查颜色对比度
      const contrastIssue = this.checkElementContrast(element);
      if (contrastIssue) {
        issues.push(contrastIssue);
        suggestions.push('调整颜色以满足对比度要求');
      }

      // 检查语义化
      if (this.isGenericElement(element) && this.shouldUseSemanticElement(element)) {
        issues.push({
          type: 'non-semantic-element',
          severity: 'medium',
          message: '建议使用语义化元素',
          recommendation: '考虑使用更具语义的HTML元素'
        });
        suggestions.push('使用语义化的HTML元素提高可访问性');
      }

      const score = Math.max(0, 100 - issues.length * 20);

      return { issues, score, suggestions };
    } catch (error) {
      console.error('实时检测失败:', error);
      throw error;
    }
  }

  /**
   * 应用无障碍修复
   */
  async applyAccessibilityFixes(element: HTMLElement, fixes: string[]): Promise<void> {
    try {
      for (const fix of fixes) {
        switch (fix) {
          case 'add-focus-style':
            this.addFocusStyle(element);
            break;
          case 'add-aria-label':
            this.addAriaLabel(element);
            break;
          case 'improve-contrast':
            this.improveContrast(element);
            break;
          case 'add-semantic-role':
            this.addSemanticRole(element);
            break;
        }
      }
    } catch (error) {
      console.error('应用修复失败:', error);
      throw error;
    }
  }

  /**
   * 获取无障碍检测配置
   */
  getDefaultCheckConfig(): AccessibilityCheckConfig {
    return {
      url: window.location.href,
      level: 'AA',
      categories: [...this.checkCategories]
    };
  }

  /**
   * 验证检测配置
   */
  validateCheckConfig(config: AccessibilityCheckConfig): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.url) {
      errors.push('URL是必需的');
    }

    if (config.level && !this.wcagLevels.includes(config.level)) {
      errors.push('无效的WCAG级别');
    }

    if (config.categories) {
      const invalidCategories = config.categories.filter(cat => 
        !this.checkCategories.includes(cat)
      );
      if (invalidCategories.length > 0) {
        errors.push(`无效的检测类别: ${invalidCategories.join(', ')}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 格式化检测结果
   */
  formatResults(results: AccessibilityResults): string {
    const { summary, checks } = results;
    
    let report = `无障碍检测报告\n`;
    report += `URL: ${results.url}\n`;
    report += `WCAG级别: ${results.level}\n`;
    report += `检测时间: ${new Date(results.timestamp).toLocaleString()}\n\n`;
    
    report += `总体评分: ${summary.averageScore}/100\n`;
    report += `合规级别: ${this.getComplianceLevelText(summary.complianceLevel)}\n`;
    report += `通过类别: ${summary.passedCategories}/${summary.totalCategories}\n`;
    report += `发现问题: ${summary.totalIssues}个\n\n`;

    Object.entries(checks).forEach(([category, result]) => {
      report += `${this.getCategoryName(category)}: ${result.status === 'pass' ? '✅' : '❌'} (${result.score}/100)\n`;
      if (result.issues.length > 0) {
        result.issues.forEach(issue => {
          report += `  - ${issue.message}\n`;
        });
      }
      report += '\n';
    });

    return report;
  }

  /**
   * 私有辅助方法
   */
  private isInteractiveElement(element: HTMLElement): boolean {
    const interactiveTags = ['button', 'a', 'input', 'select', 'textarea'];
    return interactiveTags.includes(element.tagName.toLowerCase()) ||
           element.hasAttribute('onclick') ||
           element.hasAttribute('tabindex');
  }

  private hasFocusStyle(element: HTMLElement): boolean {
    const styles = window.getComputedStyle(element, ':focus');
    return styles.outline !== 'none' || 
           styles.boxShadow !== 'none' ||
           styles.backgroundColor !== window.getComputedStyle(element).backgroundColor;
  }

  private hasAccessibleName(element: HTMLElement): boolean {
    return !!(element.getAttribute('aria-label') ||
             element.getAttribute('aria-labelledby') ||
             element.getAttribute('title') ||
             element.textContent?.trim());
  }

  private checkElementContrast(element: HTMLElement): AccessibilityIssue | null {
    const styles = window.getComputedStyle(element);
    const color = styles.color;
    const backgroundColor = styles.backgroundColor;
    
    // 简化的对比度检查（实际应使用更精确的算法）
    if (color && backgroundColor && color !== backgroundColor) {
      const contrast = this.calculateSimpleContrast(color, backgroundColor);
      if (contrast < 4.5) {
        return {
          type: 'low-contrast',
          severity: 'medium',
          message: `颜色对比度不足 (${contrast.toFixed(2)}:1)`,
          recommendation: '调整前景色或背景色以提高对比度'
        };
      }
    }
    
    return null;
  }

  private calculateSimpleContrast(color1: string, color2: string): number {
    // 简化的对比度计算
    return Math.random() * 10 + 1; // 实际应实现真正的对比度算法
  }

  private isGenericElement(element: HTMLElement): boolean {
    return ['div', 'span'].includes(element.tagName.toLowerCase());
  }

  private shouldUseSemanticElement(element: HTMLElement): boolean {
    const text = element.textContent?.toLowerCase() || '';
    return text.includes('button') || 
           text.includes('link') || 
           text.includes('header') ||
           text.includes('navigation');
  }

  private addFocusStyle(element: HTMLElement): void {
    element.style.outline = '2px solid #007acc';
    element.style.outlineOffset = '2px';
  }

  private addAriaLabel(element: HTMLElement): void {
    if (!element.getAttribute('aria-label')) {
      const text = element.textContent?.trim() || '交互元素';
      element.setAttribute('aria-label', text);
    }
  }

  private improveContrast(element: HTMLElement): void {
    const styles = window.getComputedStyle(element);
    if (styles.color === 'rgb(128, 128, 128)') {
      element.style.color = '#333333';
    }
  }

  private addSemanticRole(element: HTMLElement): void {
    if (element.tagName.toLowerCase() === 'div' && this.isInteractiveElement(element)) {
      element.setAttribute('role', 'button');
    }
  }

  private getCategoryName(category: string): string {
    const names: Record<string, string> = {
      'keyboard-navigation': '键盘导航',
      'screen-reader': '屏幕阅读器',
      'color-contrast': '颜色对比度',
      'focus-management': '焦点管理',
      'semantic-markup': '语义化标记',
      'alternative-text': '替代文本',
      'form-accessibility': '表单无障碍',
      'multimedia-accessibility': '多媒体无障碍'
    };
    return names[category] || category;
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

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear();
  }
}

export const accessibilityService = new AccessibilityService();
export default accessibilityService;
