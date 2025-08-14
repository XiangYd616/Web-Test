/**
 * 兼容性测试报告生成器
 */

const { BROWSER_CONFIGS, DEVICE_CONFIGS, SCORING_WEIGHTS } = require('../config/compatibilityTestConfig');

class CompatibilityReportGenerator {
  constructor() {
    this.name = 'compatibility-report-generator';
    this.version = '1.0.0';
  }

  /**
   * 生成详细的兼容性报告
   */
  generateDetailedReport(testResults) {
    const report = {
      summary: this.generateSummary(testResults),
      browserAnalysis: this.analyzeBrowserCompatibility(testResults),
      deviceAnalysis: this.analyzeDeviceCompatibility(testResults),
      featureAnalysis: this.analyzeFeatureSupport(testResults),
      issueAnalysis: this.analyzeIssues(testResults),
      recommendations: this.generateRecommendations(testResults),
      technicalDetails: this.generateTechnicalDetails(testResults)
    };

    return report;
  }

  /**
   * 生成测试摘要
   */
  generateSummary(testResults) {
    const totalBrowsers = Object.keys(testResults.browserCompatibility || {}).length;
    const totalDevices = Object.keys(testResults.deviceCompatibility || {}).length;
    const totalIssues = (testResults.issues || []).length;
    
    const highSeverityIssues = (testResults.issues || []).filter(issue => issue.severity === 'high').length;
    const mediumSeverityIssues = (testResults.issues || []).filter(issue => issue.severity === 'medium').length;
    const lowSeverityIssues = (testResults.issues || []).filter(issue => issue.severity === 'low').length;

    return {
      overallScore: Math.round(testResults.overallScore || 0),
      testDuration: testResults.actualDuration || 0,
      browsersTestedCount: totalBrowsers,
      devicesTestedCount: totalDevices,
      totalIssuesFound: totalIssues,
      issueBreakdown: {
        high: highSeverityIssues,
        medium: mediumSeverityIssues,
        low: lowSeverityIssues
      },
      compatibilityLevel: this.getCompatibilityLevel(testResults.overallScore || 0),
      testTimestamp: testResults.startTime || new Date().toISOString()
    };
  }

  /**
   * 分析浏览器兼容性
   */
  analyzeBrowserCompatibility(testResults) {
    const browserResults = testResults.detailedResults || {};
    const analysis = {};

    Object.entries(browserResults).forEach(([browser, result]) => {
      const browserConfig = BROWSER_CONFIGS[browser];
      
      analysis[browser] = {
        score: Math.round(result.score || 0),
        status: this.getBrowserStatus(result.score || 0),
        supportedFeatures: this.extractSupportedFeatures(result),
        unsupportedFeatures: this.extractUnsupportedFeatures(result),
        criticalIssues: (result.issues || []).filter(issue => issue.severity === 'high'),
        recommendations: this.generateBrowserSpecificRecommendations(browser, result),
        marketShare: this.getBrowserMarketShare(browser),
        engineInfo: {
          name: browserConfig?.engine || 'unknown',
          version: 'latest'
        }
      };
    });

    return analysis;
  }

  /**
   * 分析设备兼容性
   */
  analyzeDeviceCompatibility(testResults) {
    const deviceResults = testResults.deviceCompatibility || {};
    const analysis = {};

    Object.entries(deviceResults).forEach(([device, score]) => {
      const deviceConfig = DEVICE_CONFIGS[device];
      
      analysis[device] = {
        score: Math.round(score),
        status: this.getDeviceStatus(score),
        viewport: deviceConfig ? `${deviceConfig.width}x${deviceConfig.height}` : 'unknown',
        touchSupport: deviceConfig?.touchSupport || false,
        commonIssues: this.getCommonDeviceIssues(device, testResults),
        recommendations: this.generateDeviceSpecificRecommendations(device, score),
        usageStatistics: this.getDeviceUsageStats(device)
      };
    });

    return analysis;
  }

  /**
   * 分析特性支持情况
   */
  analyzeFeatureSupport(testResults) {
    const detailedResults = testResults.detailedResults || {};
    const featureSupport = {
      css: {},
      javascript: {},
      html5: {},
      modern: {}
    };

    // 汇总所有浏览器的特性支持情况
    Object.values(detailedResults).forEach(result => {
      if (result.cssFeatures) {
        Object.entries(result.cssFeatures).forEach(([feature, supported]) => {
          if (!featureSupport.css[feature]) {
            featureSupport.css[feature] = { supported: 0, total: 0 };
          }
          featureSupport.css[feature].total++;
          if (supported) featureSupport.css[feature].supported++;
        });
      }

      if (result.jsFeatures) {
        Object.entries(result.jsFeatures).forEach(([feature, supported]) => {
          if (!featureSupport.javascript[feature]) {
            featureSupport.javascript[feature] = { supported: 0, total: 0 };
          }
          featureSupport.javascript[feature].total++;
          if (supported) featureSupport.javascript[feature].supported++;
        });
      }
    });

    // 计算支持百分比
    Object.keys(featureSupport).forEach(category => {
      Object.keys(featureSupport[category]).forEach(feature => {
        const data = featureSupport[category][feature];
        data.supportPercentage = data.total > 0 ? Math.round((data.supported / data.total) * 100) : 0;
      });
    });

    return featureSupport;
  }

  /**
   * 分析问题
   */
  analyzeIssues(testResults) {
    const issues = testResults.issues || [];
    
    const analysis = {
      totalCount: issues.length,
      byCategory: {},
      bySeverity: { high: 0, medium: 0, low: 0 },
      byBrowser: {},
      byDevice: {},
      mostCommon: [],
      criticalPath: []
    };

    issues.forEach(issue => {
      // 按类别分组
      if (!analysis.byCategory[issue.type]) {
        analysis.byCategory[issue.type] = 0;
      }
      analysis.byCategory[issue.type]++;

      // 按严重程度分组
      if (analysis.bySeverity[issue.severity] !== undefined) {
        analysis.bySeverity[issue.severity]++;
      }

      // 按浏览器分组
      if (issue.browser) {
        if (!analysis.byBrowser[issue.browser]) {
          analysis.byBrowser[issue.browser] = 0;
        }
        analysis.byBrowser[issue.browser]++;
      }

      // 按设备分组
      if (issue.device) {
        if (!analysis.byDevice[issue.device]) {
          analysis.byDevice[issue.device] = 0;
        }
        analysis.byDevice[issue.device]++;
      }
    });

    // 找出最常见的问题
    analysis.mostCommon = Object.entries(analysis.byCategory)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([type, count]) => ({ type, count }));

    return analysis;
  }

  /**
   * 生成优化建议
   */
  generateRecommendations(testResults) {
    const recommendations = [];
    const issues = testResults.issues || [];
    const overallScore = testResults.overallScore || 0;

    // 基于总体分数的建议
    if (overallScore < 60) {
      recommendations.push({
        priority: 'high',
        category: '整体优化',
        title: '兼容性问题较多，需要全面优化',
        description: '建议优先解决高严重级别的兼容性问题，并考虑使用polyfill库来提升浏览器支持。',
        actionItems: [
          '使用Babel转译现代JavaScript语法',
          '添加CSS前缀以支持旧版浏览器',
          '实施渐进式增强策略',
          '考虑使用兼容性检测库'
        ]
      });
    }

    // 基于具体问题的建议
    const cssIssues = issues.filter(issue => issue.type.includes('CSS'));
    if (cssIssues.length > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'CSS兼容性',
        title: '改善CSS兼容性',
        description: '发现CSS兼容性问题，建议使用自动前缀工具和fallback方案。',
        actionItems: [
          '使用Autoprefixer自动添加CSS前缀',
          '为现代CSS特性提供fallback方案',
          '使用@supports规则进行特性检测',
          '考虑使用PostCSS插件'
        ]
      });
    }

    const jsIssues = issues.filter(issue => issue.type.includes('JavaScript'));
    if (jsIssues.length > 0) {
      recommendations.push({
        priority: 'high',
        category: 'JavaScript兼容性',
        title: '解决JavaScript兼容性问题',
        description: 'JavaScript兼容性问题可能影响网站功能，建议使用polyfill和转译工具。',
        actionItems: [
          '使用core-js提供polyfill支持',
          '配置Babel转译ES6+语法',
          '实施特性检测而非浏览器检测',
          '提供优雅降级方案'
        ]
      });
    }

    return recommendations;
  }

  /**
   * 生成技术详情
   */
  generateTechnicalDetails(testResults) {
    return {
      testConfiguration: {
        browsers: Object.keys(testResults.browserCompatibility || {}),
        devices: Object.keys(testResults.deviceCompatibility || {}),
        testDuration: testResults.actualDuration || 0,
        testUrl: testResults.url || '',
        testTimestamp: testResults.startTime || new Date().toISOString()
      },
      scoringBreakdown: this.calculateScoringBreakdown(testResults),
      rawResults: testResults.detailedResults || {},
      metadata: {
        engineVersion: this.version,
        testId: testResults.testId || '',
        reportGeneratedAt: new Date().toISOString()
      }
    };
  }

  // 辅助方法
  getCompatibilityLevel(score) {
    if (score >= 90) return 'excellent';
    if (score >= 80) return 'good';
    if (score >= 70) return 'fair';
    if (score >= 60) return 'poor';
    return 'critical';
  }

  getBrowserStatus(score) {
    if (score >= 85) return 'fully-compatible';
    if (score >= 70) return 'mostly-compatible';
    if (score >= 50) return 'partially-compatible';
    return 'incompatible';
  }

  getDeviceStatus(score) {
    if (score >= 85) return 'optimized';
    if (score >= 70) return 'compatible';
    if (score >= 50) return 'needs-improvement';
    return 'problematic';
  }

  getBrowserMarketShare(browser) {
    const marketShare = {
      'Chrome': 65.12,
      'Safari': 18.78,
      'Edge': 4.45,
      'Firefox': 3.17
    };
    return marketShare[browser] || 0;
  }

  getDeviceUsageStats(device) {
    const usage = {
      'desktop': 45.2,
      'mobile': 48.7,
      'tablet': 6.1
    };
    return usage[device] || 0;
  }

  extractSupportedFeatures(result) {
    const supported = [];
    if (result.cssFeatures) {
      Object.entries(result.cssFeatures).forEach(([feature, isSupported]) => {
        if (isSupported) supported.push(`CSS: ${feature}`);
      });
    }
    if (result.jsFeatures) {
      Object.entries(result.jsFeatures).forEach(([feature, isSupported]) => {
        if (isSupported) supported.push(`JS: ${feature}`);
      });
    }
    return supported;
  }

  extractUnsupportedFeatures(result) {
    const unsupported = [];
    if (result.cssFeatures) {
      Object.entries(result.cssFeatures).forEach(([feature, isSupported]) => {
        if (!isSupported) unsupported.push(`CSS: ${feature}`);
      });
    }
    if (result.jsFeatures) {
      Object.entries(result.jsFeatures).forEach(([feature, isSupported]) => {
        if (!isSupported) unsupported.push(`JS: ${feature}`);
      });
    }
    return unsupported;
  }

  generateBrowserSpecificRecommendations(browser, result) {
    const recommendations = [];
    const score = result.score || 0;
    
    if (score < 70) {
      recommendations.push(`考虑为${browser}添加特定的polyfill支持`);
    }
    
    if (result.jsErrors && result.jsErrors.length > 0) {
      recommendations.push(`修复${browser}中的JavaScript错误`);
    }
    
    return recommendations;
  }

  generateDeviceSpecificRecommendations(device, score) {
    const recommendations = [];
    
    if (device === 'mobile' && score < 80) {
      recommendations.push('优化移动端响应式设计');
      recommendations.push('减少移动端资源加载');
    }
    
    if (device === 'tablet' && score < 75) {
      recommendations.push('改善平板端布局适配');
    }
    
    return recommendations;
  }

  getCommonDeviceIssues(device, testResults) {
    const issues = testResults.issues || [];
    return issues.filter(issue => issue.device === device).slice(0, 3);
  }

  calculateScoringBreakdown(testResults) {
    const breakdown = {};
    const totalScore = testResults.overallScore || 0;
    
    Object.entries(SCORING_WEIGHTS).forEach(([category, weight]) => {
      breakdown[category] = {
        weight: weight * 100,
        score: Math.round(totalScore * weight),
        maxScore: 100 * weight
      };
    });
    
    return breakdown;
  }
}

module.exports = CompatibilityReportGenerator;
