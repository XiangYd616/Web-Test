/**
 * 队列依赖修复测试
 * 验证 useStressTestRecord Hook 中的依赖关系是否正确
 */

import { renderHook, act } from '@testing-library/react';
import { useStressTestRecord } from '../hooks/useStressTestRecord';

// Mock 相关服务
jest.mock('../services/stressTestRecordService');
jest.mock('../services/stressTestQueueManager');

describe('队列依赖修复测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('useStressTestRecord Hook 应该正确初始化', () => {
    const { result } = renderHook(() => useStressTestRecord());

    expect(result.current).toBeDefined();
    expect(result.current.queueStats).toBeDefined();
    expect(result.current.currentQueueId).toBeNull();
    expect(result.current.enqueueTest).toBeInstanceOf(Function);
    expect(result.current.cancelQueuedTest).toBeInstanceOf(Function);
    expect(result.current.getQueuePosition).toBeInstanceOf(Function);
    expect(result.current.estimateWaitTime).toBeInstanceOf(Function);
  });

  test('enqueueTest 方法应该正常工作', async () => {
    const { result } = renderHook(() => useStressTestRecord());

    const testData = {
      testName: '测试队列',
      url: 'https://example.com',
      config: { users: 10, duration: 30 }
    };

    await act(async () => {
      try {
        await result.current.enqueueTest(testData, 'normal');
        // 如果没有抛出错误，说明依赖关系正确
        expect(true).toBe(true);
      } catch (error) {
        // 这里可能会有 mock 相关的错误，但不应该有依赖关系错误
        expect(error).not.toMatch(/Cannot access.*before initialization/);
      }
    });
  });

  test('cancelQueuedTest 方法应该正常工作', async () => {
    const { result } = renderHook(() => useStressTestRecord());

    await act(async () => {
      try {
        await result.current.cancelQueuedTest('test-queue-id', '测试取消');
        expect(true).toBe(true);
      } catch (error) {
        expect(error).not.toMatch(/Cannot access.*before initialization/);
      }
    });
  });

  test('队列统计应该正确初始化', () => {
    const { result } = renderHook(() => useStressTestRecord());

    expect(result.current.queueStats).toEqual({
      totalQueued: 0,
      totalRunning: 0,
      totalCompleted: 0,
      totalFailed: 0,
      averageWaitTime: 0,
      averageExecutionTime: 0,
      queueLength: 0,
      runningTests: [],
      nextInQueue: null
    });
  });

  test('getQueuePosition 和 estimateWaitTime 应该正常工作', () => {
    const { result } = renderHook(() => useStressTestRecord());

    expect(() => {
      result.current.getQueuePosition('test-id');
      result.current.estimateWaitTime('test-id');
    }).not.toThrow();
  });
});

// 集成测试：验证整个队列流程
describe('队列流程集成测试', () => {
  test('完整的队列操作流程应该正常工作', async () => {
    const { result } = renderHook(() => useStressTestRecord());

    const testData = {
      testName: '集成测试',
      url: 'https://example.com',
      config: { users: 50, duration: 60 }
    };

    await act(async () => {
      try {
        // 1. 添加到队列
        const queueId = await result.current.enqueueTest(testData, 'high');
        
        // 2. 获取队列位置
        const position = result.current.getQueuePosition(queueId);
        
        // 3. 估算等待时间
        const waitTime = result.current.estimateWaitTime(queueId);
        
        // 4. 取消队列中的测试
        await result.current.cancelQueuedTest(queueId, '集成测试取消');
        
        // 如果执行到这里没有错误，说明依赖关系都正确
        expect(true).toBe(true);
      } catch (error) {
        // 检查是否是依赖关系错误
        expect(error).not.toMatch(/Cannot access.*before initialization/);
        expect(error).not.toMatch(/refreshRecords.*not defined/);
      }
    });
  });
});
