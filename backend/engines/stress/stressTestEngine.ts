const StressAnalyzer = require('./StressAnalyzer.js');
const { emitTestProgress, emitTestComplete, emitTestError } = require('../../websocket/testEvents');
const { getAlertManager } = require('../../alert/AlertManager');
const Logger = require('../../utils/logger');

type StressProgress = Record<string, unknown> & {
  percentage?: number;
  completed?: number;
  total?: number;
  failed?: number;
  avgResponseTime?: number;
  stage?: string;
  message?: string;
  stats?: unknown;
};

class StressTestEngine {
  name: string;
  version: string;
  description: string;
  options: Record<string, unknown>;
  analyzer: Record<string, unknown>;
  alertManager: {
    checkAlert?: (type: string, payload: Record<string, unknown>) => Promise<void>;
  } | null;
  activeTests: Map<string, Record<string, unknown>>;
  progressCallback: ((progress: Record<string, unknown>) => void) | null;
  completionCallback: ((results: Record<string, unknown>) => void) | null;
  errorCallback: ((error: Error) => void) | null;

  constructor(options: Record<string, unknown> = {}) {
    this.name = 'stress';
    this.version = '3.0.0';
    this.description = '压力测试引擎 - 支持WebSocket实时通知和告警';
    this.options = options;
    this.analyzer = new StressAnalyzer(options);
    this.alertManager = null;
    this.activeTests = new Map();
    this.progressCallback = null;
    this.completionCallback = null;
    this.errorCallback = null;

    try {
      this.alertManager = getAlertManager();
    } catch (error) {
      Logger.warn('告警管理器未初始化:', (error as Error).message);
    }
  }

  checkAvailability() {
    return {
      available: true,
      version: this.version,
      features: [
        'stress-testing',
        'load-generation',
        'performance-analysis',
        'concurrency-testing',
      ],
    };
  }

  async executeTest(config: Record<string, unknown>) {
    const testId = (config as { testId?: string }).testId || `stress-${Date.now()}`;
    const { url = 'http://example.com' } = config as { url?: string };

    try {
      Logger.info(`🚀 开始压力测试: ${testId} - ${url}`);

      this.activeTests.set(testId, {
        status: 'running',
        progress: 0,
        startTime: Date.now(),
      });

      this.updateTestProgress(testId, 0, '压力测试开始', 'started', { url });

      const testConfig = {
        duration: 30,
        concurrency: 5,
        rampUp: 5,
        ...config,
        onProgress: (progress: StressProgress) => {
          emitTestProgress(testId, {
            stage: 'running',
            progress: progress.percentage || 0,
            message: `已完成 ${progress.completed || 0}/${progress.total || 0} 请求`,
            stats: {
              completed: progress.completed,
              failed: progress.failed,
              avgResponseTime: progress.avgResponseTime,
            },
          });
        },
      };

      this.updateTestProgress(testId, 10, '正在生成负载...', 'running');

      const results = await (
        this.analyzer as {
          analyze: (
            url: string,
            config: Record<string, unknown>
          ) => Promise<Record<string, unknown>>;
        }
      ).analyze(url, testConfig);

      this.updateTestProgress(testId, 90, '分析测试结果...', 'analyzing');

      const analysis = this._analyzeResults(results);

      if (this.alertManager?.checkAlert) {
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
        timestamp: new Date().toISOString(),
      };

      this.activeTests.set(testId, {
        status: 'completed',
        progress: 100,
        results: finalResult,
      });
      this.updateTestProgress(testId, 100, '压力测试完成', 'completed');
      if (this.completionCallback) {
        this.completionCallback(finalResult);
      }

      emitTestComplete(testId, finalResult);

      Logger.info(`✅ 压力测试完成: ${testId}`);

      return finalResult;
    } catch (error) {
      Logger.error(`❌ 压力测试失败: ${testId}`, error as Error);

      const errorResult = {
        engine: this.name,
        version: this.version,
        success: false,
        testId,
        url,
        error: (error as Error).message,
        timestamp: new Date().toISOString(),
      };

      this.activeTests.set(testId, {
        status: 'failed',
        error: (error as Error).message,
      });
      if (this.errorCallback) {
        this.errorCallback(error as Error);
      }

      emitTestError(testId, {
        error: (error as Error).message,
        stack: (error as Error).stack,
      });

      if (this.alertManager?.checkAlert) {
        await this.alertManager.checkAlert('TEST_FAILURE', {
          testId,
          testType: 'stress',
          url,
          error: (error as Error).message,
        });
      }

      return errorResult;
    }
  }

  updateTestProgress(
    testId: string,
    progress: number,
    message: string,
    stage = 'running',
    extra: Record<string, unknown> = {}
  ) {
    const test = this.activeTests.get(testId) || { status: 'running' };
    this.activeTests.set(testId, {
      ...test,
      progress,
      message,
      lastUpdate: Date.now(),
    });

    emitTestProgress(testId, {
      stage,
      progress,
      message,
      ...extra,
    });

    if (this.progressCallback) {
      this.progressCallback({
        testId,
        progress,
        message,
        status: (test as { status?: string }).status || 'running',
      });
    }
  }

  getTestStatus(testId: string) {
    return this.activeTests.get(testId);
  }

  async stopTest(testId: string) {
    const test = this.activeTests.get(testId);
    if (test) {
      this.activeTests.set(testId, {
        ...test,
        status: 'stopped',
      });
      return true;
    }
    return false;
  }

  setProgressCallback(callback: (progress: Record<string, unknown>) => void) {
    this.progressCallback = callback;
  }

  setCompletionCallback(callback: (results: Record<string, unknown>) => void) {
    this.completionCallback = callback;
  }

  setErrorCallback(callback: (error: Error) => void) {
    this.errorCallback = callback;
  }

  _analyzeResults(results: Record<string, unknown>) {
    const analysis = {
      performance: 'good',
      issues: [],
      recommendations: [],
    } as {
      performance: string;
      issues: string[];
      recommendations: string[];
    };

    const avgResponseTime = (results as { avgResponseTime?: number }).avgResponseTime || 0;
    const failedRequests = (results as { failedRequests?: number }).failedRequests || 0;
    const totalRequests = (results as { totalRequests?: number }).totalRequests || 0;

    if (avgResponseTime > 3000) {
      analysis.performance = 'poor';
      analysis.issues.push('平均响应时间过长');
      analysis.recommendations.push('考虑优化服务器性能或增加服务器资源');
    } else if (avgResponseTime > 1000) {
      analysis.performance = 'fair';
      analysis.issues.push('响应时间偏高');
      analysis.recommendations.push('建议检查数据库查询和外部API调用');
    }

    const errorRate = totalRequests > 0 ? (failedRequests / totalRequests) * 100 : 0;
    if (errorRate > 5) {
      analysis.performance = 'poor';
      analysis.issues.push(`错误率过高: ${errorRate.toFixed(2)}%`);
      analysis.recommendations.push('检查错误日志，修复导致失败的问题');
    }

    const requestsPerSecond =
      (results as { requestsPerSecond?: number }).requestsPerSecond ||
      (totalRequests > 0
        ? totalRequests / (((results as { duration?: number }).duration || 1) / 1000)
        : 0);

    if (requestsPerSecond < 10) {
      analysis.issues.push('吞吐量较低');
      analysis.recommendations.push('考虑使用缓存或优化代码逻辑');
    }

    return analysis;
  }

  async _checkAlerts(
    testId: string,
    url: string,
    results: Record<string, unknown>,
    analysis: Record<string, unknown>
  ) {
    await this.alertManager?.checkAlert?.('STRESS_TEST_ALERT', {
      testId,
      url,
      results,
      analysis,
    });
  }

  async cleanup() {
    console.log('✅ 压力测试引擎清理完成');
  }
}

module.exports = StressTestEngine;

export {};
