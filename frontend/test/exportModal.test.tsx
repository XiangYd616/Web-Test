import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ExportModal from '../components/common/ExportModal';
import ExportUtils from '../utils/exportUtils';

// Mock ExportUtils
vi.mock('../utils/exportUtils', () => ({
  exportByType: vi.fn()
}));

const mockExportUtils = ExportUtils as jest.Mocked<typeof ExportUtils>;

describe('ExportModal', () => {
  const mockData = {
    testConfig: { url: 'https://example.com', users: 10, duration: 30 },
    result: { status: 'completed' },
    metrics: { totalRequests: 100, averageResponseTime: 200 },
    realTimeData: []
  };

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    data: mockData,
    testType: 'stress' as const,
    testId: 'test-123',
    testName: '测试项目',
    onExport: vi.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('应该渲染导出模态框', () => {
    render(<ExportModal {...defaultProps} />);

    expect(screen.getByText('导出选项')).toBeInTheDocument();
    expect(screen.getByText('原始数据导出')).toBeInTheDocument();
    expect(screen.getByText('分析报告导出')).toBeInTheDocument();
    expect(screen.getByText('数据表格导出')).toBeInTheDocument();
    expect(screen.getByText('快速摘要导出')).toBeInTheDocument();
  });

  it('应该显示正确的导出类型描述', () => {
    render(<ExportModal {...defaultProps} />);

    expect(screen.getByText(/完整的JSON格式测试记录/)).toBeInTheDocument();
    expect(screen.getByText(/包含图表、性能分析、建议的HTML格式报告/)).toBeInTheDocument();
    expect(screen.getByText(/核心性能指标的CSV格式表格/)).toBeInTheDocument();
    expect(screen.getByText(/关键指标的简化JSON格式/)).toBeInTheDocument();
  });

  it('应该显示正确的文件格式标签', () => {
    render(<ExportModal {...defaultProps} />);

    const jsonLabels = screen.getAllByText('JSON');
    expect(jsonLabels).toHaveLength(2); // 原始数据和快速摘要都是JSON
    expect(screen.getByText('HTML')).toBeInTheDocument();
    expect(screen.getByText('CSV')).toBeInTheDocument();
  });

  it('点击导出按钮应该调用onExport', async () => {
    const mockOnExport = vi.fn().mockResolvedValue(undefined);
    render(<ExportModal {...defaultProps} onExport={mockOnExport} />);

    const rawDataButton = screen.getByText('导出 JSON').closest('button');
    fireEvent.click(rawDataButton!);

    await waitFor(() => {
      expect(mockOnExport).toHaveBeenCalledWith('raw-data', expect.objectContaining({
        ...mockData,
        exportType: 'raw-data',
        testType: 'stress',
        testId: 'test-123',
        testName: '测试项目'
      }));
    });
  });

  it('导出过程中应该显示加载状态', async () => {
    const mockOnExport = vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
    render(<ExportModal {...defaultProps} onExport={mockOnExport} />);

    const rawDataButton = screen.getByText('导出 JSON').closest('button');
    fireEvent.click(rawDataButton!);

    expect(screen.getByText('导出中...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText('导出中...')).not.toBeInTheDocument();
    });
  });

  it('点击关闭按钮应该调用onClose', () => {
    const mockOnClose = vi.fn();
    render(<ExportModal {...defaultProps} onClose={mockOnClose} />);

    const closeButton = screen.getByRole('button', { name: /关闭/i });
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('点击背景遮罩应该调用onClose', () => {
    const mockOnClose = vi.fn();
    render(<ExportModal {...defaultProps} onClose={mockOnClose} />);

    const backdrop = document.querySelector('.fixed.inset-0.bg-black\\/50');
    fireEvent.click(backdrop!);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('当isOpen为false时不应该渲染', () => {
    render(<ExportModal {...defaultProps} isOpen={false} />);

    expect(screen.queryByText('导出选项')).not.toBeInTheDocument();
  });

  it('导出失败时应该显示错误提示', async () => {
    const mockOnExport = vi.fn().mockRejectedValue(new Error('导出失败'));
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => { });

    render(<ExportModal {...defaultProps} onExport={mockOnExport} />);

    const rawDataButton = screen.getByText('导出 JSON').closest('button');
    fireEvent.click(rawDataButton!);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('导出失败，请重试');
    });

    alertSpy.mockRestore();
  });
});

describe('ExportUtils', () => {
  beforeEach(() => {
    // Mock DOM methods
    global.URL.createObjectURL = vi.fn(() => 'mock-url');
    global.URL.revokeObjectURL = vi.fn();

    // Mock document.createElement and click
    const mockLink = {
      href: '',
      download: '',
      click: vi.fn()
    };
    vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
    jest.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as any);
    jest.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('应该正确导出原始数据', async () => {
    const testData = {
      testConfig: { url: 'https://example.com' },
      result: { status: 'completed' },
      metrics: { totalRequests: 100 }
    };

    await ExportUtils.exportByType('raw-data', testData);

    expect(document.createElement).toHaveBeenCalledWith('a');
    expect(global.URL.createObjectURL).toHaveBeenCalled();
  });

  it('应该正确导出分析报告', async () => {
    const testData = {
      testConfig: { url: 'https://example.com' },
      metrics: { totalRequests: 100, averageResponseTime: 200 }
    };

    await ExportUtils.exportByType('analysis-report', testData);

    expect(document.createElement).toHaveBeenCalledWith('a');
    expect(global.URL.createObjectURL).toHaveBeenCalled();
  });

  it('应该正确导出数据表格', async () => {
    const testData = {
      metrics: { totalRequests: 100, averageResponseTime: 200 },
      realTimeData: [{ timestamp: Date.now(), responseTime: 100 }]
    };

    await ExportUtils.exportByType('data-table', testData);

    expect(document.createElement).toHaveBeenCalledWith('a');
    expect(global.URL.createObjectURL).toHaveBeenCalled();
  });

  it('应该正确导出快速摘要', async () => {
    const testData = {
      testConfig: { url: 'https://example.com' },
      metrics: { totalRequests: 100, averageResponseTime: 200 }
    };

    await ExportUtils.exportByType('summary', testData);

    expect(document.createElement).toHaveBeenCalledWith('a');
    expect(global.URL.createObjectURL).toHaveBeenCalled();
  });

  it('应该抛出不支持的导出类型错误', async () => {
    const testData = {};

    await expect(ExportUtils.exportByType('unsupported', testData))
      .rejects.toThrow('不支持的导出类型: unsupported');
  });
});
