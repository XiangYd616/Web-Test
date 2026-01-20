/**
 * 移动端优化分析器
 * 本地化程度：80%
 * 分析页面的移动端友好性和响应式设计
 */

import type { Page } from 'puppeteer';
import puppeteer from 'puppeteer';

interface ViewportConfig {
  width: number;
  height: number;
}

interface MobileThresholds {
  minTouchTargetSize: number;
  maxContentWidth: number;
  minFontSize: number;
}

interface MobileOptimizationResult {
  url: string;
  timestamp: Date;
  overall: {
    score: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    mobileFriendly: boolean;
    responsive: boolean;
  };
  viewport: ViewportAnalysis;
  responsiveDesign: ResponsiveDesignAnalysis;
  touchTargets: TouchTargetAnalysis;
  typography: TypographyAnalysis;
  contentFit: ContentFitAnalysis;
  performance: PerformanceAnalysis;
  recommendations: MobileRecommendation[];
}

interface ViewportAnalysis {
  configured: boolean;
  width: number;
  height: number;
  initialScale: number;
  issues: ViewportIssue[];
  score: number;
}

interface ViewportIssue {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  suggestion: string;
}

interface ResponsiveDesignAnalysis {
  mediaQueries: MediaQuery[];
  breakpoints: Breakpoint[];
  layoutAdaptation: LayoutAdaptation;
  issues: ResponsiveIssue[];
  score: number;
}

interface MediaQuery {
  rule: string;
  minWidth?: number;
  maxWidth?: number;
  valid: boolean;
  issues: string[];
}

interface Breakpoint {
  width: number;
  type: 'mobile' | 'tablet' | 'desktop';
  detected: boolean;
  issues: string[];
}

interface LayoutAdaptation {
  navigation: boolean;
  content: boolean;
  images: boolean;
  forms: boolean;
  issues: string[];
}

interface ResponsiveIssue {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  suggestion: string;
}

interface TouchTargetAnalysis {
  targets: TouchTarget[];
  total: number;
  valid: number;
  averageSize: number;
  issues: TouchIssue[];
  score: number;
}

interface TouchTarget {
  element: string;
  size: { width: number; height: number };
  position: { x: number; y: number };
  valid: boolean;
  issues: string[];
}

interface TouchIssue {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  suggestion: string;
  count: number;
}

interface TypographyAnalysis {
  fontSize: FontSizeAnalysis;
  lineHeight: LineHeightAnalysis;
  readability: ReadabilityAnalysis;
  issues: TypographyIssue[];
  score: number;
}

interface FontSizeAnalysis {
  minimum: number;
  average: number;
  valid: boolean;
  issues: string[];
}

interface LineHeightAnalysis {
  minimum: number;
  average: number;
  valid: boolean;
  issues: string[];
}

interface ReadabilityAnalysis {
  contrast: number;
  spacing: number;
  issues: string[];
}

interface TypographyIssue {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  suggestion: string;
}

interface ContentFitAnalysis {
  horizontalScroll: boolean;
  contentWidth: number;
  viewportWidth: number;
  overflow: OverflowAnalysis;
  issues: ContentFitIssue[];
  score: number;
}

interface OverflowAnalysis {
  horizontal: boolean;
  vertical: boolean;
  elements: string[];
}

interface ContentFitIssue {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  suggestion: string;
}

interface PerformanceAnalysis {
  loadTime: number;
  renderTime: number;
  firstPaint: number;
  firstContentfulPaint: number;
  issues: PerformanceIssue[];
  score: number;
}

interface PerformanceIssue {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  suggestion: string;
  value: number;
}

interface MobileRecommendation {
  priority: 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  examples: CodeExample[];
  impact: string;
  effort: 'low' | 'medium' | 'high';
}

interface CodeExample {
  title: string;
  language: string;
  code: string;
  explanation: string;
}

class MobileOptimizationAnalyzer {
  private mobileViewport: ViewportConfig;
  private tabletViewport: ViewportConfig;
  private thresholds: MobileThresholds;

  constructor() {
    this.mobileViewport = { width: 375, height: 667 }; // iPhone SE
    this.tabletViewport = { width: 768, height: 1024 }; // iPad

    this.thresholds = {
      minTouchTargetSize: 44, // 最小触摸目标尺寸 (px)
      maxContentWidth: 320, // 最大内容宽度 (px)
      minFontSize: 16, // 最小字体大小 (px)
    };
  }

  /**
   * 执行移动端优化分析
   */
  async analyze(
    url: string,
    options: {
      timeout?: number;
      checkPerformance?: boolean;
      checkTablet?: boolean;
    } = {}
  ): Promise<MobileOptimizationResult> {
    const { timeout = 30000, checkPerformance = true, checkTablet: _checkTablet = true } = options;

    const timestamp = new Date();

    let browser;
    let page;

    try {
      // 启动浏览器
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      page = await browser.newPage();

      // 设置移动端视口
      await page.setViewport(this.mobileViewport);
      await page.setUserAgent(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
      );

      // 导航到页面
      await page.goto(url, { waitUntil: 'networkidle0', timeout });

      // 分析视口配置
      const viewport = await this.analyzeViewport(page);

      // 分析响应式设计
      const responsiveDesign = await this.analyzeResponsiveDesign(page);

      // 分析触摸目标
      const touchTargets = await this.analyzeTouchTargets(page);

      // 分析字体排版
      const typography = await this.analyzeTypography(page);

      // 分析内容适配
      const contentFit = await this.analyzeContentFit(page);

      // 分析性能
      const performance = checkPerformance
        ? await this.analyzePerformance(page)
        : this.createEmptyPerformanceAnalysis();

      // 计算总体分数
      const overall = this.calculateOverallScore(
        viewport,
        responsiveDesign,
        touchTargets,
        typography,
        contentFit,
        performance
      );

      // 生成建议
      const recommendations = this.generateRecommendations(
        viewport,
        responsiveDesign,
        touchTargets,
        typography,
        contentFit,
        performance
      );

      return {
        url,
        timestamp,
        overall,
        viewport,
        responsiveDesign,
        touchTargets,
        typography,
        contentFit,
        performance,
        recommendations,
      };
    } catch (error) {
      throw new Error(
        `移动端优化分析失败: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      if (page) await page.close();
      if (browser) await browser.close();
    }
  }

  /**
   * 分析视口配置
   */
  private async analyzeViewport(page: Page): Promise<ViewportAnalysis> {
    const viewportData = await page.evaluate(() => {
      const viewportMeta = document.querySelector('meta[name="viewport"]');
      const content = viewportMeta ? viewportMeta.getAttribute('content') || '' : '';

      // 解析视口配置
      const config: Record<string, string | number | boolean> = {
        configured: !!viewportMeta,
        width: 0,
        height: 0,
        initialScale: 1,
      };

      if (content) {
        const parts = content.split(',');
        parts.forEach(part => {
          const [key, value] = part.trim().split('=');
          if (key && value) {
            config[key.trim()] = isNaN(Number(value)) ? value.trim() : Number(value);
          }
        });
      }

      const width = typeof config.width === 'number' ? config.width : 0;
      const height = typeof config.height === 'number' ? config.height : 0;
      const initialScale = typeof config.initialScale === 'number' ? config.initialScale : 1;

      return {
        configured: Boolean(config.configured),
        width,
        height,
        initialScale,
      };
    });

    const issues: ViewportIssue[] = [];
    let score = 100;

    if (!viewportData.configured) {
      issues.push({
        type: 'missing',
        severity: 'critical',
        description: '缺少viewport meta标签',
        suggestion: '添加 <meta name="viewport" content="width=device-width, initial-scale=1">',
      });
      score = 0;
    } else {
      if (!viewportData.width) {
        // 正确配置
      } else {
        issues.push({
          type: 'fixed-width',
          severity: 'high',
          description: '使用固定宽度而非响应式宽度',
          suggestion: '使用 width=device-width 实现响应式设计',
        });
        score -= 30;
      }

      if (viewportData.initialScale !== 1) {
        issues.push({
          type: 'initial-scale',
          severity: 'medium',
          description: '初始缩放比例不是1',
          suggestion: '设置 initial-scale=1',
        });
        score -= 15;
      }
    }

    return {
      configured: viewportData.configured,
      width: viewportData.width,
      height: viewportData.height,
      initialScale: viewportData.initialScale,
      issues,
      score: Math.max(0, score),
    };
  }

  /**
   * 分析响应式设计
   */
  private async analyzeResponsiveDesign(page: Page): Promise<ResponsiveDesignAnalysis> {
    const responsiveData = await page.evaluate(() => {
      // 获取所有CSS规则
      const stylesheets = Array.from(document.styleSheets);
      const mediaQueries: Array<{ rule: string; cssText: string }> = [];

      try {
        stylesheets.forEach(stylesheet => {
          try {
            const rules = Array.from(stylesheet.cssRules || []);
            rules.forEach(rule => {
              if (rule.type === CSSRule.MEDIA_RULE) {
                const mediaRule = rule as CSSMediaRule;
                mediaQueries.push({
                  rule: mediaRule.media.mediaText,
                  cssText: mediaRule.cssText,
                });
              }
            });
          } catch {
            // 跨域样式表访问限制
          }
        });
      } catch {
        // 样式表访问限制
      }

      // 检测断点
      const breakpoints = [
        { width: 320, type: 'mobile' },
        { width: 768, type: 'tablet' },
        { width: 1024, type: 'desktop' },
      ];

      // 检测布局适配
      const layoutAdaptation = {
        navigation: !!document.querySelector('nav, .nav, .navigation'),
        content: !!document.querySelector('main, .content, article'),
        images: document.querySelectorAll('img').length > 0,
        forms: document.querySelectorAll('form').length > 0,
      };

      return {
        mediaQueries,
        breakpoints,
        layoutAdaptation,
      };
    });

    // 分析媒体查询
    const mediaQueries: MediaQuery[] = responsiveData.mediaQueries.map(
      (mq: { rule: string; cssText: string }) => {
        const issues: string[] = [];
        let valid = true;

        // 简化的媒体查询解析
        const minWidthMatch = mq.rule.match(/min-width:\s*(\d+)px/);
        const maxWidthMatch = mq.rule.match(/max-width:\s*(\d+)px/);

        if (!minWidthMatch && !maxWidthMatch) {
          issues.push('缺少宽度断点');
          valid = false;
        }

        return {
          rule: mq.rule,
          minWidth: minWidthMatch ? Number(minWidthMatch[1]) : undefined,
          maxWidth: maxWidthMatch ? Number(maxWidthMatch[1]) : undefined,
          valid,
          issues,
        };
      }
    );

    // 分析断点
    const breakpoints: Breakpoint[] = responsiveData.breakpoints.map(
      (bp: { width: number; type: string }) => {
        const type = bp.type as Breakpoint['type'];
        return {
          width: bp.width,
          type,
          detected: mediaQueries.some(
            mq =>
              (mq.minWidth && mq.minWidth <= bp.width) || (mq.maxWidth && mq.maxWidth >= bp.width)
          ),
          issues: [],
        };
      }
    );

    // 分析布局适配
    const layoutAdaptation: LayoutAdaptation = {
      navigation: responsiveData.layoutAdaptation.navigation,
      content: responsiveData.layoutAdaptation.content,
      images: responsiveData.layoutAdaptation.images,
      forms: responsiveData.layoutAdaptation.forms,
      issues: [],
    };

    const issues: ResponsiveIssue[] = [];
    let score = 100;

    if (mediaQueries.length === 0) {
      issues.push({
        type: 'no-media-queries',
        severity: 'critical',
        description: '没有响应式媒体查询',
        suggestion: '添加媒体查询实现响应式设计',
      });
      score = 0;
    }

    const invalidQueries = mediaQueries.filter(mq => !mq.valid);
    if (invalidQueries.length > 0) {
      issues.push({
        type: 'invalid-media-queries',
        severity: 'high',
        description: `${invalidQueries.length}个无效的媒体查询`,
        suggestion: '修复媒体查询语法',
      });
      score -= 20;
    }

    return {
      mediaQueries,
      breakpoints,
      layoutAdaptation,
      issues,
      score: Math.max(0, score),
    };
  }

  /**
   * 分析触摸目标
   */
  private async analyzeTouchTargets(page: Page): Promise<TouchTargetAnalysis> {
    const touchData = await page.evaluate(() => {
      const clickableElements = document.querySelectorAll(
        'a, button, input, select, textarea, [onclick], [role="button"]'
      );
      const targets: Array<{
        element: string;
        size: { width: number; height: number };
        position: { x: number; y: number };
        valid: boolean;
        issues: string[];
      }> = [];

      clickableElements.forEach(element => {
        const htmlElement = element as HTMLElement;
        const rect = htmlElement.getBoundingClientRect();

        targets.push({
          element: htmlElement.tagName.toLowerCase(),
          size: {
            width: rect.width,
            height: rect.height,
          },
          position: {
            x: rect.left,
            y: rect.top,
          },
          valid: rect.width >= 44 && rect.height >= 44,
          issues: [],
        });
      });

      return targets;
    });

    const targets: TouchTarget[] = touchData.map(target => {
      const issues: string[] = [];
      let valid = true;

      if (target.size.width < this.thresholds.minTouchTargetSize) {
        issues.push(
          `宽度${target.size.width}px小于最小要求${this.thresholds.minTouchTargetSize}px`
        );
        valid = false;
      }

      if (target.size.height < this.thresholds.minTouchTargetSize) {
        issues.push(
          `高度${target.size.height}px小于最小要求${this.thresholds.minTouchTargetSize}px`
        );
        valid = false;
      }

      return {
        element: target.element,
        size: target.size,
        position: target.position,
        valid,
        issues,
      };
    });

    const total = targets.length;
    const valid = targets.filter(t => t.valid).length;
    const averageSize =
      total > 0
        ? targets.reduce((sum: number, t) => sum + (t.size.width + t.size.height) / 2, 0) / total
        : 0;

    const issuesMap: Record<string, TouchIssue> = {};
    targets.forEach(target => {
      target.issues.forEach(issue => {
        if (!issuesMap[issue]) {
          issuesMap[issue] = {
            type: issue,
            severity: 'high',
            description: issue,
            suggestion: '增加触摸目标尺寸到至少44x44像素',
            count: 0,
          };
        }
        issuesMap[issue].count++;
      });
    });

    const issues = Object.values(issuesMap);
    const score = total > 0 ? (valid / total) * 100 : 100;

    return {
      targets,
      total,
      valid,
      averageSize,
      issues,
      score,
    };
  }

  /**
   * 分析字体排版
   */
  private async analyzeTypography(page: Page): Promise<TypographyAnalysis> {
    const typographyData = await page.evaluate(() => {
      const textElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, span, div');
      const fontSizes: number[] = [];
      const lineHeights: number[] = [];

      textElements.forEach(element => {
        const htmlElement = element as HTMLElement;
        const styles = window.getComputedStyle(htmlElement);

        const fontSize = parseFloat(styles.fontSize);
        const lineHeight = parseFloat(styles.lineHeight);

        if (!isNaN(fontSize)) fontSizes.push(fontSize);
        if (!isNaN(lineHeight)) lineHeights.push(lineHeight);
      });

      const parseColor = (value: string): [number, number, number] => {
        const match = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
        if (!match) return [0, 0, 0];
        return [Number(match[1]), Number(match[2]), Number(match[3])];
      };

      const luminance = (rgb: [number, number, number]): number => {
        const transform = (channel: number) => {
          const value = channel / 255;
          return value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
        };
        return 0.2126 * transform(rgb[0]) + 0.7152 * transform(rgb[1]) + 0.0722 * transform(rgb[2]);
      };

      const bodyStyles = window.getComputedStyle(document.body);
      const textColor = parseColor(bodyStyles.color);
      const backgroundColor = parseColor(bodyStyles.backgroundColor || 'rgb(255,255,255)');
      const textLum = luminance(textColor);
      const backgroundLum = luminance(backgroundColor);
      const contrast =
        (Math.max(textLum, backgroundLum) + 0.05) / (Math.min(textLum, backgroundLum) + 0.05);

      const averageFontSize = fontSizes.length
        ? fontSizes.reduce((sum: number, size: number) => sum + size, 0) / fontSizes.length
        : 0;
      const averageLineHeight = lineHeights.length
        ? lineHeights.reduce((sum: number, height: number) => sum + height, 0) / lineHeights.length
        : 0;
      const spacing = averageFontSize > 0 ? averageLineHeight / averageFontSize : 0;

      return {
        fontSizes,
        lineHeights,
        contrast,
        spacing,
      };
    });

    // 字体大小分析
    const minFontSize = typographyData.fontSizes.length ? Math.min(...typographyData.fontSizes) : 0;
    const avgFontSize = typographyData.fontSizes.length
      ? typographyData.fontSizes.reduce((sum: number, size: number) => sum + size, 0) /
        typographyData.fontSizes.length
      : 0;
    const fontSizeAnalysis: FontSizeAnalysis = {
      minimum: minFontSize,
      average: avgFontSize,
      valid: minFontSize >= this.thresholds.minFontSize,
      issues: [],
    };

    if (fontSizeAnalysis.minimum < this.thresholds.minFontSize) {
      fontSizeAnalysis.issues.push(
        `最小字体大小${fontSizeAnalysis.minimum}px小于建议值${this.thresholds.minFontSize}px`
      );
    }

    // 行高分析
    const minLineHeight = typographyData.lineHeights.length
      ? Math.min(...typographyData.lineHeights)
      : 0;
    const avgLineHeight = typographyData.lineHeights.length
      ? typographyData.lineHeights.reduce((sum: number, height: number) => sum + height, 0) /
        typographyData.lineHeights.length
      : 0;
    const lineHeightAnalysis: LineHeightAnalysis = {
      minimum: minLineHeight,
      average: avgLineHeight,
      valid: minLineHeight >= 1.2,
      issues: [],
    };

    if (lineHeightAnalysis.minimum < 1.2) {
      lineHeightAnalysis.issues.push(`最小行高${lineHeightAnalysis.minimum}小于建议值1.2`);
    }

    // 可读性分析
    const readabilityAnalysis: ReadabilityAnalysis = {
      contrast: typographyData.contrast,
      spacing: typographyData.spacing,
      issues: [],
    };

    if (typographyData.contrast < 4.5) {
      readabilityAnalysis.issues.push('文字对比度不足');
    }

    const issues: TypographyIssue[] = [];
    let score = 100;

    if (!fontSizeAnalysis.valid) {
      issues.push({
        type: 'font-size',
        severity: 'high',
        description: '字体大小过小',
        suggestion: '增加字体大小到至少16px',
      });
      score -= 25;
    }

    if (!lineHeightAnalysis.valid) {
      issues.push({
        type: 'line-height',
        severity: 'medium',
        description: '行高过小',
        suggestion: '增加行高到至少1.2倍字体大小',
      });
      score -= 15;
    }

    if (readabilityAnalysis.contrast < 4.5) {
      issues.push({
        type: 'contrast',
        severity: 'high',
        description: '文字对比度不足',
        suggestion: '提高文字与背景的对比度',
      });
      score -= 20;
    }

    return {
      fontSize: fontSizeAnalysis,
      lineHeight: lineHeightAnalysis,
      readability: readabilityAnalysis,
      issues,
      score: Math.max(0, score),
    };
  }

  /**
   * 分析内容适配
   */
  private async analyzeContentFit(page: Page): Promise<ContentFitAnalysis> {
    const contentFitData = await page.evaluate(() => {
      const body = document.body;
      const html = document.documentElement;

      const pageWidth = Math.max(
        body.scrollWidth,
        body.offsetWidth,
        html.clientWidth,
        html.scrollWidth,
        html.offsetWidth
      );

      const pageHeight = Math.max(
        body.scrollHeight,
        body.offsetHeight,
        html.clientHeight,
        html.scrollHeight,
        html.offsetHeight
      );

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // 检查溢出元素
      const overflowElements: string[] = [];
      document.querySelectorAll('*').forEach(element => {
        const htmlElement = element as HTMLElement;
        const rect = htmlElement.getBoundingClientRect();
        if (rect.right > viewportWidth || rect.bottom > viewportHeight) {
          overflowElements.push(htmlElement.tagName.toLowerCase());
        }
      });

      return {
        contentWidth: pageWidth,
        contentHeight: pageHeight,
        viewportWidth,
        viewportHeight,
        overflowElements,
      };
    });

    const horizontalScroll = contentFitData.contentWidth > contentFitData.viewportWidth;
    const contentWidth = contentFitData.contentWidth;
    const viewportWidth = contentFitData.viewportWidth;

    const overflow: OverflowAnalysis = {
      horizontal: horizontalScroll,
      vertical: contentFitData.contentHeight > contentFitData.viewportHeight,
      elements: contentFitData.overflowElements,
    };

    const issues: ContentFitIssue[] = [];
    let score = 100;

    if (horizontalScroll) {
      issues.push({
        type: 'horizontal-scroll',
        severity: 'critical',
        description: '存在水平滚动条',
        suggestion: '调整布局以适应移动端屏幕宽度',
      });
      score -= 40;
    }

    if (contentWidth > this.thresholds.maxContentWidth) {
      issues.push({
        type: 'content-too-wide',
        severity: 'medium',
        description: `内容宽度${contentWidth}px超过建议值${this.thresholds.maxContentWidth}px`,
        suggestion: '限制内容宽度或使用响应式布局',
      });
      score -= 15;
    }

    return {
      horizontalScroll,
      contentWidth,
      viewportWidth,
      overflow,
      issues,
      score: Math.max(0, score),
    };
  }

  /**
   * 分析性能
   */
  private async analyzePerformance(page: Page): Promise<PerformanceAnalysis> {
    const performanceData = await page.evaluate(() => {
      const navigation = performance.getEntriesByType(
        'navigation'
      )[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByType('paint');

      return {
        loadTime: navigation.loadEventEnd - navigation.loadEventStart,
        renderTime: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
      };
    });

    const issues: PerformanceIssue[] = [];
    let score = 100;

    if (performanceData.firstContentfulPaint > 2000) {
      issues.push({
        type: 'slow-first-contentful-paint',
        severity: 'high',
        description: '首次内容绘制过慢',
        suggestion: '优化关键渲染路径',
        value: performanceData.firstContentfulPaint,
      });
      score -= 20;
    }

    if (performanceData.loadTime > 3000) {
      issues.push({
        type: 'slow-load',
        severity: 'medium',
        description: '页面加载时间过长',
        suggestion: '优化资源加载',
        value: performanceData.loadTime,
      });
      score -= 15;
    }

    return {
      loadTime: performanceData.loadTime,
      renderTime: performanceData.renderTime,
      firstPaint: performanceData.firstPaint,
      firstContentfulPaint: performanceData.firstContentfulPaint,
      issues,
      score: Math.max(0, score),
    };
  }

  /**
   * 计算总体分数
   */
  private calculateOverallScore(
    viewport: ViewportAnalysis,
    responsiveDesign: ResponsiveDesignAnalysis,
    touchTargets: TouchTargetAnalysis,
    typography: TypographyAnalysis,
    contentFit: ContentFitAnalysis,
    performance: PerformanceAnalysis
  ): {
    score: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    mobileFriendly: boolean;
    responsive: boolean;
  } {
    const weights = {
      viewport: 0.2,
      responsiveDesign: 0.25,
      touchTargets: 0.15,
      typography: 0.15,
      contentFit: 0.15,
      performance: 0.1,
    };

    const overallScore =
      viewport.score * weights.viewport +
      responsiveDesign.score * weights.responsiveDesign +
      touchTargets.score * weights.touchTargets +
      typography.score * weights.typography +
      contentFit.score * weights.contentFit +
      performance.score * weights.performance;

    const grade = this.getGrade(overallScore);
    const mobileFriendly = overallScore >= 70;
    const responsive = responsiveDesign.score >= 70;

    return {
      score: Math.round(overallScore),
      grade,
      mobileFriendly,
      responsive,
    };
  }

  /**
   * 生成建议
   */
  private generateRecommendations(
    viewport: ViewportAnalysis,
    responsiveDesign: ResponsiveDesignAnalysis,
    touchTargets: TouchTargetAnalysis,
    typography: TypographyAnalysis,
    _contentFit: ContentFitAnalysis,
    _performance: PerformanceAnalysis
  ): MobileRecommendation[] {
    const recommendations: MobileRecommendation[] = [];

    // 视口建议
    if (!viewport.configured) {
      recommendations.push({
        priority: 'high',
        category: 'viewport',
        title: '添加Viewport配置',
        description: '添加viewport meta标签确保移动端正确显示',
        examples: [
          {
            title: 'Viewport配置示例',
            language: 'html',
            code: '<meta name="viewport" content="width=device-width, initial-scale=1">',
            explanation: '设置viewport为设备宽度，初始缩放为1',
          },
        ],
        impact: '改善移动端显示效果',
        effort: 'low',
      });
    }

    // 响应式设计建议
    if (responsiveDesign.issues.length > 0) {
      recommendations.push({
        priority: 'high',
        category: 'responsive',
        title: '实现响应式设计',
        description: '添加媒体查询和响应式布局',
        examples: [
          {
            title: '媒体查询示例',
            language: 'css',
            code: `@media (max-width: 768px) {
  .container {
    width: 100%;
    padding: 10px;
  }
  
  .navigation {
    display: none;
  }
  
  .mobile-menu {
    display: block;
  }
}`,
            explanation: '使用媒体查询适配不同屏幕尺寸',
          },
        ],
        impact: '改善移动端用户体验',
        effort: 'medium',
      });
    }

    // 触摸目标建议
    if (touchTargets.valid < touchTargets.total) {
      recommendations.push({
        priority: 'medium',
        category: 'touch',
        title: '优化触摸目标',
        description: '增加按钮和链接的触摸区域',
        examples: [
          {
            title: '触摸目标优化示例',
            language: 'css',
            code: `button, a {
  min-width: 44px;
  min-height: 44px;
  padding: 12px 16px;
  margin: 8px;
}`,
            explanation: '设置最小触摸目标尺寸为44x44像素',
          },
        ],
        impact: '改善移动端交互体验',
        effort: 'low',
      });
    }

    // 字体建议
    if (typography.fontSize.minimum < this.thresholds.minFontSize) {
      recommendations.push({
        priority: 'medium',
        category: 'typography',
        title: '优化字体大小',
        description: '增加移动端字体大小提高可读性',
        examples: [
          {
            title: '响应式字体示例',
            language: 'css',
            code: `@media (max-width: 768px) {
  body {
    font-size: 16px;
    line-height: 1.5;
  }
  
  h1 {
    font-size: 24px;
  }
}`,
            explanation: '为移动端设置合适的字体大小',
          },
        ],
        impact: '改善移动端可读性',
        effort: 'low',
      });
    }

    return recommendations;
  }

  /**
   * 创建空的性能分析结果
   */
  private createEmptyPerformanceAnalysis(): PerformanceAnalysis {
    return {
      loadTime: 0,
      renderTime: 0,
      firstPaint: 0,
      firstContentfulPaint: 0,
      issues: [],
      score: 100,
    };
  }

  /**
   * 获取等级
   */
  private getGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * 获取阈值配置
   */
  getThresholds(): MobileThresholds {
    return { ...this.thresholds };
  }

  /**
   * 设置阈值配置
   */
  setThresholds(thresholds: Partial<MobileThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }

  /**
   * 导出分析报告
   */
  exportReport(result: MobileOptimizationResult): string {
    return JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        result,
        thresholds: this.thresholds,
      },
      null,
      2
    );
  }
}

export default MobileOptimizationAnalyzer;
