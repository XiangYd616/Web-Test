import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TestPageTemplate } from '../UnifiedTestPageTemplate';

// Mock services
jest.mock('../../../services/testService', () => ({
  testService: {
    onProgress: jest.fn(),
    onResult: jest.fn(),
  },
}));

jest.mock('../../../services/configService', () => ({
  configService: {
    getDefaultConfig: jest.fn().mockResolvedValue({}),
  },
}));

describe('UnifiedTestPageTemplate', () => {
  const defaultProps = {
    testType: 'api',
    testName: 'API测试',
    onTestStart: jest.fn(),
    onTestStop: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with correct title and test type', () => {
    render(<UnifiedTestPageTemplate {...defaultProps} />);

    expect(screen.getByText('API测试')).toBeInTheDocument();
    expect(screen.getByText('API')).toBeInTheDocument();
  });

  it('renders all tab navigation items', () => {
    render(<UnifiedTestPageTemplate {...defaultProps} />);

    expect(screen.getByText('配置')).toBeInTheDocument();
    expect(screen.getByText('进度')).toBeInTheDocument();
    expect(screen.getByText('结果')).toBeInTheDocument();
    expect(screen.getByText('历史')).toBeInTheDocument();
  });

  it('switches tabs correctly', () => {
    render(<UnifiedTestPageTemplate {...defaultProps} />);

    // Default tab should be 'config'
    expect(screen.getByText('配置')).toHaveClass('border-blue-500');

    // Click on progress tab
    fireEvent.click(screen.getByText('进度'));
    expect(screen.getByText('进度')).toHaveClass('border-blue-500');

    // Click on results tab
    fireEvent.click(screen.getByText('结果'));
    expect(screen.getByText('结果')).toHaveClass('border-blue-500');

    // Click on history tab
    fireEvent.click(screen.getByText('历史'));
    expect(screen.getByText('历史')).toHaveClass('border-blue-500');
  });

  it('calls onTestStart when start button is clicked', async () => {
    const mockOnTestStart = jest.fn().mockResolvedValue('test-id-123');

    render(
      <UnifiedTestPageTemplate
        {...defaultProps}
        onTestStart={mockOnTestStart}
      />
    );

    const startButton = screen.getByText('开始测试');
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(mockOnTestStart).toHaveBeenCalledTimes(1);
    });
  });

  it('shows loading state during test execution', async () => {
    const mockOnTestStart = jest.fn().mockImplementation(() =>
      new Promise(resolve => setTimeout(() => resolve('test-id-123'), 100))
    );

    render(
      <UnifiedTestPageTemplate
        {...defaultProps}
        onTestStart={mockOnTestStart}
      />
    );

    const startButton = screen.getByText('开始测试');
    fireEvent.click(startButton);

    // Should show loading state
    expect(screen.getByText('测试进行中...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('停止测试')).toBeInTheDocument();
    });
  });

  it('calls onTestStop when stop button is clicked', async () => {
    const mockOnTestStart = jest.fn().mockResolvedValue('test-id-123');
    const mockOnTestStop = jest.fn().mockResolvedValue(undefined);

    render(
      <UnifiedTestPageTemplate
        {...defaultProps}
        onTestStart={mockOnTestStart}
        onTestStop={mockOnTestStop}
      />
    );

    // Start test first
    fireEvent.click(screen.getByText('开始测试'));

    await waitFor(() => {
      expect(screen.getByText('停止测试')).toBeInTheDocument();
    });

    // Stop test
    fireEvent.click(screen.getByText('停止测试'));

    await waitFor(() => {
      expect(mockOnTestStop).toHaveBeenCalledWith('test-id-123');
    });
  });

  it('renders custom config panel when provided', () => {
    const CustomConfigPanel = () => <div data-testid="custom-config">Custom Config</div>;

    render(
      <UnifiedTestPageTemplate
        {...defaultProps}
        customConfigPanel={<CustomConfigPanel />}
      />
    );

    expect(screen.getByTestId('custom-config')).toBeInTheDocument();
  });

  it('renders custom results panel when provided', () => {
    const CustomResultsPanel = () => <div data-testid="custom-results">Custom Results</div>;

    render(
      <UnifiedTestPageTemplate
        {...defaultProps}
        customResultsPanel={<CustomResultsPanel />}
      />
    );

    // Switch to results tab
    fireEvent.click(screen.getByText('结果'));

    expect(screen.getByTestId('custom-results')).toBeInTheDocument();
  });

  it('renders children content', () => {
    render(
      <UnifiedTestPageTemplate {...defaultProps}>
        <div data-testid="children-content">Additional Content</div>
      </UnifiedTestPageTemplate>
    );

    expect(screen.getByTestId('children-content')).toBeInTheDocument();
  });

  it('displays correct test status', async () => {
    render(<UnifiedTestPageTemplate {...defaultProps} />);

    // Initial status
    expect(screen.getByText('准备就绪')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(
      <UnifiedTestPageTemplate
        {...defaultProps}
        className="custom-test-class"
      />
    );

    const container = screen.getByText('API测试').closest('.min-h-screen');
    expect(container).toHaveClass('custom-test-class');
  });
});
