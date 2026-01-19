/**
 * SEO评分计算器
 * 计算各模块评分和综合评分
 */

interface ScoreWeights {
  meta: number;
  content: number;
  contentQuality: number;
  performance: number;
  structuredData: number;
  links: number;
  mobile: number;
}

interface GradeThresholds {
  'A+': number;
  A: number;
  'B+': number;
  B: number;
  'C+': number;
  C: number;
  D: number;
  F: number;
}

interface ModuleScores {
  meta?: number;
  content?: number;
  contentQuality?: number;
  performance?: number;
  structuredData?: number;
  links?: number;
  mobile?: number;
}

interface ScoreResult {
  overall: {
    score: number;
    grade: string;
    gradeDescription: string;
  };
  modules: ModuleScoreResult[];
  breakdown: ScoreBreakdown;
  comparison: ScoreComparison;
  improvement: ScoreImprovement;
}

interface ModuleScoreResult {
  module: string;
  score: number;
  weight: number;
  weightedScore: number;
  grade: string;
  issues: number;
  impact: number;
}

interface ScoreBreakdown {
  byCategory: Record<string, number>;
  byWeight: Record<string, number>;
  byGrade: Record<string, number>;
}

interface ScoreComparison {
  industry: number;
  competitors: number;
  benchmark: number;
  percentile: number;
}

interface ScoreImprovement {
  potential: number;
  quickWins: number;
  longTerm: number;
  recommendations: string[];
}

class ScoreCalculator {
  private weights: ScoreWeights;
  private gradeThresholds: GradeThresholds;

  constructor() {
    // 各模块权重配置
    this.weights = {
      meta: 0.2, // Meta标签权重 20%
      content: 0.2, // 基础内容权重 20%
      contentQuality: 0.2, // 内容质量权重 20%
      performance: 0.15, // 性能权重 15%
      structuredData: 0.1, // 结构化数据权重 10%
      links: 0.1, // 链接权重 10%
      mobile: 0.05, // 移动端优化权重 5%
    };

    // 评级阈值
    this.gradeThresholds = {
      'A+': 95,
      A: 90,
      'B+': 85,
      B: 80,
      'C+': 75,
      C: 70,
      D: 60,
      F: 0,
    };
  }

  /**
   * 计算综合SEO评分
   */
  calculateOverallScore(moduleScores: ModuleScores): ScoreResult {
    // 计算各模块加权分数
    const moduleResults = this.calculateModuleScores(moduleScores);

    // 计算总体分数
    const overallScore = this.calculateWeightedScore(moduleResults);

    // 获取评级
    const grade = this.getGrade(overallScore);
    const gradeDescription = this.getGradeDescription(grade);

    // 生成分数分解
    const breakdown = this.generateScoreBreakdown(moduleResults);

    // 生成分数比较
    const comparison = this.generateScoreComparison(overallScore);

    // 生成改进建议
    const improvement = this.generateImprovementSuggestions(moduleResults);

    return {
      overall: {
        score: overallScore,
        grade,
        gradeDescription,
      },
      modules: moduleResults,
      breakdown,
      comparison,
      improvement,
    };
  }

  /**
   * 计算各模块分数
   */
  private calculateModuleScores(moduleScores: ModuleScores): ModuleScoreResult[] {
    const results: ModuleScoreResult[] = [];

    Object.entries(this.weights).forEach(([module, weight]) => {
      const score = moduleScores[module as keyof ModuleScores] || 0;
      const weightedScore = score * weight;
      const grade = this.getGrade(score);
      const issues = this.estimateIssues(score);
      const impact = this.calculateImpact(module, score, weight);

      results.push({
        module: this.getModuleDisplayName(module),
        score,
        weight,
        weightedScore,
        grade,
        issues,
        impact,
      });
    });

    return results;
  }

  /**
   * 计算加权分数
   */
  private calculateWeightedScore(moduleResults: ModuleScoreResult[]): number {
    const totalWeight = moduleResults.reduce((sum, result) => sum + result.weight, 0);
    const weightedSum = moduleResults.reduce((sum, result) => sum + result.weightedScore, 0);

    return Math.round((weightedSum / totalWeight) * 100) / 100;
  }

  /**
   * 获取评级
   */
  private getGrade(score: number): string {
    const grades = Object.entries(this.gradeThresholds).sort(([, a], [, b]) => b - a);

    for (const [grade, threshold] of grades) {
      if (score >= threshold) {
        return grade;
      }
    }

    return 'F';
  }

  /**
   * 获取评级描述
   */
  private getGradeDescription(grade: string): string {
    const descriptions: Record<string, string> = {
      'A+': '优秀 - SEO表现极佳，接近完美',
      A: '优秀 - SEO表现很好，排名潜力高',
      'B+': '良好 - SEO表现较好，有改进空间',
      B: '良好 - SEO表现一般，需要优化',
      'C+': '一般 - SEO表现较差，需要重点优化',
      C: '一般 - SEO表现差，急需改进',
      D: '较差 - SEO表现很差，存在严重问题',
      F: '失败 - SEO表现极差，需要全面优化',
    };

    return descriptions[grade] || '未知评级';
  }

  /**
   * 获取模块显示名称
   */
  private getModuleDisplayName(module: string): string {
    const displayNames: Record<string, string> = {
      meta: 'Meta标签',
      content: '基础内容',
      contentQuality: '内容质量',
      performance: '性能优化',
      structuredData: '结构化数据',
      links: '链接结构',
      mobile: '移动端优化',
    };

    return displayNames[module] || module;
  }

  /**
   * 估算问题数量
   */
  private estimateIssues(score: number): number {
    if (score >= 90) return 0;
    if (score >= 80) return 1;
    if (score >= 70) return 2;
    if (score >= 60) return 3;
    if (score >= 50) return 5;
    if (score >= 40) return 8;
    return 10;
  }

  /**
   * 计算影响程度
   */
  private calculateImpact(module: string, score: number, weight: number): number {
    const baseImpact = weight * 100;
    const scorePenalty = (100 - score) * 0.1;
    return Math.round((baseImpact - scorePenalty) * 100) / 100;
  }

  /**
   * 生成分数分解
   */
  private generateScoreBreakdown(moduleResults: ModuleScoreResult[]): ScoreBreakdown {
    const byCategory: Record<string, number> = {};
    const byWeight: Record<string, number> = {};
    const byGrade: Record<string, number> = {};

    moduleResults.forEach(result => {
      // 按类别分解
      byCategory[result.module] = result.score;

      // 按权重分解
      const weightRange = this.getWeightRange(result.weight);
      byWeight[weightRange] = (byWeight[weightRange] || 0) + result.score;

      // 按评级分解
      byGrade[result.grade] = (byGrade[result.grade] || 0) + 1;
    });

    return {
      byCategory,
      byWeight,
      byGrade,
    };
  }

  /**
   * 获取权重范围
   */
  private getWeightRange(weight: number): string {
    if (weight >= 0.2) return '高权重 (20%+)';
    if (weight >= 0.15) return '中权重 (15-19%)';
    if (weight >= 0.1) return '低权重 (10-14%)';
    return '极低权重 (<10%)';
  }

  /**
   * 生成分数比较
   */
  private generateScoreComparison(score: number): ScoreComparison {
    // 模拟行业数据
    const industry = 72;
    const competitors = 78;
    const benchmark = 85;

    // 计算百分位
    const percentile = this.calculatePercentile(score, industry, competitors, benchmark);

    return {
      industry,
      competitors,
      benchmark,
      percentile,
    };
  }

  /**
   * 计算百分位
   */
  private calculatePercentile(score: number, ...references: number[]): number {
    const sorted = references.sort((a, b) => a - b);
    const better = sorted.filter(ref => ref <= score).length;
    return Math.round((better / sorted.length) * 100);
  }

  /**
   * 生成改进建议
   */
  private generateImprovementSuggestions(moduleResults: ModuleScoreResult[]): ScoreImprovement {
    // 计算改进潜力
    const currentScore = this.calculateWeightedScore(moduleResults);
    const potentialScore = 100; // 理想分数
    const potential = potentialScore - currentScore;

    // 识别快速见效项目
    const quickWinsModules = moduleResults.filter(
      result => result.score >= 60 && result.score < 80 && result.weight >= 0.15
    );
    const quickWins = quickWinsModules.reduce(
      (sum, result) => sum + result.weight * (100 - result.score),
      0
    );

    // 识别长期项目
    const longTermModules = moduleResults.filter(result => result.score < 60);
    const longTerm = longTermModules.reduce(
      (sum, result) => sum + result.weight * (100 - result.score),
      0
    );

    // 生成具体建议
    const recommendations = this.generateModuleRecommendations(moduleResults);

    return {
      potential: Math.round(potential * 100) / 100,
      quickWins: Math.round(quickWins * 100) / 100,
      longTerm: Math.round(longTerm * 100) / 100,
      recommendations,
    };
  }

  /**
   * 生成模块建议
   */
  private generateModuleRecommendations(moduleResults: ModuleScoreResult[]): string[] {
    const recommendations: string[] = [];

    moduleResults.forEach(result => {
      if (result.score < 70) {
        recommendations.push(this.getModuleRecommendation(result.module, result.score));
      }
    });

    return recommendations;
  }

  /**
   * 获取模块建议
   */
  private getModuleRecommendation(module: string, score: number): string {
    const recommendations: Record<string, Record<string, string>> = {
      Meta标签: {
        low: '紧急优化Meta标签，添加缺失的title和description',
        medium: '改进Meta标签内容，优化长度和关键词使用',
        high: '完善Meta标签，添加Open Graph和Twitter Cards',
      },
      基础内容: {
        low: '增加内容长度，确保内容质量和相关性',
        medium: '优化内容结构，改进标题和段落组织',
        high: '提升内容质量，增加深度和权威性',
      },
      内容质量: {
        low: '大幅改善内容质量，提高可读性和价值',
        medium: '优化内容表达，改善用户体验',
        high: '完善内容细节，提升专业性和权威性',
      },
      性能优化: {
        low: '紧急优化页面性能，减少加载时间',
        medium: '改进性能指标，优化资源加载',
        high: '进一步优化性能，达到行业领先水平',
      },
      结构化数据: {
        low: '添加基础结构化数据，提高搜索理解',
        medium: '完善结构化数据，添加更多类型',
        high: '优化结构化数据，提升搜索展示效果',
      },
      链接结构: {
        low: '修复链接问题，改善内部链接结构',
        medium: '优化链接分布，提高权重传递',
        high: '完善链接策略，建立权威链接网络',
      },
      移动端优化: {
        low: '紧急修复移动端问题，确保基本可用性',
        medium: '改善移动端体验，优化触摸和显示',
        high: '完善移动端优化，达到移动优先标准',
      },
    };

    const level = score < 50 ? 'low' : score < 80 ? 'medium' : 'high';
    return recommendations[module]?.[level] || '优化该模块以提升整体SEO表现';
  }

  /**
   * 计算模块改进潜力
   */
  calculateModuleImprovementPotential(module: string, currentScore: number): number {
    const weight = this.weights[module as keyof ScoreWeights];
    const potentialScore = 100;
    const improvement = (potentialScore - currentScore) * weight;
    return Math.round(improvement * 100) / 100;
  }

  /**
   * 获取关键模块
   */
  getCriticalModules(moduleResults: ModuleScoreResult[]): ModuleScoreResult[] {
    return moduleResults
      .filter(result => result.weight >= 0.15 && result.score < 70)
      .sort((a, b) => b.weight - a.weight);
  }

  /**
   * 获取高影响模块
   */
  getHighImpactModules(moduleResults: ModuleScoreResult[]): ModuleScoreResult[] {
    return moduleResults.filter(result => result.impact >= 10).sort((a, b) => b.impact - a.impact);
  }

  /**
   * 计算目标分数
   */
  calculateTargetScore(currentScore: number, timeframe: '1month' | '3months' | '6months'): number {
    const improvements: Record<string, number> = {
      '1month': 5,
      '3months': 15,
      '6months': 25,
    };

    const improvement = improvements[timeframe] || 0;
    const targetScore = Math.min(100, currentScore + improvement);

    return Math.round(targetScore * 100) / 100;
  }

  /**
   * 生成分数趋势
   */
  generateScoreTrend(
    currentScores: number[],
    timeframe: number
  ): {
    direction: 'up' | 'down' | 'stable';
    change: number;
    rate: number;
    projection: number;
  } {
    if (currentScores.length < 2) {
      return {
        direction: 'stable',
        change: 0,
        rate: 0,
        projection: currentScores[0] || 0,
      };
    }

    const recent = currentScores.slice(-timeframe);
    const older = currentScores.slice(-timeframe * 2, -timeframe);

    const recentAvg = recent.reduce((sum, score) => sum + score, 0) / recent.length;
    const olderAvg = older.reduce((sum, score) => sum + score, 0) / older.length;

    const change = recentAvg - olderAvg;
    const direction = change > 1 ? 'up' : change < -1 ? 'down' : 'stable';
    const rate = Math.abs(change / timeframe);
    const projection = currentScores[currentScores.length - 1] + change * 2;

    return {
      direction,
      change: Math.round(change * 100) / 100,
      rate: Math.round(rate * 100) / 100,
      projection: Math.round(projection * 100) / 100,
    };
  }

  /**
   * 获取权重配置
   */
  getWeights(): ScoreWeights {
    return { ...this.weights };
  }

  /**
   * 设置权重配置
   */
  setWeights(weights: Partial<ScoreWeights>): void {
    this.weights = { ...this.weights, ...weights };
  }

  /**
   * 获取评级阈值
   */
  getGradeThresholds(): GradeThresholds {
    return { ...this.gradeThresholds };
  }

  /**
   * 设置评级阈值
   */
  setGradeThresholds(thresholds: Partial<GradeThresholds>): void {
    this.gradeThresholds = { ...this.gradeThresholds, ...thresholds };
  }

  /**
   * 验证权重总和
   */
  validateWeights(): boolean {
    const total = Object.values(this.weights).reduce((sum, weight) => sum + weight, 0);
    return Math.abs(total - 1.0) < 0.01;
  }

  /**
   * 重置为默认配置
   */
  resetToDefaults(): void {
    this.weights = {
      meta: 0.2,
      content: 0.2,
      contentQuality: 0.2,
      performance: 0.15,
      structuredData: 0.1,
      links: 0.1,
      mobile: 0.05,
    };

    this.gradeThresholds = {
      'A+': 95,
      A: 90,
      'B+': 85,
      B: 80,
      'C+': 75,
      C: 70,
      D: 60,
      F: 0,
    };
  }

  /**
   * 导出评分结果
   */
  exportScoreResult(result: ScoreResult): string {
    return JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        result,
        weights: this.weights,
        thresholds: this.gradeThresholds,
      },
      null,
      2
    );
  }
}

export default ScoreCalculator;
