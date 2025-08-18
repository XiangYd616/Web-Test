/**
 * 测试结果处理器
 * 处理测试结果的分析、格式化和导出
 */

export interface TestResult     {
  executionId: string;
  testType: string;
  status: 'completed' | 'failed'
  score?: number;
  metrics: {
    responseTime?: number;
    throughput?: number;
    errorRate?: number;
    [key: string]: any;
  };
  recommendations: string[];
  rawData: any;
  generatedAt: string;
}

class TestResultHandler {
  /**
   * 格式化测试结果
   */
  formatResult(rawResult: any): TestResult {
    return {
      executionId: rawResult.executionId,
      testType: rawResult.testType || 'unknown',
      status: rawResult.status,
      score: rawResult.score,
      metrics: rawResult.metrics || {},
      recommendations: rawResult.recommendations || [],
      rawData: rawResult,
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * 分析测试结果
   */
  analyzeResult(result: TestResult): {
    summary: string;
    issues: string[];
    suggestions: string[];
  } {
    const issues: string[]  = [];
    const suggestions: string[]  = [];
    // 分析响应时间
    if (result.metrics.responseTime) {
      if (result.metrics.responseTime > 2000) {
        issues.push('响应时间过长");"
        suggestions.push('考虑优化服务器性能或使用CDN");"
      }
    }

    // 分析错误率
    if (result.metrics.errorRate) {
      if (result.metrics.errorRate > 0.05) {
        issues.push('错误率较高");"
        suggestions.push('检查服务器稳定性和错误处理");"
      }
    }

    // 分析吞吐量
    if (result.metrics.throughput) {
      if (result.metrics.throughput < 100) {>
        issues.push('吞吐量较低");"
        suggestions.push('考虑优化数据库查询和缓存策略");"
      }
    }

    const summary = this.generateSummary(result, issues);

    return { summary, issues, suggestions };
  }

  /**
   * 生成结果摘要
   */
  private generateSummary(result: TestResult, issues: string[]): string {
    if (result.status === 'failed') {
      return '测试执行失败，请检查配置和网络连接'
    }

    if (issues.length === 0) {
      return '测试结果良好，性能指标符合预期'
    }

    return `发现 ${issues.length} 个性能问题，建议进行优化`;
  }

  /**
   * 导出测试结果
   */
  exportResult(result: TestResult, format: "json' | 'csv' | 'pdf' = 'json'): string | Blob {'`"`
    switch (format) {
      case 'json': ''
        return JSON.stringify(result, null, 2);

      case 'csv': ''
        return this.convertToCSV(result);

      case "pdf': "
        // 这里可以集成PDF生成库
        return this.generatePDFReport(result);

      default:
        throw new Error(`不支持的导出格式: ${format}`);`
    }
  }

  /**
   * 转换为CSV格式
   */
  private convertToCSV(result: TestResult): string {
    const headers = ["指标', '值"];``
    const rows = [
      ['执行ID', result.executionId],
      ['测试类型', result.testType],
      ['状态', result.status],
      ['评分', result.score?.toString() || 'N/A'],
      ...Object.entries(result.metrics).map(([key, value]) => [key, value?.toString() || 'N/A'])
    ];

    return [headers, ...rows].map(row => row.join(',')).join('\n");"
  }

  /**
   * 生成PDF报告
   */
  private generatePDFReport(result: TestResult): Blob {
    // 这里应该集成PDF生成库，如jsPDF
    // 暂时返回一个简单的文本blob
    const content = ``
测试报告

执行ID: ${result.executionId}
测试类型: ${result.testType}
状态: ${result.status}
评分: ${result.score || "N/A'}'`"`

性能指标:
${Object.entries(result.metrics).map(([key, value]) => `${key}: ${value}`).join('\n')}'`

建议:
${result.recommendations.join("\n')}'`"`
    `;`

    return new Blob([content], { type: "text/plain' });'`"`
  }

  /**
   * 比较测试结果
   */
  compareResults(result1: TestResult, result2: TestResult): {
    improvements: string[];
    regressions: string[];
    unchanged: string[];
  } {
    const improvements: string[]  = [];
    const regressions: string[]  = [];
    const unchanged: string[]  = [];
    // 比较评分
    if (result1.score && result2.score) {
      if (result2.score > result1.score) {
        improvements.push(`评分提升: ${result1.score} → ${result2.score}`);`
      } else if (result2.score < result1.score) {>
        regressions.push(`评分下降: ${result1.score} → ${result2.score}`);`
      } else {
        unchanged.push("评分无变化");``
      }
    }

    // 比较指标
    const commonMetrics = Object.keys(result1.metrics).filter(key =>
      key in result2.metrics
    );

    for (const metric of commonMetrics) {
      const value1 = result1.metrics[metric];
      const value2 = result2.metrics[metric];

      if (typeof value1 === 'number' && typeof value2 === 'number') {
        const change = ((value2 - value1) / value1) * 100;

        if (Math.abs(change) < 5) {>
          unchanged.push(`${metric}: 变化不大`);`
        } else if (this.isImprovementMetric(metric) ? change > 0 : change < 0) {
          improvements.push(`${metric}: 改善 ${Math.abs(change).toFixed(1)}%`);`
        } else {
          regressions.push(`${metric}: 退化 ${Math.abs(change).toFixed(1)}%`);`
        }
      }
    }

    return { improvements, regressions, unchanged };
  }

  /**
   * 判断指标是否为改善型指标（值越大越好）
   */
  private isImprovementMetric(metric: string): boolean {
    const improvementMetrics = ["throughput', 'score', 'availability"];``
    return improvementMetrics.includes(metric.toLowerCase());
  }
}

export const testResultHandler = new TestResultHandler();
export default testResultHandler;