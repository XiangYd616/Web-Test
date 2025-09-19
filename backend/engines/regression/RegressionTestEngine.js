/**
 * 回归测试引擎
 * 
 * 提供版本对比、历史基准分析、变更影响检测等功能
 */

;
;

/**
 * 回归测试配置
 */
export interface RegressionTestConfig extends BaseTestConfig {
  baselineId?;           // 基准测试ID
  baselineVersion?;       // 基准版本号
  currentVersion?;        // 当前版本号
  testTypes;   // 要进行回归测试的类型
  threshold: {
    performance?;         // 性能退化阈值（百分比）
    security?;           // 安全分数下降阈值
    seo?;               // SEO分数下降阈值
    accessibility?;      // 可访问性分数下降阈值
  };
  compareMode: 'strict' | 'tolerant' | 'custom';  // 对比模式
  includeVisualRegression?;  // 是否包含视觉回归
  customMetrics?[];           // 自定义指标
}

/**
 * 回归测试结果
 */
export interface RegressionTestResult extends BaseTestResult {
  baselineVersion;
  currentVersion;
  comparison: TestComparisonResult;
  regressions: Array<{
    type: TestEngineType;
    metric;
    baselineValue;
    currentValue;
    delta;
    deltaPercent;
    severity: 'critical' | 'major' | 'minor' | 'negligible';
    description;
  }>;
  improvements: Array<{
    type: TestEngineType;
    metric;
    baselineValue;
    currentValue;
    delta;
    deltaPercent;
    description;
  }>;
  unchanged;
  visualDiffs?: Array<{
    page;
    diffPercent;
    diffPixels;
    screenshot;
  }>;
  regressionDetected;
  criticalRegressions;
  majorRegressions;
  minorRegressions;
}

/**
 * 回归测试引擎实现
 */
class RegressionTestEngine extends BaseTestEngine<RegressionTestConfig, RegressionTestResult> {
  readonly type = TestEngineType.REGRESSION;
  readonly name = '回归测试引擎';
  readonly version = '1.0.0';
  
  readonly capabilities: TestEngineCapabilities = {
    type: TestEngineType.REGRESSION,
    name: '回归测试',
    description: '对比不同版本的测试结果，检测功能退化',
    version: '1.0.0',
    supportedFeatures: [
      '版本对比',
      '历史基准分析',
      '性能回归检测',
      '安全回归检测',
      '视觉回归测试',
      '自定义指标对比',
      '趋势分析',
      '阈值告警'
    ],
    requiredConfig: ['url', 'testTypes'],
    optionalConfig: ['baselineId', 'baselineVersion', 'threshold', 'customMetrics'],
    outputFormat: ['json', 'html', 'pdf'],
    maxConcurrent: 1,
    estimatedDuration: {
      min: 30,
      max: 300,
      typical: 120
    }
  };

  // 历史测试数据存储（实际应该使用数据库）
  private testBaselines: Map<string, any> = new Map();

  /**
   * 初始化回归测试引擎
   */
  protected async onInitialize(): Promise<void> {
    console.log('🔄 初始化回归测试引擎...');
    // 加载历史基准数据
    await this.loadBaselines();
  }

  /**
   * 验证配置
   */
  protected onValidate(config: RegressionTestConfig): ValidationResult {
    const errors[] = [];
    const warnings[] = [];
    const suggestions[] = [];

    // 验证测试类型
    if (!config.testTypes || config.testTypes.length === 0) {
      errors.push('至少需要选择一个测试类型进行回归测试');
    }

    // 验证基准
    if (!config.baselineId && !config.baselineVersion) {
      warnings.push('未指定基准版本，将使用最近的历史记录作为基准');
    }

    // 验证阈值
    if (config.threshold) {
      Object.entries(config.threshold).forEach(([key, value]) => {
        if (value < 0 || value > 100) {
          errors.push(`${key}的阈值必须在0-100之间`);
        }
      });
    } else {
      suggestions.push('建议设置回归阈值以自动检测问题');
    }

    // 验证对比模式
    if (!['strict', 'tolerant', 'custom'].includes(config.compareMode)) {
      config.compareMode = 'tolerant';
      warnings.push('使用默认对比模式：tolerant');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  /**
   * 执行回归测试
   */
  protected async onRun(
    testId,
    config: RegressionTestConfig,
    onProgress: (progress, currentStep) => void,
    signal: AbortSignal
  ): Promise<RegressionTestResult> {
    const startTime = new Date();
    
    try {
      // Step 1: 获取基准数据
      onProgress(10, '获取基准测试数据...');
      const baseline = await this.getBaseline(config);
      
      if (!baseline) {
        throw new Error('无法获取基准数据，请先运行基础测试');
      }

      // Step 2: 运行当前测试
      onProgress(20, '执行当前版本测试...');
      const currentResults = await this.runCurrentTests(config, signal);

      // Step 3: 对比分析
      onProgress(60, '执行回归分析...');
      const comparison = await this.compareResults(
        baseline,
        currentResults,
        config
      );

      // Step 4: 视觉回归测试（可选）
      let visualDiffs;
      if (config.includeVisualRegression) {
        onProgress(70, '执行视觉回归测试...');
        visualDiffs = await this.performVisualRegression(
          config.url!,
          baseline.version,
          config.currentVersion || 'current'
        );
      }

      // Step 5: 分析回归
      onProgress(80, '分析测试结果...');
      const regressions = this.analyzeRegressions(comparison, config.threshold);
      const improvements = this.analyzeImprovements(comparison);

      // Step 6: 生成报告
      onProgress(90, '生成回归测试报告...');
      
      const endTime = new Date();
      const result: RegressionTestResult = {
        testId,
        engineType: TestEngineType.REGRESSION,
        status: TestStatus.COMPLETED,
        score: this.calculateRegressionScore(regressions, improvements),
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        summary: this.generateSummary(regressions, improvements),
        details: {
          baseline: baseline.data,
          current: currentResults,
          comparison,
          config
        },
        baselineVersion: baseline.version || config.baselineVersion || 'unknown',
        currentVersion: config.currentVersion || 'current',
        comparison,
        regressions,
        improvements,
        unchanged: comparison.changes.unchanged ? Object.keys(comparison.changes.unchanged).length : 0,
        visualDiffs,
        regressionDetected: regressions.length > 0,
        criticalRegressions: regressions.filter(r => r.severity === 'critical').length,
        majorRegressions: regressions.filter(r => r.severity === 'major').length,
        minorRegressions: regressions.filter(r => r.severity === 'minor').length,
        errors: [],
        warnings: this.generateWarnings(regressions),
        recommendations: this.generateRecommendations(regressions, improvements)
      };

      // 保存当前结果作为潜在的未来基准
      await this.saveBaseline(testId, config.currentVersion || 'current', currentResults);

      onProgress(100, '回归测试完成');
      return result;

    } catch (error) {
      console.error('回归测试失败:', error);
      throw error;
    }
  }

  /**
   * 加载历史基准数据
   */
  private async loadBaselines(): Promise<void> {
    // 实际应该从数据库加载
    // 这里模拟一些基准数据
    this.testBaselines.set('baseline_v1.0.0', {
      version: 'v1.0.0',
      timestamp: new Date('2024-01-01'),
      data: {
        performance: { score: 85, lcp: 2.5, fid: 100, cls: 0.1 },
        security: { score: 90, vulnerabilities: 2 },
        seo: { score: 88, issues: 5 },
        accessibility: { score: 92, violations: 3 }
      }
    });
  }

  /**
   * 获取基准数据
   */
  private async getBaseline(config: RegressionTestConfig): Promise<any> {
    if (config.baselineId) {
      return this.testBaselines.get(config.baselineId);
    }
    
    if (config.baselineVersion) {
      return this.testBaselines.get(`baseline_${config.baselineVersion}`);
    }

    // 返回最新的基准
    const baselines = Array.from(this.testBaselines.values());
    return baselines.length > 0 ? baselines[baselines.length - 1] : null;
  }

  /**
   * 运行当前测试
   */
  private async runCurrentTests(
    config: RegressionTestConfig,
    signal: AbortSignal
  ): Promise<any> {
    // 模拟运行各种测试并收集结果
    // 实际应该调用各个测试引擎
    await this.delay(2000); // 模拟测试执行

    if (signal.aborted) {
      throw new Error('测试被取消');
    }

    return {
      performance: { score: 82, lcp: 2.8, fid: 120, cls: 0.15 },
      security: { score: 91, vulnerabilities: 1 },
      seo: { score: 85, issues: 7 },
      accessibility: { score: 90, violations: 4 }
    };
  }

  /**
   * 对比测试结果
   */
  private async compareResults(
    baseline,
    current,
    config: RegressionTestConfig
  ): Promise<TestComparisonResult> {
    const changes = {
      improved: {} as Record<string, any>,
      degraded: {} as Record<string, any>,
      unchanged: {} as Record<string, any>
    };

    // 对比各项指标
    for (const testType of config.testTypes) {
      const baselineData = baseline.data[testType];
      const currentData = current[testType];

      if (!baselineData || !currentData) continue;

      const delta = currentData.score - baselineData.score;
      
      if (Math.abs(delta) < 1) {
        changes.unchanged[testType] = { baseline: baselineData, current: currentData };
      } else if (delta > 0) {
        changes.improved[testType] = { 
          baseline: baselineData, 
          current: currentData, 
          improvement: delta 
        };
      } else {
        changes.degraded[testType] = { 
          baseline: baselineData, 
          current: currentData, 
          regression: Math.abs(delta) 
        };
      }
    }

    const overallDelta = this.calculateOverallDelta(baseline.data, current);

    return {
      baselineId: `baseline_${baseline.version}`,
      currentId: 'current_test',
      engineType: TestEngineType.REGRESSION,
      timestamp: new Date(),
      changes,
      scoreDelta: overallDelta,
      regressionDetected: overallDelta < -5, // 总分下降超过5分认为有回归
      analysis: this.generateAnalysis(changes, overallDelta)
    };
  }

  /**
   * 分析回归
   */
  private analyzeRegressions(
    comparison: TestComparisonResult,
    threshold?: RegressionTestConfig['threshold']
  ): RegressionTestResult['regressions'] {
    const regressions: RegressionTestResult['regressions'] = [];

    Object.entries(comparison.changes.degraded).forEach(([type, data]: [string, any]) => {
      const regression = data.regression;
      const severity = this.calculateSeverity(regression, threshold);

      regressions.push({
        type: type as TestEngineType,
        metric: 'score',
        baselineValue: data.baseline.score,
        currentValue: data.current.score,
        delta: -regression,
        deltaPercent: -(regression / data.baseline.score * 100),
        severity,
        description: `${type}分数下降了${regression}分`
      });

      // 分析具体指标
      Object.keys(data.current).forEach(metric => {
        if (metric !== 'score' && typeof data.current[metric] === 'number') {
          const metricDelta = data.current[metric] - data.baseline[metric];
          if (this.isSignificantChange(metric, metricDelta)) {
            regressions.push({
              type: type as TestEngineType,
              metric,
              baselineValue: data.baseline[metric],
              currentValue: data.current[metric],
              delta: metricDelta,
              deltaPercent: (metricDelta / data.baseline[metric] * 100),
              severity: 'minor',
              description: `${metric}指标退化`
            });
          }
        }
      });
    });

    return regressions;
  }

  /**
   * 分析改进
   */
  private analyzeImprovements(
    comparison: TestComparisonResult
  ): RegressionTestResult['improvements'] {
    const improvements: RegressionTestResult['improvements'] = [];

    Object.entries(comparison.changes.improved).forEach(([type, data]: [string, any]) => {
      improvements.push({
        type: type as TestEngineType,
        metric: 'score',
        baselineValue: data.baseline.score,
        currentValue: data.current.score,
        delta: data.improvement,
        deltaPercent: (data.improvement / data.baseline.score * 100),
        description: `${type}分数提升了${data.improvement}分`
      });
    });

    return improvements;
  }

  /**
   * 执行视觉回归测试
   */
  private async performVisualRegression(
    url,
    baselineVersion,
    currentVersion
  ): Promise<RegressionTestResult['visualDiffs']> {
    // 模拟视觉回归测试
    await this.delay(1000);

    return [
      {
        page: 'homepage',
        diffPercent: 2.5,
        diffPixels: 1250,
        screenshot: '/screenshots/diff-homepage.png'
      },
      {
        page: 'dashboard',
        diffPercent: 0.8,
        diffPixels: 400,
        screenshot: '/screenshots/diff-dashboard.png'
      }
    ];
  }

  /**
   * 计算回归分数
   */
  private calculateRegressionScore(
    regressions: RegressionTestResult['regressions'],
    improvements: RegressionTestResult['improvements']
  ) {
    // 基础分数100
    let score = 100;

    // 根据回归扣分
    regressions.forEach(regression => {
      switch (regression.severity) {
        case 'critical':
          score -= 20;
          break;
        case 'major':
          score -= 10;
          break;
        case 'minor':
          score -= 5;
          break;
        case 'negligible':
          score -= 1;
          break;
      }
    });

    // 根据改进加分
    improvements.forEach(() => {
      score += 2;
    });

    return Math.max(0, Math.min(100, score));
  }

  /**
   * 计算严重程度
   */
  private calculateSeverity(
    regression,
    threshold?: RegressionTestConfig['threshold']
  ): 'critical' | 'major' | 'minor' | 'negligible' {
    if (regression > 20) return 'critical';
    if (regression > 10) return 'major';
    if (regression > 5) return 'minor';
    return 'negligible';
  }

  /**
   * 判断是否为显著变化
   */
  private isSignificantChange(metric, delta) {
    // 根据不同指标定义显著性阈值
    const thresholds: Record<string, number> = {
      lcp: 0.5,      // LCP变化超过0.5秒
      fid: 50,       // FID变化超过50ms
      cls: 0.05,     // CLS变化超过0.05
      default: 10    // 默认10%变化
    };

    const threshold = thresholds[metric] || thresholds.default;
    return Math.abs(delta) > threshold;
  }

  /**
   * 计算总体变化
   */
  private calculateOverallDelta(baseline, current) {
    let totalBaseline = 0;
    let totalCurrent = 0;
    let count = 0;

    Object.keys(baseline).forEach(key => {
      if (baseline[key]?.score && current[key]?.score) {
        totalBaseline += baseline[key].score;
        totalCurrent += current[key].score;
        count++;
      }
    });

    if (count === 0) return 0;

    return (totalCurrent - totalBaseline) / count;
  }

  /**
   * 生成分析报告
   */
  private generateAnalysis(changes, overallDelta) {
    const improved = Object.keys(changes.improved).length;
    const degraded = Object.keys(changes.degraded).length;
    const unchanged = Object.keys(changes.unchanged).length;

    let analysis = `检测到${improved}项改进，${degraded}项退化，${unchanged}项保持稳定。`;
    
    if (overallDelta > 0) {
      analysis += `整体性能提升${Math.abs(overallDelta).toFixed(1)}分。`;
    } else if (overallDelta < 0) {
      analysis += `整体性能下降${Math.abs(overallDelta).toFixed(1)}分，需要关注。`;
    } else {
      analysis += '整体性能保持稳定。';
    }

    return analysis;
  }

  /**
   * 生成摘要
   */
  private generateSummary(
    regressions: RegressionTestResult['regressions'],
    improvements: RegressionTestResult['improvements']
  ) {
    if (regressions.length === 0 && improvements.length === 0) {
      return '版本间无显著变化';
    }
    
    if (regressions.length > 0) {
      const critical = regressions.filter(r => r.severity === 'critical').length;
      if (critical > 0) {
        return `检测到${critical}个严重回归问题，需要立即处理`;
      }
      return `检测到${regressions.length}个回归问题`;
    }

    return `性能提升，包含${improvements.length}项改进`;
  }

  /**
   * 生成警告
   */
  private generateWarnings(regressions: RegressionTestResult['regressions'])[] {
    const warnings[] = [];

    const critical = regressions.filter(r => r.severity === 'critical');
    if (critical.length > 0) {
      warnings.push(`⚠️ 发现${critical.length}个严重回归问题`);
    }

    const performanceRegressions = regressions.filter(r => r.type === TestEngineType.PERFORMANCE);
    if (performanceRegressions.length > 0) {
      warnings.push('性能指标出现退化，可能影响用户体验');
    }

    const securityRegressions = regressions.filter(r => r.type === TestEngineType.SECURITY);
    if (securityRegressions.length > 0) {
      warnings.push('安全性降低，建议立即检查');
    }

    return warnings;
  }

  /**
   * 生成建议
   */
  private generateRecommendations(
    regressions: RegressionTestResult['regressions'],
    improvements: RegressionTestResult['improvements']
  )[] {
    const recommendations[] = [];

    if (regressions.length > 0) {
      recommendations.push('建议回滚到上一个稳定版本或修复回归问题');
      
      const types = [...new Set(regressions.map(r => r.type))];
      types.forEach(type => {
        recommendations.push(`重点检查${type}相关的代码变更`);
      });
    }

    if (improvements.length > 0) {
      recommendations.push('记录并保持这些改进措施');
    }

    if (regressions.length === 0 && improvements.length === 0) {
      recommendations.push('版本稳定，可以继续部署');
    }

    return recommendations;
  }

  /**
   * 保存基准数据
   */
  private async saveBaseline(testId, version, data): Promise<void> {
    this.testBaselines.set(`baseline_${version}`, {
      version,
      timestamp: new Date(),
      data
    });
  }

  /**
   * 辅助延迟函数
   */
  private delay(ms): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}


module.exports = RegressionTestEngine;