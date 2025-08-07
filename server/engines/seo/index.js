/**
 * SEO分析引擎入口文件
 * 提供统一的SEO分析接口
 */

const SEOAnalyzer = require('./SEOAnalyzer');
const { getPool } = require('../../config/database');
const Logger = require('../../utils/logger');
const EngineCache = require('../../utils/cache/EngineCache');
const ErrorNotificationHelper = require('../../utils/ErrorNotificationHelper');

class SEOEngine {
  constructor() {
    this.analyzer = null;
    this.isRunning = false;
    this.cache = new EngineCache('SEO');
    this.errorNotifier = new ErrorNotificationHelper('SEO');
  }

  /**
   * 启动SEO测试
   */
  async startTest(testId, url, config = {}) {
    const startTime = Date.now();
    this.startTime = startTime;

    try {
      Logger.info('启动SEO测试', { testId, url, engine: 'SEO' });

      // 更新测试状态为运行中
      await this.updateTestStatus(testId, 'running', { started_at: new Date() });

      // 发送初始进度
      await this.sendProgress(testId, {
        percentage: 0,
        stage: 'initializing',
        message: '初始化SEO分析引擎...'
      });

      // 创建分析器实例
      this.analyzer = new SEOAnalyzer(config);
      this.isRunning = true;

      // 发送进度更新
      await this.sendProgress(testId, {
        percentage: 10,
        stage: 'loading',
        message: '加载页面中...'
      });

      // 检查缓存
      let analysisResults = null;
      if (!config.forceRefresh) {
        analysisResults = await this.cache.getCachedAnalysisResult(url, config);
        if (analysisResults) {
          Logger.info('使用缓存的SEO分析结果', { testId, url: url.substring(0, 50) });

          // 快速完成进度
          await this.sendProgress(testId, {
            percentage: 80,
            stage: 'cached',
            message: '使用缓存结果...'
          });
        }
      }

      // 如果没有缓存结果，执行分析
      if (!analysisResults) {
        analysisResults = await this.analyzer.analyze(url, {
          ...config,
          onProgress: (progress) => this.sendProgress(testId, progress)
        });

        // 缓存分析结果
        await this.cache.cacheAnalysisResult(url, config, analysisResults);
      }

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
        message: 'SEO分析完成'
      });

      const summary = analysisResults.getSummary ? analysisResults.getSummary() : this.createSummary(analysisResults);

      // 发送测试完成通知
      await this.sendTestComplete(testId, summary);

      Logger.info('SEO测试完成', { testId, score: analysisResults.scores.overall.score, engine: 'SEO' });

      return {
        success: true,
        testId,
        results: summary
      };

    } catch (error) {
      Logger.error('SEO测试失败', error, { testId, engine: 'SEO' });

      // 更新测试状态为失败
      await this.updateTestStatus(testId, 'failed', {
        completed_at: new Date(),
        error_message: error.message
      });

      // 发送详细的错误通知
      const errorContext = this.errorNotifier.createErrorContext(testId, url, config, {
        stage: 'analysis',
        duration: Date.now() - startTime
      });
      await this.errorNotifier.sendTestFailedNotification(testId, error, errorContext);

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
   * 取消SEO测试
   */
  async cancelTest(testId) {
    try {
      console.log(`🛑 取消SEO测试: ${testId}`);

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
      console.error(`❌ 取消SEO测试失败: ${testId}`, error);
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

      // 保存到seo_test_details表
      await pool.query(
        `INSERT INTO seo_test_details (
          test_id, meta_analysis, content_analysis, performance_analysis,
          structured_data_analysis, link_analysis, mobile_analysis,
          score_breakdown, recommendations, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
        [
          testId,
          JSON.stringify(analysisResults.meta),
          JSON.stringify(analysisResults.content),
          JSON.stringify(analysisResults.performance),
          JSON.stringify(analysisResults.structuredData),
          JSON.stringify(analysisResults.links),
          JSON.stringify(analysisResults.mobile),
          JSON.stringify(analysisResults.scores),
          JSON.stringify(analysisResults.recommendations)
        ]
      );

      console.log(`💾 SEO分析结果已保存: ${testId}`);
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

      // 获取详细SEO分析结果
      const detailsResult = await pool.query(
        `SELECT * FROM seo_test_details WHERE test_id = $1`,
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
          meta: details.meta_analysis,
          content: details.content_analysis,
          performance: details.performance_analysis,
          structuredData: details.structured_data_analysis,
          links: details.link_analysis,
          mobile: details.mobile_analysis,
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
        meta: analysisResults.scores.meta.score,
        content: analysisResults.scores.content.score,
        performance: analysisResults.scores.performance.score,
        structuredData: analysisResults.scores.structuredData.score,
        links: analysisResults.scores.links.score,
        mobile: analysisResults.scores.mobile.score
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
    // 计算总检查项数
    let total = 0;

    // Meta标签检查项
    if (analysisResults.meta) {
      total += 10; // title, description, og, canonical等
    }

    // 内容检查项
    if (analysisResults.content) {
      total += 15; // 长度、标题结构、图片、关键词等
    }

    // 性能检查项
    if (analysisResults.performance) {
      total += 12; // Core Web Vitals、加载时间等
    }

    // 结构化数据检查项
    if (analysisResults.structuredData) {
      total += 8;
    }

    // 链接检查项
    if (analysisResults.links) {
      total += 10;
    }

    // 移动端检查项
    if (analysisResults.mobile) {
      total += 10;
    }

    return total;
  }

  calculatePassedChecks(analysisResults) {
    // 根据各模块评分计算通过的检查项
    const scores = analysisResults.scores;
    let passed = 0;

    Object.values(scores).forEach(moduleScore => {
      if (moduleScore.score >= 80) passed += 3;
      else if (moduleScore.score >= 60) passed += 2;
      else if (moduleScore.score >= 40) passed += 1;
    });

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
   * 发送测试进度
   */
  async sendProgress(testId, progress) {
    try {
      // 检查是否有实时通信服务
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
   * 检查引擎健康状态
   */
  async healthCheck() {
    try {
      // 简单的健康检查
      const testAnalyzer = new SEOAnalyzer({ timeout: 5000 });
      await testAnalyzer.cleanup();

      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        capabilities: [
          'meta-analysis',
          'content-analysis',
          'performance-analysis',
          'structured-data-analysis',
          'link-analysis',
          'mobile-optimization-analysis'
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

module.exports = SEOEngine;
