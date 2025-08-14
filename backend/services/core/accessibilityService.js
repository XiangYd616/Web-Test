/**
 * 无障碍功能服务
 * 提供无障碍检测、评估、优化建议功能
 */

const Logger = require('../utils/logger');

class AccessibilityService {
  constructor() {
    this.logger = Logger;
    this.wcagLevels = ['A', 'AA', 'AAA'];
    this.checkCategories = [
      'keyboard-navigation',
      'screen-reader',
      'color-contrast',
      'focus-management',
      'semantic-markup',
      'alternative-text',
      'form-accessibility',
      'multimedia-accessibility'
    ];
    this.contrastRatios = {
      'AA': { normal: 4.5, large: 3.0 },
      'AAA': { normal: 7.0, large: 4.5 }
    };
  }

  /**
   * 执行无障碍检测
   */
  async performAccessibilityCheck(checkConfig) {
    try {
      this.logger.info('开始无障碍检测:', checkConfig);

      const { url, level = 'AA', categories = this.checkCategories } = checkConfig;

      if (!url) {
        throw new Error('URL参数是必需的');
      }

      if (!this.wcagLevels.includes(level)) {
        throw new Error(`不支持的WCAG级别: ${level}`);
      }

      // 执行各项检测
      const results = {
        url,
        level,
        timestamp: new Date().toISOString(),
        checks: {},
        summary: {},
        recommendations: []
      };

      // 执行各类别检测
      for (const category of categories) {
        if (this.checkCategories.includes(category)) {
          results.checks[category] = await this.performCategoryCheck(url, category, level);
        }
      }

      // 生成摘要
      results.summary = this.generateSummary(results.checks);

      // 生成建议
      results.recommendations = this.generateRecommendations(results.checks, level);

      return {
        success: true,
        data: results
      };
    } catch (error) {
      this.logger.error('无障碍检测失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 执行分类检测
   */
  async performCategoryCheck(url, category, level) {
    try {
      switch (category) {
        case 'keyboard-navigation':
          return await this.checkKeyboardNavigation(url);
        case 'screen-reader':
          return await this.checkScreenReaderCompatibility(url);
        case 'color-contrast':
          return await this.checkColorContrast(url, level);
        case 'focus-management':
          return await this.checkFocusManagement(url);
        case 'semantic-markup':
          return await this.checkSemanticMarkup(url);
        case 'alternative-text':
          return await this.checkAlternativeText(url);
        case 'form-accessibility':
          return await this.checkFormAccessibility(url);
        case 'multimedia-accessibility':
          return await this.checkMultimediaAccessibility(url);
        default:
          return { status: 'skipped', message: '未知的检测类别' };
      }
    } catch (error) {
      this.logger.error(`${category}检测失败:`, error);
      return {
        status: 'error',
        message: error.message,
        issues: []
      };
    }
  }

  /**
   * 检测键盘导航
   */
  async checkKeyboardNavigation(url) {
    // 模拟键盘导航检测
    const issues = [];
    const elements = await this.simulateElementDetection(url);

    // 检查可聚焦元素
    const focusableElements = elements.filter(el => el.focusable);
    if (focusableElements.length === 0) {
      issues.push({
        type: 'no-focusable-elements',
        severity: 'high',
        message: '页面中没有可聚焦的元素',
        element: 'body'
      });
    }

    // 检查Tab顺序
    const tabIndexIssues = elements.filter(el => el.tabIndex && el.tabIndex > 0);
    if (tabIndexIssues.length > 0) {
      issues.push({
        type: 'positive-tabindex',
        severity: 'medium',
        message: '使用了正数tabindex，可能影响键盘导航顺序',
        count: tabIndexIssues.length
      });
    }

    // 检查跳转链接
    const hasSkipLinks = elements.some(el => el.type === 'skip-link');
    if (!hasSkipLinks) {
      issues.push({
        type: 'missing-skip-links',
        severity: 'medium',
        message: '缺少跳转到主内容的链接',
        recommendation: '添加"跳转到主内容"链接'
      });
    }

    return {
      status: issues.length === 0 ? 'pass' : 'fail',
      score: Math.max(0, 100 - issues.length * 20),
      issues,
      checkedElements: elements.length
    };
  }

  /**
   * 检测屏幕阅读器兼容性
   */
  async checkScreenReaderCompatibility(url) {
    const issues = [];
    const elements = await this.simulateElementDetection(url);

    // 检查ARIA标签
    const elementsWithoutAria = elements.filter(el => 
      el.interactive && !el.ariaLabel && !el.ariaLabelledBy
    );
    
    if (elementsWithoutAria.length > 0) {
      issues.push({
        type: 'missing-aria-labels',
        severity: 'high',
        message: '交互元素缺少ARIA标签',
        count: elementsWithoutAria.length
      });
    }

    // 检查标题结构
    const headings = elements.filter(el => el.type === 'heading');
    const headingLevels = headings.map(h => h.level).sort();
    
    for (let i = 1; i < headingLevels.length; i++) {
      if (headingLevels[i] - headingLevels[i-1] > 1) {
        issues.push({
          type: 'heading-structure',
          severity: 'medium',
          message: '标题层级跳跃，影响屏幕阅读器导航',
          details: `从H${headingLevels[i-1]}跳跃到H${headingLevels[i]}`
        });
      }
    }

    // 检查地标元素
    const landmarks = elements.filter(el => el.landmark);
    if (landmarks.length === 0) {
      issues.push({
        type: 'missing-landmarks',
        severity: 'medium',
        message: '缺少地标元素（main, nav, aside等）',
        recommendation: '使用语义化的地标元素'
      });
    }

    return {
      status: issues.length === 0 ? 'pass' : 'fail',
      score: Math.max(0, 100 - issues.length * 15),
      issues,
      headingCount: headings.length,
      landmarkCount: landmarks.length
    };
  }

  /**
   * 检测颜色对比度
   */
  async checkColorContrast(url, level) {
    const issues = [];
    const textElements = await this.simulateTextElementDetection(url);
    const requiredRatio = this.contrastRatios[level];

    for (const element of textElements) {
      const contrast = this.calculateContrastRatio(element.foreground, element.background);
      const isLargeText = element.fontSize >= 18 || (element.fontSize >= 14 && element.bold);
      const minRatio = isLargeText ? requiredRatio.large : requiredRatio.normal;

      if (contrast < minRatio) {
        issues.push({
          type: 'low-contrast',
          severity: contrast < minRatio * 0.8 ? 'high' : 'medium',
          message: `颜色对比度不足 (${contrast.toFixed(2)}:1, 需要${minRatio}:1)`,
          element: element.selector,
          currentRatio: contrast,
          requiredRatio: minRatio,
          isLargeText
        });
      }
    }

    return {
      status: issues.length === 0 ? 'pass' : 'fail',
      score: Math.max(0, 100 - (issues.length / textElements.length) * 100),
      issues,
      checkedElements: textElements.length,
      level
    };
  }

  /**
   * 检测焦点管理
   */
  async checkFocusManagement(url) {
    const issues = [];
    const interactiveElements = await this.simulateInteractiveElementDetection(url);

    // 检查焦点可见性
    const elementsWithoutFocusStyle = interactiveElements.filter(el => !el.focusVisible);
    if (elementsWithoutFocusStyle.length > 0) {
      issues.push({
        type: 'focus-not-visible',
        severity: 'high',
        message: '焦点状态不可见',
        count: elementsWithoutFocusStyle.length
      });
    }

    // 检查焦点陷阱
    const modals = interactiveElements.filter(el => el.type === 'modal');
    const modalsWithoutTrap = modals.filter(modal => !modal.focusTrap);
    if (modalsWithoutTrap.length > 0) {
      issues.push({
        type: 'missing-focus-trap',
        severity: 'high',
        message: '模态框缺少焦点陷阱',
        count: modalsWithoutTrap.length
      });
    }

    return {
      status: issues.length === 0 ? 'pass' : 'fail',
      score: Math.max(0, 100 - issues.length * 25),
      issues,
      checkedElements: interactiveElements.length
    };
  }

  /**
   * 检测语义化标记
   */
  async checkSemanticMarkup(url) {
    const issues = [];
    const elements = await this.simulateElementDetection(url);

    // 检查语义化元素使用
    const divCount = elements.filter(el => el.tagName === 'div').length;
    const semanticCount = elements.filter(el => 
      ['header', 'nav', 'main', 'section', 'article', 'aside', 'footer'].includes(el.tagName)
    ).length;

    if (semanticCount === 0 && divCount > 10) {
      issues.push({
        type: 'no-semantic-elements',
        severity: 'medium',
        message: '过度使用div元素，缺少语义化标记',
        divCount,
        recommendation: '使用语义化HTML5元素'
      });
    }

    // 检查列表结构
    const lists = elements.filter(el => ['ul', 'ol'].includes(el.tagName));
    const improperLists = lists.filter(list => list.children.some(child => child.tagName !== 'li'));
    if (improperLists.length > 0) {
      issues.push({
        type: 'improper-list-structure',
        severity: 'medium',
        message: '列表结构不正确',
        count: improperLists.length
      });
    }

    return {
      status: issues.length === 0 ? 'pass' : 'fail',
      score: Math.max(0, 100 - issues.length * 20),
      issues,
      semanticElementCount: semanticCount,
      totalElements: elements.length
    };
  }

  /**
   * 检测替代文本
   */
  async checkAlternativeText(url) {
    const issues = [];
    const images = await this.simulateImageDetection(url);

    // 检查图片alt属性
    const imagesWithoutAlt = images.filter(img => !img.alt);
    if (imagesWithoutAlt.length > 0) {
      issues.push({
        type: 'missing-alt-text',
        severity: 'high',
        message: '图片缺少alt属性',
        count: imagesWithoutAlt.length
      });
    }

    // 检查装饰性图片
    const decorativeImages = images.filter(img => img.decorative && img.alt !== '');
    if (decorativeImages.length > 0) {
      issues.push({
        type: 'decorative-alt-text',
        severity: 'medium',
        message: '装饰性图片应使用空alt属性',
        count: decorativeImages.length
      });
    }

    return {
      status: issues.length === 0 ? 'pass' : 'fail',
      score: Math.max(0, 100 - (issues.length / Math.max(images.length, 1)) * 100),
      issues,
      totalImages: images.length
    };
  }

  /**
   * 检测表单无障碍性
   */
  async checkFormAccessibility(url) {
    const issues = [];
    const forms = await this.simulateFormDetection(url);

    for (const form of forms) {
      // 检查标签关联
      const inputsWithoutLabels = form.inputs.filter(input => !input.label);
      if (inputsWithoutLabels.length > 0) {
        issues.push({
          type: 'missing-form-labels',
          severity: 'high',
          message: '表单控件缺少标签',
          formId: form.id,
          count: inputsWithoutLabels.length
        });
      }

      // 检查错误提示
      const requiredFields = form.inputs.filter(input => input.required);
      const fieldsWithoutErrorHandling = requiredFields.filter(field => !field.errorMessage);
      if (fieldsWithoutErrorHandling.length > 0) {
        issues.push({
          type: 'missing-error-messages',
          severity: 'medium',
          message: '必填字段缺少错误提示',
          formId: form.id,
          count: fieldsWithoutErrorHandling.length
        });
      }
    }

    return {
      status: issues.length === 0 ? 'pass' : 'fail',
      score: Math.max(0, 100 - issues.length * 20),
      issues,
      totalForms: forms.length
    };
  }

  /**
   * 检测多媒体无障碍性
   */
  async checkMultimediaAccessibility(url) {
    const issues = [];
    const mediaElements = await this.simulateMediaDetection(url);

    // 检查视频字幕
    const videosWithoutCaptions = mediaElements.videos.filter(video => !video.captions);
    if (videosWithoutCaptions.length > 0) {
      issues.push({
        type: 'missing-video-captions',
        severity: 'high',
        message: '视频缺少字幕',
        count: videosWithoutCaptions.length
      });
    }

    // 检查音频描述
    const audiosWithoutTranscript = mediaElements.audios.filter(audio => !audio.transcript);
    if (audiosWithoutTranscript.length > 0) {
      issues.push({
        type: 'missing-audio-transcript',
        severity: 'medium',
        message: '音频缺少文字描述',
        count: audiosWithoutTranscript.length
      });
    }

    return {
      status: issues.length === 0 ? 'pass' : 'fail',
      score: Math.max(0, 100 - issues.length * 30),
      issues,
      totalVideos: mediaElements.videos.length,
      totalAudios: mediaElements.audios.length
    };
  }

  /**
   * 生成检测摘要
   */
  generateSummary(checks) {
    const categories = Object.keys(checks);
    const passedChecks = categories.filter(cat => checks[cat].status === 'pass').length;
    const totalIssues = categories.reduce((sum, cat) => sum + (checks[cat].issues?.length || 0), 0);
    const averageScore = categories.reduce((sum, cat) => sum + (checks[cat].score || 0), 0) / categories.length;

    return {
      totalCategories: categories.length,
      passedCategories: passedChecks,
      failedCategories: categories.length - passedChecks,
      totalIssues,
      averageScore: Math.round(averageScore),
      overallStatus: passedChecks === categories.length ? 'pass' : 'fail',
      complianceLevel: this.getComplianceLevel(averageScore)
    };
  }

  /**
   * 生成改进建议
   */
  generateRecommendations(checks, level) {
    const recommendations = [];
    const highPriorityIssues = [];
    const mediumPriorityIssues = [];

    Object.values(checks).forEach(check => {
      if (check.issues) {
        check.issues.forEach(issue => {
          if (issue.severity === 'high') {
            highPriorityIssues.push(issue);
          } else if (issue.severity === 'medium') {
            mediumPriorityIssues.push(issue);
          }
        });
      }
    });

    // 高优先级建议
    if (highPriorityIssues.length > 0) {
      recommendations.push({
        priority: 'high',
        title: '紧急修复项',
        description: '这些问题严重影响无障碍性，需要立即修复',
        actions: this.getHighPriorityActions(highPriorityIssues)
      });
    }

    // 中优先级建议
    if (mediumPriorityIssues.length > 0) {
      recommendations.push({
        priority: 'medium',
        title: '改进建议',
        description: '这些改进可以进一步提升无障碍性',
        actions: this.getMediumPriorityActions(mediumPriorityIssues)
      });
    }

    // 通用建议
    recommendations.push({
      priority: 'general',
      title: '最佳实践',
      description: `遵循WCAG ${level}级别的最佳实践`,
      actions: this.getGeneralRecommendations(level)
    });

    return recommendations;
  }

  /**
   * 获取合规级别
   */
  getComplianceLevel(score) {
    if (score >= 90) return 'excellent';
    if (score >= 75) return 'good';
    if (score >= 60) return 'fair';
    return 'poor';
  }

  /**
   * 计算颜色对比度
   */
  calculateContrastRatio(foreground, background) {
    // 简化的对比度计算（实际应使用WCAG算法）
    const fgLuminance = this.getLuminance(foreground);
    const bgLuminance = this.getLuminance(background);
    const lighter = Math.max(fgLuminance, bgLuminance);
    const darker = Math.min(fgLuminance, bgLuminance);
    return (lighter + 0.05) / (darker + 0.05);
  }

  /**
   * 获取亮度值
   */
  getLuminance(color) {
    // 简化的亮度计算
    const rgb = this.hexToRgb(color);
    if (!rgb) return 0;
    
    const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  /**
   * 十六进制转RGB
   */
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  /**
   * 模拟元素检测（实际应使用真实的DOM分析）
   */
  async simulateElementDetection(url) {
    // 返回模拟的元素数据
    return [
      { tagName: 'div', focusable: false, tabIndex: 0, type: 'container' },
      { tagName: 'button', focusable: true, tabIndex: 0, type: 'button', ariaLabel: 'Submit' },
      { tagName: 'a', focusable: true, tabIndex: 0, type: 'link', ariaLabel: null },
      { tagName: 'input', focusable: true, tabIndex: 0, type: 'input', ariaLabel: 'Email' },
      { tagName: 'h1', focusable: false, type: 'heading', level: 1 },
      { tagName: 'h2', focusable: false, type: 'heading', level: 2 },
      { tagName: 'main', focusable: false, type: 'main', landmark: true },
      { tagName: 'nav', focusable: false, type: 'nav', landmark: true }
    ];
  }

  async simulateTextElementDetection(url) {
    return [
      { selector: 'p', foreground: '#333333', background: '#ffffff', fontSize: 16, bold: false },
      { selector: 'h1', foreground: '#000000', background: '#ffffff', fontSize: 24, bold: true },
      { selector: '.small-text', foreground: '#666666', background: '#ffffff', fontSize: 12, bold: false }
    ];
  }

  async simulateInteractiveElementDetection(url) {
    return [
      { type: 'button', focusVisible: true },
      { type: 'link', focusVisible: false },
      { type: 'modal', focusTrap: false }
    ];
  }

  async simulateImageDetection(url) {
    return [
      { src: 'image1.jpg', alt: 'Description', decorative: false },
      { src: 'image2.jpg', alt: '', decorative: true },
      { src: 'image3.jpg', alt: null, decorative: false }
    ];
  }

  async simulateFormDetection(url) {
    return [
      {
        id: 'contact-form',
        inputs: [
          { type: 'text', label: true, required: true, errorMessage: true },
          { type: 'email', label: false, required: true, errorMessage: false }
        ]
      }
    ];
  }

  async simulateMediaDetection(url) {
    return {
      videos: [
        { src: 'video1.mp4', captions: false },
        { src: 'video2.mp4', captions: true }
      ],
      audios: [
        { src: 'audio1.mp3', transcript: false }
      ]
    };
  }

  getHighPriorityActions(issues) {
    return [
      '为所有图片添加适当的alt属性',
      '确保所有交互元素都有可见的焦点状态',
      '为表单控件添加标签',
      '修复颜色对比度不足的问题'
    ];
  }

  getMediumPriorityActions(issues) {
    return [
      '改善标题层级结构',
      '添加地标元素',
      '为模态框实现焦点陷阱',
      '使用语义化HTML元素'
    ];
  }

  getGeneralRecommendations(level) {
    return [
      `遵循WCAG ${level}级别指南`,
      '定期进行无障碍测试',
      '使用屏幕阅读器测试',
      '提供多种交互方式',
      '确保内容在禁用CSS时仍可访问'
    ];
  }
}

module.exports = new AccessibilityService();
