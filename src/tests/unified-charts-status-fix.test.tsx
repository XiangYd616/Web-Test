/**
 * UnifiedStressTestCharts 状态修复测试
 * 验证状态指示器能正确处理所有状态值
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import UnifiedStressTestCharts, { TestStatus } from '../components/charts/UnifiedStressTestCharts';

// Mock 数据
const mockTestData = {
  realTimeData: [],
  testResult: null,
  metrics: {},
  historicalResults: [],
  testPhases: []
};

describe('UnifiedStressTestCharts 状态修复测试', () => {
  const defaultProps = {
    testData: mockTestData,
    testStatus: TestStatus.IDLE,
    isRunning: false,
    onSaveAsBaseline: jest.fn(),
    onExportData: jest.fn()
  };

  test('应该正确处理所有枚举状态', () => {
    const statuses = [
      TestStatus.IDLE,
      TestStatus.STARTING,
      TestStatus.RUNNING,
      TestStatus.COMPLETED,
      TestStatus.FAILED,
      TestStatus.CANCELLED,
      TestStatus.WAITING,
      TestStatus.TIMEOUT
    ];

    statuses.forEach(status => {
      const { unmount } = render(
        <UnifiedStressTestCharts
          {...defaultProps}
          testStatus={status}
        />
      );

      // 验证组件能正常渲染，不抛出错误
      expect(screen.getByText(/视图:/)).toBeInTheDocument();
      
      unmount();
    });
  });

  test('应该正确处理字符串状态值', () => {
    const stringStatuses = [
      'idle',
      'starting', 
      'running',
      'completed',
      'failed',
      'cancelled',
      'waiting',
      'timeout'
    ];

    stringStatuses.forEach(status => {
      const { unmount } = render(
        <UnifiedStressTestCharts
          {...defaultProps}
          testStatus={status as any}
        />
      );

      // 验证组件能正常渲染，不抛出错误
      expect(screen.getByText(/视图:/)).toBeInTheDocument();
      
      unmount();
    });
  });

  test('应该正确处理未知状态值', () => {
    const unknownStatuses = [
      'unknown',
      'invalid',
      null,
      undefined,
      123,
      {}
    ];

    unknownStatuses.forEach(status => {
      const { unmount } = render(
        <UnifiedStressTestCharts
          {...defaultProps}
          testStatus={status as any}
        />
      );

      // 验证组件能正常渲染，使用默认状态
      expect(screen.getByText(/视图:/)).toBeInTheDocument();
      
      unmount();
    });
  });

  test('状态指示器应该显示正确的文本', () => {
    const statusTexts = {
      [TestStatus.IDLE]: '待机',
      [TestStatus.STARTING]: '启动中',
      [TestStatus.RUNNING]: '运行中',
      [TestStatus.COMPLETED]: '已完成',
      [TestStatus.FAILED]: '失败',
      [TestStatus.CANCELLED]: '已取消',
      [TestStatus.WAITING]: '等待中',
      [TestStatus.TIMEOUT]: '已超时'
    };

    Object.entries(statusTexts).forEach(([status, expectedText]) => {
      const { unmount } = render(
        <UnifiedStressTestCharts
          {...defaultProps}
          testStatus={status as TestStatus}
        />
      );

      // 验证状态文本正确显示
      expect(screen.getByText(expectedText)).toBeInTheDocument();
      
      unmount();
    });
  });

  test('运行状态应该有动画效果', () => {
    const { container } = render(
      <UnifiedStressTestCharts
        {...defaultProps}
        testStatus={TestStatus.RUNNING}
      />
    );

    // 查找带有 animate-pulse 类的元素
    const animatedElement = container.querySelector('.animate-pulse');
    expect(animatedElement).toBeInTheDocument();
  });

  test('非运行状态不应该有动画效果', () => {
    const nonRunningStatuses = [
      TestStatus.IDLE,
      TestStatus.COMPLETED,
      TestStatus.FAILED,
      TestStatus.CANCELLED
    ];

    nonRunningStatuses.forEach(status => {
      const { container, unmount } = render(
        <UnifiedStressTestCharts
          {...defaultProps}
          testStatus={status}
        />
      );

      // 验证没有动画效果
      const animatedElement = container.querySelector('.animate-pulse');
      expect(animatedElement).toBeNull();
      
      unmount();
    });
  });

  test('应该正确处理状态配置缺失的情况', () => {
    // 模拟一个完全未知的状态
    const { container } = render(
      <UnifiedStressTestCharts
        {...defaultProps}
        testStatus={'completely-unknown-status' as any}
      />
    );

    // 验证组件仍然能渲染，使用默认状态
    expect(screen.getByText(/视图:/)).toBeInTheDocument();
    expect(screen.getByText('待机')).toBeInTheDocument(); // 默认状态文本
  });

  test('状态变化应该正确更新显示', () => {
    const { rerender } = render(
      <UnifiedStressTestCharts
        {...defaultProps}
        testStatus={TestStatus.IDLE}
      />
    );

    // 验证初始状态
    expect(screen.getByText('待机')).toBeInTheDocument();

    // 更改状态
    rerender(
      <UnifiedStressTestCharts
        {...defaultProps}
        testStatus={TestStatus.RUNNING}
      />
    );

    // 验证状态已更新
    expect(screen.getByText('运行中')).toBeInTheDocument();
    expect(screen.queryByText('待机')).not.toBeInTheDocument();
  });
});

// 集成测试：验证与其他组件的交互
describe('UnifiedStressTestCharts 集成测试', () => {
  test('应该正确处理来自 StressTest 页面的状态', () => {
    // 模拟从 StressTest 页面传入的各种状态
    const stressTestStatuses = [
      'idle',
      'running', 
      'completed',
      'failed',
      'cancelled'
    ];

    stressTestStatuses.forEach(status => {
      const { unmount } = render(
        <UnifiedStressTestCharts
          testData={mockTestData}
          testStatus={status as any}
          isRunning={status === 'running'}
          onSaveAsBaseline={jest.fn()}
          onExportData={jest.fn()}
        />
      );

      // 验证组件正常渲染
      expect(screen.getByText(/视图:/)).toBeInTheDocument();
      
      unmount();
    });
  });

  test('应该正确处理队列状态', () => {
    const queueStatuses = ['waiting', 'timeout'];

    queueStatuses.forEach(status => {
      const { unmount } = render(
        <UnifiedStressTestCharts
          testData={mockTestData}
          testStatus={status as any}
          isRunning={false}
          onSaveAsBaseline={jest.fn()}
          onExportData={jest.fn()}
        />
      );

      // 验证队列状态正确显示
      expect(screen.getByText(/视图:/)).toBeInTheDocument();
      
      unmount();
    });
  });
});
