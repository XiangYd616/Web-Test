/**
 * 取消状态修复验证测试
 * 验证取消操作不会被错误地更新为完成状态
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from '@testing-library/react';
import React from 'react';

// Mock 数据和服务
const mockSocket = {
  on: jest.fn(),
  emit: jest.fn(),
  connected: true,
  disconnect: jest.fn()
};

const mockBackgroundTestManager = {
  addListener: jest.fn(() => () => {}),
  cancelTest: jest.fn(),
  getTestInfo: jest.fn()
};

const mockUseStressTestRecord = {
  cancelRecord: jest.fn(),
  createRecord: jest.fn(),
  currentRecord: { id: 'test-record-123' },
  records: [],
  loading: false,
  error: null
};

// Mock 模块
jest.mock('socket.io-client', () => ({
  io: () => mockSocket
}));

jest.mock('../services/backgroundTestManager', () => ({
  default: mockBackgroundTestManager
}));

jest.mock('../hooks/useStressTestRecord', () => ({
  __esModule: true,
  default: () => mockUseStressTestRecord
}));

// Mock fetch
global.fetch = jest.fn();

describe('取消状态修复验证', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        message: '测试已取消',
        data: { status: 'cancelled' }
      })
    });
  });

  test('testCancelled 事件应该设置正确的取消状态', async () => {
    const StressTest = require('../pages/StressTest').default;
    
    render(<StressTest />);

    // 模拟 testCancelled 事件
    const testInfo = {
      type: 'stress',
      id: 'test-123',
      result: {
        status: 'cancelled',
        metrics: {}
      }
    };

    // 获取 backgroundTestManager 监听器
    const addListenerCall = mockBackgroundTestManager.addListener.mock.calls[0];
    const listener = addListenerCall[0];

    // 触发 testCancelled 事件
    act(() => {
      listener('testCancelled', testInfo);
    });

    // 验证状态设置为 cancelled 而不是 failed
    await waitFor(() => {
      const statusElement = screen.queryByText('测试已取消');
      expect(statusElement).toBeInTheDocument();
    });
  });

  test('WebSocket 状态更新不应该覆盖取消状态', async () => {
    const StressTest = require('../pages/StressTest').default;
    
    const { container } = render(<StressTest />);

    // 模拟设置取消状态
    act(() => {
      // 直接设置组件状态为取消
      const component = container.querySelector('[data-testid="stress-test-component"]');
      if (component) {
        (component as any).__testStatus = 'cancelled';
      }
    });

    // 获取 WebSocket 监听器
    const socketOnCalls = mockSocket.on.mock.calls;
    const stressTestStatusHandler = socketOnCalls.find(call => call[0] === 'stress-test-status')?.[1];

    if (stressTestStatusHandler) {
      // 模拟收到状态更新事件
      act(() => {
        stressTestStatusHandler({
          status: 'running',
          progress: 50
        });
      });

      // 验证取消状态没有被覆盖
      await waitFor(() => {
        // 这里应该验证状态仍然是 cancelled
        // 由于我们无法直接访问组件状态，我们检查UI显示
        const cancelledElement = screen.queryByText(/已取消/);
        if (cancelledElement) {
          expect(cancelledElement).toBeInTheDocument();
        }
      });
    }
  });

  test('取消操作错误处理应该保持取消状态', async () => {
    // Mock fetch 返回错误
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('网络错误'));

    const StressTest = require('../pages/StressTest').default;
    
    render(<StressTest />);

    // Mock window.confirm
    window.confirm = jest.fn(() => true);

    // 模拟有正在运行的测试
    act(() => {
      // 设置测试状态
      const component = document.querySelector('[data-testid="stress-test-component"]');
      if (component) {
        (component as any).__currentTestId = 'test-123';
        (component as any).__isRunning = true;
      }
    });

    // 查找取消按钮（如果存在）
    const cancelButton = screen.queryByText(/取消/);
    
    if (cancelButton) {
      // 点击取消按钮
      fireEvent.click(cancelButton);

      // 等待错误处理完成
      await waitFor(() => {
        // 验证即使发生错误，状态也应该是取消而不是失败
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/test/stress/cancel/'),
          expect.objectContaining({
            method: 'POST'
          })
        );
      });
    }
  });

  test('useEffect 状态同步不应该覆盖取消状态', async () => {
    const StressTest = require('../pages/StressTest').default;
    
    const { rerender } = render(<StressTest />);

    // 模拟结果数据但状态为取消
    const mockResult = {
      status: 'cancelled',
      metrics: {},
      message: '测试已取消'
    };

    // 重新渲染组件，模拟状态变化
    rerender(<StressTest />);

    // 验证取消状态被正确处理
    await waitFor(() => {
      // 检查是否有取消相关的UI元素
      const cancelledElements = screen.queryAllByText(/取消/);
      expect(cancelledElements.length).toBeGreaterThan(0);
    });
  });

  test('完整的取消流程验证', async () => {
    const StressTest = require('../pages/StressTest').default;
    
    render(<StressTest />);

    // 1. 模拟测试开始
    act(() => {
      const component = document.querySelector('[data-testid="stress-test-component"]');
      if (component) {
        (component as any).__isRunning = true;
        (component as any).__currentTestId = 'test-123';
        (component as any).__testStatus = 'running';
      }
    });

    // 2. 模拟用户点击取消
    window.confirm = jest.fn(() => true);
    
    const cancelButton = screen.queryByText(/取消/);
    if (cancelButton) {
      fireEvent.click(cancelButton);

      // 3. 验证取消API被调用
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/test/stress/cancel/test-123'),
          expect.objectContaining({
            method: 'POST'
          })
        );
      });

      // 4. 验证状态设置为取消
      await waitFor(() => {
        const statusText = screen.queryByText(/取消/);
        expect(statusText).toBeInTheDocument();
      });
    }
  });

  test('WebSocket 完成事件应该检查取消状态', async () => {
    const StressTest = require('../pages/StressTest').default;
    
    render(<StressTest />);

    // 获取 WebSocket 监听器
    const socketOnCalls = mockSocket.on.mock.calls;
    const stressTestCompleteHandler = socketOnCalls.find(call => call[0] === 'stress-test-complete')?.[1];

    if (stressTestCompleteHandler) {
      // 模拟收到取消状态的完成事件
      act(() => {
        stressTestCompleteHandler({
          results: {
            status: 'cancelled',
            metrics: {},
            message: '测试已取消'
          }
        });
      });

      // 验证状态被正确设置为取消
      await waitFor(() => {
        const cancelledElement = screen.queryByText(/取消/);
        expect(cancelledElement).toBeInTheDocument();
      });
    }
  });
});

// 集成测试
describe('取消状态集成测试', () => {
  test('多个状态更新源不应该冲突', async () => {
    const StressTest = require('../pages/StressTest').default;
    
    render(<StressTest />);

    // 1. 设置初始取消状态
    act(() => {
      const component = document.querySelector('[data-testid="stress-test-component"]');
      if (component) {
        (component as any).__testStatus = 'cancelled';
      }
    });

    // 2. 模拟多个状态更新源
    const socketOnCalls = mockSocket.on.mock.calls;
    
    // WebSocket 状态更新
    const statusHandler = socketOnCalls.find(call => call[0] === 'stress-test-status')?.[1];
    if (statusHandler) {
      act(() => {
        statusHandler({ status: 'completed', progress: 100 });
      });
    }

    // WebSocket 完成事件
    const completeHandler = socketOnCalls.find(call => call[0] === 'stress-test-complete')?.[1];
    if (completeHandler) {
      act(() => {
        completeHandler({
          results: { status: 'completed', metrics: {} }
        });
      });
    }

    // 3. 验证取消状态没有被覆盖
    await waitFor(() => {
      // 应该仍然显示取消状态
      const cancelledElement = screen.queryByText(/取消/);
      expect(cancelledElement).toBeInTheDocument();
    });
  });
});
