/**
 * Mobile SEO Detection Utility
 * Comprehensive mobile SEO checker for validating mobile optimization
 */

export interface MobileViewportResult {
  hasViewport: boolean;
  content: string;
  issues: string[];
  isOptimal: boolean;
  recommendations: string[];
}

export interface ResponsiveDesignResult {
  score: number;
  hasMediaQueries: boolean;
  flexboxUsage: boolean;
  gridUsage: boolean;
  issues: string[];
  recommendations: string[];
}

export interface TouchTargetResult {
  totalElements: number;
  appropriateSize: number;
  tooSmall: number;
  minTouchTargetSize: number;
  issues: Array<{
    element: string;
    size: { width: number; height: number };
    recommendation: string;
  }>;
}

export interface MobileFontResult {
  score: number;
  readableText: boolean;
  minFontSize: number;
  averageFontSize: number;
  issues: string[];
  recommendations: string[];
}

export interface MobilePerformanceResult {
  score: number;
  imageOptimization: {
    total: number;
    optimized: number;
    issues: string[];
  };
  resourceLoading: {
    totalRequests: number;
    criticalResources: number;
    issues: string[];
  };
  recommendations: string[];
}

export interface MobileSeoAnalysisResult {
  overallScore: number;
  viewport: MobileViewportResult;
  responsive: ResponsiveDesignResult;
  touchTargets: TouchTargetResult;
  fonts: MobileFontResult;
  performance: MobilePerformanceResult;
  coreWebVitals?: {
    lcp: number;
    fid: number;
    cls: number;
    assessment: 'good' | 'needs-improvement' | 'poor';
  };
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low';
    category: string;
    message: string;
    action: string;
  }>;
}

export class MobileSeoDetector {
  private document: Document;
  private cssRules: CSSStyleSheet[] = [];

  constructor(document: Document) {
    this.document = document;
    this.initializeCSSRules();
  }

  /**
   * 执行完整的移动SEO分析
   */
  async analyzeMobileSEO(options: {
    includePerformance?: boolean;
    includeCoreWebVitals?: boolean;
    simulateMobileDevice?: boolean;
  } = {}): Promise<MobileSeoAnalysisResult> {
    const viewport = this.analyzeViewport();
    const responsive = this.analyzeResponsiveDesign();
    const touchTargets = this.analyzeTouchTargets();
    const fonts = this.analyzeFonts();
    const performance = options.includePerformance 
      ? this.analyzeMobilePerformance() 
      : this.getDefaultPerformanceResult();

    let coreWebVitals;
    if (options.includeCoreWebVitals) {
      coreWebVitals = await this.analyzeCoreWebVitals();
    }

    const overallScore = this.calculateOverallScore({
      viewport,
      responsive,
      touchTargets,
      fonts,
      performance
    });

    const recommendations = this.generateRecommendations({
      viewport,
      responsive,
      touchTargets,
      fonts,
      performance,
      coreWebVitals
    });

    return {
      overallScore,
      viewport,
      responsive,
      touchTargets,
      fonts,
      performance,
      coreWebVitals,
      recommendations
    };
  }

  /**
   * 分析Viewport标签
   */
  private analyzeViewport(): MobileViewportResult {
    const viewportMeta = this.document.querySelector('meta[name="viewport"]') as HTMLMetaElement;
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    if (!viewportMeta) {
      return {
        hasViewport: false,
        content: '',
        issues: ['缺少viewport meta标签'],
        isOptimal: false,
        recommendations: ['添加viewport meta标签: <meta name="viewport" content="width=device-width, initial-scale=1.0">']
      };
    }

    const content = viewportMeta.content;
    const hasDeviceWidth = /width=device-width/i.test(content);
    const hasInitialScale = /initial-scale=1(\.0)?/i.test(content);
    const hasUserScalable = /user-scalable=no/i.test(content);

    if (!hasDeviceWidth) {
      issues.push('viewport未设置width=device-width');
      recommendations.push('设置width=device-width以适应移动设备屏幕');
    }

    if (!hasInitialScale) {
      issues.push('viewport未设置initial-scale=1.0');
      recommendations.push('设置initial-scale=1.0以确保正常缩放级别');
    }

    if (hasUserScalable) {
      issues.push('禁用了用户缩放，可能影响可访问性');
      recommendations.push('允许用户缩放以提升可访问性');
    }

    const isOptimal = hasDeviceWidth && hasInitialScale && !hasUserScalable;

    return {
      hasViewport: true,
      content,
      issues,
      isOptimal,
      recommendations
    };
  }

  /**
   * 分析响应式设计
   */
  private analyzeResponsiveDesign(): ResponsiveDesignResult {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let score = 100;

    // 检查媒体查询
    const hasMediaQueries = this.hasMediaQueries();
    if (!hasMediaQueries) {
      issues.push('未检测到CSS媒体查询');
      recommendations.push('添加响应式媒体查询以适应不同屏幕尺寸');
      score -= 30;
    }

    // 检查现代布局技术
    const flexboxUsage = this.hasFlexboxUsage();
    const gridUsage = this.hasGridUsage();

    if (!flexboxUsage && !gridUsage) {
      issues.push('未使用现代布局技术（Flexbox或Grid）');
      recommendations.push('考虑使用Flexbox或CSS Grid实现更好的响应式布局');
      score -= 20;
    }

    // 检查固定宽度元素
    const fixedWidthElements = this.findFixedWidthElements();
    if (fixedWidthElements.length > 0) {
      issues.push(`发现${fixedWidthElements.length}个固定宽度元素可能影响移动体验`);
      recommendations.push('使用相对单位(%、vw等)替代固定像素宽度');
      score -= 15;
    }

    return {
      score: Math.max(0, score),
      hasMediaQueries,
      flexboxUsage,
      gridUsage,
      issues,
      recommendations
    };
  }

  /**
   * 分析触摸目标
   */
  private analyzeTouchTargets(): TouchTargetResult {
    const interactiveElements = this.document.querySelectorAll(
      'a, button, input, select, textarea, [onclick], [role="button"]'
    );

    const issues: TouchTargetResult['issues'] = [];
    let appropriateSize = 0;
    let tooSmall = 0;
    const minTouchTargetSize = 44; // iOS推荐的最小触摸目标尺寸

    interactiveElements.forEach((element) => {
      const rect = this.getElementDimensions(element as HTMLElement);
      const minDimension = Math.min(rect.width, rect.height);

      if (minDimension >= minTouchTargetSize) {
        appropriateSize++;
      } else {
        tooSmall++;
        issues.push({
          element: this.getElementSelector(element as HTMLElement),
          size: rect,
          recommendation: `增加元素尺寸至至少${minTouchTargetSize}px×${minTouchTargetSize}px`
        });
      }
    });

    return {
      totalElements: interactiveElements.length,
      appropriateSize,
      tooSmall,
      minTouchTargetSize,
      issues
    };
  }

  /**
   * 分析字体和文本可读性
   */
  private analyzeFonts(): MobileFontResult {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let score = 100;

    const textElements = this.document.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6, li');
    let totalFontSize = 0;
    let readableElements = 0;
    let tooSmallElements = 0;
    const minReadableFontSize = 16; // 移动设备推荐的最小字体大小

    textElements.forEach((element) => {
      const fontSize = this.getComputedFontSize(element as HTMLElement);
      totalFontSize += fontSize;

      if (fontSize >= minReadableFontSize) {
        readableElements++;
      } else {
        tooSmallElements++;
      }
    });

    const averageFontSize = textElements.length > 0 ? totalFontSize / textElements.length : 0;
    const readablePercentage = textElements.length > 0 ? (readableElements / textElements.length) * 100 : 0;

    if (readablePercentage < 80) {
      issues.push(`${tooSmallElements}个文本元素字体过小（小于${minReadableFontSize}px）`);
      recommendations.push(`确保主要文本字体大小至少为${minReadableFontSize}px`);
      score -= 30;
    }

    if (averageFontSize < minReadableFontSize) {
      issues.push('平均字体大小偏小，可能影响移动设备阅读体验');
      recommendations.push('提高整体字体大小以改善移动阅读体验');
      score -= 20;
    }

    // 检查行高
    const elementsWithPoorLineHeight = this.findElementsWithPoorLineHeight();
    if (elementsWithPoorLineHeight.length > 0) {
      issues.push(`${elementsWithPoorLineHeight.length}个元素行高可能过小`);
      recommendations.push('设置适当的行高（建议1.4-1.6）以提升可读性');
      score -= 10;
    }

    return {
      score: Math.max(0, score),
      readableText: readablePercentage >= 80,
      minFontSize: minReadableFontSize,
      averageFontSize: Math.round(averageFontSize),
      issues,
      recommendations
    };
  }

  /**
   * 分析移动性能
   */
  private analyzeMobilePerformance(): MobilePerformanceResult {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let score = 100;

    // 图片优化分析
    const images = this.document.querySelectorAll('img');
    let optimizedImages = 0;
    const imageIssues: string[] = [];

    images.forEach((img) => {
      const hasAlt = img.hasAttribute('alt');
      const hasLazyLoading = img.hasAttribute('loading') && img.getAttribute('loading') === 'lazy';
      const hasSrcset = img.hasAttribute('srcset');
      const _hasWebPSupport = this.checkWebPSupport(img);

      let imageOptimized = true;

      if (!hasAlt) {
        imageIssues.push('图片缺少alt属性');
        imageOptimized = false;
      }

      if (!hasLazyLoading && this.isImageBelowFold(img)) {
        imageIssues.push('建议为折叠下方的图片添加懒加载');
        imageOptimized = false;
      }

      if (!hasSrcset) {
        imageIssues.push('建议使用srcset提供响应式图片');
        imageOptimized = false;
      }

      if (imageOptimized) optimizedImages++;
    });

    const imageOptimizationRatio = images.length > 0 ? optimizedImages / images.length : 1;
    if (imageOptimizationRatio < 0.8) {
      score -= 25;
      recommendations.push('优化图片加载：添加懒加载、使用现代图片格式、提供多尺寸版本');
    }

    // 资源加载分析
    const criticalResources = this.identifyCriticalResources();
    const totalResources = this.countTotalResources();

    if (totalResources > 50) {
      issues.push('资源请求数量过多，可能影响移动网络加载性能');
      recommendations.push('合并CSS和JavaScript文件，使用HTTP/2推送，考虑资源预加载');
      score -= 15;
    }

    return {
      score: Math.max(0, score),
      imageOptimization: {
        total: images.length,
        optimized: optimizedImages,
        issues: imageIssues
      },
      resourceLoading: {
        totalRequests: totalResources,
        criticalResources: criticalResources.length,
        issues
      },
      recommendations
    };
  }

  /**
   * 分析Core Web Vitals（移动端）
   */
  private async analyzeCoreWebVitals(): Promise<MobileSEOAnalysisResult['coreWebVitals']> {
    // 这里应该集成真实的Core Web Vitals测量
    // 目前返回模拟数据，实际应用中需要使用web-vitals库或类似工具
    
    const lcp = await this.measureLCP();
    const fid = await this.measureFID();
    const cls = await this.measureCLS();

    // Google的移动端Core Web Vitals阈值
    const lcpThreshold = { good: 2500, poor: 4000 };
    const fidThreshold = { good: 100, poor: 300 };
    const clsThreshold = { good: 0.1, poor: 0.25 };

    const lcpRating = lcp <= lcpThreshold.good ? 'good' : 
                     lcp <= lcpThreshold.poor ? 'needs-improvement' : 'poor';
    
    const fidRating = fid <= fidThreshold.good ? 'good' : 
                     fid <= fidThreshold.poor ? 'needs-improvement' : 'poor';
    
    const clsRating = cls <= clsThreshold.good ? 'good' : 
                     cls <= clsThreshold.poor ? 'needs-improvement' : 'poor';

    const overallRating = [lcpRating, fidRating, clsRating].every(rating => rating === 'good') 
      ? 'good' 
      : [lcpRating, fidRating, clsRating].some(rating => rating === 'poor') 
        ? 'poor' 
        : 'needs-improvement';

    return {
      lcp,
      fid,
      cls,
      assessment: overallRating
    };
  }

  // 辅助方法
  private initializeCSSRules(): void {
    try {
      for (let i = 0; i < this.document.styleSheets.length; i++) {
        const styleSheet = this.document.styleSheets[i];
        try {
          // 只处理同源的样式表，避免CORS问题
          if (styleSheet.cssRules) {
            this.cssRules.push(styleSheet as CSSStyleSheet);
          }
        } catch (e) {
          // 跨源样式表，跳过
        }
      }
    } catch (error) {
      console.warn('无法访问CSS规则:', error);
    }
  }

  private hasMediaQueries(): boolean {
    const styleTags = this.document.querySelectorAll('style');
    const linkTags = this.document.querySelectorAll('link[rel="stylesheet"]');

    // 检查内联样式中的媒体查询
    for (const style of styleTags) {
      if (style.textContent && /@media/i.test(style.textContent)) {
        return true;
      }
    }

    // 检查link标签的media属性
    for (const link of linkTags) {
      if (link.getAttribute('media') && link.getAttribute('media') !== 'all') {
        return true;
      }
    }

    // 检查CSS规则中的媒体查询
    for (const styleSheet of this.cssRules) {
      try {
        for (let i = 0; i < styleSheet.cssRules.length; i++) {
          const rule = styleSheet.cssRules[i];
          if (rule.type === CSSRule.MEDIA_RULE) {
            return true;
          }
        }
      } catch (e) {
        // 继续检查其他样式表
      }
    }

    return false;
  }

  private hasFlexboxUsage(): boolean {
    return this.hasCSSProperty(['display'], ['flex', 'inline-flex']);
  }

  private hasGridUsage(): boolean {
    return this.hasCSSProperty(['display'], ['grid', 'inline-grid']);
  }

  private hasCSSProperty(properties: string[], values: string[]): boolean {
    const allElements = this.document.querySelectorAll('*');
    
    for (const element of allElements) {
      const styles = window.getComputedStyle(element as Element);
      
      for (const property of properties) {
        const value = styles.getPropertyValue(property);
        if (values.some(v => value.includes(v))) {
          return true;
        }
      }
    }
    
    return false;
  }

  private findFixedWidthElements(): HTMLElement[] {
    const elements = this.document.querySelectorAll('*');
    const fixedWidthElements: HTMLElement[] = [];

    elements.forEach((element) => {
      const styles = window.getComputedStyle(element);
      const width = styles.width;
      
      // 检查是否使用了固定像素宽度且宽度较大
      if (width.endsWith('px')) {
        const pixelWidth = parseInt(width, 10);
        if (pixelWidth > 300) { // 大于300px的固定宽度元素
          fixedWidthElements.push(element as HTMLElement);
        }
      }
    });

    return fixedWidthElements;
  }

  private getElementDimensions(element: HTMLElement): { width: number; height: number } {
    const rect = element.getBoundingClientRect();
    return {
      width: rect.width,
      height: rect.height
    };
  }

  private getElementSelector(element: HTMLElement): string {
    if (element.id) return `#${element.id}`;
    if (element.className) return `.${element.className.split(' ')[0]}`;
    return element.tagName.toLowerCase();
  }

  private getComputedFontSize(element: HTMLElement): number {
    const styles = window.getComputedStyle(element);
    const fontSize = styles.fontSize;
    return fontSize.endsWith('px') ? parseInt(fontSize, 10) : 16; // 默认16px
  }

  private findElementsWithPoorLineHeight(): HTMLElement[] {
    const textElements = this.document.querySelectorAll('p, div, span, h1, h2, h3, h4, h5, h6');
    const poorLineHeightElements: HTMLElement[] = [];

    textElements.forEach((element) => {
      const styles = window.getComputedStyle(element);
      const lineHeight = styles.lineHeight;
      
      if (lineHeight !== 'normal') {
        const lineHeightValue = parseFloat(lineHeight);
        if (lineHeightValue < 1.3) {
          poorLineHeightElements.push(element as HTMLElement);
        }
      }
    });

    return poorLineHeightElements;
  }

  private checkWebPSupport(img: HTMLImageElement): boolean {
    const src = img.src || img.getAttribute('srcset') || '';
    return /\.webp/i.test(src);
  }

  private isImageBelowFold(img: HTMLImageElement): boolean {
    const rect = img.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    return rect.top > viewportHeight;
  }

  private identifyCriticalResources(): string[] {
    const criticalResources: string[] = [];
    
    // 识别关键CSS
    const cssLinks = this.document.querySelectorAll('link[rel="stylesheet"]');
    cssLinks.forEach((link) => {
      if (!link.getAttribute('media') || link.getAttribute('media') === 'all') {
        criticalResources.push((link as HTMLLinkElement).href);
      }
    });

    // 识别关键JavaScript
    const scripts = this.document.querySelectorAll('script[src]');
    scripts.forEach((script) => {
      if (!script.hasAttribute('async') && !script.hasAttribute('defer')) {
        criticalResources.push((script as HTMLScriptElement).src);
      }
    });

    return criticalResources;
  }

  private countTotalResources(): number {
    const images = this.document.querySelectorAll('img').length;
    const cssFiles = this.document.querySelectorAll('link[rel="stylesheet"]').length;
    const jsFiles = this.document.querySelectorAll('script[src]').length;
    
    return images + cssFiles + jsFiles;
  }

  // 模拟Core Web Vitals测量（实际应用中应使用真实的测量工具）
  private async measureLCP(): Promise<number> {
    return new Promise(resolve => {
      // 模拟LCP测量
      setTimeout(() => resolve(Math.random() * 4000 + 1000), 100);
    });
  }

  private async measureFID(): Promise<number> {
    return new Promise(resolve => {
      // 模拟FID测量
      setTimeout(() => resolve(Math.random() * 200 + 50), 100);
    });
  }

  private async measureCLS(): Promise<number> {
    return new Promise(resolve => {
      // 模拟CLS测量
      setTimeout(() => resolve(Math.random() * 0.3), 100);
    });
  }

  private getDefaultPerformanceResult(): MobilePerformanceResult {
    return {
      score: 75,
      imageOptimization: {
        total: 0,
        optimized: 0,
        issues: []
      },
      resourceLoading: {
        totalRequests: 0,
        criticalResources: 0,
        issues: []
      },
      recommendations: ['启用性能分析以获取详细的移动性能建议']
    };
  }

  private calculateOverallScore(results: {
    viewport: MobileViewportResult;
    responsive: ResponsiveDesignResult;
    touchTargets: TouchTargetResult;
    fonts: MobileFontResult;
    performance: MobilePerformanceResult;
  }): number {
    const viewportScore = results.viewport.isOptimal ? 100 : 60;
    const responsiveScore = results.responsive.score;
    const touchScore = results.touchTargets.totalElements > 0 
      ? (results.touchTargets.appropriateSize / results.touchTargets.totalElements) * 100 
      : 100;
    const fontScore = results.fonts.score;
    const performanceScore = results.performance.score;

    return Math.round((viewportScore + responsiveScore + touchScore + fontScore + performanceScore) / 5);
  }

  private generateRecommendations(results: {
    viewport: MobileViewportResult;
    responsive: ResponsiveDesignResult;
    touchTargets: TouchTargetResult;
    fonts: MobileFontResult;
    performance: MobilePerformanceResult;
    coreWebVitals?: MobileSeoAnalysisResult['coreWebVitals'];
  }): MobileSeoAnalysisResult['recommendations'] {
    const recommendations: MobileSeoAnalysisResult['recommendations'] = [];

    // Viewport建议
    if (!results.viewport.isOptimal) {
      recommendations.push({
        priority: 'high',
        category: 'Viewport',
        message: '移动视口配置需要优化',
        action: results.viewport.recommendations.join('; ')
      });
    }

    // 响应式设计建议
    if (results.responsive.score < 80) {
      recommendations.push({
        priority: 'high',
        category: '响应式设计',
        message: '响应式设计实现不完整',
        action: results.responsive.recommendations.join('; ')
      });
    }

    // 触摸目标建议
    if (results.touchTargets.tooSmall > 0) {
      recommendations.push({
        priority: 'medium',
        category: '触摸目标',
        message: `${results.touchTargets.tooSmall}个交互元素触摸目标过小`,
        action: '确保所有交互元素至少44px×44px'
      });
    }

    // 字体建议
    if (!results.fonts.readableText) {
      recommendations.push({
        priority: 'medium',
        category: '字体可读性',
        message: '文字可读性需要改善',
        action: results.fonts.recommendations.join('; ')
      });
    }

    // 性能建议
    if (results.performance.score < 70) {
      recommendations.push({
        priority: 'high',
        category: '移动性能',
        message: '移动性能需要优化',
        action: results.performance.recommendations.join('; ')
      });
    }

    // Core Web Vitals建议
    if (results.coreWebVitals && results.coreWebVitals.assessment !== 'good') {
      recommendations.push({
        priority: 'high',
        category: 'Core Web Vitals',
        message: 'Core Web Vitals指标需要改善',
        action: '优化LCP、FID和CLS指标以提升用户体验'
      });
    }

    return recommendations;
  }
}

export default MobileSeoDetector;
