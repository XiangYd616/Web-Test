/**
 * 压力测试引擎
 * 基于StressAnalyzer提供标准化的压力测试接口
 * 
 * 增强功能:
 * - WebSocket实时进度通知
 * - 告警系统集成
 * - 数据持久化
 * - 结果分析和建议
 */

const StressAnalyzer = require('./StressAnalyzer.js');
const { emitTestProgress, emitTestComplete, emitTestError } = require('../../websocket/testEvents');
const { getAlertManager } = require('../../alert/AlertManager');
const Logger = require('../../utils/logger');

class StressTestEngine {
  constructor(options = {}) {
    this.name = 'stress';
    this.version = '3.0.0';
    this.description = '压力测试引擎 - 支持WebSocket实时通知和告警';
    this.options = options;
    this.analyzer = new StressAnalyzer(options);
    this.alertManager = null;
    
    // 初始化告警管理器
    try {
      this.alertManager = getAlertManager();
    } catch (error) {
      Logger.warn('告警管理器未初始化:', error.message);
    }
  }

  /**
   * 检查引擎可用性
   */
  checkAvailability() {
    return {
      available: true,
      version: this.version,
      features: [
        'stress-testing',
        'load-generation',
        'performance-analysis',
        'concurrency-testing'
      ]
    };
  }

  /**
   * 执行压力测试
   */
  async executeTest(config) {
    const testId = config.testId || `stress-${Date.now()}`;
    const { url = 'http://example.com' } = config;
    
    try {
      Logger.info(`🚀 开始压力测试: ${testId} - ${url}`);
      
      // 发送测试开始事件
      emitTestProgress(testId, {
        stage: 'started',
        progress: 0,
        message: '压力测试开始',
        url
      });
      
      // 提供默认的压力测试配置
      const testConfig = {
        duration: 30, // 30秒测试
        concurrency: 5, // 5个并发用户
        rampUp: 5, // 5秒加压期
        ...config,
        // 注入进度回调
        onProgress: (progress) => {
          emitTestProgress(testId, {
            stage: 'running',
            progress: progress.percentage || 0,
            message: `已完成 ${progress.completed || 0}/${progress.total || 0} 请求`,
            stats: {
              completed: progress.completed,
              failed: progress.failed,
              avgResponseTime: progress.avgResponseTime
            }
          });
        }
      };
      
      // 执行测试
      emitTestProgress(testId, {
        stage: 'running',
        progress: 10,
        message: '正在生成负载...'
      });
      
      const results = await this.analyzer.analyze(url, testConfig);
      
      // 分析结果
      emitTestProgress(testId, {
        stage: 'analyzing',
        progress: 90,
        message: '分析测试结果...'
      });
      
      const analysis = this._analyzeResults(results);
      
      // 检查告警条件
      if (this.alertManager) {
        await this._checkAlerts(testId, url, results, analysis);
      }
      
      const finalResult = {
        engine: this.name,
        version: this.version,
        success: true,
        testId,
        url,
        results,
        analysis,
        timestamp: new Date().toISOString()
      };
      
      // 发送完成事件
      emitTestComplete(testId, finalResult);
      
      Logger.info(`✅ 压力测试完成: ${testId}`);
      
      return finalResult;
      
    } catch (error) {
      Logger.error(`❌ 压力测试失败: ${testId}`, error);
      
      const errorResult = {
        engine: this.name,
        version: this.version,
        success: false,
        testId,
        url,
        error: error.message,
        timestamp: new Date().toISOString()
      };
      
      // 发送错误事件
      emitTestError(testId, {
        error: error.message,
        stack: error.stack
      });
      
      // 触发错误告警
      if (this.alertManager) {
        await this.alertManager.checkAlert('TEST_FAILURE', {
          testId,
          testType: 'stress',
          url,
          error: error.message
        });
      }
      
      return errorResult;
    }
  }
  
  /**
   * 分析测试结果
   * @private
   */
  _analyzeResults(results) {
    const analysis = {
      performance: 'good',
      issues: [],
      recommendations: []
    };
    
    // 检查响应时间
    if (results.avgResponseTime > 3000) {
      analysis.performance = 'poor';
      analysis.issues.push('平均响应时间过长');
      analysis.recommendations.push('考虑优化服务器性能或增加服务器资源');
    } else if (results.avgResponseTime > 1000) {
      analysis.performance = 'fair';
      analysis.issues.push('响应时间偏高');
      analysis.recommendations.push('建议检查数据库查询和外部API调用');
    }
    
    // 检查错误率
    const errorRate = (results.failedRequests / results.totalRequests) * 100;
    if (errorRate > 5) {
      analysis.performance = 'poor';
      analysis.issues.push(`错误率过高: ${errorRate.toFixed(2)}%`);
      analysis.recommendations.push('检查错误日志，修复导致失败的问题');
    }
    
    // 检查吞吐量
    const requestsPerSecond = results.requestsPerSecond || 
      (results.totalRequests / (results.duration / 1000));
    
    if (requestsPerSecond < 10) {
      analysis.issues.push('吞吐量较低');
      analysis.recommendations.push('考虑使用缓存或优化代码逻辑');
    }
    
    return analysis;
  }
  
  /**
   * 检查告警条件
   * @private
   */
  async _checkAlerts(testId, url, results, analysis) {
    try {
      // 检查响应时间告警
      await this.alertManager.checkAlert('RESPONSE_TIME_THRESHOLD', {
        testId,
        url,
        value: results.avgResponseTime,
        threshold: 3000
      });
      
      // 检查错误率告警
      const errorRate = (results.failedRequests / results.totalRequests) * 100;
      await this.alertManager.checkAlert('ERROR_RATE_THRESHOLD', {
        testId,
        url,
        value: errorRate,
        threshold: 5
      });
      
      // 检查性能下降告警
      if (analysis.performance === 'poor') {
        await this.alertManager.checkAlert('PERFORMANCE_DEGRADATION', {
          testId,
          url,
          performance: analysis.performance,
          issues: analysis.issues
        });
      }
    } catch (error) {
      Logger.warn('告警检查失败:', error.message);
    }
  }

  /**
   * 获取引擎信息
   */
  getInfo() {
    return {
      name: this.name,
      version: this.version,
      description: this.description,
      available: this.checkAvailability()
    };
  }

  /**
   * 清理资源
   */
  async cleanup() {
    if (this.analyzer && typeof this.analyzer.cleanup === 'function') {
      await this.analyzer.cleanup();
    }
    console.log('✅ 压力测试引擎清理完成');
  }
}

module.exports = StressTestEngine;
