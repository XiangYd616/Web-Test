/**
 * 无障碍功能服务
 * 提供无障碍检测、评估、优化建议功能
 */

import type { Page } from 'puppeteer';
import puppeteer from 'puppeteer';
import Logger from '../../utils/logger';

interface AccessibilityCheck {
  category: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  element?: string;
  recommendation: string;
  wcagLevel: 'A' | 'AA' | 'AAA';
}

interface AccessibilityResult {
  score: number;
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  checks: AccessibilityCheck[];
  summary: {
    keyboardNavigation: number;
    screenReader: number;
    colorContrast: number;
    focusManagement: number;
    semanticMarkup: number;
    alternativeText: number;
    formAccessibility: number;
    multimediaAccessibility: number;
  };
  recommendations: string[];
}

interface TestConfig {
  url: string;
  wcagLevel?: 'A' | 'AA' | 'AAA';
  categories?: string[];
  timeout?: number;
}

type InteractiveElement = {
  tagName: string;
  hasTabIndex: boolean;
  tabIndex: number;
  isDisabled: boolean;
  isHidden: boolean;
};

type HeadingInfo = {
  level: number;
  text?: string;
};

type TextElementStyle = {
  tagName: string;
  color: string;
  backgroundColor: string;
  fontSize: number;
  fontWeight: string;
};

type ImageInfo = {
  hasAlt: boolean;
  alt: string | null;
  isDecorative: boolean;
};

type FormControlInfo = {
  tagName: string;
  type: string;
  hasLabel: boolean;
  hasPlaceholder: boolean;
  isRequired: boolean;
};

type VideoInfo = {
  hasTracks: boolean;
  hasControls: boolean;
};

class AccessibilityService {
  private logger = Logger;
  private wcagLevels: ('A' | 'AA' | 'AAA')[] = ['A', 'AA', 'AAA'];
  private checkCategories = [
    'keyboard-navigation',
    'screen-reader',
    'color-contrast',
    'focus-management',
    'semantic-markup',
    'alternative-text',
    'form-accessibility',
    'multimedia-accessibility',
  ];
  private contrastRatios = {
    AA: { normal: 4.5, large: 3.0 },
    AAA: { normal: 7.0, large: 4.5 },
  };

  /**
   * 执行无障碍检测
   */
  async runAccessibilityTest(config: TestConfig): Promise<AccessibilityResult> {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    try {
      await page.goto(config.url, { waitUntil: 'networkidle2' });

      const checks = await this.performAccessibilityChecks(page, config);
      const score = this.calculateScore(checks);
      const summary = this.generateSummary(checks);
      const recommendations = this.generateRecommendations(checks);

      return {
        score,
        totalChecks: checks.length,
        passedChecks: checks.filter(c => c.severity === 'low').length,
        failedChecks: checks.filter(c => c.severity !== 'low').length,
        checks,
        summary,
        recommendations,
      };
    } catch (error) {
      this.logger.error('无障碍检测失败', { error, url: config.url });
      throw new Error(`无障碍检测失败: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      await browser.close();
    }
  }

  /**
   * 执行无障碍检查
   */
  private async performAccessibilityChecks(
    page: Page,
    config: TestConfig
  ): Promise<AccessibilityCheck[]> {
    const checks: AccessibilityCheck[] = [];
    const categories = config.categories || this.checkCategories;

    for (const category of categories) {
      switch (category) {
        case 'keyboard-navigation':
          checks.push(...(await this.checkKeyboardNavigation(page)));
          break;
        case 'screen-reader':
          checks.push(...(await this.checkScreenReader(page)));
          break;
        case 'color-contrast':
          checks.push(...(await this.checkColorContrast(page)));
          break;
        case 'focus-management':
          checks.push(...(await this.checkFocusManagement(page)));
          break;
        case 'semantic-markup':
          checks.push(...(await this.checkSemanticMarkup(page)));
          break;
        case 'alternative-text':
          checks.push(...(await this.checkAlternativeText(page)));
          break;
        case 'form-accessibility':
          checks.push(...(await this.checkFormAccessibility(page)));
          break;
        case 'multimedia-accessibility':
          checks.push(...(await this.checkMultimediaAccessibility(page)));
          break;
      }
    }

    return checks;
  }

  /**
   * 检查键盘导航
   */
  private async checkKeyboardNavigation(page: Page): Promise<AccessibilityCheck[]> {
    const checks: AccessibilityCheck[] = [];

    // 检查所有交互元素是否可通过键盘访问
    const interactiveElements = (await page.$$eval(
      'a, button, input, select, textarea, [tabindex]',
      (elements: Element[]) => {
        return elements.map((el: Element) => ({
          tagName: el.tagName,
          hasTabIndex: el.hasAttribute('tabindex'),
          tabIndex: parseInt(el.getAttribute('tabindex') || '0'),
          isDisabled: (el as HTMLInputElement).disabled,
          isHidden: window.getComputedStyle(el).display === 'none',
        }));
      }
    )) as InteractiveElement[];

    interactiveElements.forEach((element: InteractiveElement) => {
      if (element.isHidden && !element.isDisabled) {
        checks.push({
          category: 'keyboard-navigation',
          description: '交互元素被隐藏但仍可通过键盘访问',
          severity: 'medium',
          element: element.tagName,
          recommendation: '为隐藏的交互元素添加 tabindex="-1"',
          wcagLevel: 'AA',
        });
      }

      if (element.hasTabIndex && element.tabIndex < 0) {
        checks.push({
          category: 'keyboard-navigation',
          description: '元素具有负的 tabindex',
          severity: 'low',
          element: element.tagName,
          recommendation: '考虑移除负 tabindex 或使用其他方式控制焦点顺序',
          wcagLevel: 'A',
        });
      }
    });

    return checks;
  }

  /**
   * 检查屏幕阅读器支持
   */
  private async checkScreenReader(page: Page): Promise<AccessibilityCheck[]> {
    const checks: AccessibilityCheck[] = [];

    // 检查是否有适当的 ARIA 标签
    const _ariaElements = (await page.$$eval(
      '[aria-label], [aria-labelledby], [aria-describedby]',
      (elements: Element[]) => {
        return elements.map((el: Element) => ({
          tagName: el.tagName,
          hasLabel: el.hasAttribute('aria-label'),
          hasLabelledBy: el.hasAttribute('aria-labelledby'),
          hasDescribedBy: el.hasAttribute('aria-describedby'),
        }));
      }
    )) as Array<Record<string, unknown>>;

    // 检查标题结构
    const headings = (await page.$$eval('h1, h2, h3, h4, h5, h6', (elements: Element[]) => {
      return elements.map((el: Element) => ({
        level: parseInt(el.tagName.substring(1)),
        text: el.textContent?.trim(),
      }));
    })) as HeadingInfo[];

    // 检查标题层级是否正确
    for (let i = 1; i < headings.length; i++) {
      if (headings[i].level > headings[i - 1].level + 1) {
        checks.push({
          category: 'screen-reader',
          description: '标题层级跳跃',
          severity: 'medium',
          element: `H${headings[i].level}`,
          recommendation: '确保标题层级按顺序递增，不要跳跃级别',
          wcagLevel: 'AA',
        });
      }
    }

    return checks;
  }

  /**
   * 检查颜色对比度
   */
  private async checkColorContrast(page: Page): Promise<AccessibilityCheck[]> {
    const checks: AccessibilityCheck[] = [];

    // 获取所有文本元素的颜色对比度
    const textElements = (await page.$$eval(
      'p, h1, h2, h3, h4, h5, h6, span, div',
      (elements: Element[]) => {
        return elements.map((el: Element) => {
          const styles = window.getComputedStyle(el);
          return {
            tagName: el.tagName,
            color: styles.color,
            backgroundColor: styles.backgroundColor,
            fontSize: parseFloat(styles.fontSize),
            fontWeight: styles.fontWeight,
          };
        });
      }
    )) as TextElementStyle[];

    // 简化的对比度检查（实际应用中需要更复杂的算法）
    textElements.forEach((element: TextElementStyle) => {
      if (
        element.backgroundColor === 'rgba(0, 0, 0, 0)' ||
        element.backgroundColor === 'transparent'
      ) {
        checks.push({
          category: 'color-contrast',
          description: '文本元素没有背景色，可能影响对比度',
          severity: 'low',
          element: element.tagName,
          recommendation: '确保文本与背景有足够的对比度',
          wcagLevel: 'AA',
        });
      }
    });

    return checks;
  }

  /**
   * 检查焦点管理
   */
  private async checkFocusManagement(page: Page): Promise<AccessibilityCheck[]> {
    const checks: AccessibilityCheck[] = [];

    // 检查是否有跳过导航链接
    const skipLinks = await page.$$eval(
      'a[href*="skip"], a[href*="main"], a[href*="content"]',
      (elements: Element[]) => elements.length
    );

    if (skipLinks === 0) {
      checks.push({
        category: 'focus-management',
        description: '缺少跳过导航链接',
        severity: 'medium',
        recommendation: '添加跳过主导航的链接，帮助键盘用户快速访问内容',
        wcagLevel: 'AA',
      });
    }

    return checks;
  }

  /**
   * 检查语义标记
   */
  private async checkSemanticMarkup(page: Page): Promise<AccessibilityCheck[]> {
    const checks: AccessibilityCheck[] = [];

    // 检查是否使用了语义化标签
    const semanticElements = await page.$$eval(
      'header, nav, main, section, article, aside, footer',
      (elements: Element[]) => elements.map((el: Element) => el.tagName)
    );

    if (semanticElements.length === 0) {
      checks.push({
        category: 'semantic-markup',
        description: '页面缺少语义化标签',
        severity: 'medium',
        recommendation: '使用适当的 HTML5 语义化标签来结构化内容',
        wcagLevel: 'A',
      });
    }

    return checks;
  }

  /**
   * 检查替代文本
   */
  private async checkAlternativeText(page: Page): Promise<AccessibilityCheck[]> {
    const checks: AccessibilityCheck[] = [];

    // 检查图片的 alt 属性
    const images = (await page.$$eval('img', (elements: Element[]) => {
      return elements.map((el: Element) => ({
        hasAlt: el.hasAttribute('alt'),
        alt: el.getAttribute('alt'),
        isDecorative: el.hasAttribute('role') && el.getAttribute('role') === 'presentation',
      }));
    })) as ImageInfo[];

    images.forEach((image: ImageInfo, index: number) => {
      if (!image.hasAlt && !image.isDecorative) {
        checks.push({
          category: 'alternative-text',
          description: '图片缺少 alt 属性',
          severity: 'high',
          element: `IMG[${index}]`,
          recommendation: '为所有有意义的图片添加描述性的 alt 文本',
          wcagLevel: 'A',
        });
      }
    });

    return checks;
  }

  /**
   * 检查表单无障碍
   */
  private async checkFormAccessibility(page: Page): Promise<AccessibilityCheck[]> {
    const checks: AccessibilityCheck[] = [];

    // 检查表单控件是否有标签
    const formControls = (await page.$$eval('input, select, textarea', (elements: Element[]) => {
      return elements.map((el: Element) => ({
        tagName: el.tagName,
        type: (el as HTMLInputElement).type,
        hasLabel:
          el.hasAttribute('aria-label') ||
          el.hasAttribute('aria-labelledby') ||
          document.querySelector(`label[for="${(el as HTMLInputElement).id}"]`) !== null,
        hasPlaceholder: el.hasAttribute('placeholder'),
        isRequired: el.hasAttribute('required'),
      }));
    })) as FormControlInfo[];

    formControls.forEach((control: FormControlInfo) => {
      if (!control.hasLabel && control.type !== 'hidden') {
        checks.push({
          category: 'form-accessibility',
          description: '表单控件缺少标签',
          severity: 'high',
          element: control.tagName,
          recommendation: '为表单控件添加适当的标签或 aria-label',
          wcagLevel: 'A',
        });
      }
    });

    return checks;
  }

  /**
   * 检查多媒体无障碍
   */
  private async checkMultimediaAccessibility(page: Page): Promise<AccessibilityCheck[]> {
    const checks: AccessibilityCheck[] = [];

    // 检查视频是否有字幕
    const videos = (await page.$$eval('video', (elements: Element[]) => {
      return elements.map((el: Element) => ({
        hasTracks: el.querySelectorAll('track').length > 0,
        hasControls: el.hasAttribute('controls'),
      }));
    })) as VideoInfo[];

    videos.forEach((video: VideoInfo, index: number) => {
      if (!video.hasTracks) {
        checks.push({
          category: 'multimedia-accessibility',
          description: '视频缺少字幕或音轨',
          severity: 'medium',
          element: `VIDEO[${index}]`,
          recommendation: '为视频添加字幕轨道，提供听觉和视觉内容',
          wcagLevel: 'AA',
        });
      }
    });

    return checks;
  }

  /**
   * 计算无障碍评分
   */
  private calculateScore(checks: AccessibilityCheck[]): number {
    if (checks.length === 0) return 100;

    const severityWeights = {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1,
    };

    const totalWeight = checks.reduce((sum, check) => sum + severityWeights[check.severity], 0);
    const failedWeight = checks
      .filter(check => check.severity !== 'low')
      .reduce((sum, check) => sum + severityWeights[check.severity], 0);

    return Math.max(0, 100 - (failedWeight / totalWeight) * 100);
  }

  /**
   * 生成摘要
   */
  private generateSummary(checks: AccessibilityCheck[]): AccessibilityResult['summary'] {
    const summary: AccessibilityResult['summary'] = {
      keyboardNavigation: 0,
      screenReader: 0,
      colorContrast: 0,
      focusManagement: 0,
      semanticMarkup: 0,
      alternativeText: 0,
      formAccessibility: 0,
      multimediaAccessibility: 0,
    };

    checks.forEach(check => {
      const category = check.category.replace('-', '') as keyof typeof summary;
      if (category in summary) {
        summary[category]++;
      }
    });

    return summary;
  }

  /**
   * 生成建议
   */
  private generateRecommendations(checks: AccessibilityCheck[]): string[] {
    const recommendations = new Set<string>();

    checks
      .filter(check => check.severity !== 'low')
      .forEach(check => {
        recommendations.add(check.recommendation);
      });

    return Array.from(recommendations);
  }
}

export default new AccessibilityService();
