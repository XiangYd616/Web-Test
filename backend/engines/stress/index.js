/**
 * 压力测试引擎入口文件
 * 提供统一的压力测试接口
 */

const StressAnalyzer = require('./StressAnalyzer');
const { getPool } = require('../../config/database');

class StressEngine {
  constructor() {
    this.analyzer = null;
    this.isRunning = false;
  }

  /**
   * 启动压力测试
   */
  async startTest(testId, url, config = {}) {
    try {
      console.log(`🚀 启动压力测试: ${testId} - ${url}`);
      
      // 更新测试状态为运行中
      await this.updateTestStatus(testId, 'running', { started_at: new Date() });
      
      // 发送初始进度
      await this.sendProgress(testId, {
        percentage: 0,
        stage: 'initializing',
        message: '初始化压力测试引擎...'
      });
      
      // 创建分析器实例
      this.analyzer = new StressAnalyzer(config);
      this.isRunning = true;
      
      // 执行分析（带进度回调）
      const analysisResults = await this.analyzer.analyze(url, {
        ...config,
        onProgress: (progress) => this.sendProgress(testId, progress)
      });
      
      // 发送分析完成进度
      await this.sendProgress(testId, {
        percentage: 98,
        stage: 'saving',
        message: '保存分析结果...'
      });
      
      // 保存分析结果
      await this.saveResults(testId, analysisResults);
      
      // 计算评分
      const overallScore = this.calculateOverallScore(analysisResults);
      
      // 更新测试状态为完成
      await this.updateTestStatus(testId, 'completed', {
        completed_at: new Date(),
        duration_ms: analysisResults.analysisTime,
        overall_score: overallScore,
        grade: this.getGrade(overallScore),
        total_checks: this.calculateTotalChecks(analysisResults),
        passed_checks: this.calculatePassedChecks(analysisResults),
        failed_checks: this.calculateFailedChecks(analysisResults),
        warnings: this.calculateWarnings(analysisResults)
      });
      
      // 发送完成进度
      await this.sendProgress(testId, {
        percentage: 100,
        stage: 'completed',
        message: '压力测试完成'
      });
      
      const summary = this.createSummary(analysisResults);
      
      // 发送测试完成通知
      await this.sendTestComplete(testId, summary);
      
      console.log(`✅ 压力测试完成: ${testId} - 评分: ${overallScore}`);
      
      return {
        success: true,
        testId,
        results: summary
      };
      
    } catch (error) {
      console.error(`❌ 压力测试失败: ${testId}`, error);
      
      // 更新测试状态为失败
      await this.updateTestStatus(testId, 'failed', {
        completed_at: new Date(),
        error_message: error.message
      });
      
      // 发送测试失败通知
      await this.sendTestFailed(testId, error);
      
      throw error;
    } finally {
      this.isRunning = false;
      if (this.analyzer) {
        this.analyzer.stop();
        this.analyzer = null;
      }
    }
  }

  /**
   * 取消压力测试
   */
  async cancelTest(testId) {
    try {
      console.log(`🛑 取消压力测试: ${testId}`);
      
      if (this.analyzer) {
        this.analyzer.stop();
        this.analyzer = null;
      }
      
      this.isRunning = false;
      
      // 更新测试状态为取消
      await this.updateTestStatus(testId, 'cancelled', {
        completed_at: new Date()
      });
      
      return { success: true, testId };
    } catch (error) {
      console.error(`❌ 取消压力测试失败: ${testId}`, error);
      throw error;
    }
  }

  /**
   * 获取测试状态
   */
  async getTestStatus(testId) {
    try {
      const pool = getPool();
      const result = await pool.query(
        'SELECT status, started_at, completed_at, overall_score, grade FROM test_results WHERE id = $1',
        [testId]
      );
      
      if (result.rows.length === 0) {
        throw new Error('测试不存在');
      }
      
      const test = result.rows[0];
      
      return {
        testId,
        status: test.status,
        startedAt: test.started_at,
        completedAt: test.completed_at,
        overallScore: test.overall_score,
        grade: test.grade,
        isRunning: this.isRunning && test.status === 'running',
        currentStats: this.analyzer ? this.analyzer.getStatus() : null
      };
    } catch (error) {
      console.error(`❌ 获取测试状态失败: ${testId}`, error);
      throw error;
    }
  }

  /**
   * 更新测试状态
   */
  async updateTestStatus(testId, status, additionalData = {}) {
    try {
      const pool = getPool();
      
      const updateFields = ['status = $2', 'updated_at = NOW()'];
      const values = [testId, status];
      let paramIndex = 3;
      
      // 动态添加更新字段
      Object.entries(additionalData).forEach(([key, value]) => {
        updateFields.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      });
      
      const query = `UPDATE test_results SET ${updateFields.join(', ')} WHERE id = $1`;
      await pool.query(query, values);
      
    } catch (error) {
      console.error(`❌ 更新测试状态失败: ${testId}`, error);
      throw error;
    }
  }

  /**
   * 保存分析结果
   */
  async saveResults(testId, analysisResults) {
    try {
      const pool = getPool();
      
      // 保存到stress_test_details表
      await pool.query(
        `INSERT INTO stress_test_details (
          test_id, test_configuration, load_results, performance_analysis,
          bottleneck_analysis, recommendations, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [
          testId,
          JSON.stringify(analysisResults.testConfig),
          JSON.stringify(analysisResults.loadResults),
          JSON.stringify(analysisResults.performanceAnalysis),
          JSON.stringify(analysisResults.performanceAnalysis.bottlenecks),
          JSON.stringify(analysisResults.recommendations)
        ]
      );
      
      console.log(`💾 压力测试分析结果已保存: ${testId}`);
    } catch (error) {
      console.error(`❌ 保存分析结果失败: ${testId}`, error);
      throw error;
    }
  }

  /**
   * 获取详细结果
   */
  async getDetailedResults(testId) {
    try {
      const pool = getPool();
      
      // 获取基本测试信息
      const testResult = await pool.query(
        `SELECT * FROM test_results WHERE id = $1`,
        [testId]
      );
      
      if (testResult.rows.length === 0) {
        throw new Error('测试不存在');
      }
      
      // 获取详细压力测试结果
      const detailsResult = await pool.query(
        `SELECT * FROM stress_test_details WHERE test_id = $1`,
        [testId]
      );
      
      const test = testResult.rows[0];
      const details = detailsResult.rows[0];
      
      return {
        test: {
          id: test.id,
          url: test.url,
          testName: test.test_name,
          status: test.status,
          overallScore: test.overall_score,
          grade: test.grade,
          startedAt: test.started_at,
          completedAt: test.completed_at,
          durationMs: test.duration_ms,
          totalChecks: test.total_checks,
          passedChecks: test.passed_checks,
          failedChecks: test.failed_checks,
          warnings: test.warnings
        },
        analysis: details ? {
          testConfig: details.test_configuration,
          loadResults: details.load_results,
          performanceAnalysis: details.performance_analysis,
          bottlenecks: details.bottleneck_analysis,
          recommendations: details.recommendations
        } : null
      };
    } catch (error) {
      console.error(`❌ 获取详细结果失败: ${testId}`, error);
      throw error;
    }
  }

  /**
   * 发送测试进度
   */
  async sendProgress(testId, progress) {
    try {
      if (global.realtimeService) {
        await global.realtimeService.updateTestProgress(testId, progress);
      }
    } catch (error) {
      console.warn('发送测试进度失败:', error);
    }
  }

  /**
   * 发送测试完成通知
   */
  async sendTestComplete(testId, result) {
    try {
      if (global.realtimeService) {
        await global.realtimeService.notifyTestComplete(testId, result);
      }
    } catch (error) {
      console.warn('发送测试完成通知失败:', error);
    }
  }

  /**
   * 发送测试失败通知
   */
  async sendTestFailed(testId, error) {
    try {
      if (global.realtimeService) {
        await global.realtimeService.notifyTestFailed(testId, error);
      }
    } catch (error) {
      console.warn('发送测试失败通知失败:', error);
    }
  }

  /**
   * 创建结果摘要
   */
  createSummary(analysisResults) {
    const { loadResults, performanceAnalysis } = analysisResults;
    
    return {
      url: analysisResults.url,
      timestamp: analysisResults.timestamp,
      analysisTime: analysisResults.analysisTime,
      overallScore: this.calculateOverallScore(analysisResults),
      grade: this.getGrade(this.calculateOverallScore(analysisResults)),
      performance: {
        totalRequests: loadResults.totalRequests,
        successRate: loadResults.successRate,
        avgResponseTime: loadResults.avgResponseTime,
        throughput: loadResults.throughput,
        efficiency: performanceAnalysis.performance.efficiency.score,
        stability: performanceAnalysis.performance.stability.score,
        scalability: performanceAnalysis.performance.scalability.score
      },
      bottlenecks: performanceAnalysis.bottlenecks.filter(b => b.severity === 'high').length,
      topRecommendations: analysisResults.recommendations.slice(0, 5)
    };
  }

  /**
   * 计算总体评分
   */
  calculateOverallScore(analysisResults) {
    const { loadResults, performanceAnalysis } = analysisResults;
    
    // 基础分数
    let score = 100;
    
    // 成功率影响 (40%)
    const successRateScore = loadResults.successRate;
    score = score * 0.6 + successRateScore * 0.4;
    
    // 性能指标影响 (60%)
    const performanceScore = (
      performanceAnalysis.performance.efficiency.score * 0.3 +
      performanceAnalysis.performance.stability.score * 0.4 +
      performanceAnalysis.performance.scalability.score * 0.3
    );
    score = score * 0.4 + performanceScore * 0.6;
    
    return Math.round(score);
  }

  // 辅助计算方法
  calculateTotalChecks(analysisResults) {
    return 5; // 效率、稳定性、可扩展性、错误率、响应时间
  }

  calculatePassedChecks(analysisResults) {
    const { performanceAnalysis, loadResults } = analysisResults;
    let passed = 0;
    
    if (performanceAnalysis.performance.efficiency.score >= 70) passed++;
    if (performanceAnalysis.performance.stability.score >= 70) passed++;
    if (performanceAnalysis.performance.scalability.score >= 70) passed++;
    if (loadResults.successRate >= 95) passed++;
    if (loadResults.avgResponseTime <= 1000) passed++;
    
    return passed;
  }

  calculateFailedChecks(analysisResults) {
    return this.calculateTotalChecks(analysisResults) - this.calculatePassedChecks(analysisResults);
  }

  calculateWarnings(analysisResults) {
    return analysisResults.performanceAnalysis.bottlenecks.filter(b => 
      b.severity === 'medium' || b.severity === 'low'
    ).length;
  }

  getGrade(score) {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * 检查引擎健康状态
   */
  async healthCheck() {
    try {
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        capabilities: [
          'load-testing',
          'performance-analysis',
          'bottleneck-detection',
          'scalability-testing',
          'multiple-load-patterns'
        ],
        realtime: !!global.realtimeService
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// 创建单例实例
const stressEngine = new StressEngine();

module.exports = stressEngine;
