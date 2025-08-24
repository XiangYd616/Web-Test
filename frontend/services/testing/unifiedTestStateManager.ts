/**
 * 统一测试状态管理系统
 * 提取自压力测试的完整状态管理功能，适用于所有测试类型
 */

import { EventEmitter } from 'events';
import { testApiService } from '../api/testApiService';

// 测试状态类型
export type TestStatus = 'idle' | 'starting' | 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | 'stopping';

// 测试阶段
export type TestPhase = 'IDLE' | 'STARTING' | 'QUEUED' | 'RUNNING' | 'COMPLETING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

// 测试配置基础接口
export interface BaseTestConfig {
  url: string;
  testType: string;
  testName?: string;
  timeout?: number;
  [key: string]: any;
}

// 测试记录接口
export interface TestRecord {
  id: string;
  testName: string;
  url: string;
  config: BaseTestConfig;
  status: TestStatus;
  startTime?: Date;
  endTime?: Date;
  result?: any;
  error?: string;
}

// 队列统计接口
export interface QueueStats {
  totalRunning: number;
  totalQueued: number;
  maxConcurrent: number;
  estimatedWaitTime: number;
}

// 系统资源监控接口
export interface SystemResourceMonitor {
  canStartNewTest(): boolean;
  getCurrentLoad(): number;
  getMemoryUsage(): number;
}

// 测试状态管理器配置
export interface TestStateManagerConfig {
  testType: string;
  maxConcurrentTests?: number;
  defaultTimeout?: number;
  enableQueue?: boolean;
  enableWebSocket?: boolean;
  enablePersistence?: boolean;
  apiEndpoint?: string;
}

/**
 * 统一测试状态管理器
 */
export class UnifiedTestStateManager extends EventEmitter {
  private config: TestStateManagerConfig;
  private currentTestId: string | null = null;
  private currentRecordId: string | null = null;
  private testStatus: TestStatus = 'idle';
  private testPhase: TestPhase = 'IDLE';
  private statusMessage: string = '';
  private queueStats: QueueStats = {
    totalRunning: 0,
    totalQueued: 0,
    maxConcurrent: 3,
    estimatedWaitTime: 0
  };
  private testTimeoutTimer: NodeJS.Timeout | null = null;
  private websocketConnection: WebSocket | null = null;
  private systemResourceMonitor: SystemResourceMonitor | null = null;

  constructor(config: TestStateManagerConfig) {
    super();
    this.config = {
      maxConcurrentTests: 3,
      defaultTimeout: 300000, // 5分钟
      enableQueue: true,
      enableWebSocket: true,
      enablePersistence: true,
      ...config
    };

    this.initializeSystemMonitoring();
  }

  /**
   * 初始化系统监控
   */
  private initializeSystemMonitoring() {
    // 简化的系统资源监控
    this.systemResourceMonitor = {
      canStartNewTest: () => {
        return this.queueStats.totalRunning < (this.config.maxConcurrentTests || 3);
      },
      getCurrentLoad: () => {
        return (this.queueStats.totalRunning / (this.config.maxConcurrentTests || 3)) * 100;
      },
      getMemoryUsage: () => {
        // 简化实现，实际应该监控真实内存使用
        return 50;
      }
    };
  }

  /**
   * 启动测试
   */
  async startTest(testConfig: BaseTestConfig): Promise<string> {
    try {
      this.updateStatus('starting', 'STARTING', '正在检查系统资源和队列状态...');

      // 创建测试记录
      const recordId = await this.createTestRecord(testConfig);
      this.currentRecordId = recordId;

      // 检查是否需要排队
      const canStartImmediately = this.canStartTestImmediately();

      if (canStartImmediately) {
        // 立即启动测试
        return await this.startTestDirectly(testConfig, recordId);
      } else {
        // 加入队列
        return await this.enqueueTest(testConfig, recordId);
      }

    } catch (error: any) {
      this.updateStatus('failed', 'FAILED', error.message || '启动测试失败');
      this.emit('testFailed', { error: error.message, testId: this.currentTestId });
      throw error;
    }
  }

  /**
   * 直接启动测试
   */
  private async startTestDirectly(config: BaseTestConfig, recordId: string): Promise<string> {
    this.updateStatus('starting', 'STARTING', '正在启动测试引擎...');

    try {
      // 根据测试类型调用相应的API
      const response = await this.callTestAPI(config);

      if (!response.success) {
        throw new Error(response.message || '启动测试失败');
      }

      const testId = response.data.id || response.data.testId || recordId;
      this.currentTestId = testId;

      this.updateStatus('running', 'RUNNING', '测试正在运行中...');

      // 启动WebSocket连接（如果启用）
      if (this.config.enableWebSocket) {
        this.initializeWebSocket(testId);
      }

      // 启动超时检查
      this.startTimeoutCheck(config.timeout || this.config.defaultTimeout!);

      this.emit('testStarted', { testId, recordId, config });
      return testId;

    } catch (error: any) {
      this.updateStatus('failed', 'FAILED', error.message || '启动测试失败');
      throw error;
    }
  }

  /**
   * 调用测试API
   */
  private async callTestAPI(config: BaseTestConfig): Promise<any> {
    switch (config.testType) {
      case 'performance':
        return await testApiService.executePerformanceTest(config.url, {
          device: 'desktop',
          network_condition: 'no-throttling'
        });

      case 'security':
        return await testApiService.executeSecurityTest(config.url, {
          scan_depth: 'medium',
          include_ssl: true,
          include_headers: true,
          custom_checks: []
        });

      case 'stress':
        return await testApiService.executeStressTest(config.url, {
          concurrent_users: 10,
          duration_seconds: 30,
          ramp_up_time: 5,
          test_scenarios: []
        });

      case 'api':
        return await testApiService.executeApiTest({
          endpoints: [],
          configuration: {
            timeout: 30000,
            retry_count: 0,
            parallel_requests: 1
          }
        });

      case 'compatibility':
        return await testApiService.executeCompatibilityTest(config.url, {
          browsers: ['chrome', 'firefox'],
          devices: ['desktop', 'mobile'],
          features_to_test: [],
          screenshot_comparison: false
        });

      case 'seo':
        return await testApiService.executeSeoTest(config.url, {
          depth: 'page',
          include_technical: true,
          include_content: true
        });

      case 'ux':
        return await testApiService.executeUxTest(config.url, {
          accessibility_level: 'AA',
          include_usability: true,
          include_mobile: true,
          custom_checks: []
        });

      default:
        return await testApiService.executeGenericTest(config.testType, config.url, config);
    }
  }

  /**
   * 检查是否可以立即启动测试
   */
  private canStartTestImmediately(): boolean {
    if (!this.config.enableQueue) {
      return true;
    }

    return this.queueStats.totalRunning < (this.config.maxConcurrentTests || 3) &&
      (this.systemResourceMonitor?.canStartNewTest() !== false);
  }

  /**
   * 将测试加入队列
   */
  private async enqueueTest(config: BaseTestConfig, recordId: string): Promise<string> {
    this.updateStatus('queued', 'QUEUED', '测试已加入队列，等待执行...');

    this.queueStats.totalQueued++;
    this.queueStats.estimatedWaitTime = this.calculateEstimatedWaitTime();

    this.emit('testQueued', { recordId, config, queueStats: this.queueStats });

    // 简化的队列实现 - 实际应该有更复杂的队列管理
    setTimeout(() => {
      if (this.testStatus === 'queued') {
        this.startTestDirectly(config, recordId);
      }
    }, this.queueStats.estimatedWaitTime * 1000);

    return recordId;
  }

  /**
   * 计算预估等待时间
   */
  private calculateEstimatedWaitTime(): number {
    // 简化计算：假设每个测试平均需要60秒
    const averageTestDuration = 60;
    const position = this.queueStats.totalQueued;
    const availableSlots = Math.max(0, (this.config.maxConcurrentTests || 3) - this.queueStats.totalRunning);

    if (availableSlots > 0) {
      return 0;
    }

    return Math.ceil(position / (this.config.maxConcurrentTests || 3)) * averageTestDuration;
  }

  /**
   * 创建测试记录
   */
  private async createTestRecord(config: BaseTestConfig): Promise<string> {
    const record: TestRecord = {
      id: this.generateTestId(),
      testName: config.testName || `${config.testType}测试 - ${new URL(config.url).hostname}`,
      url: config.url,
      config,
      status: 'idle',
      startTime: new Date()
    };

    // 这里应该调用实际的记录创建API
    // 暂时使用本地生成的ID
    return record.id;
  }

  /**
   * 生成测试ID
   */
  private generateTestId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 11);
    return `${this.config.testType}_${timestamp}_${random}`;
  }

  /**
   * 初始化WebSocket连接
   */
  private initializeWebSocket(testId: string) {
    if (!this.config.enableWebSocket) return;

    try {
      const wsUrl = `ws://localhost:3001/api/test/ws/${testId}`;
      this.websocketConnection = new WebSocket(wsUrl);

      this.websocketConnection.onopen = () => {
        console.log('🔌 WebSocket连接已建立:', testId);
        this.emit('websocketConnected', { testId });
      };

      this.websocketConnection.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleWebSocketMessage(data);
        } catch (error) {
          console.error('WebSocket消息解析失败:', error);
        }
      };

      this.websocketConnection.onclose = () => {
        console.log('🔌 WebSocket连接已关闭');
        this.emit('websocketDisconnected', { testId });
      };

      this.websocketConnection.onerror = (error) => {
        console.error('WebSocket连接错误:', error);
        this.emit('websocketError', { error, testId });
      };

    } catch (error) {
      console.error('初始化WebSocket失败:', error);
    }
  }

  /**
   * 处理WebSocket消息
   */
  private handleWebSocketMessage(data: any) {
    switch (data.type) {
      case 'progress':
        this.emit('testProgress', {
          testId: this.currentTestId,
          progress: data.progress,
          message: data.message,
          data: data.data
        });
        break;

      case 'completed':
        this.handleTestCompletion(data);
        break;

      case 'failed':
        this.handleTestFailure(data);
        break;

      case 'cancelled':
        this.handleTestCancellation(data);
        break;

      default:
        this.emit('websocketMessage', data);
    }
  }

  /**
   * 处理测试完成
   */
  private handleTestCompletion(data: any) {
    this.updateStatus('completed', 'COMPLETED', '测试已完成');
    this.clearTimeoutCheck();
    this.closeWebSocket();

    this.emit('testCompleted', {
      testId: this.currentTestId,
      result: data.result,
      metrics: data.metrics
    });
  }

  /**
   * 处理测试失败
   */
  private handleTestFailure(data: any) {
    this.updateStatus('failed', 'FAILED', data.message || '测试失败');
    this.clearTimeoutCheck();
    this.closeWebSocket();

    this.emit('testFailed', {
      testId: this.currentTestId,
      error: data.error || data.message,
      details: data.details
    });
  }

  /**
   * 处理测试取消
   */
  private handleTestCancellation(data: any) {
    this.updateStatus('cancelled', 'CANCELLED', '测试已取消');
    this.clearTimeoutCheck();
    this.closeWebSocket();

    this.emit('testCancelled', {
      testId: this.currentTestId,
      reason: data.reason || '用户取消'
    });
  }

  /**
   * 启动超时检查
   */
  private startTimeoutCheck(timeout: number) {
    this.clearTimeoutCheck();

    this.testTimeoutTimer = setTimeout(() => {
      if (this.testStatus === 'running') {
        this.handleTestTimeout();
      }
    }, timeout);
  }

  /**
   * 处理测试超时
   */
  private handleTestTimeout() {
    console.warn('⏰ 测试超时，强制结束');
    this.updateStatus('failed', 'FAILED', '测试超时');
    this.closeWebSocket();

    this.emit('testTimeout', {
      testId: this.currentTestId,
      timeout: this.config.defaultTimeout
    });
  }

  /**
   * 清除超时检查
   */
  private clearTimeoutCheck() {
    if (this.testTimeoutTimer) {
      clearTimeout(this.testTimeoutTimer);
      this.testTimeoutTimer = null;
    }
  }

  /**
   * 关闭WebSocket连接
   */
  private closeWebSocket() {
    if (this.websocketConnection) {
      this.websocketConnection.close();
      this.websocketConnection = null;
    }
  }

  /**
   * 更新状态
   */
  private updateStatus(status: TestStatus, phase: TestPhase, message: string) {
    this.testStatus = status;
    this.testPhase = phase;
    this.statusMessage = message;

    this.emit('statusUpdate', {
      status,
      phase,
      message,
      testId: this.currentTestId,
      timestamp: new Date()
    });
  }

  /**
   * 取消测试
   */
  async cancelTest(): Promise<void> {
    if (!this.currentTestId) {
      throw new Error('没有正在运行的测试');
    }

    try {
      this.updateStatus('stopping', 'COMPLETING', '正在取消测试...');

      // 调用取消API
      if (this.config.testType === 'stress') {
        await testApiService.cancelStressTest(this.currentTestId);
      } else {
        // 通用取消方法
        await testApiService.stopExecution(this.currentTestId);
      }

      this.updateStatus('cancelled', 'CANCELLED', '测试已取消');
      this.clearTimeoutCheck();
      this.closeWebSocket();

    } catch (error: any) {
      console.error('取消测试失败:', error);
      this.emit('cancelError', { error: error.message, testId: this.currentTestId });
    }
  }

  /**
   * 停止测试
   */
  async stopTest(): Promise<void> {
    return this.cancelTest();
  }

  /**
   * 重置状态
   */
  reset() {
    this.currentTestId = null;
    this.currentRecordId = null;
    this.testStatus = 'idle';
    this.testPhase = 'IDLE';
    this.statusMessage = '';
    this.clearTimeoutCheck();
    this.closeWebSocket();

    this.emit('reset');
  }

  /**
   * 获取当前状态
   */
  getState() {
    return {
      testId: this.currentTestId,
      recordId: this.currentRecordId,
      status: this.testStatus,
      phase: this.testPhase,
      message: this.statusMessage,
      queueStats: this.queueStats
    };
  }

  /**
   * 销毁管理器
   */
  destroy() {
    this.clearTimeoutCheck();
    this.closeWebSocket();
    this.removeAllListeners();
  }

  /**
   * 获取测试历史
   */
  async getTestHistory(limit: number = 20): Promise<any[]> {
    try {
      const response = await testApiService.getExecutions({
        test_type: this.config.testType,
        limit,
        offset: 0
      });

      return response.success ? response.data : [];
    } catch (error) {
      console.error('获取测试历史失败:', error);
      return [];
    }
  }

  /**
   * 获取测试统计信息
   */
  async getTestStatistics(): Promise<any> {
    try {
      // 根据测试类型获取相应的统计信息
      switch (this.config.testType) {
        case 'security':
          return await testApiService.getSecurityStatistics();
        case 'performance':
          return await testApiService.analyzePerformanceData([], 'trend');
        default:
          return { totalTests: 0, successRate: 0, averageDuration: 0 };
      }
    } catch (error) {
      console.error('获取测试统计失败:', error);
      return { totalTests: 0, successRate: 0, averageDuration: 0 };
    }
  }

  /**
   * 保存测试配置
   */
  saveTestConfiguration(config: BaseTestConfig): void {
    if (this.config.enablePersistence) {
      const key = `test_config_${this.config.testType}`;
      localStorage.setItem(key, JSON.stringify(config));
    }
  }

  /**
   * 加载测试配置
   */
  loadTestConfiguration(): BaseTestConfig | null {
    if (this.config.enablePersistence) {
      const key = `test_config_${this.config.testType}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (error) {
          console.error('加载测试配置失败:', error);
        }
      }
    }
    return null;
  }

  /**
   * 导出测试结果
   */
  async exportTestResult(testId: string, format: 'json' | 'csv' | 'pdf' = 'json'): Promise<Blob> {
    try {
      const result = await testApiService.getExecutionDetails(testId);

      if (!result.success) {
        throw new Error('获取测试结果失败');
      }

      const data = result.data;

      switch (format) {
        case 'json':
          return new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });

        case 'csv':
          const csv = this.convertToCSV(data);
          return new Blob([csv], { type: 'text/csv' });

        case 'pdf':
          // 简化的PDF导出，实际应该使用专门的PDF库
          const pdfContent = this.convertToPDF(data);
          return new Blob([pdfContent], { type: 'application/pdf' });

        default:
          throw new Error('不支持的导出格式');
      }
    } catch (error: any) {
      throw new Error(`导出测试结果失败: ${error.message}`);
    }
  }

  /**
   * 转换为CSV格式
   */
  private convertToCSV(data: any): string {
    // 简化的CSV转换
    const headers = Object.keys(data);
    const values = Object.values(data);

    return [
      headers.join(','),
      values.map(v => typeof v === 'object' ? JSON.stringify(v) : v).join(',')
    ].join('\n');
  }

  /**
   * 转换为PDF格式
   */
  private convertToPDF(data: any): string {
    // 简化的PDF转换，实际应该使用jsPDF等库
    return `PDF Report\n${JSON.stringify(data, null, 2)}`;
  }

  /**
   * 比较测试结果
   */
  async compareTestResults(testIds: string[]): Promise<any> {
    try {
      const results = await Promise.all(
        testIds.map(id => testApiService.getExecutionDetails(id))
      );

      const validResults = results
        .filter(r => r.success)
        .map(r => r.data);

      if (validResults.length < 2) {
        throw new Error('需要至少两个有效的测试结果进行比较');
      }

      return this.generateComparison(validResults);
    } catch (error: any) {
      throw new Error(`比较测试结果失败: ${error.message}`);
    }
  }

  /**
   * 生成比较报告
   */
  private generateComparison(results: any[]): any {
    // 简化的比较逻辑
    return {
      totalResults: results.length,
      comparison: results.map((result, index) => ({
        index,
        testId: result.id,
        timestamp: result.timestamp,
        summary: result.summary || {},
        metrics: result.metrics || {}
      })),
      trends: this.analyzeTrends(results),
      recommendations: this.generateComparisonRecommendations(results)
    };
  }

  /**
   * 分析趋势
   */
  private analyzeTrends(results: any[]): any {
    // 简化的趋势分析
    return {
      performance: 'stable',
      reliability: 'improving',
      issues: 'decreasing'
    };
  }

  /**
   * 生成比较建议
   */
  private generateComparisonRecommendations(results: any[]): string[] {
    // 简化的建议生成
    return [
      '建议定期进行测试以监控性能变化',
      '关注测试结果中的异常指标',
      '考虑优化配置以提高测试效率'
    ];
  }

  /**
   * 获取实时系统状态
   */
  getSystemStatus(): any {
    return {
      resourceMonitor: {
        canStartNewTest: this.systemResourceMonitor?.canStartNewTest() || false,
        currentLoad: this.systemResourceMonitor?.getCurrentLoad() || 0,
        memoryUsage: this.systemResourceMonitor?.getMemoryUsage() || 0
      },
      queueStats: this.queueStats,
      activeConnections: this.websocketConnection ? 1 : 0,
      testStatus: {
        current: this.testStatus,
        phase: this.testPhase,
        message: this.statusMessage
      }
    };
  }

  /**
   * 设置自定义资源监控器
   */
  setResourceMonitor(monitor: SystemResourceMonitor): void {
    this.systemResourceMonitor = monitor;
  }

  /**
   * 更新队列统计
   */
  updateQueueStats(stats: Partial<QueueStats>): void {
    this.queueStats = { ...this.queueStats, ...stats };
    this.emit('queueStatsUpdated', this.queueStats);
  }

  /**
   * 获取测试类型配置
   */
  getTestTypeConfig(): any {
    const baseConfig = {
      testType: this.config.testType,
      maxConcurrentTests: this.config.maxConcurrentTests,
      defaultTimeout: this.config.defaultTimeout,
      enableQueue: this.config.enableQueue,
      enableWebSocket: this.config.enableWebSocket,
      enablePersistence: this.config.enablePersistence
    };

    // 根据测试类型返回特定配置
    switch (this.config.testType) {
      case 'performance':
        return {
          ...baseConfig,
          supportedDevices: ['desktop', 'mobile', 'tablet'],
          supportedNetworks: ['fast-3g', 'slow-3g', 'offline'],
          defaultMetrics: ['FCP', 'LCP', 'FID', 'CLS']
        };

      case 'security':
        return {
          ...baseConfig,
          scanDepths: ['surface', 'medium', 'deep'],
          supportedChecks: ['ssl', 'headers', 'vulnerabilities', 'authentication'],
          riskLevels: ['low', 'medium', 'high', 'critical']
        };

      case 'stress':
        return {
          ...baseConfig,
          maxConcurrentUsers: 1000,
          maxDuration: 3600, // 1小时
          supportedMethods: ['GET', 'POST', 'PUT', 'DELETE'],
          loadPatterns: ['constant', 'ramp-up', 'spike', 'step']
        };

      case 'api':
        return {
          ...baseConfig,
          supportedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'],
          authTypes: ['none', 'basic', 'bearer', 'apikey', 'oauth'],
          responseFormats: ['json', 'xml', 'text', 'html']
        };

      default:
        return baseConfig;
    }
  }
}

export default UnifiedTestStateManager;
