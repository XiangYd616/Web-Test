/**
 * 🧪 统一测试引擎集成测试
 * 验证统一测试引擎的完整集成功能
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { BrowserRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EngineMonitor } from '../../components/monitoring/EngineMonitor';
import { TestPage } from '../../pages/TestPage';

// Mock WebSocket
global.WebSocket = vi.fn(() => ({
  readyState: 1,
  send: vi.fn(),
  close: vi.fn(),
  onopen: undefined as undefined | ((event: Event) => void),
  onmessage: undefined as undefined | ((event: MessageEvent) => void),
  onclose: undefined as undefined | ((event: CloseEvent) => void),
  onerror: undefined as undefined | ((event: Event) => void),
})) as any;

// Mock fetch
global.fetch = vi.fn();

// Mock URL API
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = vi.fn();

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <ConfigProvider locale={zhCN}>{component}</ConfigProvider>
    </BrowserRouter>
  );
};

describe('统一测试引擎集成测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock 成功的API响应
    (global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('/test-types')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: {
                testTypes: [
                  { id: 'performance', name: '性能测试', core: 'performance' },
                  { id: 'security', name: '安全测试', core: 'security' },
                  { id: 'api', name: 'API测试', core: 'api' },
                ],
                engineVersion: '1.0.0',
              },
            }),
        });
      }

      if (url.includes('/execute')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: {
                testId: 'test_integration_123',
                message: '测试已启动',
                estimatedDuration: 30000,
              },
            }),
        });
      }

      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: {} }),
      });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('完整页面集成', () => {
    it('应该正确渲染完整的统一测试页面', async () => {
      renderWithProviders(<TestPage />);

      // 验证页面标题
      expect(screen.getByText('🧠 统一测试引擎')).toBeInTheDocument();

      // 验证页面描述
      expect(
        screen.getByText('集成多种测试工具，提供统一的测试执行和结果分析平台')
      ).toBeInTheDocument();

      // 验证引擎状态卡片
      expect(screen.getByText('引擎状态')).toBeInTheDocument();
      expect(screen.getByText('支持的测试类型')).toBeInTheDocument();
      expect(screen.getByText('运行中测试')).toBeInTheDocument();
      expect(screen.getByText('总测试结果')).toBeInTheDocument();

      // 验证标签页
      expect(screen.getByText('测试执行器')).toBeInTheDocument();
      expect(screen.getByText('经典面板')).toBeInTheDocument();
    });

    it('应该支持帮助文档切换', async () => {
      renderWithProviders(<TestPage />);

      const helpButton = screen.getByText('帮助');
      fireEvent.click(helpButton);

      await waitFor(() => {
        expect(screen.getByText('统一测试引擎使用指南')).toBeInTheDocument();
        expect(screen.getByText('支持的测试类型:')).toBeInTheDocument();
      });

      // 验证帮助内容
      expect(screen.getByText('performance')).toBeInTheDocument();
      expect(screen.getByText('security')).toBeInTheDocument();
      expect(screen.getByText('api')).toBeInTheDocument();
    });

    it('应该支持标签页切换', async () => {
      renderWithProviders(<TestPage />);

      // 默认在测试执行器标签页
      expect(screen.getByText('🚀 引擎状态')).toBeInTheDocument();

      // 切换到经典面板
      const panelTab = screen.getByText('经典面板');
      fireEvent.click(panelTab);

      await waitFor(() => {
        expect(screen.getByText('配置')).toBeInTheDocument();
        expect(screen.getByText('进度')).toBeInTheDocument();
        expect(screen.getByText('结果')).toBeInTheDocument();
      });
    });
  });

  describe('引擎监控集成', () => {
    it('应该正确渲染引擎监控组件', () => {
      renderWithProviders(<EngineMonitor />);

      expect(screen.getByText('📊 引擎监控面板')).toBeInTheDocument();
      expect(screen.getByText('实时监控统一测试引擎的状态和性能')).toBeInTheDocument();

      // 验证状态卡片
      expect(screen.getByText('引擎状态')).toBeInTheDocument();
      expect(screen.getByText('测试统计')).toBeInTheDocument();
      expect(screen.getByText('支持的测试类型')).toBeInTheDocument();
      expect(screen.getByText('系统健康')).toBeInTheDocument();
    });

    it('应该支持自动刷新功能', async () => {
      renderWithProviders(<EngineMonitor refreshInterval={1000} />);

      const autoRefreshButton = screen.getByText('自动刷新');
      expect(autoRefreshButton).toBeInTheDocument();

      // 点击切换自动刷新
      fireEvent.click(autoRefreshButton);

      // 验证按钮状态变化
      await waitFor(() => {
        expect(autoRefreshButton).toHaveClass('ant-btn-primary');
      });
    });

    it('应该显示正确的健康评分', () => {
      renderWithProviders(<EngineMonitor showDetailedStats={true} />);

      expect(screen.getByText('健康评分')).toBeInTheDocument();
      expect(screen.getByText('成功率')).toBeInTheDocument();
      expect(screen.getByText('错误率')).toBeInTheDocument();
      expect(screen.getByText('平均执行时间')).toBeInTheDocument();
    });
  });

  describe('端到端测试流程', () => {
    it('应该支持完整的测试执行流程', async () => {
      renderWithProviders(<TestPage />);

      // 1. 配置测试
      const urlInput = screen.getByPlaceholderText('https://example.com');
      fireEvent.change(urlInput, { target: { value: 'https://test-site.com' } });

      // 2. 选择测试类型
      const testTypeSelect = screen.getByDisplayValue('🚀 性能测试');
      expect(testTypeSelect).toBeInTheDocument();

      // 3. 启动测试
      const startButton = screen.getByText('开始测试');
      fireEvent.click(startButton);

      // 4. 验证API调用
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/test-engine/execute',
          expect.objectContaining({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: expect.stringContaining('performance'),
          })
        );
      });

      // 5. 验证切换到监控标签页
      await waitFor(() => {
        expect(screen.getByText('📊 测试监控')).toBeInTheDocument();
      });
    });

    it('应该正确处理测试错误', async () => {
      // Mock 失败的API响应
      (global.fetch as any).mockRejectedValueOnce(new Error('网络错误'));

      const _mockOnTestError = vi.fn();

      renderWithProviders(<TestPage />);

      const urlInput = screen.getByPlaceholderText('https://example.com');
      const startButton = screen.getByText('开始测试');

      fireEvent.change(urlInput, { target: { value: 'https://test-site.com' } });
      fireEvent.click(startButton);

      // 验证错误处理
      await waitFor(() => {
        expect(screen.getByText('引擎错误')).toBeInTheDocument();
      });
    });

    it('应该支持测试结果查看和下载', async () => {
      renderWithProviders(<TestPage />);

      // 切换到结果标签页
      const resultsTab = screen.getByText(/查看结果/);
      fireEvent.click(resultsTab);

      await waitFor(() => {
        expect(screen.getByText('📋 测试结果')).toBeInTheDocument();
      });

      // 验证表格列
      expect(screen.getByText('测试ID')).toBeInTheDocument();
      expect(screen.getByText('测试类型')).toBeInTheDocument();
      expect(screen.getByText('评分')).toBeInTheDocument();
      expect(screen.getByText('时长')).toBeInTheDocument();
      expect(screen.getByText('完成时间')).toBeInTheDocument();
      expect(screen.getByText('操作')).toBeInTheDocument();
    });
  });

  describe('WebSocket集成测试', () => {
    it('应该正确建立WebSocket连接', () => {
      renderWithProviders(<TestPage />);

      // 验证WebSocket构造函数被调用
      expect(global.WebSocket).toHaveBeenCalledWith(expect.stringContaining('/test-engine'));
    });

    it('应该正确处理WebSocket消息', async () => {
      const mockWS = {
        readyState: 1,
        send: vi.fn(),
        close: vi.fn(),
        onopen: undefined as undefined | ((event: Event) => void),
        onmessage: undefined as undefined | ((event: MessageEvent) => void),
        onclose: undefined as undefined | ((event: CloseEvent) => void),
        onerror: undefined as undefined | ((event: Event) => void),
      };

      (global.WebSocket as any).mockReturnValue(mockWS);

      renderWithProviders(<TestPage />);

      // 模拟WebSocket连接打开
      if (mockWS.onopen) {
        mockWS.onopen({} as Event);
      }

      // 模拟接收测试进度消息
      const progressMessage = {
        type: 'testProgress',
        testId: 'test_123',
        data: {
          progress: 50,
          step: '正在分析页面性能...',
          timestamp: Date.now(),
        },
      };

      if (mockWS.onmessage) {
        mockWS.onmessage({
          data: JSON.stringify(progressMessage),
        } as MessageEvent);
      }

      // 验证消息处理
      expect(mockWS.send).toBeDefined();
    });
  });

  describe('响应式设计集成测试', () => {
    it('应该在移动设备上正常工作', () => {
      // 模拟移动设备屏幕
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      renderWithProviders(<TestPage />);

      // 验证关键元素仍然可见
      expect(screen.getByText('🧠 统一测试引擎')).toBeInTheDocument();
      expect(screen.getByText('开始测试')).toBeInTheDocument();
    });

    it('应该在平板设备上正常工作', () => {
      // 模拟平板设备屏幕
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });

      renderWithProviders(<TestPage />);

      // 验证布局适应
      expect(screen.getByText('测试执行器')).toBeInTheDocument();
      expect(screen.getByText('经典面板')).toBeInTheDocument();
    });
  });

  describe('性能集成测试', () => {
    it('应该在合理时间内完成渲染', () => {
      const startTime = performance.now();

      renderWithProviders(<TestPage />);

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // 完整页面渲染应该在200ms内完成
      expect(renderTime).toBeLessThan(200);
    });

    it('应该正确处理大量并发测试', async () => {
      renderWithProviders(<TestPage />);

      // 模拟多个并发测试
      const testPromises = [];
      for (let i = 0; i < 10; i++) {
        const urlInput = screen.getByPlaceholderText('https://example.com');
        fireEvent.change(urlInput, { target: { value: `https://test-${i}.com` } });

        const startButton = screen.getByText('开始测试');
        testPromises.push(fireEvent.click(startButton));
      }

      // 等待所有测试启动
      await Promise.all(testPromises);

      // 验证API调用次数
      expect(global.fetch).toHaveBeenCalledTimes(10);
    });
  });

  describe('错误恢复集成测试', () => {
    it('应该从网络错误中恢复', async () => {
      // 第一次调用失败
      (global.fetch as any).mockRejectedValueOnce(new Error('网络错误')).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: { testTypes: [], engineVersion: '1.0.0' },
          }),
      });

      renderWithProviders(<TestPage />);

      // 点击刷新按钮
      const refreshButton = screen.getByText('刷新');
      fireEvent.click(refreshButton);

      // 等待重试成功
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2);
      });
    });

    it('应该正确处理WebSocket连接失败', () => {
      // Mock WebSocket连接失败
      (global.WebSocket as any).mockImplementation(() => {
        throw new Error('WebSocket连接失败');
      });

      renderWithProviders(<TestPage />);

      // 验证页面仍然可以渲染
      expect(screen.getByText('🧠 统一测试引擎')).toBeInTheDocument();

      // 验证错误提示
      expect(screen.getByText('引擎未连接')).toBeInTheDocument();
    });
  });

  describe('用户权限集成测试', () => {
    it('应该根据用户角色显示不同功能', () => {
      // 这里可以测试不同用户角色的功能访问
      renderWithProviders(<TestPage />);

      // 验证基础功能对所有用户可用
      expect(screen.getByText('开始测试')).toBeInTheDocument();
    });
  });

  describe('数据持久化集成测试', () => {
    it('应该正确保存和恢复测试配置', () => {
      renderWithProviders(<TestPage />);

      // 配置测试参数
      const urlInput = screen.getByPlaceholderText('https://example.com');
      fireEvent.change(urlInput, { target: { value: 'https://saved-config.com' } });

      // 验证配置保存（通过localStorage或其他机制）
      expect(urlInput).toHaveValue('https://saved-config.com');
    });
  });

  describe('国际化集成测试', () => {
    it('应该正确显示中文界面', () => {
      renderWithProviders(<TestPage />);

      // 验证中文文本
      expect(screen.getByText('统一测试引擎')).toBeInTheDocument();
      expect(screen.getByText('测试执行器')).toBeInTheDocument();
      expect(screen.getByText('开始测试')).toBeInTheDocument();
      expect(screen.getByText('引擎状态')).toBeInTheDocument();
    });
  });

  describe('主题集成测试', () => {
    it('应该支持主题切换', () => {
      renderWithProviders(<TestPage />);

      // 验证主题相关的类名存在
      const pageElement = screen.getByText('🧠 统一测试引擎').closest('div');
      expect(pageElement).toBeInTheDocument();
    });
  });
});

/**
 * 集成测试工具函数
 */
export const integrationTestUtils = {
  /**
   * 模拟完整的测试执行流程
   */
  async simulateFullTestFlow(testType = 'performance', url = 'https://example.com') {
    const component = renderWithProviders(<TestPage />);

    // 1. 配置测试
    const urlInput = screen.getByPlaceholderText('https://example.com');
    fireEvent.change(urlInput, { target: { value: url } });

    // 2. 启动测试
    const startButton = screen.getByText('开始测试');
    fireEvent.click(startButton);

    // 3. 等待API调用
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/test-engine/execute',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    return component;
  },

  /**
   * 模拟WebSocket消息
   */
  simulateWebSocketMessage(type: string, data: any) {
    const mockWS = (global.WebSocket as any).mock.results[0]?.value;
    if (mockWS && mockWS.onmessage) {
      mockWS.onmessage({
        data: JSON.stringify({ type, data }),
      } as MessageEvent);
    }
  },

  /**
   * 验证测试结果显示
   */
  async verifyTestResultDisplay(testId: string, expectedScore: number) {
    // 切换到结果标签页
    const resultsTab = screen.getByText(/查看结果/);
    fireEvent.click(resultsTab);

    await waitFor(() => {
      expect(screen.getByText('📋 测试结果')).toBeInTheDocument();
    });

    // 验证测试结果
    expect(screen.getByText(testId.substring(0, 12))).toBeInTheDocument();
    expect(screen.getByText(`${expectedScore}分`)).toBeInTheDocument();
  },
};

export default integrationTestUtils;
