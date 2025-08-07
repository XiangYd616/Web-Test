/**
 * SEO评分计算器
 * 计算各模块评分和综合评分
 */

class ScoreCalculator {
  constructor() {
    // 各模块权重配置
    this.weights = {
      meta: 0.25,           // Meta标签权重 25%
      content: 0.25,        // 内容质量权重 25%
      performance: 0.20,    // 性能权重 20%
      structuredData: 0.10, // 结构化数据权重 10%
      links: 0.10,          // 链接权重 10%
      mobile: 0.10          // 移动端优化权重 10%
    };
    
    // 评级阈值
    this.gradeThresholds = {
      'A+': 95,
      'A': 90,
      'B+': 85,
      'B': 80,
      'C+': 75,
      'C': 70,
      'D': 60,
      'F': 0
    };
  }

  /**
   * 计算所有评分
   */
  calculateScores(analysisResults) {
    const scores = {
      meta: this.calculateMetaScore(analysisResults.meta),
      content: this.calculateContentScore(analysisResults.content),
      performance: this.calculatePerformanceScore(analysisResults.performance),
      structuredData: this.calculateStructuredDataScore(analysisResults.structuredData),
      links: this.calculateLinksScore(analysisResults.links),
      mobile: this.calculateMobileScore(analysisResults.mobile)
    };
    
    // 计算综合评分
    const overallScore = this.calculateOverallScore(scores);
    const grade = this.getGrade(overallScore);
    
    return {
      ...scores,
      overall: {
        score: overallScore,
        grade,
        breakdown: this.getScoreBreakdown(scores)
      }
    };
  }

  /**
   * 计算Meta标签评分
   */
  calculateMetaScore(metaAnalysis) {
    if (!metaAnalysis) return { score: 0, grade: 'F', details: {} };
    
    let score = 0;
    let maxScore = 0;
    const details = {};
    
    // Title评分 (40%)
    maxScore += 40;
    if (metaAnalysis.title?.exists && !metaAnalysis.title?.isEmpty) {
      if (metaAnalysis.title.isOptimal) {
        score += 40;
        details.title = { score: 40, status: 'excellent' };
      } else if (!metaAnalysis.title.isTooShort && !metaAnalysis.title.isTooLong) {
        score += 30;
        details.title = { score: 30, status: 'good' };
      } else {
        score += 15;
        details.title = { score: 15, status: 'needs-improvement' };
      }
    } else {
      details.title = { score: 0, status: 'missing' };
    }
    
    // Description评分 (30%)
    maxScore += 30;
    if (metaAnalysis.description?.exists && !metaAnalysis.description?.isEmpty) {
      if (metaAnalysis.description.isOptimal) {
        score += 30;
        details.description = { score: 30, status: 'excellent' };
      } else if (!metaAnalysis.description.isTooShort && !metaAnalysis.description.isTooLong) {
        score += 22;
        details.description = { score: 22, status: 'good' };
      } else {
        score += 12;
        details.description = { score: 12, status: 'needs-improvement' };
      }
    } else {
      details.description = { score: 0, status: 'missing' };
    }
    
    // Open Graph评分 (15%)
    maxScore += 15;
    if (metaAnalysis.openGraph?.exists) {
      if (metaAnalysis.openGraph.isComplete) {
        score += 15;
        details.openGraph = { score: 15, status: 'excellent' };
      } else {
        score += 8;
        details.openGraph = { score: 8, status: 'partial' };
      }
    } else {
      details.openGraph = { score: 0, status: 'missing' };
    }
    
    // Canonical评分 (10%)
    maxScore += 10;
    if (metaAnalysis.canonical?.exists && metaAnalysis.canonical?.isValid) {
      score += 10;
      details.canonical = { score: 10, status: 'excellent' };
    } else if (metaAnalysis.canonical?.exists) {
      score += 5;
      details.canonical = { score: 5, status: 'needs-improvement' };
    } else {
      details.canonical = { score: 0, status: 'missing' };
    }
    
    // Viewport评分 (5%)
    maxScore += 5;
    if (metaAnalysis.viewport?.exists && metaAnalysis.viewport?.isResponsive) {
      score += 5;
      details.viewport = { score: 5, status: 'excellent' };
    } else if (metaAnalysis.viewport?.exists) {
      score += 2;
      details.viewport = { score: 2, status: 'needs-improvement' };
    } else {
      details.viewport = { score: 0, status: 'missing' };
    }
    
    const finalScore = Math.round((score / maxScore) * 100);
    return {
      score: finalScore,
      grade: this.getGrade(finalScore),
      details
    };
  }

  /**
   * 计算内容评分
   */
  calculateContentScore(contentAnalysis) {
    if (!contentAnalysis) return { score: 0, grade: 'F', details: {} };
    
    let score = 0;
    let maxScore = 0;
    const details = {};
    
    // 内容长度评分 (30%)
    maxScore += 30;
    if (contentAnalysis.textContent?.isOptimalLength) {
      score += 30;
      details.length = { score: 30, status: 'excellent' };
    } else if (contentAnalysis.textContent?.isAdequateLength) {
      score += 20;
      details.length = { score: 20, status: 'good' };
    } else {
      score += 8;
      details.length = { score: 8, status: 'poor' };
    }
    
    // 标题结构评分 (25%)
    maxScore += 25;
    if (contentAnalysis.headingStructure?.hasH1 && !contentAnalysis.headingStructure?.hasMultipleH1) {
      if (contentAnalysis.headingStructure.hasProperHierarchy) {
        score += 25;
        details.headings = { score: 25, status: 'excellent' };
      } else {
        score += 18;
        details.headings = { score: 18, status: 'good' };
      }
    } else if (contentAnalysis.headingStructure?.hasH1) {
      score += 12;
      details.headings = { score: 12, status: 'needs-improvement' };
    } else {
      details.headings = { score: 0, status: 'missing' };
    }
    
    // 图片优化评分 (20%)
    maxScore += 20;
    if (contentAnalysis.images?.hasProperAltTexts) {
      score += 20;
      details.images = { score: 20, status: 'excellent' };
    } else if (contentAnalysis.images?.missingAltPercentage <= 20) {
      score += 12;
      details.images = { score: 12, status: 'good' };
    } else {
      score += 5;
      details.images = { score: 5, status: 'poor' };
    }
    
    // 关键词优化评分 (15%)
    maxScore += 15;
    if (contentAnalysis.keywords?.isOptimalDensity && !contentAnalysis.keywords?.isKeywordStuffing) {
      score += 15;
      details.keywords = { score: 15, status: 'excellent' };
    } else if (!contentAnalysis.keywords?.isKeywordStuffing) {
      score += 10;
      details.keywords = { score: 10, status: 'good' };
    } else {
      score += 3;
      details.keywords = { score: 3, status: 'poor' };
    }
    
    // 可读性评分 (10%)
    maxScore += 10;
    if (contentAnalysis.readability?.isEasyToRead) {
      score += 10;
      details.readability = { score: 10, status: 'excellent' };
    } else if (!contentAnalysis.readability?.isDifficultToRead) {
      score += 6;
      details.readability = { score: 6, status: 'good' };
    } else {
      score += 2;
      details.readability = { score: 2, status: 'poor' };
    }
    
    const finalScore = Math.round((score / maxScore) * 100);
    return {
      score: finalScore,
      grade: this.getGrade(finalScore),
      details
    };
  }

  /**
   * 计算性能评分
   */
  calculatePerformanceScore(performanceAnalysis) {
    if (!performanceAnalysis) return { score: 0, grade: 'F', details: {} };
    
    // 直接使用性能分析器的评分
    const score = performanceAnalysis.score || 0;
    
    return {
      score,
      grade: this.getGrade(score),
      details: {
        coreWebVitals: {
          score: this.calculateCoreWebVitalsScore(performanceAnalysis.coreWebVitals),
          status: this.getStatusFromScore(this.calculateCoreWebVitalsScore(performanceAnalysis.coreWebVitals))
        },
        loading: {
          score: this.calculateLoadingScore(performanceAnalysis.loadingMetrics),
          status: this.getStatusFromScore(this.calculateLoadingScore(performanceAnalysis.loadingMetrics))
        },
        resources: {
          score: this.calculateResourceScore(performanceAnalysis.resourceAnalysis),
          status: this.getStatusFromScore(this.calculateResourceScore(performanceAnalysis.resourceAnalysis))
        }
      }
    };
  }

  /**
   * 计算结构化数据评分
   */
  calculateStructuredDataScore(structuredDataAnalysis) {
    if (!structuredDataAnalysis) return { score: 0, grade: 'F', details: {} };
    
    // 这里需要实现结构化数据的评分逻辑
    // 暂时返回基础评分
    const score = 75; // 默认评分
    
    return {
      score,
      grade: this.getGrade(score),
      details: {}
    };
  }

  /**
   * 计算链接评分
   */
  calculateLinksScore(linkAnalysis) {
    if (!linkAnalysis) return { score: 0, grade: 'F', details: {} };
    
    // 这里需要实现链接分析的评分逻辑
    // 暂时返回基础评分
    const score = 80; // 默认评分
    
    return {
      score,
      grade: this.getGrade(score),
      details: {}
    };
  }

  /**
   * 计算移动端优化评分
   */
  calculateMobileScore(mobileAnalysis) {
    if (!mobileAnalysis) return { score: 0, grade: 'F', details: {} };
    
    // 这里需要实现移动端优化的评分逻辑
    // 暂时返回基础评分
    const score = 85; // 默认评分
    
    return {
      score,
      grade: this.getGrade(score),
      details: {}
    };
  }

  /**
   * 计算综合评分
   */
  calculateOverallScore(scores) {
    let weightedSum = 0;
    let totalWeight = 0;
    
    Object.keys(this.weights).forEach(key => {
      if (scores[key] && typeof scores[key].score === 'number') {
        weightedSum += scores[key].score * this.weights[key];
        totalWeight += this.weights[key];
      }
    });
    
    return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
  }

  /**
   * 获取评级
   */
  getGrade(score) {
    for (const [grade, threshold] of Object.entries(this.gradeThresholds)) {
      if (score >= threshold) {
        return grade;
      }
    }
    return 'F';
  }

  /**
   * 获取评分详细分解
   */
  getScoreBreakdown(scores) {
    return Object.keys(this.weights).map(key => ({
      category: key,
      score: scores[key]?.score || 0,
      weight: this.weights[key],
      weightedScore: (scores[key]?.score || 0) * this.weights[key],
      grade: scores[key]?.grade || 'F'
    }));
  }

  // 辅助方法
  calculateCoreWebVitalsScore(cwv) {
    if (!cwv) return 0;
    let score = 0;
    if (cwv.lcp?.isGood) score += 30;
    if (cwv.fid?.isGood) score += 20;
    if (cwv.cls?.isGood) score += 30;
    if (cwv.fcp?.isGood) score += 20;
    return score;
  }

  calculateLoadingScore(loading) {
    if (!loading) return 0;
    let score = 0;
    if (loading.pageLoadTime?.isGood) score += 40;
    if (loading.domContentLoaded?.isGood) score += 30;
    if (loading.firstPaint?.isGood) score += 30;
    return score;
  }

  calculateResourceScore(resources) {
    if (!resources) return 0;
    let score = 0;
    if (resources.total?.isOptimal) score += 40;
    if (resources.image?.isOptimal) score += 25;
    if (resources.script?.isOptimal) score += 20;
    if (resources.stylesheet?.isOptimal) score += 15;
    return score;
  }

  getStatusFromScore(score) {
    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    if (score >= 40) return 'needs-improvement';
    return 'poor';
  }
}

module.exports = ScoreCalculator;
