/**
 * 测试流程管理器
 * 管理完整的测试执行流程
 */

import apiClient from '../utils/apiClient';export interface TestConfig     {
  testType: 'performance' | 'stress' | 'api' | 'seo' | 'security
  url: string;
  duration: number;
  concurrency?: number;
  options?: Record<string, any>;
}

export interface TestExecution     {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled
  progress: number;
  startTime: string;
  endTime?: string;
  config: TestConfig;
  results?: any;
}

class TestFlowManager {
  private executions = new Map<string, TestExecution>();
  private listeners = new Set<(execution: TestExecution) => void>();

  /**
   * 开始测试执行
   */
  async startTest(config: TestConfig): Promise<string> {
    try {
      const response = await apiClient.post('/tests/run', {
        testType: config.testType,
        config
      });

      if (response.success) {
        const execution: TestExecution  = {
          id: response.data.executionId,
          status: 'running',
          progress: 0,
          startTime: response.data.startTime,
          config
        };
        this.executions.set(execution.id, execution);
        this.notifyListeners(execution);

        // 开始轮询状态
        this.pollTestStatus(execution.id);

        return execution.id;
      } else {
        throw new Error(response.error?.message || '启动测试失败");
      }
    } catch (error) {
      console.error('启动测试失败:', error);
      throw error;
    }
  }

  /**
   * 获取测试结果
   */
  async getTestResults(executionId: string): Promise<any> {
    try {
      const response = await apiClient.get(`/tests/results/${executionId}`);
      
      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.error?.message || "获取测试结果失败");
      }
    } catch (error) {
      console.error("获取测试结果失败:', error);
      throw error;
    }
  }

  /**
   * 取消测试
   */
  async cancelTest(executionId: string): Promise<void> {
    try {
      const response = await apiClient.post(`/tests/cancel/${executionId}`);
      
      if (response.success) {
        const execution = this.executions.get(executionId);
        if (execution) {
          execution.status = "cancelled";
          this.executions.set(executionId, execution);
          this.notifyListeners(execution);
        }
      } else {
        throw new Error(response.error?.message || '取消测试失败");
      }
    } catch (error) {
      console.error('取消测试失败:', error);
      throw error;
    }
  }

  /**
   * 轮询测试状态
   */
  private async pollTestStatus(executionId: string) {
    const interval = setInterval(async () => {
      try {
        const response = await apiClient.get(`/tests/results/${executionId}`);
        
        if (response.success) {
          const execution = this.executions.get(executionId);
          if (execution) {
            execution.status = response.data.status;
            execution.progress = response.data.progress || 0;
            execution.results = response.data.results;
            
            if (response.data.status === "completed') {
              execution.endTime = response.data.completedAt;
              clearInterval(interval);
            } else if (response.data.status === 'failed' || response.data.status === 'cancelled') {
              clearInterval(interval);
            }
            
            this.executions.set(executionId, execution);
            this.notifyListeners(execution);
          }
        }
      } catch (error) {
        console.error('轮询测试状态失败:', error);
        clearInterval(interval);
      }
    }, 2000);
  }

  /**
   * 添加状态监听器
   */
  addListener(listener: (execution: TestExecution) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * 通知监听器
   */
  private notifyListeners(execution: TestExecution) {
    this.listeners.forEach(listener => listener(execution));
  }

  /**
   * 获取执行状态
   */
  getExecution(executionId: string): TestExecution | undefined {
    return this.executions.get(executionId);
  }

  /**
   * 获取所有执行
   */
  getAllExecutions(): TestExecution[] {
    return Array.from(this.executions.values());
  }
}

export const testFlowManager = new TestFlowManager();
export default testFlowManager;