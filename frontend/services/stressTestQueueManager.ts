/**
 * stressTestQueueManager.ts - ҵ������
 * 
 * �ļ�·��: frontend\services\stressTestQueueManager.ts
 * ����ʱ��: 2025-09-25
 */


import Logger from '@/utils/logger';
import { stressTestRecordService } from './stressTestRecordService';

export interface QueuedTest {
  id: string;
  recordId: string;
  testName: string;
  url: string;
  config: {
    users: number;
    duration: number;
    rampUpTime: number;
    testType: 'gradual' | 'spike' | 'constant' | 'step';
    method: string;
    timeout: number;
    thinkTime: number;
    warmupDuration?: number;
    cooldownDuration?: number;
    headers?: Record<string, string>;
    body?: string;
    proxy?: {
      enabled: boolean;
      type?: string;
      host?: string;
      port?: number;
      username?: string;
      password?: string;
    };
  };
  priority: 'high' | 'normal' | 'low';
  testType?: 'stress' | 'website' | 'seo' | 'security' | 'performance' | 'api';
  userId?: string;
  queuedAt: Date;
  startTime?: Date;
  estimatedDuration: number; // Ԥ������ʱ�����룩
  retryCount: number;
  maxRetries: number;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress?: number;
  onProgress?: (progress: number, message: string) => void;
  onComplete?: (result: any) => void;
  onError?: (error: Error) => void;
}

export interface QueueConfig {
  maxConcurrentTests: number;
  maxConcurrentStressTests: number; // ѹ������ר�ò�������
  maxQueueSize: number;
  queueTimeout: number; // ���г�ʱʱ�䣨���룩
  retryDelay: number; // �����ӳ٣����룩
  priorityWeights: {
    high: number;
    normal: number;
    low: number;
  };
  stressTestFastTrack: boolean; // ѹ�����Կ���ͨ��
}

export interface QueueStats {
  totalQueued: number;
  totalRunning: number;
  totalCompleted: number;
  totalFailed: number;
  averageWaitTime: number;
  averageExecutionTime: number;
  queueLength: number;
  runningTests: QueuedTest[];
  nextInQueue: QueuedTest | null;
}

class StressTestQueueManager {
  private queue: QueuedTest[] = [];
  private runningTests = new Map<string, QueuedTest>();
  private completedTests = new Map<string, QueuedTest>();
  private failedTests = new Map<string, QueuedTest>();
  private config: QueueConfig;
  private isProcessing = false;
  private processingInterval: NodeJS.Timeout | null = null;
  private listeners = new Set<(event: string, data: any) => void>();

  constructor(config?: Partial<QueueConfig>) {
    this.config = {
      maxConcurrentTests: 3, // ��ͨ���Բ�������
      maxConcurrentStressTests: 15, // ѹ������ר�ò������ƣ����ߣ�
      maxQueueSize: 20,
      queueTimeout: 30 * 60 * 1000, // 30����
      retryDelay: 5000, // 5��
      stressTestFastTrack: true, // ����ѹ�����Կ���ͨ��
      priorityWeights: {
        high: 3,
        normal: 2,
        low: 1
      },
      ...config
    };

    this.startProcessing();
    this.setupResourceMonitoring();
  }

  /**
   * ������Դ��أ��򻯰棩
   */
  private setupResourceMonitoring(): void {
    // ����Դ��أ������������ӵ�ϵͳ���

    // ʹ�ù̶��Ĳ������ƣ����ٶ�̬����
    // �������Ա��ⲻ��Ҫ��ϵͳ��Դ��ص���
  }

  /**
   * ��Ӳ��Ե�����
   */
  async enqueueTest(
    testData: Omit<QueuedTest, 'id' | 'queuedAt' | 'retryCount' | 'status'>,
    priority: 'high' | 'normal' | 'low' = 'normal'
  ): Promise<string> {
    // �������Ƿ�����
    if (this.queue.length >= this.config.maxQueueSize) {
      throw new Error(`�����������������: ${this.config.maxQueueSize}`);
    }

    // ����Ƿ��Ѿ��ڶ�����
    const existingTest = this.queue.find(test => test.recordId === testData.recordId);
    if (existingTest) {
      throw new Error('�ò������ڶ�����');
    }

    const queuedTest: QueuedTest = {
      ...testData,
      id: this.generateQueueId(),
      priority,
      queuedAt: new Date(),
      retryCount: 0,
      status: 'queued'
    };

    // ѹ�����Կ���ͨ���������������ѹ�����ԣ���������ִ��
    if (this.config.stressTestFastTrack && queuedTest.testType === 'stress') {
      const canStartImmediately = this.canStartStressTest();
      if (canStartImmediately) {
        Logger.debug(`?? ѹ�����Կ���ͨ��������ִ�� ${queuedTest.testName}`);
        await this.startTest(queuedTest);
        return queuedTest.id;
      }
    }

    // �������ȼ��������
    this.insertByPriority(queuedTest);

    // ���²��Լ�¼״̬Ϊ׼���У��Ŷӵȴ���
    try {
      await stressTestRecordService.updateTestRecord(testData.recordId, {
        status: 'idle', // ?? �򻯣�ʹ��idle��Ϊ�Ŷ�״̬
        waitingReason: `�Ŷӵȴ�ִ�� (����λ��: ${this.getQueuePosition(queuedTest.id)})`,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      Logger.warn('���²��Լ�¼״̬ʧ��:', { error: String(error) });
    }

    this.notifyListeners('testQueued', {
      test: queuedTest,
      queuePosition: this.getQueuePosition(queuedTest.id),
      estimatedWaitTime: this.estimateWaitTime(queuedTest.id)
    });

    return queuedTest.id;
  }

  /**
   * ȡ�������еĲ���
   */
  async cancelQueuedTest(queueId: string, reason: string = '�û�ȡ��'): Promise<boolean> {
    // �Ӷ������Ƴ�
    const queueIndex = this.queue.findIndex(test => test.id === queueId);
    if (queueIndex !== -1) {
      const test = this.queue[queueIndex];
      this.queue.splice(queueIndex, 1);

      // ���²��Լ�¼״̬
      try {
        await stressTestRecordService.cancelTestRecord(test.recordId, reason);
      } catch (error) {
        Logger.warn('���²��Լ�¼״̬ʧ��:', { error: String(error) });
      }

      this.notifyListeners('testCancelled', { test, reason });
      return true;
    }

    // ����Ƿ���������
    const runningTest = this.runningTests.get(queueId);
    if (runningTest) {
      runningTest.status = 'cancelled';
      this.runningTests.delete(queueId);

      try {
        await stressTestRecordService.cancelTestRecord(runningTest.recordId, reason);
      } catch (error) {
        Logger.warn('���²��Լ�¼״̬ʧ��:', { error: String(error) });
      }

      this.notifyListeners('testCancelled', { test: runningTest, reason });
      return true;
    }

    return false;
  }

  /**
   * ��ȡ����״̬
   */
  getQueueStats(): QueueStats {
    const completedTests = Array.from(this.completedTests.values());
    const failedTests = Array.from(this.failedTests.values());

    const averageWaitTime = this.calculateAverageWaitTime();
    const averageExecutionTime = this.calculateAverageExecutionTime();

    return {
      totalQueued: this.queue.length,
      totalRunning: this.runningTests.size,
      totalCompleted: completedTests.length,
      totalFailed: failedTests.length,
      averageWaitTime,
      averageExecutionTime,
      queueLength: this.queue.length,
      runningTests: Array.from(this.runningTests.values()),
      nextInQueue: this.queue[0] || null
    };
  }

  /**
   * ��ȡ�����ڶ����е�λ��
   */
  getQueuePosition(queueId: string): number {
    const index = this.queue.findIndex(test => test.id === queueId);
    return index === -1 ? -1 : index + 1;
  }

  /**
   * ����ȴ�ʱ��
   */
  estimateWaitTime(queueId: string): number {
    const position = this.getQueuePosition(queueId);
    if (position === -1) return 0;

    const averageExecutionTime = this.calculateAverageExecutionTime();
    const testsAhead = position - 1;
    const availableSlots = Math.max(1, this.config.maxConcurrentTests - this.runningTests.size);

    return Math.ceil(testsAhead / availableSlots) * averageExecutionTime;
  }

  /**
   * ��ʼ�������
   */
  private startProcessing(): void {
    if (this.isProcessing) return;

    this.isProcessing = true;
    this.processingInterval = setInterval(() => {
      this.processQueue();
    }, 1000); // ÿ����һ�ζ���
  }

  /**
   * ֹͣ�������
   */
  stopProcessing(): void {
    this.isProcessing = false;
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }

  /**
   * �������
   */
  private async processQueue(): Promise<void> {
    // �����ʱ�Ĳ���
    this.cleanupTimeoutTests();

    // ����Ƿ��������²���
    while (this.queue.length > 0) {
      const nextTest = this.queue[0];
      if (!nextTest) break;

      // ���ݲ������ͼ�鲢������
      const canStart = this.canStartTest(nextTest);
      if (!canStart) {
        break; // �޷����������ԣ��˳�ѭ��
      }

      // ���ϵͳ��Դ״̬�����ݲ������ͣ�
      const testType = nextTest.testType === 'stress' ? 'stress' : 'regular';
      const canStartNewTest = true(testType) !== false;
      if (!canStartNewTest) {
        // Logger.debug(`?? ϵͳ��Դ���㣬��ͣ����µ�${testType}����`); // ��Ĭ����
        break;
      }

      // �Ӷ������Ƴ����������
      this.queue.shift();
      await this.startTest(nextTest);
    }
  }

  /**
   * �������
   */
  private async startTest(test: QueuedTest): Promise<void> {
    test.status = 'processing';
    test.startTime = new Date();
    test.progress = 0;
    this.runningTests.set(test.id, test);

    try {
      // ���²��Լ�¼״̬Ϊ������
      await stressTestRecordService.startFromPending(test.recordId);

      this.notifyListeners('testStarted', { test });
      Logger.debug(`?? ��ʼִ�в���: ${test.testName}`);

      // ����ʵ�ʵ�ѹ������ִ���߼�
      await this.executeRealStressTest(test);

    } catch (error) {
      Logger.error(`����ִ��ʧ��: ${test.testName}`, { error: String(error) });
      await this.handleTestFailure(test, error as Error);
    }
  }

  /**
   * ִ����ʵ��ѹ������
   */
  private async executeRealStressTest(test: QueuedTest): Promise<void> {
    try {

      // ���ú��ѹ������API
      const response = await fetch('/api/test/stress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          ...test.config,
          url: test.url,
          testId: test.recordId,
          queueId: test.id,
          priority: test.priority
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      Logger.debug(`? ѹ������API���óɹ�: ${test.testName}`, result);

      await this.waitForTestCompletion(test);

    } catch (error) {
      Logger.error(`? ѹ������ִ��ʧ��: ${test.testName}`, { error: String(error) });
      throw error;
    }
  }

  /**
   * �ȴ��������
   */
  private async waitForTestCompletion(test: QueuedTest): Promise<void> {
    const maxWaitTime = (test.estimatedDuration + 60) * 1000; // Ԥ��ʱ�� + 1���ӻ���
    const startTime = Date.now();
    const checkInterval = 2000; // ÿ2����һ��

    return new Promise((resolve, reject) => {
      const checkStatus = async () => {
        try {
          // �����Լ�¼״̬
          const record = await stressTestRecordService.getTestRecord(test.recordId);

          if (record.status === 'completed') {
            Logger.debug(`? �������: ${test.testName}`);
            await this.handleTestCompletion(test, record.results || {});
            resolve();
            return;
          }

          if (record.status === 'failed' || record.status === 'cancelled') {
            Logger.debug(`? ����ʧ�ܻ�ȡ��: ${test.testName}, ״̬: ${record.status}`);
            reject(new Error(record.error || `����${record.status}`));
            return;
          }

          // ����Ƿ�ʱ
          if (Date.now() - startTime > maxWaitTime) {
            reject(new Error('����ִ�г�ʱ'));
            return;
          }

          // ���½���
          if (test.onProgress && record.progress !== undefined) {
            test.onProgress(record.progress, record.currentPhase || '���Խ�����...');
          }

          // �������
          setTimeout(checkStatus, checkInterval);

        } catch (error) {
          Logger.error(`������״̬ʧ��: ${test.testName}`, { error: String(error) });
          reject(error);
        }
      };

      // ��ʼ���
      checkStatus();
    });
  }

  /**
   * ����������
   */
  private async handleTestCompletion(test: QueuedTest, result: any): Promise<void> {
    test.status = 'completed';
    this.runningTests.delete(test.id);
    this.completedTests.set(test.id, test);

    try {
      await stressTestRecordService.completeTestRecord(test.recordId, result);
    } catch (error) {
      Logger.warn('���²��Լ�¼ʧ��:', { error: String(error) });
    }

    if (test.onComplete) {
      test.onComplete(result);
    }

    this.notifyListeners('testCompleted', { test, result });
    Logger.debug(`? �������: ${test.testName}`);
  }

  /**
   * �������ʧ��
   */
  private async handleTestFailure(test: QueuedTest, error: Error): Promise<void> {
    test.retryCount++;

    if (test.retryCount < test.maxRetries) {
      // ���¼������
      test.status = 'queued';
      this.runningTests.delete(test.id);

      setTimeout(() => {
        this.insertByPriority(test);
      }, this.config.retryDelay);
    } else {
      // ���Ϊʧ��
      test.status = 'failed';
      this.runningTests.delete(test.id);
      this.failedTests.set(test.id, test);

      try {
        await stressTestRecordService.failTestRecord(test.recordId, error.message);
      } catch (updateError) {
        Logger.warn('���²��Լ�¼ʧ��:', { error: String(updateError) });
      }

      if (test.onError) {
        test.onError(error);
      }

      this.notifyListeners('testFailed', { test, error });
      Logger.error(`? ����ʧ��: ${test.testName}`, { error: String(error) });
    }
  }

  /**
   * �������ȼ��������
   */
  private insertByPriority(test: QueuedTest): void {
    const weight = this.config.priorityWeights[test.priority];
    let insertIndex = this.queue.length;

    for (let i = 0; i < this.queue.length; i++) {
      /**
       * if���ܺ���
       * @param {Object} params - ��������
       * @returns {Promise<Object>} ���ؽ��
       */
      const existingWeight = this.config.priorityWeights[this.queue[i].priority];
      if (weight > existingWeight) {
        insertIndex = i;
        break;
      }
    }

    this.queue.splice(insertIndex, 0, test);
  }

  /**
   * ����Ƿ�������ָ������
   */
  private canStartTest(test: QueuedTest): boolean {
    if (test.testType === 'stress') {
      return this.canStartStressTest();
    } else {
      return this.canStartRegularTest();
    }
  }

  /**
   * ����Ƿ�������ѹ������
   */
  private canStartStressTest(): boolean {
    const runningStressTests = Array.from(this.runningTests.values())
      .filter(test => test.testType === 'stress').length;

    // ��鲢������
    const withinConcurrencyLimit = runningStressTests < this.config.maxConcurrentStressTests;

    // ���ϵͳ��Դ��ѹ������ʹ�ø����ɵļ�飩
    const hasSystemResources = true('stress') !== false;

    return withinConcurrencyLimit && hasSystemResources;
  }

  /**
   * ����Ƿ���������ͨ����
   */
  private canStartRegularTest(): boolean {
    const runningRegularTests = Array.from(this.runningTests.values())
      .filter(test => test.testType !== 'stress').length;
    return runningRegularTests < this.config.maxConcurrentTests;
  }

  /**
   * �����ʱ�Ĳ���
   */
  private cleanupTimeoutTests(): void {
    const now = Date.now();

    this.queue = this.queue.filter(test => {
      const isTimeout = now - test.queuedAt.getTime() > this.config.queueTimeout;
      if (isTimeout) {
        this.handleTestFailure(test, new Error('���г�ʱ'));
        return false;
      }
      return true;
    });
  }

  /**
   * ����ƽ���ȴ�ʱ��
   */
  private calculateAverageWaitTime(): number {
    // ������ʷ���ݼ��㣬����ʹ�ü򵥹���
    return this.queue.length * 30; // ����ÿ������ƽ��30��
  }

  /**
   * ����ƽ��ִ��ʱ��
   */
  private calculateAverageExecutionTime(): number {
    const completedTests = Array.from(this.completedTests.values());
    if (completedTests.length === 0) return 60; // Ĭ��60��

    const totalTime = completedTests.reduce((sum, test) => sum + test.estimatedDuration, 0);
    return totalTime / completedTests.length;
  }

  /**
   * ���ɶ���ID
   */
  private generateQueueId(): string {
    return `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * ����¼�������
   */
  addListener(callback: (event: string, data: any) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * ֪ͨ������
   */
  private notifyListeners(event: string, data: any): void {
    this.listeners.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        Logger.error('�������ص�ʧ��:', { error: String(error) });
      }
    });
  }

  /**
   * ���ٶ��й�����
   */
  destroy(): void {
    this.stopProcessing();
    this.queue = [];
    this.runningTests.clear();
    this.completedTests.clear();
    this.failedTests.clear();
    this.listeners.clear();
  }
}

// ����ȫ�ֶ��й�����ʵ��
export const stressTestQueueManager = new StressTestQueueManager();

export default StressTestQueueManager;
