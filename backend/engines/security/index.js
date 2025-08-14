/**
 * 安全测试引擎入口文件
 * 提供统一的安全测试接口
 */

const SecurityAnalyzer = require('./SecurityAnalyzer');
const { getPool } = require('../../config/database');
const Logger = require('../../utils/logger');

class SecurityEngine {
  constructor() {
    this.analyzer = null;
    this.isRunning = false;
  }

  /**
   * 启动安全测试
   */
  async startTest(testId, url, config = {}) {
    try {
      Logger.info('启动安全测试', { testId, url, engine: 'Security' });

      // 更新测试状态为运行中
      await this.updateTestStatus(testId, 'running', { started_at: new Date() });

      // 发送初始进度
      await this.sendProgress(testId, {
        percentage: 0,
        stage: 'initializing',
        message: '初始化安全分析引擎...'
      });

      // 创建分析器实例
      this.analyzer = new SecurityAnalyzer(config);
      this.isRunning = true;

      // 执行分析（带进度回调）
      const analysisResults = await this.analyzer.analyze(url, {
        ...config,
        onProgress: (progress) => this.sendProgress(testId, progress)
      });

      // 发送分析完成进度
      await this.sendProgress(testId, {
        percentage: 95,
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
        message: '安全分析完成'
      });

      const summary = this.createSummary(analysisResults);

      // 发送测试完成通知
      await this.sendTestComplete(testId, summary);

      Logger.info('安全测试完成', { testId, score: analysisResults.scores.overall.score, engine: 'Security' });

      return {
        success: true,
        testId,
        results: summary
      };

    } catch (error) {
      Logger.error('安全测试失败', error, { testId, engine: 'Security' });

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
   * 取消安全测试
   */
  async cancelTest(testId) {
    try {
      console.log(`🛑 取消安全测试: ${testId}`);

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
      console.error(`❌ 取消安全测试失败: ${testId}`, error);
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

      // 保存到security_test_details表
      await pool.query(
        `INSERT INTO security_test_details (
          test_id, sql_injection_results, xss_results, ssl_results,
          security_headers_results, vulnerability_summary, score_breakdown,
          recommendations, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        [
          testId,
          JSON.stringify(analysisResults.details.sqlInjection),
          JSON.stringify(analysisResults.details.xss),
          JSON.stringify(analysisResults.details.ssl),
          JSON.stringify(analysisResults.details.headers),
          JSON.stringify(this.createVulnerabilitySummary(analysisResults.vulnerabilities)),
          JSON.stringify(analysisResults.scores),
          JSON.stringify(analysisResults.recommendations)
        ]
      );

      console.log(`💾 安全分析结果已保存: ${testId}`);
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

      // 获取详细安全分析结果
      const detailsResult = await pool.query(
        `SELECT * FROM security_test_details WHERE test_id = $1`,
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
          sqlInjection: details.sql_injection_results,
          xss: details.xss_results,
          ssl: details.ssl_results,
          headers: details.security_headers_results,
          vulnerabilities: details.vulnerability_summary,
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
    const vulnerabilitySummary = this.createVulnerabilitySummary(analysisResults.vulnerabilities);

    return {
      url: analysisResults.url,
      timestamp: analysisResults.timestamp,
      analysisTime: analysisResults.analysisTime,
      overallScore: analysisResults.scores.overall.score,
      grade: analysisResults.scores.overall.grade,
      scores: {
        sqlInjection: analysisResults.scores.sqlInjection.score,
        xss: analysisResults.scores.xss.score,
        ssl: analysisResults.scores.ssl.score,
        headers: analysisResults.scores.headers.score
      },
      vulnerabilities: vulnerabilitySummary,
      topRecommendations: analysisResults.recommendations.slice(0, 5)
    };
  }

  /**
   * 创建漏洞摘要
   */
  createVulnerabilitySummary(vulnerabilities) {
    const summary = {
      total: vulnerabilities.length,
      critical: vulnerabilities.filter(v => v.severity === 'critical').length,
      high: vulnerabilities.filter(v => v.severity === 'high').length,
      medium: vulnerabilities.filter(v => v.severity === 'medium').length,
      low: vulnerabilities.filter(v => v.severity === 'low').length,
      byCategory: {}
    };

    // 按类别统计
    vulnerabilities.forEach(vuln => {
      const category = this.getVulnerabilityCategory(vuln.type);
      if (!summary.byCategory[category]) {
        summary.byCategory[category] = 0;
      }
      summary.byCategory[category]++;
    });

    return summary;
  }

  /**
   * 获取漏洞分类
   */
  getVulnerabilityCategory(type) {
    if (type.includes('sql')) return 'injection';
    if (type.includes('xss')) return 'xss';
    if (type.includes('ssl') || type.includes('certificate')) return 'ssl';
    if (type.includes('header') || type.includes('cookie')) return 'configuration';
    return 'other';
  }

  // 辅助计算方法
  calculateTotalChecks(analysisResults) {
    let total = 0;

    // SQL注入检查项
    total += 10;

    // XSS检查项
    total += 10;

    // SSL/TLS检查项
    total += 8;

    // 安全头检查项
    total += 7;

    return total;
  }

  calculatePassedChecks(analysisResults) {
    const totalChecks = this.calculateTotalChecks(analysisResults);
    const totalVulns = analysisResults.vulnerabilities.length;

    // 简化计算：假设每个漏洞代表一个失败的检查
    return Math.max(0, totalChecks - totalVulns);
  }

  calculateFailedChecks(analysisResults) {
    return analysisResults.vulnerabilities.filter(v =>
      v.severity === 'critical' || v.severity === 'high'
    ).length;
  }

  calculateWarnings(analysisResults) {
    return analysisResults.vulnerabilities.filter(v =>
      v.severity === 'medium' || v.severity === 'low'
    ).length;
  }

  /**
   * 检查引擎健康状态
   */
  async healthCheck() {
    try {
      // 简单的健康检查
      const testAnalyzer = new SecurityAnalyzer({ timeout: 5000 });
      await testAnalyzer.cleanup();

      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        capabilities: [
          'sql-injection-detection',
          'xss-detection',
          'ssl-tls-analysis',
          'security-headers-analysis'
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

module.exports = SecurityEngine;
