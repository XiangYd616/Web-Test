/**
 * 性能测试引擎入口文件
 * 提供统一的性能测试接口
 */

const PerformanceAnalyzer = require('./PerformanceAnalyzer');
const { getPool } = require('../../config/database');
const Logger = require('../../utils/logger');
const EngineCache = require('../../utils/cache/EngineCache');

class PerformanceEngine {
  constructor() {
    this.analyzer = null;
    this.isRunning = false;
    this.cache = new EngineCache('Performance');
  }

  /**
   * 启动性能测试
   */
  async startTest(testId, url, config = {}) {
    try {
      Logger.info('启动性能测试', { testId, url, engine: 'Performance' });

      // 更新测试状态为运行中
      await this.updateTestStatus(testId, 'running', { started_at: new Date() });

      // 发送初始进度
      await this.sendProgress(testId, {
        percentage: 0,
        stage: 'initializing',
        message: '初始化性能分析引擎...'
      });

      // 创建分析器实例
      this.analyzer = new PerformanceAnalyzer(config);
      this.isRunning = true;

      // 执行分析（带进度回调）
      const analysisResults = await this.analyzer.analyze(url, {
        ...config,
        onProgress: (progress) => this.sendProgress(testId, progress)
      });

      // 发送分析完成进度
      await this.sendProgress(testId, {
        percentage: 90,
        stage: 'saving',
        message: '保存分析结果...'
      });

      // 保存分析结果
      await this.saveResults(testId, analysisResults);

      // 更新测试状态为完成
      await this.updateTestStatus(testId, 'completed', {
        completed_at: new Date(),
        duration_ms: analysisResults.analysisTime,
        overall_score: analysisResults.scores.overall.score,
        grade: analysisResults.scores.overall.grade,
        total_checks: this.calculateTotalChecks(analysisResults),
        passed_checks: this.calculatePassedChecks(analysisResults),
        failed_checks: this.calculateFailedChecks(analysisResults),
        warnings: this.calculateWarnings(analysisResults)
      });

      // 发送完成进度
      await this.sendProgress(testId, {
        percentage: 100,
        stage: 'completed',
        message: '性能分析完成'
      });

      const summary = this.createSummary(analysisResults);

      // 发送测试完成通知
      await this.sendTestComplete(testId, summary);

      Logger.info('性能测试完成', { testId, score: analysisResults.scores.overall.score, engine: 'Performance' });

      return {
        success: true,
        testId,
        results: summary
      };

    } catch (error) {
      Logger.error('性能测试失败', error, { testId, engine: 'Performance' });

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
        await this.analyzer.cleanup();
        this.analyzer = null;
      }
    }
  }

  /**
   * 取消性能测试
   */
  async cancelTest(testId) {
    try {
      console.log(`🛑 取消性能测试: ${testId}`);

      if (this.analyzer) {
        await this.analyzer.cleanup();
        this.analyzer = null;
      }

      this.isRunning = false;

      // 更新测试状态为取消
      await this.updateTestStatus(testId, 'cancelled', {
        completed_at: new Date()
      });

      return { success: true, testId };
    } catch (error) {
      console.error(`❌ 取消性能测试失败: ${testId}`, error);
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
        isRunning: this.isRunning && test.status === 'running'
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

      // 保存到performance_test_details表
      await pool.query(
        `INSERT INTO performance_test_details (
          test_id, core_web_vitals, resource_analysis, network_analysis,
          score_breakdown, recommendations, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [
          testId,
          JSON.stringify(analysisResults.coreWebVitals),
          JSON.stringify(analysisResults.resources),
          JSON.stringify(analysisResults.network),
          JSON.stringify(analysisResults.scores),
          JSON.stringify(analysisResults.recommendations)
        ]
      );

      console.log(`💾 性能分析结果已保存: ${testId}`);
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

      // 获取详细性能分析结果
      const detailsResult = await pool.query(
        `SELECT * FROM performance_test_details WHERE test_id = $1`,
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
          coreWebVitals: details.core_web_vitals,
          resources: details.resource_analysis,
          network: details.network_analysis,
          scores: details.score_breakdown,
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
      Logger.warn('发送测试进度失败', { error: error.message, testId });
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
    return {
      url: analysisResults.url,
      timestamp: analysisResults.timestamp,
      analysisTime: analysisResults.analysisTime,
      overallScore: analysisResults.scores.overall.score,
      grade: analysisResults.scores.overall.grade,
      scores: {
        coreWebVitals: analysisResults.scores.coreWebVitals.score,
        resources: analysisResults.scores.resources.score,
        network: analysisResults.scores.network.score
      },
      coreWebVitals: {
        lcp: analysisResults.coreWebVitals.lcp,
        fid: analysisResults.coreWebVitals.fid,
        cls: analysisResults.coreWebVitals.cls,
        fcp: analysisResults.coreWebVitals.fcp,
        ttfb: analysisResults.coreWebVitals.ttfb
      },
      issueCount: {
        critical: analysisResults.recommendations.filter(r => r.priority === 'critical').length,
        high: analysisResults.recommendations.filter(r => r.priority === 'high').length,
        medium: analysisResults.recommendations.filter(r => r.priority === 'medium').length,
        low: analysisResults.recommendations.filter(r => r.priority === 'low').length
      },
      topRecommendations: analysisResults.recommendations.slice(0, 5)
    };
  }

  // 辅助计算方法
  calculateTotalChecks(analysisResults) {
    let total = 0;

    // Core Web Vitals检查项
    total += 5; // LCP, FID, CLS, FCP, TTFB

    // 资源检查项
    total += 10; // 资源大小、数量、压缩、缓存等

    // 网络检查项
    total += 5; // DNS、连接、响应时间等

    return total;
  }

  calculatePassedChecks(analysisResults) {
    let passed = 0;

    // Core Web Vitals通过检查
    if (analysisResults.coreWebVitals.lcp.rating === 'good') passed++;
    if (analysisResults.coreWebVitals.fid.rating === 'good') passed++;
    if (analysisResults.coreWebVitals.cls.rating === 'good') passed++;
    if (analysisResults.coreWebVitals.fcp.rating === 'good') passed++;
    if (analysisResults.coreWebVitals.ttfb.rating === 'good') passed++;

    // 资源检查通过数
    const resourceScore = analysisResults.scores.resources.score;
    passed += Math.round((resourceScore / 100) * 10);

    // 网络检查通过数
    const networkScore = analysisResults.scores.network.score;
    passed += Math.round((networkScore / 100) * 5);

    return passed;
  }

  calculateFailedChecks(analysisResults) {
    const total = this.calculateTotalChecks(analysisResults);
    const passed = this.calculatePassedChecks(analysisResults);
    return Math.max(0, total - passed);
  }

  calculateWarnings(analysisResults) {
    return analysisResults.recommendations.filter(r =>
      r.priority === 'medium' || r.priority === 'low'
    ).length;
  }

  /**
   * 检查引擎健康状态
   */
  async healthCheck() {
    try {
      // 简单的健康检查
      const testAnalyzer = new PerformanceAnalyzer({ timeout: 5000 });
      await testAnalyzer.cleanup();

      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        capabilities: [
          'core-web-vitals-analysis',
          'resource-analysis',
          'network-analysis',
          'performance-optimization-recommendations'
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
const performanceEngine = new PerformanceEngine();

module.exports = performanceEngine;
