const Joi = require('joi');
const axios = require('axios');
const cheerio = require('cheerio');

type CheerioSelection = {
  each: (callback: (index: number, el: unknown) => void) => void;
  length?: number;
  attr?: (name: string) => string | undefined;
  text?: () => string;
  first?: () => { text: () => string };
};

type CheerioAPI = ((selector: string | unknown) => CheerioSelection) & {
  (el: unknown): CheerioSelection;
};

type AccessibilityConfig = {
  url: string;
  wcagLevel?: 'A' | 'AA' | 'AAA';
  checks?: string[];
  timeout?: number;
  includeWarnings?: boolean;
};

type AccessibilityCheckResult = {
  name: string;
  description: string;
  issues: Array<Record<string, unknown>>;
  passed: number;
  failed: number;
};

class AccessibilityTestEngine {
  name: string;
  version: string;
  activeTests: Map<string, Record<string, unknown>>;
  wcagLevels: string[];
  progressCallback: ((progress: Record<string, unknown>) => void) | null;
  completionCallback: ((results: Record<string, unknown>) => void) | null;
  errorCallback: ((error: Error) => void) | null;

  constructor() {
    this.name = 'accessibility';
    this.version = '2.0.0';
    this.activeTests = new Map();
    this.wcagLevels = ['A', 'AA', 'AAA'];
    this.progressCallback = null;
    this.completionCallback = null;
    this.errorCallback = null;
  }

  async checkAvailability() {
    try {
      const testResponse = await axios.get('https://httpbin.org/html', { timeout: 5000 });
      cheerio.load(testResponse.data);

      return {
        available: true,
        version: this.version,
        capabilities: this.getCapabilities(),
        dependencies: ['axios', 'cheerio'],
      };
    } catch (error) {
      return {
        available: false,
        error: (error as Error).message,
        dependencies: ['axios', 'cheerio'],
      };
    }
  }

  getCapabilities() {
    return {
      supportedTests: [
        'color-contrast',
        'alt-text',
        'headings-structure',
        'form-labels',
        'aria-attributes',
        'keyboard-navigation',
        'focus-management',
        'semantic-markup',
      ],
      wcagLevels: this.wcagLevels,
      maxConcurrent: 5,
      timeout: 60000,
    };
  }

  validateConfig(config: AccessibilityConfig) {
    const schema = Joi.object({
      url: Joi.string().uri().required(),
      wcagLevel: Joi.string().valid('A', 'AA', 'AAA').default('AA'),
      checks: Joi.array()
        .items(
          Joi.string().valid(
            'color-contrast',
            'alt-text',
            'headings-structure',
            'form-labels',
            'aria-attributes',
            'keyboard-navigation',
            'focus-management',
            'semantic-markup'
          )
        )
        .default(['color-contrast', 'alt-text', 'headings-structure', 'form-labels']),
      timeout: Joi.number().min(10000).max(120000).default(60000),
      includeWarnings: Joi.boolean().default(true),
    });

    const { error, value } = schema.validate(config);
    if (error) {
      throw new Error(`配置验证失败: ${error.details[0].message}`);
    }
    return value as AccessibilityConfig;
  }

  async runAccessibilityTest(config: AccessibilityConfig) {
    const testId = `accessibility_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    try {
      const validatedConfig = this.validateConfig(config);

      this.activeTests.set(testId, {
        status: 'running',
        progress: 0,
        startTime: Date.now(),
      });

      this.updateTestProgress(testId, 10, '开始可访问性测试');

      const results = await this.performAccessibilityTests(validatedConfig, testId);

      this.updateTestProgress(testId, 100, '测试完成');

      this.activeTests.set(testId, {
        status: 'completed',
        progress: 100,
        results,
      });

      if (this.completionCallback) {
        this.completionCallback(results);
      }

      return {
        success: true,
        testId,
        results,
        duration: Date.now() - ((this.activeTests.get(testId)?.startTime as number) || 0),
      };
    } catch (error) {
      this.activeTests.set(testId, {
        status: 'failed',
        error: (error as Error).message,
      });

      if (this.errorCallback) {
        this.errorCallback(error as Error);
      }
      throw error;
    }
  }

  async performAccessibilityTests(config: AccessibilityConfig, testId: string) {
    this.updateTestProgress(testId, 20, '获取页面内容');

    const response = await axios.get(config.url, {
      timeout: config.timeout,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AccessibilityBot/2.0)',
      },
    });

    const $ = cheerio.load(response.data) as CheerioAPI;

    const results = {
      testId,
      url: config.url,
      wcagLevel: config.wcagLevel,
      timestamp: new Date().toISOString(),
      checks: {} as Record<string, AccessibilityCheckResult>,
      summary: {
        totalIssues: 0,
        errors: 0,
        warnings: 0,
        passed: 0,
        score: 0,
      },
      recommendations: [] as string[],
    };

    const checkList = config.checks || [];
    const progressStep = checkList.length > 0 ? 70 / checkList.length : 70;
    let currentProgress = 20;

    for (const check of checkList) {
      this.updateTestProgress(testId, currentProgress, `执行${check}检查`);

      switch (check) {
        case 'color-contrast':
          results.checks.colorContrast = await this.checkColorContrast($);
          break;
        case 'alt-text':
          results.checks.altText = this.checkAltText($);
          break;
        case 'headings-structure':
          results.checks.headingsStructure = this.checkHeadingsStructure($);
          break;
        case 'form-labels':
          results.checks.formLabels = this.checkFormLabels($);
          break;
        case 'aria-attributes':
          results.checks.ariaAttributes = this.checkAriaAttributes($);
          break;
        case 'keyboard-navigation':
          results.checks.keyboardNavigation = this.checkKeyboardNavigation($);
          break;
        case 'focus-management':
          results.checks.focusManagement = this.checkFocusManagement($);
          break;
        case 'semantic-markup':
          results.checks.semanticMarkup = this.checkSemanticMarkup($);
          break;
      }

      currentProgress += progressStep;
    }

    results.summary = this.calculateAccessibilityScore(results.checks, config.wcagLevel || 'AA');
    results.recommendations = this.generateRecommendations(results.checks);

    return results;
  }

  async checkColorContrast($: CheerioAPI) {
    const result: AccessibilityCheckResult = {
      name: '颜色对比度',
      description: 'WCAG 颜色对比度要求检查',
      issues: [],
      passed: 0,
      failed: 0,
    };

    const textElements = $('p, span, div, h1, h2, h3, h4, h5, h6, a, button, label');

    textElements.each((_, el) => {
      const $el = $(el);
      const text = ($el.text ? $el.text() : '').trim();

      if (text.length > 0) {
        const style = this.parseInlineStyle($el.attr ? $el.attr('style') : undefined);
        const color = this.parseColor(style.color as string | undefined);
        const background = this.parseColor(
          (style['background-color'] || style.backgroundColor) as string | undefined
        );

        if (!color || !background) {
          result.passed++;
          return;
        }

        const contrast = this.calculateContrastRatio(color, background);
        const threshold = this.getContrastThreshold('AA');
        if (contrast >= threshold) {
          result.passed++;
        } else {
          result.failed++;
          result.issues.push({
            element: ((el as { tagName?: string }).tagName || '').toLowerCase(),
            text: text.substring(0, 50),
            issue: `颜色对比度不足(${contrast.toFixed(2)}:1)`,
            severity: 'error',
          });
        }
      }
    });

    return result;
  }

  checkAltText($: CheerioAPI) {
    const result: AccessibilityCheckResult = {
      name: '图片Alt属性',
      description: '检查图片是否有适当的Alt属性',
      issues: [],
      passed: 0,
      failed: 0,
    };

    $('img').each((_, el) => {
      const $img = $(el);
      const alt = $img.attr ? $img.attr('alt') : undefined;
      const src = $img.attr ? $img.attr('src') : undefined;

      if (!alt || alt.trim() === '') {
        result.failed++;
        result.issues.push({
          element: 'img',
          src: src || 'unknown',
          issue: '缺少Alt属性或Alt属性为空',
          severity: 'error',
          wcagCriterion: '1.1.1',
        });
      } else {
        result.passed++;
      }
    });

    return result;
  }

  checkHeadingsStructure($: CheerioAPI) {
    const result: AccessibilityCheckResult = {
      name: '标题结构',
      description: '检查标题层级结构是否合理',
      issues: [],
      passed: 0,
      failed: 0,
    };

    const headings = $('h1, h2, h3, h4, h5, h6');
    let previousLevel = 0;
    let hasH1 = false;

    headings.each((_, el) => {
      const currentLevel = parseInt(((el as { tagName?: string }).tagName || 'h0').charAt(1), 10);
      const text = ($(el).text ? $(el).text() : '').trim();

      if (currentLevel === 1) {
        hasH1 = true;
      }

      if (currentLevel > previousLevel + 1) {
        result.failed++;
        result.issues.push({
          element: ((el as { tagName?: string }).tagName || '').toLowerCase(),
          text: text.substring(0, 50),
          issue: `标题层级跳跃：从h${previousLevel}直接跳到h${currentLevel}`,
          severity: 'warning',
          wcagCriterion: '1.3.1',
        });
      } else {
        result.passed++;
      }

      previousLevel = currentLevel;
    });

    if (!hasH1 && (headings.length || 0) > 0) {
      result.failed++;
      result.issues.push({
        element: 'page',
        issue: '页面缺少h1标题',
        severity: 'error',
        wcagCriterion: '1.3.1',
      });
    }

    return result;
  }

  checkFormLabels($: CheerioAPI) {
    const result: AccessibilityCheckResult = {
      name: '表单标签',
      description: '检查表单控件是否有适当的标签',
      issues: [],
      passed: 0,
      failed: 0,
    };

    $('input, select, textarea').each((_, el) => {
      const $el = $(el);
      const type = $el.attr ? $el.attr('type') : undefined;
      const id = $el.attr ? $el.attr('id') : undefined;
      const name = $el.attr ? $el.attr('name') : undefined;

      if (type === 'hidden' || type === 'submit' || type === 'button') {
        return;
      }

      const hasLabel = id && ($(`label[for="${id}"]`).length || 0) > 0;
      const hasAriaLabel = $el.attr ? $el.attr('aria-label') : undefined;
      const hasAriaLabelledby = $el.attr ? $el.attr('aria-labelledby') : undefined;

      if (hasLabel || hasAriaLabel || hasAriaLabelledby) {
        result.passed++;
      } else {
        result.failed++;
        result.issues.push({
          element: ((el as { tagName?: string }).tagName || '').toLowerCase(),
          type: type || 'unknown',
          name: name || 'unnamed',
          issue: '表单控件缺少标签',
          severity: 'error',
          wcagCriterion: '1.3.1',
        });
      }
    });

    return result;
  }

  checkAriaAttributes($: CheerioAPI) {
    const result: AccessibilityCheckResult = {
      name: 'ARIA属性',
      description: '检查ARIA属性的正确使用',
      issues: [],
      passed: 0,
      failed: 0,
    };

    $('[aria-label], [aria-labelledby], [aria-describedby], [role]').each(() => {
      result.passed++;
    });

    $('div[onclick], span[onclick]').each((_, el) => {
      const $el = $(el);
      const hasRole = $el.attr ? $el.attr('role') : undefined;

      if (!hasRole) {
        result.failed++;
        result.issues.push({
          element: ((el as { tagName?: string }).tagName || '').toLowerCase(),
          issue: '可点击元素缺少role属性',
          severity: 'warning',
          wcagCriterion: '4.1.2',
        });
      }
    });

    return result;
  }

  checkKeyboardNavigation($: CheerioAPI) {
    const result: AccessibilityCheckResult = {
      name: '键盘导航',
      description: '检查键盘导航支持',
      issues: [],
      passed: 0,
      failed: 0,
    };

    const focusableElements = $('a, button, input, select, textarea, [tabindex]');

    focusableElements.each((_, el) => {
      const $el = $(el);
      const tabindex = $el.attr ? $el.attr('tabindex') : undefined;

      if (
        tabindex === '-1' &&
        !['button', 'a'].includes(((el as { tagName?: string }).tagName || '').toLowerCase())
      ) {
        result.issues.push({
          element: ((el as { tagName?: string }).tagName || '').toLowerCase(),
          issue: '元素设置了tabindex="-1"，可能无法通过键盘访问',
          severity: 'warning',
          wcagCriterion: '2.1.1',
        });
      } else {
        result.passed++;
      }
    });

    return result;
  }

  checkFocusManagement($: CheerioAPI) {
    const result: AccessibilityCheckResult = {
      name: '焦点管理',
      description: '检查焦点指示器和管理',
      issues: [],
      passed: 0,
      failed: 0,
    };

    const focusable = $('a, button, input, select, textarea, [tabindex]');
    focusable.each((_, el) => {
      const $el = $(el);
      const style = this.parseInlineStyle($el.attr ? $el.attr('style') : undefined);
      const outline = style.outline || style['outline-style'];
      if (outline && outline.includes('none')) {
        result.failed++;
        result.issues.push({
          element: ((el as { tagName?: string }).tagName || '').toLowerCase(),
          issue: '元素禁用了焦点样式(outline:none)',
          severity: 'warning',
          wcagCriterion: '2.4.7',
        });
      } else {
        result.passed++;
      }
    });

    return result;
  }

  checkSemanticMarkup($: CheerioAPI) {
    const result: AccessibilityCheckResult = {
      name: '语义化标记',
      description: '检查HTML语义化标记的使用',
      issues: [],
      passed: 0,
      failed: 0,
    };

    const semanticElements = ['main', 'nav', 'section', 'article', 'aside', 'header', 'footer'];

    semanticElements.forEach(element => {
      if (($(`${element}`).length || 0) > 0) {
        result.passed++;
      }
    });

    const divCount = $('div').length || 0;
    const totalElements = $('*').length || 0;

    if (totalElements > 0 && divCount > totalElements * 0.3) {
      result.issues.push({
        element: 'page',
        issue: 'div元素使用过多，建议使用更多语义化元素',
        severity: 'info',
      });
    }

    return result;
  }

  calculateAccessibilityScore(
    checks: Record<string, AccessibilityCheckResult>,
    _wcagLevel: string
  ) {
    let totalIssues = 0;
    let errors = 0;
    let warnings = 0;
    let passed = 0;

    Object.values(checks).forEach(check => {
      totalIssues += check.failed;
      passed += check.passed;
      check.issues.forEach(issue => {
        if ((issue as { severity?: string }).severity === 'error') {
          errors++;
        } else {
          warnings++;
        }
      });
    });

    const score = Math.max(0, 100 - errors * 10 - warnings * 5);

    return {
      totalIssues,
      errors,
      warnings,
      passed,
      score,
    };
  }

  generateRecommendations(checks: Record<string, AccessibilityCheckResult>) {
    const recommendations: string[] = [];

    Object.values(checks).forEach(check => {
      check.issues.forEach(issue => {
        const issueText = (issue as { issue?: string }).issue;
        if (issueText) {
          recommendations.push(issueText);
        }
      });
    });

    if (recommendations.length === 0) {
      recommendations.push('页面可访问性表现良好');
    }

    return recommendations;
  }

  parseInlineStyle(style?: string) {
    const styles: Record<string, string> = {};
    if (!style) return styles;

    style.split(';').forEach(item => {
      const [key, value] = item.split(':').map(v => v.trim());
      if (key && value) {
        styles[key] = value;
      }
    });
    return styles;
  }

  parseColor(color?: string) {
    if (!color) return null;
    if (color.startsWith('#')) {
      const hex = color.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      return { r, g, b };
    }
    if (color.startsWith('rgb')) {
      const values = color.match(/\d+/g);
      if (!values || values.length < 3) return null;
      return { r: parseInt(values[0], 10), g: parseInt(values[1], 10), b: parseInt(values[2], 10) };
    }
    return null;
  }

  calculateContrastRatio(
    color: { r: number; g: number; b: number },
    background: { r: number; g: number; b: number }
  ) {
    const luminance = (c: { r: number; g: number; b: number }) => {
      const [r, g, b] = [c.r, c.g, c.b].map(val => {
        const channel = val / 255;
        return channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };

    const l1 = luminance(color) + 0.05;
    const l2 = luminance(background) + 0.05;
    return l1 > l2 ? l1 / l2 : l2 / l1;
  }

  getContrastThreshold(level: string) {
    if (level === 'AAA') return 7;
    return 4.5;
  }

  updateTestProgress(testId: string, progress: number, message: string) {
    const test = this.activeTests.get(testId) || { status: 'running' };
    this.activeTests.set(testId, {
      ...test,
      status: (test as { status?: string }).status || 'running',
      progress,
      message,
      lastUpdate: Date.now(),
    });

    if (this.progressCallback) {
      this.progressCallback({
        testId,
        progress,
        message,
        status: (test as { status?: string }).status || 'running',
      });
    }
  }

  getTestStatus(testId: string) {
    return this.activeTests.get(testId);
  }

  async stopTest(testId: string) {
    const test = this.activeTests.get(testId);
    if (test) {
      this.activeTests.set(testId, {
        ...test,
        status: 'stopped',
      });
      return true;
    }
    return false;
  }

  setProgressCallback(callback: (progress: Record<string, unknown>) => void) {
    this.progressCallback = callback;
  }

  setCompletionCallback(callback: (results: Record<string, unknown>) => void) {
    this.completionCallback = callback;
  }

  setErrorCallback(callback: (error: Error) => void) {
    this.errorCallback = callback;
  }

  async cleanup() {
    console.log('✅ 可访问性测试引擎清理完成');
  }
}

module.exports = AccessibilityTestEngine;

export {};
