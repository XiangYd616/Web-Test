/**
 * 可访问性测试分析器
 * 本地化程度：100%
 * 集成WCAG 2.1标准检测和可访问性分析
 */

const ColorContrastAnalyzer = require('./analyzers/ColorContrastAnalyzer');
const KeyboardNavigationAnalyzer = require('./analyzers/KeyboardNavigationAnalyzer');
const ARIASemanticAnalyzer = require('./analyzers/ARIASemanticAnalyzer');

class AccessibilityAnalyzer {
  constructor(options = {}) {
    this.options = {
      timeout: 30000,
      wcagLevel: 'AA', // A, AA, AAA
      includeWarnings: true,
      ...options
    };

    this.colorContrastAnalyzer = new ColorContrastAnalyzer();
    this.keyboardNavigationAnalyzer = new KeyboardNavigationAnalyzer();
    this.ariaSemanticAnalyzer = new ARIASemanticAnalyzer();

    // WCAG 2.1 原则和指导原则
    this.wcagPrinciples = {
      perceivable: {
        name: '可感知性',
        guidelines: [
          '1.1 替代文本',
          '1.2 基于时间的媒体',
          '1.3 适应性',
          '1.4 可辨别性'
        ]
      },
      operable: {
        name: '可操作性',
        guidelines: [
          '2.1 键盘可访问',
          '2.2 足够的时间',
          '2.3 癫痫和身体反应',
          '2.4 导航',
          '2.5 输入方式'
        ]
      },
      understandable: {
        name: '可理解性',
        guidelines: [
          '3.1 可读性',
          '3.2 可预测性',
          '3.3 输入辅助'
        ]
      },
      robust: {
        name: '健壮性',
        guidelines: [
          '4.1 兼容性'
        ]
      }
    };
  }

  /**
   * 执行可访问性分析
   */
  async analyze(page, config = {}) {
    const startTime = Date.now();

    try {
      console.log('♿ 开始可访问性分析...');

      const analysisConfig = { ...this.options, ...config };
      const results = {
        url: await page.url(),
        timestamp: new Date().toISOString(),
        analysisTime: 0,
        wcagLevel: analysisConfig.wcagLevel,
        colorContrast: null,
        keyboardNavigation: null,
        ariaSemantics: null,
        compliance: null,
        scores: null,
        recommendations: []
      };

      // 发送进度更新
      if (config.onProgress) {
        config.onProgress({
          percentage: 10,
          stage: 'analyzing',
          message: '分析色彩对比度...'
        });
      }

      // 色彩对比度分析
      try {
        // 使用新的综合分析方法
        results.colorContrast = await this.colorContrastAnalyzer.analyzeColorContrast(url, config.colorContrastOptions);
      } catch (error) {
        console.warn('色彩对比度分析失败:', error.message);
        // 回退到原有方法
        try {
          await this.colorContrastAnalyzer.injectAnalysisFunctions(page);
          results.colorContrast = await this.colorContrastAnalyzer.analyze(page);
        } catch (fallbackError) {
          results.colorContrast = { error: fallbackError.message };
        }
      }

      // 发送进度更新
      if (config.onProgress) {
        config.onProgress({
          percentage: 40,
          stage: 'analyzing',
          message: '分析键盘导航...'
        });
      }

      // 键盘导航分析
      try {
        // 使用新的详细分析方法
        results.keyboardNavigation = await this.keyboardNavigationAnalyzer.analyzeKeyboardNavigation(url, config.keyboardOptions);
      } catch (error) {
        console.warn('键盘导航分析失败:', error.message);
        // 回退到原有方法
        try {
          results.keyboardNavigation = await this.keyboardNavigationAnalyzer.analyze(page);
        } catch (fallbackError) {
          results.keyboardNavigation = { error: fallbackError.message };
        }
      }

      // 发送进度更新
      if (config.onProgress) {
        config.onProgress({
          percentage: 70,
          stage: 'analyzing',
          message: '分析ARIA和语义化...'
        });
      }

      // ARIA和语义化分析
      try {
        results.ariaSemantics = await this.ariaSemanticAnalyzer.analyze(page);
      } catch (error) {
        console.warn('ARIA和语义化分析失败:', error.message);
        results.ariaSemantics = { error: error.message };
      }

      // 发送进度更新
      if (config.onProgress) {
        config.onProgress({
          percentage: 85,
          stage: 'calculating',
          message: '计算WCAG合规性...'
        });
      }

      // 计算WCAG合规性
      results.compliance = this.calculateWCAGCompliance(results, analysisConfig.wcagLevel);

      // 发送进度更新
      if (config.onProgress) {
        config.onProgress({
          percentage: 95,
          stage: 'calculating',
          message: '计算可访问性评分...'
        });
      }

      // 计算评分
      results.scores = this.calculateScores(results);

      // 生成建议
      results.recommendations = this.generateRecommendations(results);

      // 计算分析时间
      results.analysisTime = Date.now() - startTime;

      console.log(`✅ 可访问性分析完成，总体评分: ${results.scores.overall}`);

      return results;

    } catch (error) {
      console.error('❌ 可访问性分析失败:', error);
      throw error;
    }
  }

  /**
   * 计算WCAG合规性
   */
  calculateWCAGCompliance(results, wcagLevel) {
    const compliance = {
      level: wcagLevel,
      principles: {},
      summary: {
        totalChecks: 0,
        passedChecks: 0,
        failedChecks: 0,
        warningChecks: 0,
        complianceRate: 0
      },
      issues: []
    };

    // 初始化原则评估
    Object.keys(this.wcagPrinciples).forEach(principle => {
      compliance.principles[principle] = {
        name: this.wcagPrinciples[principle].name,
        passed: 0,
        failed: 0,
        warnings: 0,
        total: 0,
        rate: 0
      };
    });

    // 评估可感知性 (Perceivable)
    this.evaluatePerceivable(results, compliance);

    // 评估可操作性 (Operable)
    this.evaluateOperable(results, compliance);

    // 评估可理解性 (Understandable)
    this.evaluateUnderstandable(results, compliance);

    // 评估健壮性 (Robust)
    this.evaluateRobust(results, compliance);

    // 计算总体合规率
    compliance.summary.complianceRate = compliance.summary.totalChecks > 0 ?
      Math.round((compliance.summary.passedChecks / compliance.summary.totalChecks) * 100) : 0;

    // 计算各原则合规率
    Object.keys(compliance.principles).forEach(principle => {
      const p = compliance.principles[principle];
      p.rate = p.total > 0 ? Math.round((p.passed / p.total) * 100) : 0;
    });

    return compliance;
  }

  /**
   * 评估可感知性
   */
  evaluatePerceivable(results, compliance) {
    const principle = compliance.principles.perceivable;

    // 1.1 替代文本
    if (results.ariaSemantics && results.ariaSemantics.images) {
      const imageIssues = results.ariaSemantics.images.issues || [];
      const totalImages = results.ariaSemantics.images.images ? results.ariaSemantics.images.images.length : 0;

      principle.total += totalImages;
      compliance.summary.totalChecks += totalImages;

      const failedImages = imageIssues.filter(issue => issue.type === 'missing_alt_attribute').length;
      principle.failed += failedImages;
      principle.passed += totalImages - failedImages;
      compliance.summary.failedChecks += failedImages;
      compliance.summary.passedChecks += totalImages - failedImages;

      imageIssues.forEach(issue => {
        compliance.issues.push({
          principle: 'perceivable',
          guideline: '1.1 替代文本',
          level: 'A',
          type: issue.type,
          element: issue.element,
          description: issue.message
        });
      });
    }

    // 1.4 可辨别性 - 色彩对比度
    if (results.colorContrast && results.colorContrast.analysis) {
      const contrastAnalysis = results.colorContrast.analysis;
      const totalElements = contrastAnalysis.summary.total;

      principle.total += totalElements;
      compliance.summary.totalChecks += totalElements;

      const failedElements = contrastAnalysis.summary.nonCompliant.AA;
      principle.failed += failedElements;
      principle.passed += totalElements - failedElements;
      compliance.summary.failedChecks += failedElements;
      compliance.summary.passedChecks += totalElements - failedElements;

      contrastAnalysis.issues.forEach(issue => {
        if (issue.type === 'contrast_aa_fail') {
          compliance.issues.push({
            principle: 'perceivable',
            guideline: '1.4 可辨别性',
            level: 'AA',
            type: issue.type,
            element: issue.element,
            description: `对比度 ${issue.contrast}:1 不符合AA标准`
          });
        }
      });
    }
  }

  /**
   * 评估可操作性
   */
  evaluateOperable(results, compliance) {
    const principle = compliance.principles.operable;

    // 2.1 键盘可访问
    if (results.keyboardNavigation && results.keyboardNavigation.analysis) {
      const keyboardAnalysis = results.keyboardNavigation.analysis;

      // 焦点可见性
      const focusIssues = keyboardAnalysis.summary.focusVisibilityIssues;
      const totalFocusable = keyboardAnalysis.summary.focusableElements;

      principle.total += totalFocusable;
      compliance.summary.totalChecks += totalFocusable;

      principle.failed += focusIssues;
      principle.passed += totalFocusable - focusIssues;
      compliance.summary.failedChecks += focusIssues;
      compliance.summary.passedChecks += totalFocusable - focusIssues;

      keyboardAnalysis.issues.forEach(issue => {
        if (issue.type === 'focus_not_visible' || issue.type === 'non_focusable_interactive') {
          compliance.issues.push({
            principle: 'operable',
            guideline: '2.1 键盘可访问',
            level: 'A',
            type: issue.type,
            element: issue.element,
            description: issue.description
          });
        }
      });
    }

    // 2.4 导航
    if (results.keyboardNavigation && results.keyboardNavigation.skipLinks) {
      const skipLinks = results.keyboardNavigation.skipLinks;
      const hasSkipLinks = skipLinks.length > 0;

      principle.total += 1;
      compliance.summary.totalChecks += 1;

      if (hasSkipLinks) {
        principle.passed += 1;
        compliance.summary.passedChecks += 1;
      } else {
        principle.failed += 1;
        compliance.summary.failedChecks += 1;

        compliance.issues.push({
          principle: 'operable',
          guideline: '2.4 导航',
          level: 'A',
          type: 'missing_skip_links',
          description: '页面缺少跳转链接'
        });
      }
    }
  }

  /**
   * 评估可理解性
   */
  evaluateUnderstandable(results, compliance) {
    const principle = compliance.principles.understandable;

    // 3.3 输入辅助
    if (results.ariaSemantics && results.ariaSemantics.formLabels) {
      const formAnalysis = results.ariaSemantics.formLabels;
      const totalControls = formAnalysis.labels ? formAnalysis.labels.length : 0;
      const labelIssues = formAnalysis.issues ? formAnalysis.issues.filter(issue =>
        issue.type === 'missing_form_label'
      ).length : 0;

      principle.total += totalControls;
      compliance.summary.totalChecks += totalControls;

      principle.failed += labelIssues;
      principle.passed += totalControls - labelIssues;
      compliance.summary.failedChecks += labelIssues;
      compliance.summary.passedChecks += totalControls - labelIssues;

      if (formAnalysis.issues) {
        formAnalysis.issues.forEach(issue => {
          if (issue.type === 'missing_form_label') {
            compliance.issues.push({
              principle: 'understandable',
              guideline: '3.3 输入辅助',
              level: 'A',
              type: issue.type,
              element: issue.element,
              description: issue.message
            });
          }
        });
      }
    }
  }

  /**
   * 评估健壮性
   */
  evaluateRobust(results, compliance) {
    const principle = compliance.principles.robust;

    // 4.1 兼容性 - ARIA使用
    if (results.ariaSemantics && results.ariaSemantics.ariaUsage) {
      const ariaIssues = results.ariaSemantics.ariaUsage.issues || [];
      const ariaElements = results.ariaSemantics.ariaUsage.elements || [];

      principle.total += ariaElements.length;
      compliance.summary.totalChecks += ariaElements.length;

      const failedAria = ariaIssues.length;
      principle.failed += failedAria;
      principle.passed += Math.max(0, ariaElements.length - failedAria);
      compliance.summary.failedChecks += failedAria;
      compliance.summary.passedChecks += Math.max(0, ariaElements.length - failedAria);

      ariaIssues.forEach(issue => {
        compliance.issues.push({
          principle: 'robust',
          guideline: '4.1 兼容性',
          level: 'A',
          type: issue.type,
          element: issue.element,
          description: issue.message
        });
      });
    }
  }

  /**
   * 计算可访问性评分
   */
  calculateScores(results) {
    const scores = {
      perceivable: 100,
      operable: 100,
      understandable: 100,
      robust: 100,
      overall: 100
    };

    // 基于合规性计算评分
    if (results.compliance) {
      Object.keys(results.compliance.principles).forEach(principle => {
        const rate = results.compliance.principles[principle].rate;
        scores[principle] = rate;
      });

      scores.overall = Math.round(
        (scores.perceivable + scores.operable + scores.understandable + scores.robust) / 4
      );
    }

    return scores;
  }

  /**
   * 生成优化建议
   */
  generateRecommendations(results) {
    const recommendations = [];

    // 基于各分析器的建议
    if (results.colorContrast && results.colorContrast.analysis && results.colorContrast.analysis.recommendations) {
      recommendations.push(...results.colorContrast.analysis.recommendations.map(rec => ({
        ...rec,
        source: 'color_contrast'
      })));
    }

    if (results.keyboardNavigation && results.keyboardNavigation.analysis && results.keyboardNavigation.analysis.recommendations) {
      recommendations.push(...results.keyboardNavigation.analysis.recommendations.map(rec => ({
        ...rec,
        source: 'keyboard_navigation'
      })));
    }

    if (results.ariaSemantics && results.ariaSemantics.analysis && results.ariaSemantics.analysis.recommendations) {
      recommendations.push(...results.ariaSemantics.analysis.recommendations.map(rec => ({
        ...rec,
        source: 'aria_semantics'
      })));
    }

    // 基于总体评分生成建议
    if (results.scores && results.scores.overall < 80) {
      recommendations.push({
        priority: 'high',
        category: 'general',
        title: '提高整体可访问性',
        description: '网站可访问性需要全面改进',
        solution: '实施WCAG 2.1指导原则，优先修复高优先级问题',
        source: 'overall'
      });
    }

    // 按优先级排序
    recommendations.sort((a, b) => {
      const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    return recommendations.slice(0, 10); // 返回前10个建议
  }

  /**
   * 生成可访问性报告
   */
  generateReport(results) {
    return {
      summary: {
        url: results.url,
        timestamp: results.timestamp,
        analysisTime: results.analysisTime,
        wcagLevel: results.wcagLevel,
        overallScore: results.scores.overall,
        complianceRate: results.compliance.summary.complianceRate
      },
      scores: results.scores,
      compliance: results.compliance,
      recommendations: results.recommendations,
      details: {
        colorContrast: results.colorContrast,
        keyboardNavigation: results.keyboardNavigation,
        ariaSemantics: results.ariaSemantics
      }
    };
  }
}

module.exports = AccessibilityAnalyzer;
