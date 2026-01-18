/**
 * 可访问性测试引擎
 * WCAG 2.1 合规性检查、颜色对比度测试、键盘导航等
 */

const Joi = require('joi');
const axios = require('axios');
const cheerio = require('cheerio');

class AccessibilityTestEngine {
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
      // 测试基础依赖是否可用
      const testResponse = await axios.get('https://httpbin.org/html', { timeout: 5000 });
      cheerio.load(testResponse.data);
      
      return {
        available: true,
        version: this.version,
        capabilities: this.getCapabilities(),
        dependencies: ['axios', 'cheerio']
      };
    } catch (error) {
      return {
        available: false,
        error: error.message,
        dependencies: ['axios', 'cheerio']
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
        'semantic-markup'
      ],
      wcagLevels: this.wcagLevels,
      maxConcurrent: 5,
      timeout: 60000
    };
  }

  validateConfig(config) {
    const schema = Joi.object({
      url: Joi.string().uri().required(),
      wcagLevel: Joi.string().valid('A', 'AA', 'AAA').default('AA'),
      checks: Joi.array().items(
        Joi.string().valid(
          'color-contrast', 'alt-text', 'headings-structure', 
          'form-labels', 'aria-attributes', 'keyboard-navigation',
          'focus-management', 'semantic-markup'
        )
      ).default(['color-contrast', 'alt-text', 'headings-structure', 'form-labels']),
      timeout: Joi.number().min(10000).max(120000).default(60000),
      includeWarnings: Joi.boolean().default(true)
    });

    /**
     * if功能函数
     * @param {Object} params - 参数对象
     * @returns {Promise<Object>} 返回结果
     */
    const { error, value } = schema.validate(config);
    if (error) {
      throw new Error(`配置验证失败: ${error.details[0].message}`);
    }
    return value;
  }

  async runAccessibilityTest(config) {
    const testId = `accessibility_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    
    try {
      const validatedConfig = this.validateConfig(config);
      
      this.activeTests.set(testId, {
        status: 'running',
        progress: 0,
        startTime: Date.now()
      });

      this.updateTestProgress(testId, 10, '开始可访问性测试');

      const results = await this.performAccessibilityTests(validatedConfig, testId);
      
      this.updateTestProgress(testId, 100, '测试完成');
      
      this.activeTests.set(testId, {
        status: 'completed',
        progress: 100,
        results
      });

      if (this.completionCallback) {
        this.completionCallback(results);
      }
      
      return {
        success: true,
        testId,
        results,
        duration: Date.now() - this.activeTests.get(testId)?.startTime || 0
      };

    } catch (error) {
      this.activeTests.set(testId, {
        status: 'failed',
        error: error.message
      });

      if (this.errorCallback) {
        this.errorCallback(error);
      }
      throw error;
    }
  }

  async performAccessibilityTests(config, testId) {
    this.updateTestProgress(testId, 20, '获取页面内容');
    
    // 获取页面HTML内容
    const response = await axios.get(config.url, {
      timeout: config.timeout,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AccessibilityBot/2.0)'
      }
    });
    
    const $ = cheerio.load(response.data);
    
    const results = {
      testId,
      url: config.url,
      wcagLevel: config.wcagLevel,
      timestamp: new Date().toISOString(),
      checks: {},
      summary: {
        totalIssues: 0,
        errors: 0,
        warnings: 0,
        passed: 0,
        score: 0
      },
      recommendations: []
    };

    const progressStep = 70 / config.checks.length;
    let currentProgress = 20;

    // 执行各项可访问性检查
    for (const check of config.checks) {
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

    // 计算总体评分和统计
    results.summary = this.calculateAccessibilityScore(results.checks, config.wcagLevel);
    results.recommendations = this.generateRecommendations(results.checks);
    
    return results;
  }

  async checkColorContrast($) {
    const result = {
      name: '颜色对比度',
      description: 'WCAG 颜色对比度要求检查',
      issues: [],
      passed: 0,
      failed: 0
    };

    // 检查所有可能有颜色的元素
    const textElements = $('p, span, div, h1, h2, h3, h4, h5, h6, a, button, label');

    textElements.each((i, el) => {
      const $el = $(el);
      const text = $el.text().trim();
      
      if (text.length > 0) {
        const style = this.parseInlineStyle($el.attr('style'));
        const color = this.parseColor(style.color);
        const background = this.parseColor(style['background-color'] || style.backgroundColor);

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
            element: el.tagName.toLowerCase(),
            text: text.substring(0, 50),
            issue: `颜色对比度不足(${contrast.toFixed(2)}:1)`,
            severity: 'error'
          });
        }
      }
    });

    return result;
  }

  checkAltText($) {
    const result = {
      name: '图片Alt属性',
      description: '检查图片是否有适当的Alt属性',
      issues: [],
      passed: 0,
      failed: 0
    };

    $('img').each((i, el) => {
      const $img = $(el);
      const alt = $img.attr('alt');
      const src = $img.attr('src');
      
      if (!alt || alt.trim() === '') {
        result.failed++;
        result.issues.push({
          element: 'img',
          src: src || 'unknown',
          issue: '缺少Alt属性或Alt属性为空',
          severity: 'error',
          wcagCriterion: '1.1.1'
        });
      } else {
        result.passed++;
      }
    });

    return result;
  }

  checkHeadingsStructure($) {
    const result = {
      name: '标题结构',
      description: '检查标题层级结构是否合理',
      issues: [],
      passed: 0,
      failed: 0
    };

    const headings = $('h1, h2, h3, h4, h5, h6');
    let previousLevel = 0;
    let hasH1 = false;

    headings.each((i, el) => {
      const currentLevel = parseInt(el.tagName.charAt(1));
      const text = $(el).text().trim();

      if (currentLevel === 1) {
        hasH1 = true;
      }

      if (currentLevel > previousLevel + 1) {
        result.failed++;
        result.issues.push({
          element: el.tagName.toLowerCase(),
          text: text.substring(0, 50),
          issue: `标题层级跳跃：从h${previousLevel}直接跳到h${currentLevel}`,
          severity: 'warning',
          wcagCriterion: '1.3.1'
        });
      } else {
        result.passed++;
      }

      previousLevel = currentLevel;
    });

    if (!hasH1 && headings.length > 0) {
      result.failed++;
      result.issues.push({
        element: 'page',
        issue: '页面缺少h1标题',
        severity: 'error',
        wcagCriterion: '1.3.1'
      });
    }

    return result;
  }

  checkFormLabels($) {
    const result = {
      name: '表单标签',
      description: '检查表单控件是否有适当的标签',
      issues: [],
      passed: 0,
      failed: 0
    };

    $('input, select, textarea').each((i, el) => {
      const $el = $(el);
      const type = $el.attr('type');
      const id = $el.attr('id');
      const name = $el.attr('name');
      
      // 跳过隐藏字段和按钮
      if (type === 'hidden' || type === 'submit' || type === 'button') {
        return;
      }

      const hasLabel = id && $(`label[for="${id}"]`).length > 0;
      const hasAriaLabel = $el.attr('aria-label');

      /**

       * if功能函数

       * @param {Object} params - 参数对象

       * @returns {Promise<Object>} 返回结果

       */
      const hasAriaLabelledby = $el.attr('aria-labelledby');

      if (hasLabel || hasAriaLabel || hasAriaLabelledby) {
        result.passed++;
      } else {
        result.failed++;
        result.issues.push({
          element: el.tagName.toLowerCase(),
          type: type || 'unknown',
          name: name || 'unnamed',
          issue: '表单控件缺少标签',
          severity: 'error',
          wcagCriterion: '1.3.1'
        });
      }
    });

    return result;
  }

  checkAriaAttributes($) {
    const result = {
      name: 'ARIA属性',
      description: '检查ARIA属性的正确使用',
      issues: [],
      passed: 0,
      failed: 0
    };

    // 检查常见的ARIA属性
    $('[aria-label], [aria-labelledby], [aria-describedby], [role]').each(() => {
      result.passed++; // 简化检查，认为有ARIA属性就是好的
    });

    // 检查可能需要ARIA的元素
    $('div[onclick], span[onclick]').each((i, el) => {
      const $el = $(el);
      const hasRole = $el.attr('role');
      
      if (!hasRole) {
        result.failed++;
        result.issues.push({
          element: el.tagName.toLowerCase(),
          issue: '可点击元素缺少role属性',
          severity: 'warning',
          wcagCriterion: '4.1.2'
        });
      }
    });

    return result;
  }

  checkKeyboardNavigation($) {
    const result = {
      name: '键盘导航',
      description: '检查键盘导航支持',
      issues: [],
      passed: 0,
      failed: 0
    };

    // 检查可聚焦元素
    const focusableElements = $('a, button, input, select, textarea, [tabindex]');
    
    focusableElements.each((i, el) => {
      const $el = $(el);
      const tabindex = $el.attr('tabindex');
      
      if (tabindex === '-1' && !['button', 'a'].includes(el.tagName.toLowerCase())) {
        result.issues.push({
          element: el.tagName.toLowerCase(),
          issue: '元素设置了tabindex="-1"，可能无法通过键盘访问',
          severity: 'warning',
          wcagCriterion: '2.1.1'
        });
      } else {
        result.passed++;
      }
    });

    return result;
  }

  checkFocusManagement($) {
    const result = {
      name: '焦点管理',
      description: '检查焦点指示器和管理',
      issues: [],
      passed: 0,
      failed: 0
    };

    const focusable = $('a, button, input, select, textarea, [tabindex]');
    focusable.each((_, el) => {
      const $el = $(el);
      const style = this.parseInlineStyle($el.attr('style'));
      const outline = style.outline || style['outline-style'];
      if (outline && outline.includes('none')) {
        result.failed++;
        result.issues.push({
          element: el.tagName.toLowerCase(),
          issue: '元素禁用了焦点样式(outline:none)',
          severity: 'warning',
          wcagCriterion: '2.4.7'
        });
      } else {
        result.passed++;
      }
    });
    
    return result;
  }

  checkSemanticMarkup($) {
    const result = {
      name: '语义化标记',
      description: '检查HTML语义化标记的使用',
      issues: [],
      passed: 0,
      failed: 0
    };

    // 检查语义化元素的使用
    const semanticElements = ['main', 'nav', 'section', 'article', 'aside', 'header', 'footer'];
    
    semanticElements.forEach(element => {
      if ($(element).length > 0) {
        result.passed++;
      }
    });

    // 检查过度使用div的情况
    const divCount = $('div').length;
    const totalElements = $('*').length;
    
    if (divCount > totalElements * 0.3) {
      result.issues.push({
        element: 'page',
        issue: 'div元素使用过多，建议使用更多语义化元素',
        severity: 'info'
      });
    }

    return result;
  }

  calculateAccessibilityScore(checks, _wcagLevel) {
    let totalIssues = 0;
    let errors = 0;
    let warnings = 0;
    let passed = 0;

    Object.values(checks).forEach(check => {
      if (check.issues) {
        check.issues.forEach(issue => {
          totalIssues++;
          if (issue.severity === 'error') {
            errors++;
          } else if (issue.severity === 'warning') {
            warnings++;
          }
        });
      }
      if (check.passed) {
        passed += check.passed;
      }
    });

    // 计算评分 (0-100)
    const totalChecks = passed + errors + warnings;
    const score = totalChecks > 0 ? Math.round((passed / totalChecks) * 100) : 0;

    return {
      totalIssues,
      errors,
      warnings,
      passed,
      score
    };
  }

  generateRecommendations(checks) {
    const recommendations = [];

    Object.values(checks).forEach(check => {
      if (check.issues && check.issues.length > 0) {
        const errorCount = check.issues.filter(i => i.severity === 'error').length;
        if (errorCount > 0) {
          recommendations.push(`修复 ${check.name} 中的 ${errorCount} 个错误`);
        }
      }
    });

    if (recommendations.length === 0) {
      recommendations.push('页面可访问性良好，继续保持！');
    }

    return recommendations;
  }

  parseInlineStyle(style = '') {
    return style.split(';').reduce((acc, pair) => {
      const [key, value] = pair.split(':').map(item => item?.trim());
      if (key && value) {
        acc[key.replace(/-([a-z])/g, (_, char) => char.toUpperCase())] = value;
      }
      return acc;
    }, {});
  }

  parseColor(value) {
    if (!value) return null;
    const hexMatch = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (hexMatch) {
      const hex = hexMatch[1].length === 3
        ? hexMatch[1].split('').map(c => c + c).join('')
        : hexMatch[1];
      const num = parseInt(hex, 16);
      return {
        r: (num >> 16) & 255,
        g: (num >> 8) & 255,
        b: num & 255
      };
    }

    const rgbMatch = value.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/i);
    if (rgbMatch) {
      return {
        r: Number(rgbMatch[1]),
        g: Number(rgbMatch[2]),
        b: Number(rgbMatch[3])
      };
    }

    return null;
  }

  calculateContrastRatio(foreground, background) {
    const luminance = (color) => {
      const channel = (value) => {
        const c = value / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      };
      return 0.2126 * channel(color.r) + 0.7152 * channel(color.g) + 0.0722 * channel(color.b);
    };
    const l1 = luminance(foreground) + 0.05;
    const l2 = luminance(background) + 0.05;
    return l1 > l2 ? l1 / l2 : l2 / l1;
  }

  getContrastThreshold(level = 'AA') {
    if (level === 'AAA') return 7;
    if (level === 'A') return 3;
    return 4.5;
  }

  updateTestProgress(testId, progress, message) {
    const test = this.activeTests.get(testId);
    if (test) {
      test.progress = progress;
      test.message = message;
    }

    if (this.progressCallback) {
      this.progressCallback({
        testId,
        progress,
        message,
        status: test?.status || 'running'
      });
    }
  }

  getTestStatus(testId) {
    return this.activeTests.get(testId);
  }

  async stopTest(testId) {
    const test = this.activeTests.get(testId);
    if (test) {
      this.activeTests.delete(testId);
      return true;
    }
    return false;
  }

  setProgressCallback(callback) {
    this.progressCallback = callback;
  }

  setCompletionCallback(callback) {
    this.completionCallback = callback;
  }

  setErrorCallback(callback) {
    this.errorCallback = callback;
  }
}

module.exports = AccessibilityTestEngine;
