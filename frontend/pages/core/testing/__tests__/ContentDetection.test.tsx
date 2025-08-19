/**
 * ContentDetection组件单元测试
 * 
 * 测试内容检测页面的各种功能和用户交互
 * 
 * @author Test-Web Team
 * @since 1.0.0
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ContentDetection from '../ContentDetection';

// Mock antd components that might cause issues in tests
jest.mock('antd', () => {
  const antd = jest.requireActual('antd');
  return {
    ...antd,
    Progress: ({ percent, ...props }: any) => (
      <div data-testid="progress" data-percent={percent} {...props} />
    ),
    List: ({ dataSource, renderItem, ...props }: any) => (
      <div data-testid="list" {...props}>
        {dataSource?.map((item: any, index: number) => (
          <div key={index} data-testid="list-item">
            {renderItem ? renderItem(item, index) : JSON.stringify(item)}
          </div>
        ))}
      </div>
    )
  };
});

describe('ContentDetection组件', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('基本渲染', () => {
    it('应该正确渲染内容检测页面', () => {
      render(<ContentDetection />);
      
      expect(screen.getByText('内容安全检测')).toBeInTheDocument();
      expect(screen.getByText('全面的内容安全扫描，包括恶意内容检测、敏感信息扫描、内容质量分析和合规性检查。')).toBeInTheDocument();
    });

    it('应该显示检测配置选项卡', () => {
      render(<ContentDetection />);
      
      expect(screen.getByText('检测配置')).toBeInTheDocument();
      expect(screen.getByText('检测进度')).toBeInTheDocument();
      expect(screen.getByText('检测结果')).toBeInTheDocument();
    });

    it('应该显示配置表单', () => {
      render(<ContentDetection />);
      
      expect(screen.getByLabelText('网站URL')).toBeInTheDocument();
      expect(screen.getByLabelText('检测类型')).toBeInTheDocument();
      expect(screen.getByLabelText('检测深度')).toBeInTheDocument();
      expect(screen.getByLabelText('语言')).toBeInTheDocument();
      expect(screen.getByLabelText('超时时间(秒)')).toBeInTheDocument();
      expect(screen.getByLabelText('严格模式')).toBeInTheDocument();
    });
  });

  describe('表单交互', () => {
    it('应该允许用户输入URL', () => {
      render(<ContentDetection />);
      
      const urlInput = screen.getByLabelText('网站URL');
      fireEvent.change(urlInput, { target: { value: 'https://example.com' } });
      
      expect(urlInput).toHaveValue('https://example.com');
    });

    it('应该显示开始检测按钮', () => {
      render(<ContentDetection />);
      
      const startButton = screen.getByText('开始检测');
      expect(startButton).toBeInTheDocument();
      expect(startButton).not.toBeDisabled();
    });

    it('应该显示重置按钮', () => {
      render(<ContentDetection />);
      
      const resetButton = screen.getByText('重置');
      expect(resetButton).toBeInTheDocument();
    });
  });

  describe('检测执行', () => {
    it('应该在点击开始检测时启动检测', async () => {
      render(<ContentDetection />);
      
      // 输入URL
      const urlInput = screen.getByLabelText('网站URL');
      fireEvent.change(urlInput, { target: { value: 'https://example.com' } });
      
      // 点击开始检测
      const startButton = screen.getByText('开始检测');
      fireEvent.click(startButton);
      
      // 应该切换到进度选项卡
      await waitFor(() => {
        expect(screen.getByText('准备开始检测...')).toBeInTheDocument();
      });
    });

    it('应该在检测运行时显示进度', async () => {
      render(<ContentDetection />);
      
      // 输入URL并开始检测
      const urlInput = screen.getByLabelText('网站URL');
      fireEvent.change(urlInput, { target: { value: 'https://example.com' } });
      
      const startButton = screen.getByText('开始检测');
      fireEvent.click(startButton);
      
      // 应该显示进度
      await waitFor(() => {
        expect(screen.getByTestId('progress')).toBeInTheDocument();
      });
    });

    it('应该在检测完成时显示结果', async () => {
      render(<ContentDetection />);
      
      // 输入URL并开始检测
      const urlInput = screen.getByLabelText('网站URL');
      fireEvent.change(urlInput, { target: { value: 'https://example.com' } });
      
      const startButton = screen.getByText('开始检测');
      fireEvent.click(startButton);
      
      // 等待检测完成
      await waitFor(() => {
        expect(screen.getByText('检测概览')).toBeInTheDocument();
      }, { timeout: 10000 });
    });
  });

  describe('检测结果', () => {
    it('应该显示综合评分', async () => {
      render(<ContentDetection />);
      
      // 输入URL并开始检测
      const urlInput = screen.getByLabelText('网站URL');
      fireEvent.change(urlInput, { target: { value: 'https://example.com' } });
      
      const startButton = screen.getByText('开始检测');
      fireEvent.click(startButton);
      
      // 等待检测完成并检查评分
      await waitFor(() => {
        expect(screen.getByText('综合评分')).toBeInTheDocument();
        expect(screen.getByText('86')).toBeInTheDocument(); // 模拟评分
      }, { timeout: 10000 });
    });

    it('应该显示风险等级', async () => {
      render(<ContentDetection />);
      
      // 输入URL并开始检测
      const urlInput = screen.getByLabelText('网站URL');
      fireEvent.change(urlInput, { target: { value: 'https://example.com' } });
      
      const startButton = screen.getByText('开始检测');
      fireEvent.click(startButton);
      
      // 等待检测完成并检查风险等级
      await waitFor(() => {
        expect(screen.getByText('风险等级')).toBeInTheDocument();
        expect(screen.getByText('低风险')).toBeInTheDocument();
      }, { timeout: 10000 });
    });

    it('应该显示详细检测结果', async () => {
      render(<ContentDetection />);
      
      // 输入URL并开始检测
      const urlInput = screen.getByLabelText('网站URL');
      fireEvent.change(urlInput, { target: { value: 'https://example.com' } });
      
      const startButton = screen.getByText('开始检测');
      fireEvent.click(startButton);
      
      // 等待检测完成并检查详细结果
      await waitFor(() => {
        expect(screen.getByText('详细检测结果')).toBeInTheDocument();
        expect(screen.getByText('恶意内容检测')).toBeInTheDocument();
        expect(screen.getByText('敏感信息扫描')).toBeInTheDocument();
        expect(screen.getByText('内容质量分析')).toBeInTheDocument();
      }, { timeout: 10000 });
    });

    it('应该显示优化建议', async () => {
      render(<ContentDetection />);
      
      // 输入URL并开始检测
      const urlInput = screen.getByLabelText('网站URL');
      fireEvent.change(urlInput, { target: { value: 'https://example.com' } });
      
      const startButton = screen.getByText('开始检测');
      fireEvent.click(startButton);
      
      // 等待检测完成并检查优化建议
      await waitFor(() => {
        expect(screen.getByText('优化建议')).toBeInTheDocument();
      }, { timeout: 10000 });
    });

    it('应该显示导出按钮', async () => {
      render(<ContentDetection />);
      
      // 输入URL并开始检测
      const urlInput = screen.getByLabelText('网站URL');
      fireEvent.change(urlInput, { target: { value: 'https://example.com' } });
      
      const startButton = screen.getByText('开始检测');
      fireEvent.click(startButton);
      
      // 等待检测完成并检查导出按钮
      await waitFor(() => {
        expect(screen.getByText('导出结果')).toBeInTheDocument();
      }, { timeout: 10000 });
    });
  });

  describe('错误处理', () => {
    it('应该在URL为空时不启动检测', () => {
      render(<ContentDetection />);
      
      // 不输入URL直接点击开始检测
      const startButton = screen.getByText('开始检测');
      fireEvent.click(startButton);
      
      // 应该不会启动检测
      expect(screen.queryByText('准备开始检测...')).not.toBeInTheDocument();
    });
  });

  describe('重置功能', () => {
    it('应该在点击重置时清空表单', () => {
      render(<ContentDetection />);
      
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

  describe('检测类型选择', () => {
    it('应该允许选择不同的检测类型', () => {
      render(<ContentDetection />);
      
      const checkTypesSelect = screen.getByLabelText('检测类型');
      expect(checkTypesSelect).toBeInTheDocument();
    });

    it('应该允许选择检测深度', () => {
      render(<ContentDetection />);
      
      const depthSelect = screen.getByLabelText('检测深度');
      expect(depthSelect).toBeInTheDocument();
    });

    it('应该允许选择语言', () => {
      render(<ContentDetection />);
      
      const languageSelect = screen.getByLabelText('语言');
      expect(languageSelect).toBeInTheDocument();
    });

    it('应该允许设置严格模式', () => {
      render(<ContentDetection />);
      
      const strictModeSwitch = screen.getByLabelText('严格模式');
      expect(strictModeSwitch).toBeInTheDocument();
    });
  });
});
