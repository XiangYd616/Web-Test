/**
 * 压力测试引擎入口文件
 * 提供统一的压力测试接口
 */

const RealStressTestEngine = require('../../services/realStressTestEngine');
const { getPool } = require('../../config/database');
const Logger = require('../../utils/logger');

class LoadTestEngine {
  constructor() {
    this.stressEngine = null;
    this.isRunning = false;
  }

  /**
   * 启动压力测试
   */
  async startTest(testId, url, config = {}) {
    try {
      Logger.info('启动压力测试', { testId, url, engine: 'LoadTest' });
      
      // 更新测试状态为运行中
      await this.updateTestStatus(testId, 'running', { started_at: new Date() });
      
      // 发送初始进度
      await this.sendProgress(testId, {
        percentage: 0,
        stage: 'initializing',
        message: '初始化压力测试引擎...'
      });
      
      // 创建压力测试引擎实例
      this.stressEngine = new RealStressTestEngine();
      this.isRunning = true;
      
      // 设置进度回调
      const progressCallback = (progress) => {
        this.sendProgress(testId, {
          percentage: progress.progress || 0,
          stage: progress.stage || 'testing',
          message: progress.message || '执行压力测试...',
          metrics: progress.metrics
        });
      };
      
      // 执行压力测试
      const testResults = await this.stressEngine.runStressTest(testId, url, {
        ...config,
        progressCallback
      });
      
      // 发送分析完成进度
      await this.sendProgress(testId, {
        percentage: 95,
        stage: 'saving',
        message: '保存分析结果...'
      });
      
      // 保存结果
      await this.saveResults(testId, testResults);
      
      // 更新测试状态为完成
      await this.updateTestStatus(testId, 'completed', {
        completed_at: new Date(),
        duration_ms: testResults.duration || 0,
        overall_score: testResults.overallScore || 0,
        grade: this.getGrade(testResults.overallScore || 0),
        total_checks: this.calculateTotalChecks(testResults),
        passed_checks: this.calculatePassedChecks(testResults),
        failed_checks: this.calculateFailedChecks(testResults),
        warnings: this.calculateWarnings(testResults)
      });
      
      // 发送完成进度
      await this.sendProgress(testId, {
        percentage: 100,
        stage: 'completed',
        message: '压力测试完成'
      });
      
      const summary = this.createSummary(testResults);
      
      // 发送测试完成通知
      await this.sendTestComplete(testId, summary);
      
      Logger.info('压力测试完成', { testId, score: testResults.overallScore || 0, engine: 'LoadTest' });
      
      return {
        success: true,
        testId,
        results: summary
      };
      
    } catch (error) {
      Logger.error('压力测试失败', error, { testId, engine: 'LoadTest' });
      
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
      if (this.stressEngine) {
        await this.stressEngine.cleanup?.();
        this.stressEngine = null;
      }
    }
  }

  /**
   * 停止测试
   */
  async stopTest(testId) {
    try {
      Logger.info('停止压力测试', { testId, engine: 'LoadTest' });
      
      if (this.stressEngine) {
        await this.stressEngine.stopTest?.(testId);
      }
      
      this.isRunning = false;
      
      // 更新测试状态为已取消
      await this.updateTestStatus(testId, 'cancelled', {
        completed_at: new Date()
      });
      
      return { success: true, message: '测试已停止' };
    } catch (error) {
      Logger.error('停止压力测试失败', error, { testId, engine: 'LoadTest' });
      throw error;
    }
  }

  /**
   * 获取测试状态
   */
  getTestStatus() {
    return {
      isRunning: this.isRunning,
      engine: 'LoadTest'
    };
  }

  /**
   * 更新测试状态
   */
  async updateTestStatus(testId, status, data = {}) {
    try {
      const pool = getPool();
      const query = `
        UPDATE test_results 
        SET status = $1, updated_at = NOW(), data = COALESCE(data, '{}') || $2::jsonb
        WHERE id = $3
      `;
      await pool.query(query, [status, JSON.stringify(data), testId]);
    } catch (error) {
      Logger.error('更新测试状态失败', error, { testId, status });
    }
  }

  /**
   * 保存测试结果
   */
  async saveResults(testId, results) {
    try {
      const pool = getPool();
      const query = `
        UPDATE test_results 
        SET 
          results = $1,
          updated_at = NOW()
        WHERE id = $2
      `;
      await pool.query(query, [JSON.stringify(results), testId]);
    } catch (error) {
      Logger.error('保存测试结果失败', error, { testId });
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
      Logger.warn('发送测试完成通知失败', { error: error.message, testId });
    }
  }

  /**
   * 发送测试失败通知
   */
  async sendTestFailed(testId, error) {
    try {
      const errorInfo = {
        testId,
        engine: 'LoadTest',
        error: {
          message: error.message,
          code: error.code || 'UNKNOWN_ERROR',
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        },
        timestamp: new Date().toISOString(),
        retryable: this.isRetryableError(error)
      };
      
      if (global.realtimeService) {
        await global.realtimeService.notifyTestFailed(testId, errorInfo);
      }
    } catch (notificationError) {
      Logger.error('发送测试失败通知失败', notificationError, { testId });
    }
  }

  /**
   * 创建测试摘要
   */
  createSummary(results) {
    return {
      testType: 'loadtest',
      engine: 'LoadTest',
      timestamp: new Date().toISOString(),
      score: results.overallScore || 0,
      grade: this.getGrade(results.overallScore || 0),
      duration: results.duration || 0,
      metrics: results.metrics || {},
      summary: results.summary || {},
      recommendations: results.recommendations || []
    };
  }

  /**
   * 获取评分等级
   */
  getGrade(score) {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * 计算总检查项
   */
  calculateTotalChecks(results) {
    return results.totalRequests || 0;
  }

  /**
   * 计算通过检查项
   */
  calculatePassedChecks(results) {
    return results.successfulRequests || 0;
  }

  /**
   * 计算失败检查项
   */
  calculateFailedChecks(results) {
    return results.failedRequests || 0;
  }

  /**
   * 计算警告数
   */
  calculateWarnings(results) {
    return results.warnings || 0;
  }

  /**
   * 判断错误是否可重试
   */
  isRetryableError(error) {
    const retryableErrors = ['TIMEOUT', 'NETWORK_ERROR', 'CONNECTION_REFUSED'];
    return retryableErrors.includes(error.code);
  }
}

module.exports = LoadTestEngine;
