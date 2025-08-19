/**
 * TestResults组件单元测试
 * 
 * 测试TestResults组件的各种状态显示、用户交互和边界情况
 * 
 * @author Test-Web Team
 * @since 1.0.0
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import TestResults, { TestResult } from '../TestResults';

// 测试数据
const mockCompletedResult: TestResult = {
  executionId: 'test-123',
  status: 'completed',
  testType: 'stress',
  score: 85,
  metrics: {
    responseTime: 250,
    throughput: 1000,
    errorRate: 0.1
  },
  recommendations: ['优化数据库查询', '启用缓存'],
  startTime: '2025-08-19T10:00:00Z',
  completedAt: '2025-08-19T10:05:00Z'
};

const mockRunningResult: TestResult = {
  executionId: 'test-456',
  status: 'running',
  testType: 'api',
  startTime: '2025-08-19T10:00:00Z'
};

const mockFailedResult: TestResult = {
  executionId: 'test-789',
  status: 'failed',
  testType: 'seo',
  startTime: '2025-08-19T10:00:00Z',
  completedAt: '2025-08-19T10:02:00Z'
};

describe('TestResults组件', () => {
  describe('基本渲染', () => {
    it('应该正确渲染已完成的测试结果', () => {
      render(<TestResults result={mockCompletedResult} />);
      
      // 检查基本信息
      expect(screen.getByText('测试结果')).toBeInTheDocument();
      expect(screen.getByText('执行ID: test-123')).toBeInTheDocument();
      expect(screen.getByText('已完成')).toBeInTheDocument();
      expect(screen.getByText('85')).toBeInTheDocument();
    });

    it('应该正确渲染运行中的测试结果', () => {
      render(<TestResults result={mockRunningResult} />);
      
      expect(screen.getByText('运行中')).toBeInTheDocument();
      expect(screen.getByText('执行ID: test-456')).toBeInTheDocument();
      
      // 运行中状态不应显示操作按钮
      expect(screen.queryByText('重新运行')).not.toBeInTheDocument();
      expect(screen.queryByText('导出报告')).not.toBeInTheDocument();
    });

    it('应该正确渲染失败的测试结果', () => {
      render(<TestResults result={mockFailedResult} />);
      
      expect(screen.getByText('失败')).toBeInTheDocument();
      expect(screen.getByText('执行ID: test-789')).toBeInTheDocument();
    });
  });

  describe('状态颜色', () => {
    it('已完成状态应该显示绿色', () => {
      render(<TestResults result={mockCompletedResult} />);
      const statusElement = screen.getByText('已完成');
      expect(statusElement).toHaveClass('text-green-600');
    });

    it('运行中状态应该显示蓝色', () => {
      render(<TestResults result={mockRunningResult} />);
      const statusElement = screen.getByText('运行中');
      expect(statusElement).toHaveClass('text-blue-600');
    });

    it('失败状态应该显示红色', () => {
      render(<TestResults result={mockFailedResult} />);
      const statusElement = screen.getByText('失败');
      expect(statusElement).toHaveClass('text-red-600');
    });
  });

  describe('分数显示', () => {
    it('高分数应该显示绿色', () => {
      const highScoreResult = { ...mockCompletedResult, score: 90 };
      render(<TestResults result={highScoreResult} />);
      const scoreElement = screen.getByText('90');
      expect(scoreElement).toHaveClass('text-green-600');
    });

    it('中等分数应该显示黄色', () => {
      const mediumScoreResult = { ...mockCompletedResult, score: 70 };
      render(<TestResults result={mediumScoreResult} />);
      const scoreElement = screen.getByText('70');
      expect(scoreElement).toHaveClass('text-yellow-600');
    });

    it('低分数应该显示红色', () => {
      const lowScoreResult = { ...mockCompletedResult, score: 40 };
      render(<TestResults result={lowScoreResult} />);
      const scoreElement = screen.getByText('40');
      expect(scoreElement).toHaveClass('text-red-600');
    });

    it('无分数时应该显示灰色', () => {
      const noScoreResult = { ...mockCompletedResult, score: undefined };
      render(<TestResults result={noScoreResult} />);
      const noScoreElement = screen.getByText('无评分');
      expect(noScoreElement).toHaveClass('text-gray-600');
    });
  });

  describe('性能指标', () => {
    it('应该正确显示性能指标', () => {
      render(<TestResults result={mockCompletedResult} />);
      
      expect(screen.getByText('250ms')).toBeInTheDocument();
      expect(screen.getByText('1000 req/s')).toBeInTheDocument();
      expect(screen.getByText('0.1%')).toBeInTheDocument();
    });

    it('缺少性能指标时应该显示默认值', () => {
      const noMetricsResult = { ...mockCompletedResult, metrics: undefined };
      render(<TestResults result={noMetricsResult} />);
      
      expect(screen.getByText('无数据')).toBeInTheDocument();
    });
  });

  describe('建议信息', () => {
    it('应该正确显示建议列表', () => {
      render(<TestResults result={mockCompletedResult} />);
      
      expect(screen.getByText('优化数据库查询')).toBeInTheDocument();
      expect(screen.getByText('启用缓存')).toBeInTheDocument();
    });

    it('无建议时应该显示默认消息', () => {
      const noRecommendationsResult = { ...mockCompletedResult, recommendations: undefined };
      render(<TestResults result={noRecommendationsResult} />);
      
      expect(screen.getByText('暂无优化建议')).toBeInTheDocument();
    });
  });

  describe('用户交互', () => {
    it('应该正确处理重新运行按钮点击', () => {
      const mockOnRerun = jest.fn();
      render(<TestResults result={mockCompletedResult} onRerun={mockOnRerun} />);
      
      const rerunButton = screen.getByText('重新运行');
      fireEvent.click(rerunButton);
      
      expect(mockOnRerun).toHaveBeenCalledTimes(1);
    });

    it('应该正确处理导出报告按钮点击', () => {
      const mockOnExport = jest.fn();
      render(<TestResults result={mockCompletedResult} onExport={mockOnExport} />);
      
      const exportButton = screen.getByText('导出报告');
      fireEvent.click(exportButton);
      
      expect(mockOnExport).toHaveBeenCalledTimes(1);
    });

    it('未提供回调函数时不应显示对应按钮', () => {
      render(<TestResults result={mockCompletedResult} />);
      
      expect(screen.queryByText('重新运行')).not.toBeInTheDocument();
      expect(screen.queryByText('导出报告')).not.toBeInTheDocument();
    });

    it('非完成状态时不应显示操作按钮', () => {
      const mockOnRerun = jest.fn();
      const mockOnExport = jest.fn();
      
      render(
        <TestResults 
          result={mockRunningResult} 
          onRerun={mockOnRerun} 
          onExport={mockOnExport} 
        />
      );
      
      expect(screen.queryByText('重新运行')).not.toBeInTheDocument();
      expect(screen.queryByText('导出报告')).not.toBeInTheDocument();
    });
  });

  describe('时间显示', () => {
    it('应该正确显示开始时间', () => {
      render(<TestResults result={mockCompletedResult} />);
      
      // 检查是否显示了格式化的时间
      expect(screen.getByText(/开始时间/)).toBeInTheDocument();
    });

    it('应该正确显示完成时间', () => {
      render(<TestResults result={mockCompletedResult} />);
      
      expect(screen.getByText(/完成时间/)).toBeInTheDocument();
    });

    it('未完成的测试不应显示完成时间', () => {
      render(<TestResults result={mockRunningResult} />);
      
      expect(screen.queryByText(/完成时间/)).not.toBeInTheDocument();
    });
  });

  describe('边界情况', () => {
    it('应该处理空的执行ID', () => {
      const emptyIdResult = { ...mockCompletedResult, executionId: '' };
      render(<TestResults result={emptyIdResult} />);
      
      expect(screen.getByText('执行ID:')).toBeInTheDocument();
    });

    it('应该处理未知的测试状态', () => {
      const unknownStatusResult = { 
        ...mockCompletedResult, 
        status: 'unknown' as any 
      };
      render(<TestResults result={unknownStatusResult} />);
      
      const statusElement = screen.getByText('unknown');
      expect(statusElement).toHaveClass('text-gray-600');
    });

    it('应该处理极端分数值', () => {
      const extremeScoreResult = { ...mockCompletedResult, score: 0 };
      render(<TestResults result={extremeScoreResult} />);
      
      const scoreElement = screen.getByText('0');
      expect(scoreElement).toHaveClass('text-red-600');
    });
  });
});
