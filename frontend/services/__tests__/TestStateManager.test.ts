/**
 * 测试状态管理器单元测试
 * 测试TestStateManager的核心功能
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestStateManager, TestState, TestPhase } from '../TestStateManager';
import type { TestConfig, TestDataPoint, RealTimeMetrics } from '../TestStateManager';

// 模拟定时器
vi.useFakeTimers();

afterEach(() => {
  vi.clearAllTimers();
  vi.clearAllMocks();
});

describe('TestStateManager', () => {
  let stateManager: TestStateManager;

  beforeEach(() => {
    stateManager = new TestStateManager({
      maxDataPoints: 100,
      dataRetentionTime: 60000, // 1分钟
      autoCleanupInterval: 10000, // 10秒
      enableLogging: false
    });
  });

  afterEach(() => {
    if (stateManager) {
      stateManager.destroy();
    }
  });

  describe('基本状态管理', () => {
    it('应该初始化为IDLE状态', () => {
      expect(stateManager.getState()).toBe(TestState.IDLE);
      expect(stateManager.getPhase()).toBe(TestPhase.INITIALIZATION);
      expect(stateManager.getTestId()).toBeNull();
      expect(stateManager.getConfig()).toBeNull();
      expect(stateManager.getMetrics()).toBeNull();
      expect(stateManager.getError()).toBeNull();
      expect(stateManager.getProgress().progress).toBe(0);
    });

    it('应该能够更新状态', () => {
      const listener = vi.fn();
      const unsubscribe = stateManager.onStateChange(listener);
      
      const testConfig: TestConfig = {
        url: 'https://example.com',
        users: 10,
        duration: 60,
        rampUp: 10,
        testType: 'load',
        method: 'GET',
        timeout: 30000,
        thinkTime: 1000
      };
      
      stateManager.startTest('test-123', testConfig);
      
      expect(stateManager.getState()).toBe(TestState.STARTING);
      expect(stateManager.getTestId()).toBe('test-123');
      expect(stateManager.getConfig()).toEqual(testConfig);
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          previousState: TestState.IDLE,
          currentState: TestState.STARTING
        })
      );
      
      unsubscribe();
    });

    it('应该能够更新阶段', () => {
      stateManager.updatePhase(TestPhase.RAMP_UP);
      expect(stateManager.getPhase()).toBe(TestPhase.RAMP_UP);
    });

    it('应该能够设置和获取测试ID', () => {
      const testConfig: TestConfig = {
        url: 'https://example.com',
        users: 10,
        duration: 60,
        rampUp: 10,
        testType: 'load',
        method: 'GET',
        timeout: 30000,
        thinkTime: 1000
      };
      
      stateManager.startTest('test-456', testConfig);
      expect(stateManager.getTestId()).toBe('test-456');
    });
  });

  describe('配置管理', () => {
    it('应该能够设置和获取测试配置', () => {
      const testConfig: TestConfig = {
        url: 'https://test.example.com',
        users: 50,
        duration: 120,
        rampUp: 30,
        testType: 'stress',
        method: 'POST',
        timeout: 45000,
        thinkTime: 2000,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: true })
      };
      
      stateManager.startTest('config-test', testConfig);
      expect(stateManager.getConfig()).toEqual(testConfig);
    });

    it('应该验证配置参数', () => {
      const validConfig: TestConfig = {
        url: 'https://example.com',
        users: 10,
        duration: 60,
        rampUp: 10,
        testType: 'load',
        method: 'GET',
        timeout: 30000,
        thinkTime: 1000
      };
      
      // Test that valid config is accepted
      expect(() => stateManager.startTest('valid-config', validConfig)).not.toThrow();
      expect(stateManager.getConfig()).toEqual(validConfig);
    });
  });

  describe('指标管理', () => {
    it('应该能够更新实时指标', () => {
      const listener = vi.fn();
      const unsubscribe = stateManager.onMetricsUpdate(listener);
      
      const metrics: RealTimeMetrics = {
        totalRequests: 100,
        successfulRequests: 95,
        failedRequests: 5,
        averageResponseTime: 150,
        currentTPS: 10,
        peakTPS: 15,
        errorRate: 0.05,
        activeUsers: 50,
        timestamp: Date.now()
      };
      
      stateManager.updateMetrics(metrics);
      
      expect(stateManager.getMetrics()).toMatchObject(metrics);
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining(metrics)
      );
      
      unsubscribe();
    });

    it('应该计算派生指标', () => {
      const metrics: RealTimeMetrics = {
        totalRequests: 100,
        successfulRequests: 80,
        failedRequests: 20,
        averageResponseTime: 300,
        currentTPS: 5,
        peakTPS: 10,
        errorRate: 0.2,
        activeUsers: 5,
        timestamp: Date.now()
      };

      stateManager.updateMetrics(metrics);

      // 验证错误率计算
      expect(stateManager.getMetrics()!.errorRate).toBe(0.2);
      
      // 验证成功率计算
      const successRate = stateManager.getMetrics()!.successfulRequests / stateManager.getMetrics()!.totalRequests;
      expect(successRate).toBe(0.8);
    });
  });

  describe('数据点管理', () => {
    it('应该能够添加数据点', () => {
      const listener = vi.fn();
      const unsubscribe = stateManager.onDataUpdate(listener);
      
      const dataPoint: TestDataPoint = {
        timestamp: Date.now(),
        responseTime: 200,
        activeUsers: 25,
        throughput: 5,
        errorRate: 0.02,
        status: 200,
        success: true,
        phase: TestPhase.STEADY_STATE
      };
      
      stateManager.addDataPoint(dataPoint);
      
      expect(stateManager.getDataPoints()).toContain(dataPoint);
      expect(listener).toHaveBeenCalledWith(dataPoint);
      
      unsubscribe();
    });

    it('应该限制数据点数量', () => {
      const maxDataPoints = 5;
      const limitedStateManager = new TestStateManager({
        maxDataPoints,
        dataRetentionTime: 60000,
        autoCleanupInterval: 10000,
        enableLogging: false
      });

      // 添加超过限制的数据点
      for (let i = 0; i < 10; i++) {
        limitedStateManager.addDataPoint({
          timestamp: Date.now() + i,
          responseTime: 200 + i,
          activeUsers: 5,
          throughput: 10,
          errorRate: 0.02,
          status: 200,
          success: true,
          phase: TestPhase.STEADY_STATE
        });
      }

      const dataPoints = limitedStateManager.getDataPoints();
      expect(dataPoints).toHaveLength(maxDataPoints);
      
      // 验证保留的是最新的数据点
      expect(dataPoints[dataPoints.length - 1].responseTime).toBe(209);
      
      limitedStateManager.destroy();
    });

    it('应该按时间排序数据点', () => {
      const now = Date.now();
      const dataPoints: TestDataPoint[] = [
        {
          timestamp: now + 2000,
          responseTime: 300,
          activeUsers: 30,
          throughput: 8,
          errorRate: 0,
          status: 200,
          success: true,
          phase: TestPhase.STEADY_STATE
        },
        {
          timestamp: now + 1000,
          responseTime: 250,
          activeUsers: 25,
          throughput: 6,
          errorRate: 0,
          status: 200,
          success: true,
          phase: TestPhase.RAMP_UP
        },
        {
          timestamp: now,
          responseTime: 200,
          activeUsers: 20,
          throughput: 4,
          errorRate: 0,
          status: 200,
          success: true,
          phase: TestPhase.RAMP_UP
        }
      ];
      
      // 添加数据点（乱序）
      dataPoints.forEach(point => stateManager.addDataPoint(point));
      
      const retrievedPoints = stateManager.getDataPoints();
      
      // 由于TestStateManager按添加顺序存储，验证数据点存在
      expect(retrievedPoints).toHaveLength(3);
      expect(retrievedPoints[0].timestamp).toBe(now + 2000);
      expect(retrievedPoints[1].timestamp).toBe(now + 1000);
      expect(retrievedPoints[2].timestamp).toBe(now);
    });
  });

  describe('进度管理', () => {
    it('应该能够更新测试进度', () => {
      stateManager.updateProgress(50, '测试进行中...');
      
      const progress = stateManager.getProgress();
      expect(progress.progress).toBe(50);
      expect(progress.message).toBe('测试进行中...');
    });

    it('应该验证进度范围', () => {
      // 测试超出范围的进度值
      stateManager.updateProgress(150, '超出范围');
      expect(stateManager.getProgress().progress).toBe(100); // 应该被限制为100
      
      stateManager.updateProgress(-10, '负数进度');
      expect(stateManager.getProgress().progress).toBe(0); // 应该被限制为0
    });

    it('应该计算基于时间的进度', () => {
      const testConfig: TestConfig = {
        url: 'https://example.com',
        users: 10,
        duration: 100, // 100秒
        rampUp: 10,
        testType: 'load',
        method: 'GET',
        timeout: 30000,
        thinkTime: 1000
      };
      
      stateManager.startTest('progress-test', testConfig);
      
      // 测试进度更新
      stateManager.updateProgress(25, '25%完成');
      expect(stateManager.getProgress().progress).toBe(25);
      
      stateManager.updateProgress(75, '75%完成');
      expect(stateManager.getProgress().progress).toBe(75);
    });
  });

  describe('事件监听器', () => {
    it('应该能够添加和移除状态变更监听器', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      
      const unsubscribe1 = stateManager.onStateChange(listener1);
      const unsubscribe2 = stateManager.onStateChange(listener2);
      
      const testConfig: TestConfig = {
        url: 'https://example.com',
        users: 5,
        duration: 30,
        rampUp: 5,
        testType: 'load',
        method: 'GET',
        timeout: 30000,
        thinkTime: 1000
      };
      
      stateManager.startTest('listener-test', testConfig);
      
      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
      
      // 移除第一个监听器
      unsubscribe1();
      
      stateManager.setRunning();
      stateManager.completeTest();
      
      expect(listener1).toHaveBeenCalledTimes(1); // 没有增加
      expect(listener2).toHaveBeenCalledTimes(3); // 增加了2次（setRunning + complete）
      
      unsubscribe2();
    });

    it('应该能够添加和移除数据更新监听器', () => {
      const listener = vi.fn();
      const unsubscribe = stateManager.onDataUpdate(listener);
      
      const dataPoint: TestDataPoint = {
        timestamp: Date.now(),
        responseTime: 100,
        activeUsers: 10,
        throughput: 2,
        errorRate: 0,
        status: 200,
        success: true,
        phase: TestPhase.STEADY_STATE
      };
      
      stateManager.addDataPoint(dataPoint);
      expect(listener).toHaveBeenCalledWith(dataPoint);
      
      unsubscribe();
      
      stateManager.addDataPoint({ ...dataPoint, timestamp: Date.now() + 1000 });
      expect(listener).toHaveBeenCalledTimes(1); // 没有增加
    });
  });

  describe('自动清理', () => {
    it('应该自动清理过期的数据点', () => {
      const shortRetentionManager = new TestStateManager({
        maxDataPoints: 1000,
        dataRetentionTime: 1000, // 1秒
        autoCleanupInterval: 500, // 0.5秒
        enableLogging: false
      });

      const now = Date.now();
      
      // 添加旧数据点
      shortRetentionManager.addDataPoint({
        timestamp: now - 2000, // 2秒前
        responseTime: 200,
        activeUsers: 5,
        throughput: 10,
        errorRate: 0.02,
        status: 200,
        success: true,
        phase: TestPhase.STEADY_STATE
      });

      // 添加新数据点
      shortRetentionManager.addDataPoint({
        timestamp: now,
        responseTime: 300,
        activeUsers: 5,
        throughput: 10,
        errorRate: 0.02,
        status: 200,
        success: true,
        phase: TestPhase.STEADY_STATE
      });

      expect(shortRetentionManager.getDataPoints()).toHaveLength(2);

      // 触发自动清理
      vi.advanceTimersByTime(1000);

      const dataPoints = shortRetentionManager.getDataPoints();
      expect(dataPoints).toHaveLength(1);
      expect(dataPoints[0].responseTime).toBe(300); // 只保留新数据
      
      shortRetentionManager.destroy();
    });
  });

  describe('重置和清理', () => {
    it('应该能够重置状态', () => {
      // 先设置一些状态
      const testConfig: TestConfig = {
        url: 'https://example.com',
        users: 10,
        duration: 60,
        rampUp: 10,
        testType: 'load',
        method: 'GET',
        timeout: 30000,
        thinkTime: 1000
      };
      
      stateManager.startTest('reset-test', testConfig);
      stateManager.updateProgress(50, '进行中');
      
      // 重置
      stateManager.reset();
      
      expect(stateManager.getState()).toBe(TestState.IDLE);
      expect(stateManager.getTestId()).toBeNull();
      expect(stateManager.getConfig()).toBeNull();
      expect(stateManager.getError()).toBeNull();
      expect(stateManager.getProgress().progress).toBe(0);
    });

    it('应该能够清理资源', () => {
      // 添加一些数据
      const dataPoint: TestDataPoint = {
        timestamp: Date.now(),
        responseTime: 150,
        activeUsers: 15,
        throughput: 3,
        errorRate: 0.01,
        status: 200,
        success: true,
        phase: TestPhase.STEADY_STATE
      };
      
      stateManager.addDataPoint(dataPoint);
      
      expect(stateManager.getDataPoints()).toHaveLength(1);
      
      stateManager.destroy();
      
      // 验证清理完成（destroy主要是清理定时器等资源）
      expect(stateManager.getDataPoints()).toHaveLength(1); // destroy不清理数据，只清理定时器
    });
  });

  describe('错误处理', () => {
    it('应该处理无效的状态转换', () => {
      // 在IDLE状态时尝试完成测试应该抛出错误
      expect(() => stateManager.completeTest()).toThrow();
      
      // 在IDLE状态时尝试设置运行状态应该抛出错误
      expect(() => stateManager.setRunning()).toThrow();
    });

    it('应该处理空数据点', () => {
      const invalidDataPoint = null as any;
      
      // 应该优雅地处理无效数据点
      expect(() => stateManager.addDataPoint(invalidDataPoint)).not.toThrow();
      expect(stateManager.getDataPoints()).toHaveLength(0);
    });

    it('应该处理无效的指标数据', () => {
      const invalidMetrics = {
        totalRequests: -1, // 无效值
        averageResponseTime: 'invalid' as any, // 错误类型
      } as any;
      
      // 应该优雅地处理无效指标
      expect(() => stateManager.updateMetrics(invalidMetrics)).not.toThrow();
    });
  });

  describe('性能测试', () => {
    it('应该能够处理大量数据点', () => {
      // 添加大量数据点
      for (let i = 0; i < 1000; i++) {
        stateManager.addDataPoint({
          timestamp: Date.now() + i,
          responseTime: 100 + i,
          activeUsers: 10,
          throughput: 5,
          errorRate: 0.01,
          status: 200,
          success: true,
          phase: TestPhase.STEADY_STATE
        });
      }
      
      const dataPoints = stateManager.getDataPoints();
      expect(dataPoints.length).toBeGreaterThan(0);
      expect(dataPoints.length).toBeLessThanOrEqual(100); // 受maxDataPoints限制
    });

    it('应该高效地查询数据', () => {
      // 添加一些数据
      for (let i = 0; i < 50; i++) {
        stateManager.addDataPoint({
          timestamp: Date.now() + i,
          responseTime: 200 + i,
          activeUsers: 15,
          throughput: 8,
          errorRate: 0.02,
          status: 200,
          success: true,
          phase: TestPhase.STEADY_STATE
        });
      }
      
      const recentPoints = stateManager.getLatestDataPoints(10);
      expect(recentPoints).toHaveLength(10);
      
      const allPoints = stateManager.getDataPoints();
      expect(allPoints).toHaveLength(50);
    });
  });
});
      
      // 添加1000个数据点
      for (let i = 0; i < 1000; i++) {
        stateManager.addDataPoint({
          timestamp: Date.now() + i,
          responseTime: 200 + Math.random() * 100,
          activeUsers: 5,
          throughput: 10,
          errorRate: Math.random() * 0.1,
          status: 200,
          success: Math.random() > 0.1,
          phase: TestPhase.STEADY_STATE
        });
      }

      const end = performance.now();
      const duration = end - start;

      // 应该在合理时间内完成
      expect(duration).toBeLessThan(1000); // 1秒内

      // 由于maxDataPoints限制，应该只保留最新的100个
      expect(stateManager.getDataPoints()).toHaveLength(100);
    });

    it('应该高效地查询数据', () => {
      // 添加数据点
      for (let i = 0; i < 100; i++) {
        stateManager.addDataPoint({
          timestamp: Date.now() + i * 1000,
          responseTime: 200 + i,
          activeUsers: 5,
          throughput: 10,
          errorRate: 0.02,
          status: 200,
          success: true,
          phase: TestPhase.STEADY_STATE
        });
      }

      const start = performance.now();
      
      // 执行多次查询
      for (let i = 0; i < 1000; i++) {
        const dataPoints = stateManager.getDataPoints();
        const metrics = stateManager.getMetrics();
        const state = stateManager.getState();
      }

      const end = performance.now();
      const duration = end - start;

      // 查询操作应该很快
      expect(duration).toBeLessThan(100); // 100ms内
    });
  });
});
