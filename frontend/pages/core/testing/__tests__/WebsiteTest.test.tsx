/**
 * WebsiteTest组件单元测试
 * 
 * 测试网站综合测试页面的各种功能和用户交互
 * 
 * @author Test-Web Team
 * @since 1.0.0
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import WebsiteTest from '../WebsiteTest';
import { websiteTestService } from '../../../../services/websiteTestService';

// Mock websiteTestService
jest.mock('../../../../services/websiteTestService', () => ({
  websiteTestService: {
    getDefaultConfig: jest.fn(() => ({
      url: '',
      checks: ['health', 'seo', 'performance', 'security'],
      depth: 1,
      maxPages: 10,
      timeout: 60000,
      followExternalLinks: false
    })),
    validateConfig: jest.fn(() => []),
    startWebsiteTest: jest.fn(),
    pollTestProgress: jest.fn()
  }
}));

// Mock antd components that might cause issues in tests
jest.mock('antd', () => {
  const antd = jest.requireActual('antd');
  return {
    ...antd,
    Progress: ({ percent, ...props }: any) => (
      <div data-testid="progress" data-percent={percent} {...props} />
    ),
    Table: ({ dataSource, columns, ...props }: any) => (
      <div data-testid="table" {...props}>
        {dataSource?.map((item: any, index: number) => (
          <div key={index} data-testid="table-row">
            {columns?.map((col: any) => (
              <span key={col.key}>{item[col.dataIndex]}</span>
            ))}
          </div>
        ))}
      </div>
    )
  };
});

describe('WebsiteTest组件', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('基本渲染', () => {
    it('应该正确渲染网站测试页面', () => {
      render(<WebsiteTest />);
      
      expect(screen.getByText('网站综合测试')).toBeInTheDocument();
      expect(screen.getByText('对网站进行全面的健康检查，包括SEO优化、性能测试、安全检查、可访问性和最佳实践验证。')).toBeInTheDocument();
    });

    it('应该显示测试配置选项卡', () => {
      render(<WebsiteTest />);
      
      expect(screen.getByText('测试配置')).toBeInTheDocument();
      expect(screen.getByText('测试进度')).toBeInTheDocument();
      expect(screen.getByText('测试结果')).toBeInTheDocument();
    });

    it('应该显示配置表单', () => {
      render(<WebsiteTest />);
      
      expect(screen.getByLabelText('网站URL')).toBeInTheDocument();
      expect(screen.getByLabelText('检查类型')).toBeInTheDocument();
      expect(screen.getByLabelText('检查深度')).toBeInTheDocument();
      expect(screen.getByLabelText('最大页面数')).toBeInTheDocument();
      expect(screen.getByLabelText('超时时间(秒)')).toBeInTheDocument();
      expect(screen.getByLabelText('跟踪外部链接')).toBeInTheDocument();
    });
  });

  describe('表单交互', () => {
    it('应该允许用户输入URL', () => {
      render(<WebsiteTest />);
      
      const urlInput = screen.getByLabelText('网站URL');
      fireEvent.change(urlInput, { target: { value: 'https://example.com' } });
      
      expect(urlInput).toHaveValue('https://example.com');
    });

    it('应该显示开始测试按钮', () => {
      render(<WebsiteTest />);
      
      const startButton = screen.getByText('开始测试');
      expect(startButton).toBeInTheDocument();
      expect(startButton).not.toBeDisabled();
    });

    it('应该显示重置按钮', () => {
      render(<WebsiteTest />);
      
      const resetButton = screen.getByText('重置');
      expect(resetButton).toBeInTheDocument();
    });
  });

  describe('测试执行', () => {
    it('应该在点击开始测试时调用服务', async () => {
      const mockStartTest = jest.fn().mockResolvedValue('test-123');
      (websiteTestService.startWebsiteTest as jest.Mock) = mockStartTest;

      render(<WebsiteTest />);
      
      // 输入URL
      const urlInput = screen.getByLabelText('网站URL');
      fireEvent.change(urlInput, { target: { value: 'https://example.com' } });
      
      // 点击开始测试
      const startButton = screen.getByText('开始测试');
      fireEvent.click(startButton);
      
      await waitFor(() => {
        expect(mockStartTest).toHaveBeenCalledWith({
          url: 'https://example.com',
          checks: ['health', 'seo', 'performance', 'security'],
          depth: 1,
          maxPages: 10,
          timeout: 60000,
          followExternalLinks: false
        });
      });
    });

    it('应该在配置无效时显示错误', async () => {
      const mockValidateConfig = jest.fn().mockReturnValue(['URL不能为空']);
      (websiteTestService.validateConfig as jest.Mock) = mockValidateConfig;

      render(<WebsiteTest />);
      
      // 点击开始测试（没有输入URL）
      const startButton = screen.getByText('开始测试');
      fireEvent.click(startButton);
      
      await waitFor(() => {
        expect(mockValidateConfig).toHaveBeenCalled();
      });
    });

    it('应该在测试运行时显示进度', async () => {
      const mockStartTest = jest.fn().mockResolvedValue('test-123');
      const mockPollProgress = jest.fn().mockImplementation((testId, onProgress) => {
        // 模拟进度更新
        setTimeout(() => onProgress({ progress: 50, message: '测试进行中', status: 'running' }), 100);
      });
      
      (websiteTestService.startWebsiteTest as jest.Mock) = mockStartTest;
      (websiteTestService.pollTestProgress as jest.Mock) = mockPollProgress;

      render(<WebsiteTest />);
      
      // 输入URL并开始测试
      const urlInput = screen.getByLabelText('网站URL');
      fireEvent.change(urlInput, { target: { value: 'https://example.com' } });
      
      const startButton = screen.getByText('开始测试');
      fireEvent.click(startButton);
      
      // 应该切换到进度选项卡
      await waitFor(() => {
        expect(screen.getByText('准备开始测试...')).toBeInTheDocument();
      });
    });
  });

  describe('测试结果', () => {
    it('应该在测试完成时显示结果', async () => {
      const mockResult = {
        testId: 'test-123',
        url: 'https://example.com',
        timestamp: '2025-08-19T10:00:00Z',
        pages: {
          'https://example.com': {
            url: 'https://example.com',
            status: 'healthy' as const,
            statusCode: 200,
            loadTime: 1250,
            score: 88,
            checks: {
              health: { score: 95, issues: [] },
              seo: { score: 85, issues: ['缺少meta描述'] }
            },
            issues: ['缺少meta描述']
          }
        },
        summary: {
          totalPages: 1,
          healthyPages: 1,
          warningPages: 0,
          errorPages: 0,
          overallScore: 88,
          categories: { health: 95, seo: 85 }
        },
        recommendations: ['添加meta描述'],
        totalTime: 5000
      };

      const mockStartTest = jest.fn().mockResolvedValue('test-123');
      const mockPollProgress = jest.fn().mockImplementation((testId, onProgress, onComplete) => {
        setTimeout(() => onComplete(mockResult), 100);
      });
      
      (websiteTestService.startWebsiteTest as jest.Mock) = mockStartTest;
      (websiteTestService.pollTestProgress as jest.Mock) = mockPollProgress;

      render(<WebsiteTest />);
      
      // 输入URL并开始测试
      const urlInput = screen.getByLabelText('网站URL');
      fireEvent.change(urlInput, { target: { value: 'https://example.com' } });
      
      const startButton = screen.getByText('开始测试');
      fireEvent.click(startButton);
      
      // 等待测试完成
      await waitFor(() => {
        expect(screen.getByText('测试概览')).toBeInTheDocument();
        expect(screen.getByText('88')).toBeInTheDocument(); // 总体评分
      });
    });

    it('应该显示导出按钮', async () => {
      // 设置一个模拟结果
      const mockResult = {
        testId: 'test-123',
        url: 'https://example.com',
        timestamp: '2025-08-19T10:00:00Z',
        pages: {},
        summary: {
          totalPages: 1,
          healthyPages: 1,
          warningPages: 0,
          errorPages: 0,
          overallScore: 88,
          categories: {}
        },
        recommendations: [],
        totalTime: 5000
      };

      const mockStartTest = jest.fn().mockResolvedValue('test-123');
      const mockPollProgress = jest.fn().mockImplementation((testId, onProgress, onComplete) => {
        setTimeout(() => onComplete(mockResult), 100);
      });
      
      (websiteTestService.startWebsiteTest as jest.Mock) = mockStartTest;
      (websiteTestService.pollTestProgress as jest.Mock) = mockPollProgress;

      render(<WebsiteTest />);
      
      // 输入URL并开始测试
      const urlInput = screen.getByLabelText('网站URL');
      fireEvent.change(urlInput, { target: { value: 'https://example.com' } });
      
      const startButton = screen.getByText('开始测试');
      fireEvent.click(startButton);
      
      // 等待测试完成并检查导出按钮
      await waitFor(() => {
        expect(screen.getByText('导出结果')).toBeInTheDocument();
      });
    });
  });

  describe('错误处理', () => {
    it('应该处理测试启动失败', async () => {
      const mockStartTest = jest.fn().mockRejectedValue(new Error('网络错误'));
      (websiteTestService.startWebsiteTest as jest.Mock) = mockStartTest;

      render(<WebsiteTest />);
      
      // 输入URL并开始测试
      const urlInput = screen.getByLabelText('网站URL');
      fireEvent.change(urlInput, { target: { value: 'https://example.com' } });
      
      const startButton = screen.getByText('开始测试');
      fireEvent.click(startButton);
      
      await waitFor(() => {
        expect(screen.getByText(/启动测试失败/)).toBeInTheDocument();
      });
    });

    it('应该处理测试执行失败', async () => {
      const mockStartTest = jest.fn().mockResolvedValue('test-123');
      const mockPollProgress = jest.fn().mockImplementation((testId, onProgress, onComplete, onError) => {
        setTimeout(() => onError(new Error('测试执行失败')), 100);
      });
      
      (websiteTestService.startWebsiteTest as jest.Mock) = mockStartTest;
      (websiteTestService.pollTestProgress as jest.Mock) = mockPollProgress;

      render(<WebsiteTest />);
      
      // 输入URL并开始测试
      const urlInput = screen.getByLabelText('网站URL');
      fireEvent.change(urlInput, { target: { value: 'https://example.com' } });
      
      const startButton = screen.getByText('开始测试');
      fireEvent.click(startButton);
      
      await waitFor(() => {
        expect(screen.getByText(/测试失败/)).toBeInTheDocument();
      });
    });
  });

  describe('重置功能', () => {
    it('应该在点击重置时清空表单', () => {
      render(<WebsiteTest />);
      
      // 输入一些数据
      const urlInput = screen.getByLabelText('网站URL');
      fireEvent.change(urlInput, { target: { value: 'https://example.com' } });
      
      // 点击重置
      const resetButton = screen.getByText('重置');
      fireEvent.click(resetButton);
      
      // 检查表单是否被重置
      expect(urlInput).toHaveValue('');
    });
  });
});
