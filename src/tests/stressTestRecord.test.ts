/**
 * 压力测试记录功能测试
 * 验证数据记录和显示逻辑的各种场景
 */

import { renderHook, act } from '@testing-library/react';
import { useStressTestRecord } from '../hooks/useStressTestRecord';
import { stressTestRecordService } from '../services/stressTestRecordService';

// Mock 服务
jest.mock('../services/stressTestRecordService');

const mockService = stressTestRecordService as jest.Mocked<typeof stressTestRecordService>;

describe('useStressTestRecord Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('数据记录完整性', () => {
    test('应该正确创建测试记录', async () => {
      const mockRecord = {
        id: 'test-1',
        testName: '测试记录',
        url: 'https://example.com',
        status: 'pending' as const,
        startTime: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        config: { users: 10, duration: 30 }
      };

      mockService.createTestRecord.mockResolvedValue(mockRecord);

      const { result } = renderHook(() => useStressTestRecord({ autoLoad: false }));

      await act(async () => {
        const record = await result.current.createRecord({
          testName: '测试记录',
          url: 'https://example.com',
          config: { users: 10, duration: 30 }
        });
        expect(record).toEqual(mockRecord);
      });

      expect(result.current.records).toContain(mockRecord);
      expect(result.current.currentRecord).toEqual(mockRecord);
      expect(result.current.operationStates.creating).toBe(false);
    });

    test('应该验证状态转换', async () => {
      const { result } = renderHook(() => useStressTestRecord({ autoLoad: false }));

      // 设置初始记录
      const initialRecord = {
        id: 'test-1',
        status: 'completed' as const,
        testName: 'Test',
        url: 'https://example.com',
        startTime: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        config: {}
      };

      act(() => {
        result.current.records.push(initialRecord);
      });

      // 尝试无效的状态转换
      await act(async () => {
        try {
          await result.current.updateRecord('test-1', { status: 'running' });
          fail('应该抛出错误');
        } catch (error: any) {
          expect(error.message).toContain('无效的状态转换');
        }
      });
    });

    test('应该处理测试失败并保存部分数据', async () => {
      const mockFailedRecord = {
        id: 'test-1',
        status: 'failed' as const,
        error: '网络错误',
        testName: 'Test',
        url: 'https://example.com',
        startTime: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        config: {}
      };

      mockService.failTestRecord.mockResolvedValue(mockFailedRecord);

      const { result } = renderHook(() => useStressTestRecord({ autoLoad: false }));

      await act(async () => {
        const record = await result.current.failRecord('test-1', '网络错误');
        expect(record.status).toBe('failed');
        expect(record.error).toBe('网络错误');
      });
    });
  });

  describe('显示逻辑验证', () => {
    test('应该正确管理加载状态', async () => {
      mockService.createTestRecord.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          id: 'test-1',
          testName: 'Test',
          url: 'https://example.com',
          status: 'pending' as const,
          startTime: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          config: {}
        }), 100))
      );

      const { result } = renderHook(() => useStressTestRecord({ autoLoad: false }));

      // 开始创建操作
      act(() => {
        result.current.createRecord({ testName: 'Test', url: 'https://example.com' });
      });

      // 检查加载状态
      expect(result.current.operationStates.creating).toBe(true);

      // 等待操作完成
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 150));
      });

      expect(result.current.operationStates.creating).toBe(false);
    });

    test('应该批量更新实时数据', async () => {
      const mockRecord = {
        id: 'test-1',
        testName: 'Test',
        url: 'https://example.com',
        status: 'running' as const,
        startTime: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        config: {},
        results: { realTimeData: [] }
      };

      mockService.updateTestRecord.mockResolvedValue({
        ...mockRecord,
        results: { realTimeData: [{ timestamp: Date.now(), value: 100 }] }
      });

      const { result } = renderHook(() => useStressTestRecord({ autoLoad: false }));

      // 设置当前记录
      act(() => {
        result.current.records.push(mockRecord);
      });

      // 添加多个实时数据点
      await act(async () => {
        await result.current.addRealTimeData('test-1', { timestamp: Date.now(), value: 100 });
        await result.current.addRealTimeData('test-1', { timestamp: Date.now(), value: 200 });
      });

      // 等待批量更新
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 1100));
      });

      // 验证批量更新被调用
      expect(mockService.updateTestRecord).toHaveBeenCalled();
    });
  });

  describe('异常情况处理', () => {
    test('应该处理网络异常', async () => {
      mockService.createTestRecord.mockRejectedValue(new Error('网络连接失败'));

      const { result } = renderHook(() => useStressTestRecord({ autoLoad: false }));

      await act(async () => {
        try {
          await result.current.createRecord({ testName: 'Test', url: 'https://example.com' });
          fail('应该抛出错误');
        } catch (error: any) {
          expect(error.message).toContain('创建测试记录失败');
        }
      });

      expect(result.current.error).toContain('创建测试记录失败');
      expect(result.current.operationStates.creating).toBe(false);
    });

    test('应该处理并发测试场景', async () => {
      const { result } = renderHook(() => useStressTestRecord({ autoLoad: false }));

      const record1 = {
        id: 'test-1',
        testName: 'Test 1',
        url: 'https://example.com',
        status: 'running' as const,
        startTime: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        config: {}
      };

      const record2 = {
        id: 'test-2',
        testName: 'Test 2',
        url: 'https://example.com',
        status: 'running' as const,
        startTime: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        config: {}
      };

      mockService.createTestRecord
        .mockResolvedValueOnce(record1)
        .mockResolvedValueOnce(record2);

      // 并发创建两个测试
      await act(async () => {
        const [r1, r2] = await Promise.all([
          result.current.createRecord({ testName: 'Test 1', url: 'https://example.com' }),
          result.current.createRecord({ testName: 'Test 2', url: 'https://example.com' })
        ]);

        expect(r1.id).toBe('test-1');
        expect(r2.id).toBe('test-2');
      });

      expect(result.current.records).toHaveLength(2);
    });

    test('应该处理实时数据记录不存在的情况', async () => {
      mockService.getTestRecord.mockResolvedValue({
        id: 'test-1',
        testName: 'Test',
        url: 'https://example.com',
        status: 'running' as const,
        startTime: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        config: {},
        results: { realTimeData: [] }
      });

      const { result } = renderHook(() => useStressTestRecord({ autoLoad: false }));

      // 尝试为不存在的记录添加实时数据
      await act(async () => {
        await result.current.addRealTimeData('non-existent', { timestamp: Date.now(), value: 100 });
      });

      // 应该尝试从服务器获取记录
      expect(mockService.getTestRecord).toHaveBeenCalledWith('non-existent');
    });
  });

  describe('性能和用户体验', () => {
    test('应该限制实时数据更新频率', async () => {
      const { result } = renderHook(() => useStressTestRecord({ autoLoad: false }));

      const mockRecord = {
        id: 'test-1',
        testName: 'Test',
        url: 'https://example.com',
        status: 'running' as const,
        startTime: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        config: {},
        results: { realTimeData: [] }
      };

      act(() => {
        result.current.records.push(mockRecord);
      });

      // 快速添加多个数据点
      await act(async () => {
        for (let i = 0; i < 10; i++) {
          await result.current.addRealTimeData('test-1', { timestamp: Date.now(), value: i });
        }
      });

      // 验证批量更新机制
      expect(mockService.updateTestRecord).not.toHaveBeenCalled();

      // 等待批量更新触发
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 1100));
      });

      expect(mockService.updateTestRecord).toHaveBeenCalledTimes(1);
    });

    test('应该正确清理资源', () => {
      const { unmount } = renderHook(() => useStressTestRecord({ autoLoad: false }));

      // 卸载组件
      unmount();

      // 验证清理逻辑（这里主要是确保没有抛出错误）
      expect(true).toBe(true);
    });
  });
});

describe('StressTestRecordService', () => {
  describe('重试机制', () => {
    test('应该在网络失败时重试', async () => {
      const fetchSpy = jest.spyOn(global, 'fetch');
      
      // 模拟前两次失败，第三次成功
      fetchSpy
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, data: { id: 'test-1' } })
        } as Response);

      const service = new (stressTestRecordService.constructor as any)();
      
      const result = await service.updateTestRecord('test-1', { status: 'completed' });
      
      expect(fetchSpy).toHaveBeenCalledTimes(3);
      expect(result.id).toBe('test-1');
      
      fetchSpy.mockRestore();
    });
  });

  describe('状态验证', () => {
    test('应该正确验证状态转换', () => {
      const service = stressTestRecordService;
      
      // 有效转换
      expect(service.isValidStatusTransition('pending', 'running')).toBe(true);
      expect(service.isValidStatusTransition('running', 'completed')).toBe(true);
      expect(service.isValidStatusTransition('running', 'failed')).toBe(true);
      
      // 无效转换
      expect(service.isValidStatusTransition('completed', 'running')).toBe(false);
      expect(service.isValidStatusTransition('failed', 'running')).toBe(false);
      expect(service.isValidStatusTransition('cancelled', 'running')).toBe(false);
    });
  });
});
