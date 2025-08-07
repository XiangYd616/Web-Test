/**
 * 兼容性测试引擎入口文件
 * 提供统一的兼容性测试接口
 */

const CompatibilityAnalyzer = require('./CompatibilityAnalyzer');
const { getPool } = require('../../config/database');
const Logger = require('../../utils/logger');

class CompatibilityEngine {
  constructor() {
    this.analyzer = null;
    this.isRunning = false;
  }

  /**
   * 启动兼容性测试
   */
  async startTest(testId, url, config = {}) {
    try {
      Logger.info('启动兼容性测试', { testId, url, engine: 'Compatibility' });

      // 更新测试状态为运行中
      await this.updateTestStatus(testId, 'running', { started_at: new Date() });

      // 发送初始进度
      await this.sendProgress(testId, {
        percentage: 0,
        stage: 'initializing',
        message: '初始化兼容性测试引擎...'
      });

      // 创建分析器实例
      this.analyzer = new CompatibilityAnalyzer(config);
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

      // 更新测试状态为完成
      await this.updateTestStatus(testId, 'completed', {
        completed_at: new Date(),
        duration_ms: analysisResults.analysisTime,
        overall_score: analysisResults.scores.overall,
        grade: this.getGrade(analysisResults.scores.overall),
        total_checks: this.calculateTotalChecks(analysisResults),
        passed_checks: this.calculatePassedChecks(analysisResults),
        failed_checks: this.calculateFailedChecks(analysisResults),
        warnings: this.calculateWarnings(analysisResults)
      });

      // 发送完成进度
      await this.sendProgress(testId, {
        percentage: 100,
        stage: 'completed',
        message: '兼容性测试完成'
      });

      const summary = this.createSummary(analysisResults);

      // 发送测试完成通知
      await this.sendTestComplete(testId, summary);

      Logger.info('兼容性测试完成', { testId, score: analysisResults.scores.overall, engine: 'Compatibility' });

      return {
        success: true,
        testId,
        results: summary
      };

    } catch (error) {
      Logger.error('兼容性测试失败', error, { testId, engine: 'Compatibility' });

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
   * 取消兼容性测试
   */
  async cancelTest(testId) {
    try {
      console.log(`🛑 取消兼容性测试: ${testId}`);

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
      console.error(`❌ 取消兼容性测试失败: ${testId}`, error);
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

      // 保存到compatibility_test_details表
      await pool.query(
        `INSERT INTO compatibility_test_details (
          test_id, browser_results, screenshot_analysis, css_feature_analysis,
          visual_comparison, feature_comparison, compatibility_issues,
          score_breakdown, recommendations, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
        [
          testId,
          JSON.stringify(analysisResults.browsers),
          JSON.stringify(analysisResults.screenshots),
          JSON.stringify(analysisResults.cssFeatures),
          JSON.stringify(analysisResults.visualComparison),
          JSON.stringify(analysisResults.featureComparison),
          JSON.stringify(this.extractCompatibilityIssues(analysisResults)),
          JSON.stringify(analysisResults.scores),
          JSON.stringify(analysisResults.recommendations)
        ]
      );

      console.log(`💾 兼容性分析结果已保存: ${testId}`);
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

      // 获取详细兼容性分析结果
      const detailsResult = await pool.query(
        `SELECT * FROM compatibility_test_details WHERE test_id = $1`,
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
          browsers: details.browser_results,
          screenshots: details.screenshot_analysis,
          cssFeatures: details.css_feature_analysis,
          visualComparison: details.visual_comparison,
          featureComparison: details.feature_comparison,
          issues: details.compatibility_issues,
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
    return {
      url: analysisResults.url,
      timestamp: analysisResults.timestamp,
      analysisTime: analysisResults.analysisTime,
      overallScore: analysisResults.scores.overall,
      grade: this.getGrade(analysisResults.scores.overall),
      scores: {
        loading: analysisResults.scores.loading,
        visual: analysisResults.scores.visual,
        features: analysisResults.scores.features
      },
      browsers: {
        tested: analysisResults.browsers.length,
        successful: analysisResults.browsers.filter(b => b.success).length,
        failed: analysisResults.browsers.filter(b => !b.success).length
      },
      compatibility: {
        visualDifferences: analysisResults.visualComparison ?
          analysisResults.visualComparison.reduce((sum, comp) => sum + comp.comparison.differences.length, 0) : 0,
        featureIssues: analysisResults.featureComparison ?
          Object.values(analysisResults.featureComparison.featureComparison).filter(f => f.partialSupport).length : 0
      },
      topRecommendations: analysisResults.recommendations.slice(0, 5)
    };
  }

  /**
   * 提取兼容性问题
   */
  extractCompatibilityIssues(analysisResults) {
    const issues = [];

    // 提取加载失败
    analysisResults.browsers.forEach(browser => {
      if (!browser.success) {
        issues.push({
          type: 'load_failure',
          browser: `${browser.browserType} ${browser.version}`,
          error: browser.error
        });
      }
    });

    // 提取视觉差异
    if (analysisResults.visualComparison) {
      analysisResults.visualComparison.forEach(comp => {
        if (comp.comparison.summary.diffPercentage > 5) {
          issues.push({
            type: 'visual_difference',
            browsers: `${comp.baseInfo.browserType} vs ${comp.compareInfo.browserType}`,
            percentage: comp.comparison.summary.diffPercentage
          });
        }
      });
    }

    return issues;
  }

  // 辅助计算方法
  calculateTotalChecks(analysisResults) {
    return analysisResults.browsers.length * 3; // 每个浏览器3个检查项：加载、视觉、特性
  }

  calculatePassedChecks(analysisResults) {
    let passed = 0;

    // 加载成功的检查
    passed += analysisResults.browsers.filter(b => b.success).length;

    // 视觉兼容性检查
    if (analysisResults.visualComparison) {
      passed += analysisResults.visualComparison.filter(comp =>
        comp.comparison.summary.diffPercentage <= 5
      ).length;
    }

    // 特性兼容性检查
    if (analysisResults.featureComparison) {
      passed += Object.values(analysisResults.featureComparison.featureComparison)
        .filter(f => f.universalSupport).length;
    }

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
      // 简单的健康检查
      const testAnalyzer = new CompatibilityAnalyzer({ timeout: 5000 });
      await testAnalyzer.cleanup();

      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        capabilities: [
          'multi-browser-testing',
          'screenshot-comparison',
          'css-feature-detection',
          'visual-difference-analysis'
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
const compatibilityEngine = new CompatibilityEngine();

module.exports = compatibilityEngine;
