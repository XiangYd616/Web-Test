/**
 * TestHistory 组件单元测试
 * 
 * 文件路径: frontend/components/common/TestHistory/__tests__/TestHistory.test.tsx
 * 创建时间: 2025-11-14
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { TestHistory } from '../TestHistory';
import { stressTestConfig } from '../config/stressTestConfig';
import type { TestHistoryConfig } from '../types';

// Mock Logger
vi.mock('@/utils/logger', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('TestHistory 组件', () => {
  // 测试数据
  const mockRecords = [
    {
      id: '1',
      testName: '压力测试1',
      testType: 'stress',
      url: 'https://example.com',
      status: 'completed' as const,
      totalRequests: 1000,
      successfulRequests: 950,
      failedRequests: 50,
      averageResponseTime: 120,
      peakTps: 100,
      errorRate: 0.05,
      duration: 60000,
      createdAt: '2025-11-14T00:00:00Z',
      updatedAt: '2025-11-14T00:01:00Z',
      config: {},
    },
    {
      id: '2',
      testName: '压力测试2',
      testType: 'stress',
      url: 'https://test.com',
      status: 'running' as const,
      totalRequests: 500,
      successfulRequests: 480,
      failedRequests: 20,
      averageResponseTime: 90,
      peakTps: 80,
      errorRate: 0.04,
      duration: 30000,
      createdAt: '2025-11-13T00:00:00Z',
      updatedAt: '2025-11-13T00:00:30Z',
      config: {},
    },
  ];

  const mockApiResponse = {
    success: true,
    data: {
      tests: mockRecords,
      pagination: {
        total: 2,
        page: 1,
        pageSize: 10,
      },
    },
  };

  beforeEach(() => {
    // 重置所有mock
    vi.clearAllMocks();
    
    // 设置fetch默认响应
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse,
      headers: new Headers(),
      status: 200,
      statusText: 'OK',
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('基础渲染', () => {
    it('应该成功渲染组件', () => {
      render(<TestHistory config={stressTestConfig} />);
      expect(screen.getByText('测试历史')).toBeInTheDocument();
    });

    it('应该显示配置的标题', () => {
      const customConfig: TestHistoryConfig = {
        ...stressTestConfig,
        title: '自定义测试历史',
      };
      render(<TestHistory config={customConfig} />);
      expect(screen.getByText('自定义测试历史')).toBeInTheDocument();
    });

    it('应该渲染刷新按钮', () => {
      render(<TestHistory config={stressTestConfig} />);
      const refreshButton = screen.getByTitle(/刷新测试记录/);
      expect(refreshButton).toBeInTheDocument();
    });
  });

  describe('数据加载', () => {
    it('应该在挂载时加载数据', async () => {
      render(<TestHistory config={stressTestConfig} />);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/test/stress'),
          expect.any(Object)
        );
      });
    });

    it('应该显示加载状态', () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // 永不resolve
      render(<TestHistory config={stressTestConfig} />);
      expect(screen.getByText('加载中...')).toBeInTheDocument();
    });

    it('应该正确显示加载的数据', async () => {
      render(<TestHistory config={stressTestConfig} />);
      
      await waitFor(() => {
        expect(screen.getByText('压力测试1')).toBeInTheDocument();
        expect(screen.getByText('压力测试2')).toBeInTheDocument();
      });
    });

    it('应该处理API错误', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      render(<TestHistory config={stressTestConfig} />);
      
      await waitFor(() => {
        expect(screen.getByText('暂无测试记录')).toBeInTheDocument();
      });
    });
  });

  describe('空状态', () => {
    it('应该在无数据时显示空状态', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            tests: [],
            pagination: { total: 0, page: 1, pageSize: 10 },
          },
        }),
      });

      render(<TestHistory config={stressTestConfig} />);
      
      await waitFor(() => {
        expect(screen.getByText('暂无测试记录')).toBeInTheDocument();
      });
    });
  });

  describe('筛选功能', () => {
    it('应该渲染搜索框', () => {
      render(<TestHistory config={stressTestConfig} />);
      const searchInput = screen.getByPlaceholderText(/输入测试名称或URL/);
      expect(searchInput).toBeInTheDocument();
    });

    it('应该渲染状态筛选器', () => {
      render(<TestHistory config={stressTestConfig} />);
      const statusSelect = screen.getByLabelText(/筛选测试状态/);
      expect(statusSelect).toBeInTheDocument();
    });

    it('应该在筛选时重新加载数据', async () => {
      render(<TestHistory config={stressTestConfig} />);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      const searchInput = screen.getByPlaceholderText(/输入测试名称或URL/);
      fireEvent.change(searchInput, { target: { value: '测试' } });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('search=测试'),
          expect.any(Object)
        );
      }, { timeout: 3000 });
    });
  });

  describe('分页功能', () => {
    it('应该显示分页信息', async () => {
      render(<TestHistory config={stressTestConfig} />);
      
      await waitFor(() => {
        expect(screen.getByText(/显示.*共.*条记录/)).toBeInTheDocument();
      });
    });

    it('应该支持修改每页大小', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            tests: Array(20).fill(null).map((_, i) => ({
              ...mockRecords[0],
              id: String(i + 1),
            })),
            pagination: { total: 20, page: 1, pageSize: 10 },
          },
        }),
      });

      render(<TestHistory config={stressTestConfig} />);
      
      await waitFor(() => {
        expect(screen.getByText('压力测试1')).toBeInTheDocument();
      });

      // 查找页面大小选择器
      const pageSizeSelects = screen.getAllByRole('combobox');
      const pageSizeSelect = pageSizeSelects.find(select => 
        select.getAttribute('aria-label')?.includes('每页') || 
        select.closest('.flex')?.textContent?.includes('每页')
      );
      
      if (pageSizeSelect) {
        fireEvent.change(pageSizeSelect, { target: { value: '20' } });
        
        await waitFor(() => {
          expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining('pageSize=20'),
            expect.any(Object)
          );
        });
      }
    });
  });

  describe('批量操作', () => {
    it('应该支持全选', async () => {
      render(<TestHistory config={stressTestConfig} />);
      
      await waitFor(() => {
        expect(screen.getByText('压力测试1')).toBeInTheDocument();
      });

      const selectAllCheckbox = screen.getByLabelText('全选');
      fireEvent.click(selectAllCheckbox);

      expect(screen.getByText(/删除选中.*2/)).toBeInTheDocument();
    });

    it('应该支持单个选择', async () => {
      render(<TestHistory config={stressTestConfig} />);
      
      await waitFor(() => {
        expect(screen.getByText('压力测试1')).toBeInTheDocument();
      });

      const checkboxes = screen.getAllByRole('checkbox');
      const firstRecordCheckbox = checkboxes[1]; // 第0个是全选
      
      fireEvent.click(firstRecordCheckbox);

      expect(screen.getByText(/删除选中.*1/)).toBeInTheDocument();
    });
  });

  describe('导出功能', () => {
    it('应该渲染导出按钮', async () => {
      render(<TestHistory config={stressTestConfig} />);
      
      await waitFor(() => {
        expect(screen.getByText('压力测试1')).toBeInTheDocument();
      });

      expect(screen.getByText('JSON')).toBeInTheDocument();
      expect(screen.getByText('CSV')).toBeInTheDocument();
    });
  });

  describe('自定义Props', () => {
    it('应该调用onRecordClick回调', async () => {
      const handleRecordClick = vi.fn();
      render(
        <TestHistory 
          config={stressTestConfig} 
          onRecordClick={handleRecordClick}
        />
      );
      
      await waitFor(() => {
        expect(screen.getByText('压力测试1')).toBeInTheDocument();
      });

      // 点击查看详情按钮
      const viewButtons = screen.getAllByTitle('查看详情');
      fireEvent.click(viewButtons[0]);

      expect(handleRecordClick).toHaveBeenCalledWith(
        expect.objectContaining({ id: '1', testName: '压力测试1' })
      );
    });

    it('应该应用自定义className', () => {
      const { container } = render(
        <TestHistory config={stressTestConfig} className="custom-class" />
      );
      
      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });
  });

  describe('刷新功能', () => {
    it('应该在点击刷新按钮时重新加载数据', async () => {
      render(<TestHistory config={stressTestConfig} />);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      const refreshButton = screen.getByTitle(/刷新测试记录/);
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('列配置', () => {
    it('应该渲染配置的列', async () => {
      render(<TestHistory config={stressTestConfig} />);
      
      await waitFor(() => {
        expect(screen.getByText('测试名称')).toBeInTheDocument();
        expect(screen.getByText('目标URL')).toBeInTheDocument();
        expect(screen.getByText('请求总数')).toBeInTheDocument();
        expect(screen.getByText('状态')).toBeInTheDocument();
      });
    });

    it('应该正确格式化列值', async () => {
      render(<TestHistory config={stressTestConfig} />);
      
      await waitFor(() => {
        // 检查数字格式化
        expect(screen.getByText('1,000')).toBeInTheDocument();
        // 检查百分比格式化
        expect(screen.getByText('5.00%')).toBeInTheDocument();
      });
    });
  });
});
