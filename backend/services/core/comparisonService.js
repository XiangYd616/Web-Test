/**
 * 比较工具服务
 * 提供测试结果比较、性能对比、趋势分析功能
 */

const Logger = require('../../middleware/logger.js');

class ComparisonService {
  constructor() {
    this.logger = Logger;
  }

  /**
   * 比较两个测试结果
   */
  async compareTestResults(testId1, testId2) {
    try {
      this.logger.info(`开始比较测试结果: ${testId1} vs ${testId2}`);

      // 获取测试结果数据
      const result1 = await this.getTestResult(testId1);
      const result2 = await this.getTestResult(testId2);

      if (!result1 || !result2) {
        throw new Error('无法获取测试结果数据');
      }

      // 执行比较分析
      const comparison = this.performComparison(result1, result2);

      return {
        success: true,
        data: {
          test1: result1,
          test2: result2,
          comparison,
          summary: this.generateComparisonSummary(comparison)
        }
      };
    } catch (error) {
      this.logger.error('比较测试结果失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 批量比较多个测试结果
   */
  async batchCompareResults(testIds) {
    try {
      this.logger.info(`开始批量比较测试结果: ${testIds.join(', ')}`);

      if (testIds.length < 2) {
        throw new Error('至少需要两个测试结果进行比较');
      }

      // 获取所有测试结果
      const results = await Promise.all(
        testIds.map(id => this.getTestResult(id))
      );

      // 过滤无效结果
      const validResults = results.filter(result => result !== null);

      if (validResults.length < 2) {
        throw new Error('有效的测试结果不足两个');
      }

      // 执行批量比较
      const comparisons = this.performBatchComparison(validResults);

      return {
        success: true,
        data: {
          results: validResults,
          comparisons,
          trends: this.analyzeTrends(validResults),
          summary: this.generateBatchSummary(comparisons)
        }
      };
    } catch (error) {
      this.logger.error('批量比较测试结果失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 性能趋势分析
   */
  async analyzePerformanceTrends(testType, url, timeRange = 30) {
    try {
      this.logger.info(`分析性能趋势: ${testType} - ${url}`);

      // 获取时间范围内的测试数据
      const testData = await this.getTestDataByTimeRange(testType, url, timeRange);

      if (testData.length === 0) {
        return {
          success: true,
          data: {
            trends: [],
            analysis: '暂无数据进行趋势分析'
          }
        };
      }

      // 分析趋势
      const trends = this.calculateTrends(testData);
      const analysis = this.generateTrendAnalysis(trends);

      return {
        success: true,
        data: {
          trends,
          analysis,
          recommendations: this.generateRecommendations(trends)
        }
      };
    } catch (error) {
      this.logger.error('性能趋势分析失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取测试结果数据
   */
  async getTestResult(testId) {
    try {
      // 这里应该从数据库获取实际的测试结果
      // 暂时返回模拟数据
      return {
        id: testId,
        url: 'https://example.com',
        testType: 'performance',
        metrics: {
          responseTime: Math.random() * 1000 + 500,
          throughput: Math.random() * 100 + 50,
          errorRate: Math.random() * 5,
          cpuUsage: Math.random() * 80 + 10,
          memoryUsage: Math.random() * 70 + 20
        },
        timestamp: new Date().toISOString(),
        status: 'completed'
      };
    } catch (error) {
      this.logger.error(`获取测试结果失败: ${testId}`, error);
      return null;
    }
  }

  /**
   * 执行比较分析
   */
  performComparison(result1, result2) {
    const comparison = {
      metrics: {},
      improvements: [],
      regressions: [],
      unchanged: []
    };

    // 比较各项指标
    for (const metric in result1.metrics) {
      if (result2.metrics[metric] !== undefined) {
        const value1 = result1.metrics[metric];
        const value2 = result2.metrics[metric];
        const change = ((value2 - value1) / value1) * 100;

        comparison.metrics[metric] = {
          before: value1,
          after: value2,
          change: change,
          changeType: this.getChangeType(metric, change)
        };

        // 分类变化
        if (Math.abs(change) < 5) {
          comparison.unchanged.push(metric);
        } else if (this.isImprovement(metric, change)) {
          comparison.improvements.push(metric);
        } else {
          comparison.regressions.push(metric);
        }
      }
    }

    return comparison;
  }

  /**
   * 执行批量比较
   */
  performBatchComparison(results) {
    const comparisons = [];

    for (let i = 0; i < results.length - 1; i++) {
      for (let j = i + 1; j < results.length; j++) {
        const comparison = this.performComparison(results[i], results[j]);
        comparisons.push({
          test1Id: results[i].id,
          test2Id: results[j].id,
          comparison
        });
      }
    }

    return comparisons;
  }

  /**
   * 分析趋势
   */
  analyzeTrends(results) {
    const trends = {
      responseTime: [],
      throughput: [],
      errorRate: []
    };

    results.forEach(result => {
      trends.responseTime.push({
        timestamp: result.timestamp,
        value: result.metrics.responseTime
      });
      trends.throughput.push({
        timestamp: result.timestamp,
        value: result.metrics.throughput
      });
      trends.errorRate.push({
        timestamp: result.timestamp,
        value: result.metrics.errorRate
      });
    });

    return trends;
  }

  /**
   * 计算趋势
   */
  calculateTrends(testData) {
    const trends = {};
    const metrics = ['responseTime', 'throughput', 'errorRate', 'cpuUsage', 'memoryUsage'];

    metrics.forEach(metric => {
      const values = testData.map(data => data.metrics[metric]).filter(v => v !== undefined);
      
      if (values.length > 1) {
        const slope = this.calculateSlope(values);
        const direction = slope > 0.05 ? 'increasing' : slope < -0.05 ? 'decreasing' : 'stable';
        
        trends[metric] = {
          direction,
          slope,
          average: values.reduce((sum, val) => sum + val, 0) / values.length,
          min: Math.min(...values),
          max: Math.max(...values),
          variance: this.calculateVariance(values)
        };
      }
    });

    return trends;
  }

  /**
   * 计算斜率
   */
  calculateSlope(values) {
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, index) => sum + val * index, 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;

    return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  }

  /**
   * 计算方差
   */
  calculateVariance(values) {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * 获取变化类型
   */
  getChangeType(metric, change) {
    const isPositiveMetric = ['throughput'].includes(metric);
    const isNegativeMetric = ['responseTime', 'errorRate', 'cpuUsage', 'memoryUsage'].includes(metric);

    if (isPositiveMetric) {
      return change > 0 ? 'improvement' : change < 0 ? 'regression' : 'unchanged';
    } else if (isNegativeMetric) {
      return change < 0 ? 'improvement' : change > 0 ? 'regression' : 'unchanged';
    }

    return 'unchanged';
  }

  /**
   * 判断是否为改进
   */
  isImprovement(metric, change) {
    return this.getChangeType(metric, change) === 'improvement';
  }

  /**
   * 生成比较摘要
   */
  generateComparisonSummary(comparison) {
    return {
      totalMetrics: Object.keys(comparison.metrics).length,
      improvements: comparison.improvements.length,
      regressions: comparison.regressions.length,
      unchanged: comparison.unchanged.length,
      overallTrend: comparison.improvements.length > comparison.regressions.length ? 'improved' : 
                   comparison.regressions.length > comparison.improvements.length ? 'regressed' : 'stable'
    };
  }

  /**
   * 生成批量摘要
   */
  generateBatchSummary(comparisons) {
    const totalComparisons = comparisons.length;
    let totalImprovements = 0;
    let totalRegressions = 0;

    comparisons.forEach(comp => {
      totalImprovements += comp.comparison.improvements.length;
      totalRegressions += comp.comparison.regressions.length;
    });

    return {
      totalComparisons,
      averageImprovements: totalImprovements / totalComparisons,
      averageRegressions: totalRegressions / totalComparisons,
      overallTrend: totalImprovements > totalRegressions ? 'improving' : 
                   totalRegressions > totalImprovements ? 'declining' : 'stable'
    };
  }

  /**
   * 生成趋势分析
   */
  generateTrendAnalysis(trends) {
    const analysis = [];

    Object.entries(trends).forEach(([metric, trend]) => {
      analysis.push({
        metric,
        direction: trend.direction,
        severity: this.getTrendSeverity(trend),
        description: this.getTrendDescription(metric, trend)
      });
    });

    return analysis;
  }

  /**
   * 获取趋势严重程度
   */
  getTrendSeverity(trend) {
    const absSlope = Math.abs(trend.slope);
    if (absSlope > 0.2) return 'high';
    if (absSlope > 0.1) return 'medium';
    return 'low';
  }

  /**
   * 获取趋势描述
   */
  getTrendDescription(metric, trend) {
    const direction = trend.direction;
    const severity = this.getTrendSeverity(trend);

    if (direction === 'stable') {
      return `${metric}保持稳定`;
    }

    const change = direction === 'increasing' ? '上升' : '下降';
    return `${metric}呈${severity === 'high' ? '显著' : severity === 'medium' ? '明显' : '轻微'}${change}趋势`;
  }

  /**
   * 生成建议
   */
  generateRecommendations(trends) {
    const recommendations = [];

    Object.entries(trends).forEach(([metric, trend]) => {
      if (trend.direction !== 'stable') {
        const isNegativeMetric = ['responseTime', 'errorRate', 'cpuUsage', 'memoryUsage'].includes(metric);
        const isProblematic = (isNegativeMetric && trend.direction === 'increasing') ||
                             (!isNegativeMetric && trend.direction === 'decreasing');

        if (isProblematic) {
          recommendations.push({
            metric,
            priority: this.getTrendSeverity(trend),
            recommendation: this.getMetricRecommendation(metric, trend)
          });
        }
      }
    });

    return recommendations;
  }

  /**
   * 获取指标建议
   */
  getMetricRecommendation(metric, trend) {
    const recommendations = {
      responseTime: '考虑优化代码性能、增加缓存或升级硬件配置',
      errorRate: '检查错误日志，修复导致错误的代码问题',
      cpuUsage: '优化算法复杂度或考虑水平扩展',
      memoryUsage: '检查内存泄漏，优化数据结构使用',
      throughput: '优化并发处理能力，考虑负载均衡'
    };

    return recommendations[metric] || '建议进一步分析该指标的变化原因';
  }

  /**
   * 获取时间范围内的测试数据
   */
  async getTestDataByTimeRange(testType, url, timeRange) {
    try {
      // 这里应该从数据库查询实际数据
      // 暂时返回模拟数据
      const data = [];
      const now = new Date();

      for (let i = 0; i < timeRange; i++) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        data.push({
          id: `test-${i}`,
          url,
          testType,
          metrics: {
            responseTime: Math.random() * 1000 + 500 + i * 10,
            throughput: Math.random() * 100 + 50 - i * 2,
            errorRate: Math.random() * 5 + i * 0.1,
            cpuUsage: Math.random() * 80 + 10 + i * 1,
            memoryUsage: Math.random() * 70 + 20 + i * 0.5
          },
          timestamp: date.toISOString()
        });
      }

      return data.reverse();
    } catch (error) {
      this.logger.error('获取测试数据失败:', error);
      return [];
    }
  }
}

module.exports = new ComparisonService();
