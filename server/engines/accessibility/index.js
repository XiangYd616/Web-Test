/**
 * 可访问性测试引擎入口文件
 * 提供统一的可访问性测试接口
 */

const AccessibilityAnalyzer = require('./AccessibilityAnalyzer');
const { getPool } = require('../../config/database');
const puppeteer = require('puppeteer');
const Logger = require('../../utils/logger');

class AccessibilityEngine {
  constructor() {
    this.analyzer = null;
    this.browser = null;
    this.isRunning = false;
  }

  /**
   * 启动可访问性测试
   */
  async startTest(testId, url, config = {}) {
    try {
      Logger.info('启动可访问性测试', { testId, url, engine: 'Accessibility' });

      // 更新测试状态为运行中
      await this.updateTestStatus(testId, 'running', { started_at: new Date() });

      // 发送初始进度
      await this.sendProgress(testId, {
        percentage: 0,
        stage: 'initializing',
        message: '初始化可访问性测试引擎...'
      });

      // 启动浏览器
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      });

      const page = await this.browser.newPage();

      // 设置视口
      await page.setViewport({ width: 1920, height: 1080 });

      // 发送进度更新
      await this.sendProgress(testId, {
        percentage: 10,
        stage: 'loading',
        message: '加载页面...'
      });

      // 导航到URL
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

      // 创建分析器实例
      this.analyzer = new AccessibilityAnalyzer(config);
      this.isRunning = true;

      // 执行分析（带进度回调）
      const analysisResults = await this.analyzer.analyze(page, {
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
        total_checks: analysisResults.compliance.summary.totalChecks,
        passed_checks: analysisResults.compliance.summary.passedChecks,
        failed_checks: analysisResults.compliance.summary.failedChecks,
        warnings: analysisResults.compliance.summary.warningChecks
      });

      // 发送完成进度
      await this.sendProgress(testId, {
        percentage: 100,
        stage: 'completed',
        message: '可访问性测试完成'
      });

      const summary = this.createSummary(analysisResults);

      // 发送测试完成通知
      await this.sendTestComplete(testId, summary);

      Logger.info('可访问性测试完成', { testId, score: analysisResults.scores.overall, engine: 'Accessibility' });

      return {
        success: true,
        testId,
        results: summary
      };

    } catch (error) {
      Logger.error('可访问性测试失败', error, { testId, engine: 'Accessibility' });

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
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
      this.analyzer = null;
    }
  }

  /**
   * 取消可访问性测试
   */
  async cancelTest(testId) {
    try {
      console.log(`🛑 取消可访问性测试: ${testId}`);

      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }

      this.isRunning = false;
      this.analyzer = null;

      // 更新测试状态为取消
      await this.updateTestStatus(testId, 'cancelled', {
        completed_at: new Date()
      });

      return { success: true, testId };
    } catch (error) {
      console.error(`❌ 取消可访问性测试失败: ${testId}`, error);
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

      // 保存到accessibility_test_details表
      await pool.query(
        `INSERT INTO accessibility_test_details (
          test_id, color_contrast_analysis, keyboard_navigation_analysis,
          aria_semantic_analysis, wcag_compliance, score_breakdown,
          accessibility_issues, recommendations, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        [
          testId,
          JSON.stringify(analysisResults.colorContrast),
          JSON.stringify(analysisResults.keyboardNavigation),
          JSON.stringify(analysisResults.ariaSemantics),
          JSON.stringify(analysisResults.compliance),
          JSON.stringify(analysisResults.scores),
          JSON.stringify(this.extractAccessibilityIssues(analysisResults)),
          JSON.stringify(analysisResults.recommendations)
        ]
      );

      console.log(`💾 可访问性分析结果已保存: ${testId}`);
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

      // 获取详细可访问性分析结果
      const detailsResult = await pool.query(
        `SELECT * FROM accessibility_test_details WHERE test_id = $1`,
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
          colorContrast: details.color_contrast_analysis,
          keyboardNavigation: details.keyboard_navigation_analysis,
          ariaSemantics: details.aria_semantic_analysis,
          compliance: details.wcag_compliance,
          scores: details.score_breakdown,
          issues: details.accessibility_issues,
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
      wcagLevel: analysisResults.wcagLevel,
      overallScore: analysisResults.scores.overall,
      grade: this.getGrade(analysisResults.scores.overall),
      scores: {
        perceivable: analysisResults.scores.perceivable,
        operable: analysisResults.scores.operable,
        understandable: analysisResults.scores.understandable,
        robust: analysisResults.scores.robust
      },
      compliance: {
        totalChecks: analysisResults.compliance.summary.totalChecks,
        passedChecks: analysisResults.compliance.summary.passedChecks,
        failedChecks: analysisResults.compliance.summary.failedChecks,
        complianceRate: analysisResults.compliance.summary.complianceRate
      },
      topIssues: analysisResults.compliance.issues.slice(0, 5),
      topRecommendations: analysisResults.recommendations.slice(0, 5)
    };
  }

  /**
   * 提取可访问性问题
   */
  extractAccessibilityIssues(analysisResults) {
    const issues = [];

    // 从合规性检查中提取问题
    if (analysisResults.compliance && analysisResults.compliance.issues) {
      issues.push(...analysisResults.compliance.issues.map(issue => ({
        type: issue.type,
        principle: issue.principle,
        guideline: issue.guideline,
        level: issue.level,
        element: issue.element,
        description: issue.description
      })));
    }

    return issues;
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
      const testBrowser = await puppeteer.launch({ headless: true });
      await testBrowser.close();

      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        capabilities: [
          'wcag-2.1-compliance',
          'color-contrast-analysis',
          'keyboard-navigation-testing',
          'aria-semantic-analysis'
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

module.exports = AccessibilityEngine;
