/**
 * 🎯 统一测试引擎执行器组件 - 重构优化版本
 * 整合了UnifiedTestPanel、ModernUnifiedTestPanel、ModernTestRunner的功能
 * 提供完整的测试执行、监控和结果展示功能
 *
 * 重构特性：
 * - 整合多个重复组件的功能
 * - 统一的用户界面和交互
 * - 支持所有测试类型
 * - 提供向后兼容性
 * - 优化的性能和用户体验
 */

import Logger from '@/utils/logger';
import {
  BarChartOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  DownloadOutlined,
  ExclamationCircleOutlined,
  HistoryOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  SettingOutlined
} from '@ant-design/icons';
import {
  Badge,
  Button,
  Card,
  Col,
  Divider,
  Form, Input,
  Modal,
  Row,
  Select,
  Space,
  Statistic,
  Tabs,
  Timeline,
  Typography
} from 'antd';
import React, { useCallback, useState } from 'react';
import { useUnifiedTestEngine } from '../../hooks/useUnifiedTestEngine';
import { TestPriority, TestType } from '../../types/enums';
import type { TestResult } from '../../types/unifiedEngine.types';

// 导入专用子组件
import { TestHistoryPanel } from './shared/TestHistoryPanel';
import { TestProgressMonitor } from './shared/TestProgressMonitor';
import { TestResultsTable } from './shared/TestResultsTable';
import { TestStatsPanel } from './shared/TestStatsPanel';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

// Helper functions
const getTestTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    performance: '🚀 性能测试',
    security: '🔒 安全测试',
    api: '🔌 API测试',
    seo: '📊 SEO分析',
    stress: '⚡ 压力测试',
    compatibility: '🌍 兼容性测试'
  };
  return labels[type] || type;
};

const getScoreColor = (score: number): string => {
  if (score >= 80) return '#3f8600';
  if (score >= 60) return '#faad14';
  return '#cf1322';
};

// 扩展的Props接口 - 整合其他组件功能
interface UnifiedTestExecutorProps {
  className?: string;

  // 基础回调
  onTestComplete?: (testId: string, result: TestResult) => void;
  onTestError?: (error: Error) => void;

  // 整合ModernUnifiedTestPanel功能
  testType?: TestType;
  defaultConfig?: Partial<any>;
  showHistory?: boolean;
  showStats?: boolean;
  allowMultipleTests?: boolean;

  // 整合UnifiedTestPanel功能
  enableQueue?: boolean;
  enableWebSocket?: boolean;
  maxConcurrentTests?: number;

  // 整合ModernTestRunner功能
  showAdvancedOptions?: boolean;
  enableRealTimeMetrics?: boolean;
  enableExport?: boolean;

  // 扩展回调
  onTestStarted?: (data: any) => void;
  onTestProgress?: (data: any) => void;
  onConfigChange?: (config: any) => void;
}

/**
 * 统一测试引擎执行器组件
 */
export const UnifiedTestExecutor: React.FC<UnifiedTestExecutorProps> = ({
  className = '',
  testType: defaultTestType,
  defaultConfig = {},
  showHistory = true,
  showStats = true,
  allowMultipleTests = false,
  enableQueue = true,
  enableWebSocket = true,
  maxConcurrentTests = 3,
  showAdvancedOptions = false,
  enableRealTimeMetrics = true,
  enableExport = true,
  onTestComplete,
  onTestError,
  onTestStarted,
  onTestProgress,
  onConfigChange
}) => {
  const [form] = Form.useForm();
  const [selectedTestType, setSelectedTestType] = useState<TestType>(
    defaultTestType || TestType.PERFORMANCE
  );
  const [activeTab, setActiveTab] = useState<string>('config');
  const [selectedTestId, setSelectedTestId] = useState<string>('');
  const [showResultModal, setShowResultModal] = useState(false);

  // 整合其他组件的状态
  const [testHistory, setTestHistory] = useState<any[]>([]);
  const [testStatistics, setTestStatistics] = useState<any>(null);
  const [realTimeMetrics, setRealTimeMetrics] = useState<any>(null);

  // 使用统一测试引擎Hook
  const engine = useUnifiedTestEngine();

  // 当前选中测试的结果分析
  // Removed useTestResultAnalysis - not exported from module

  // 整合的功能方法

  /**
   * 加载测试历史 - 整合UnifiedTestPanel功能
   */
  const loadTestHistory = useCallback(async () => {
    try {
      const history = await engine.getTestHistory?.();
      if (history) {
        setTestHistory(history);
      }
    } catch (error) {
      Logger.error('加载测试历史失败:', error);
    }
  }, [engine, selectedTestType]);

  /**
   * 加载测试统计 - 整合ModernUnifiedTestPanel功能
   */
  const loadTestStatistics = useCallback(async () => {
    try {
      const stats = engine.getStats?.();
      if (stats) {
        setTestStatistics(stats);
      }
    } catch (error) {
      Logger.error('加载测试统计失败:', error);
    }
  }, [engine]);

  /**
   * 启动实时指标监控 - 整合ModernTestRunner功能
   */
  const startRealTimeMetrics = useCallback((testId: string) => {
    if (!enableRealTimeMetrics) return () => { };

    const interval = setInterval(async () => {
      try {
        /**
         * if功能函数
         * @param {Object} params - 参数对象
         * @returns {Promise<Object>} 返回结果
         */
        const status = await engine.getTestStatus?.(testId);
        if (status) {
          setRealTimeMetrics({
            progress: status.progress,
            currentStep: status.currentStep,
            timestamp: Date.now()
          });
        }
      } catch (error) {
        Logger.error('获取实时指标失败:', error);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [engine, enableRealTimeMetrics]);

  // 组件初始化 - 整合其他组件的初始化逻辑
  React.useEffect(() => {
    // 初始化表单默认值
    if (defaultConfig && Object.keys(defaultConfig).length > 0) {
      form.setFieldsValue(defaultConfig);
    }

    // 加载初始数据
    if (showHistory) {
      loadTestHistory();
    }
    if (showStats) {
      loadTestStatistics();
    }

    // 连接WebSocket
    if (enableWebSocket) {
      engine.connectWebSocket?.();
    }
  }, [form, defaultConfig, showHistory, showStats, enableWebSocket, engine, loadTestHistory, loadTestStatistics]);

  // 监听测试进度更新
  React.useEffect(() => {
    if (enableRealTimeMetrics && selectedTestId) {
      const cleanup = startRealTimeMetrics(selectedTestId);
      return cleanup;
    }
    return undefined;
  }, [selectedTestId, enableRealTimeMetrics, startRealTimeMetrics]);

  /**
   * 执行测试 - 整合所有组件的测试执行逻辑
   */
  const handleExecuteTest = useCallback(async () => {
    try {
      const values = await form.validateFields();

      // 合并默认配置
      const finalConfig = { ...defaultConfig, ...values };

      const testId = await engine.executeTest?.({
        testType: selectedTestType,
        config: finalConfig,
        options: {
          priority: TestPriority.MEDIUM,
          tags: [selectedTestType, 'unified-engine', 'web-ui']
        }
      });

      if (!testId) {
        throw new Error('测试启动失败');
      }

      Logger.debug(`🚀 测试已启动: ${testId}`);

      // 触发回调
      onTestStarted?.({ testId, config: finalConfig });
      onConfigChange?.(finalConfig);

      // 切换到监控标签页
      setActiveTab('monitor');

      // 订阅测试更新
      engine.subscribeToTest?.(testId, (data) => {
        onTestProgress?.(data);
      });

      // 启动实时监控
      if (enableRealTimeMetrics) {
        startRealTimeMetrics(testId);
      }

    } catch (error) {
      Logger.error('测试执行失败:', error);
      onTestError?.(error as Error);
    }
  }, [form, engine, selectedTestType, defaultConfig, onTestError, onTestStarted, onConfigChange, enableRealTimeMetrics, startRealTimeMetrics]);

  /**
   * 查看测试结果
   */
  const handleViewResult = useCallback((testId: string) => {
    setSelectedTestId(testId);
    setShowResultModal(true);
  }, []);

  /**
   * 导出测试结果 - 整合ModernTestRunner功能
   */
  const handleExportResult = useCallback(async (testId: string, format: 'json' | 'csv' | 'pdf') => {
    if (!enableExport) return;

    try {
      const result = await engine.getTestResult?.(testId);
      if (result) {
        // 创建下载链接
        const dataStr = format === 'json' ?
          JSON.stringify(result, null, 2) :
          `测试ID,测试类型,分数,持续时间\n${testId},${result.testType},${result.overallScore},${result.duration}`;

        const dataBlob = new Blob([dataStr], { type: format === 'json' ? 'application/json' : 'text/csv' });
        const url = URL.createObjectURL(dataBlob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `test-result-${testId}.${format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      Logger.error('导出测试结果失败:', error);
      onTestError?.(error as Error);
    }
  }, [engine, enableExport, onTestError]);

  /**
   * 批量操作 - 整合UnifiedTestPanel功能
   */
  const _handleBatchCancel = useCallback(async () => {
    try {
      await engine.cancelAllTests?.();
      Logger.debug('✅ 已取消所有运行中的测试');
    } catch (error) {
      Logger.error('批量取消失败:', error);
      onTestError?.(error as Error);
    }
  }, [engine, onTestError]);

  const handleClearHistory = useCallback(() => {
    engine.clearCompletedTests?.();
    setTestHistory([]);
    Logger.debug('✅ 已清理测试历史');
  }, [engine]);

  /**
   * 渲染测试配置表单
   */
  const renderConfigForm = () => (
    <Card title="🔧 测试配置" className="mb-4">
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          url: 'https://example.com',
          testType: selectedTestType
        }}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="测试类型"
              name="testType"
              rules={[{ required: true, message: '请选择测试类型' }]}
            >
              <Select
                value={selectedTestType}
                onChange={setSelectedTestType}
                loading={false}
              >
                {engine.supportedTypes?.map(type => (
                  <Option key={type} value={type}>
                    {getTestTypeLabel(type)}
                  </Option>
                )) || []}
              </Select>
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              label="目标URL"
              name="url"
              rules={[
                { required: true, message: '请输入目标URL' },
                { type: 'url', message: '请输入有效的URL' }
              ]}
            >
              <Input
                placeholder="https://example.com"
                prefix="🌐"
              />
            </Form.Item>
          </Col>
        </Row>

        {renderTestTypeSpecificFields()}

        <Divider />

        <Form.Item>
          <Space>
            <Button
              type="primary"
              size="large"
              icon={<PlayCircleOutlined />}
              onClick={handleExecuteTest}
              loading={engine.executingTest}
              disabled={!engine.isConnected}
            >
              开始测试
            </Button>

            <Button
              icon={<ReloadOutlined />}
              onClick={() => engine.fetchSupportedTypes?.()}
              loading={false}
            >
              刷新引擎
            </Button>

            <Button
              icon={<DeleteOutlined />}
              onClick={() => engine.clearCompletedTests?.()}
              disabled={engine.getStats?.().completedTests === 0}
            >
              清理历史
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );

  /**
   * 渲染测试类型特定字段
   */
  const renderTestTypeSpecificFields = () => {
    switch (selectedTestType) {
      case 'performance':
        return (
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="设备类型" name="device">
                <Select defaultValue="desktop">
                  <Option value="desktop">🖥️ 桌面端</Option>
                  <Option value="mobile">📱 移动端</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="网络限制" name="throttling">
                <Select defaultValue="simulated3G">
                  <Option value="none">🚀 无限制</Option>
                  <Option value="simulated3G">📶 模拟3G</Option>
                  <Option value="applied3G">📶 真实3G</Option>
                  <Option value="applied4G">📶 真实4G</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="语言" name="locale">
                <Select defaultValue="zh-CN">
                  <Option value="zh-CN">🇨🇳 中文</Option>
                  <Option value="en-US">🇺🇸 English</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
        );

      case 'stress':
        return (
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="并发用户数"
                name="users"
                rules={[{ required: true, message: '请输入并发用户数' }]}
              >
                <Input
                  type="number"
                  min={1}
                  max={1000}
                  placeholder="100"
                  addonAfter="用户"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="测试时长"
                name="duration"
                rules={[{ required: true, message: '请输入测试时长' }]}
              >
                <Input
                  type="number"
                  min={10}
                  max={3600}
                  placeholder="300"
                  addonAfter="秒"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="测试类型" name="stressType">
                <Select defaultValue="load">
                  <Option value="load">📈 负载测试</Option>
                  <Option value="stress">⚡ 压力测试</Option>
                  <Option value="spike">🚀 峰值测试</Option>
                  <Option value="volume">📊 容量测试</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
        );

      case 'api':
        return (
          <Form.Item label="API端点配置" name="endpoints">
            <Input.TextArea
              rows={6}
              placeholder={`请输入API端点配置（JSON格式）：
[
  {
    "id": "test1",
    "name": "获取用户信息",
    "method": "GET",
    "path": "/api/users/1"
  }
]`}
            />
          </Form.Item>
        );

      case 'security':
        return (
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="扫描深度" name="scanDepth">
                <Select defaultValue={3}>
                  <Option value={1}>🔍 浅层扫描</Option>
                  <Option value={3}>🔍 标准扫描</Option>
                  <Option value={5}>🔍 深度扫描</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="超时时间" name="timeout">
                <Select defaultValue={30000}>
                  <Option value={15000}>⏱️ 15秒</Option>
                  <Option value={30000}>⏱️ 30秒</Option>
                  <Option value={60000}>⏱️ 60秒</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
        );

      default:
        return null;
    }
  };

  /**
   * 渲染引擎状态
   */
  const renderEngineStatus = () => {
    const stats = engine.getStats?.() || { runningTests: 0, completedTests: 0, failedTests: 0, totalTests: 0 };

    return (
      <Card title="🚀 引擎状态" className="mb-4">
        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title="连接状态"
              value={engine.isConnected ? '已连接' : '未连接'}
              valueStyle={{
                color: engine.isConnected ? '#3f8600' : '#cf1322',
                fontSize: '16px'
              }}
              prefix={
                <Badge
                  status={engine.isConnected ? 'success' : 'error'}
                />
              }
            />
          </Col>

          <Col span={6}>
            <Statistic
              title="运行中测试"
              value={stats.runningTests}
              valueStyle={{ color: '#1890ff' }}
              prefix={<ClockCircleOutlined />}
            />
          </Col>

          <Col span={6}>
            <Statistic
              title="已完成测试"
              value={stats.completedTests}
              valueStyle={{ color: '#3f8600' }}
              prefix={<CheckCircleOutlined />}
            />
          </Col>

          <Col span={6}>
            <Statistic
              title="失败测试"
              value={stats.failedTests}
              valueStyle={{ color: '#cf1322' }}
              prefix={<ExclamationCircleOutlined />}
            />
          </Col>
        </Row>

        {engine.engineVersion && (
          <div className="mt-4">
            <Text type="secondary">引擎版本: {engine.engineVersion}</Text>
          </div>
        )}
      </Card>
    );
  };

  /**
   * 渲染测试监控 - 使用专用子组件
   */
  const renderTestMonitor = () => {
    return (
      <TestProgressMonitor
        activeTests={engine.activeTests}
        realTimeMetrics={realTimeMetrics}
        onStopTest={() => engine.cancelTest()}
        onCancelTest={() => engine.cancelTest()}
        className="mb-4"
      />
    );
  };

  /**
   * 渲染统计面板 - 使用专用子组件
   */
  const renderStatsPanel = () => {
    if (!showStats) return null;

    const stats = engine.getStats?.() || { runningTests: 0, completedTests: 0, failedTests: 0, totalTests: 0 };

    return (
      <TestStatsPanel
        stats={stats}
        className="mb-4"
      />
    );
  };

  /**
   * 渲染历史记录面板 - 使用专用子组件
   */
  const renderHistoryPanel = () => {
    if (!showHistory) return null;

    return (
      <TestHistoryPanel
        testHistory={testHistory}
        onViewResult={handleViewResult}
        onExportResult={enableExport ? handleExportResult : undefined}
        onClearHistory={handleClearHistory}
        enableExport={enableExport}
        className="mb-4"
      />
    );
  };

  /**
   * 渲染测试结果列表 - 使用专用子组件
   */
  const renderTestResults = () => {
    // Convert array to Map for TestResultsTable
    const testResultsMap = new Map<string, TestResult>();
    ((engine.testResults ?? []) as any[]).forEach((result: any) => {
      if (result.testId) {
        testResultsMap.set(result.testId, result);
      }
    });
    
    return (
      <TestResultsTable
        testResults={testResultsMap}
        onViewResult={handleViewResult}
        onDownloadResult={enableExport ? (result: TestResult) => downloadResult(result) : undefined}
        enableExport={enableExport}
        className="mb-4"
      />
    );
  };

  /**
   * 渲染结果详情模态框
   */
  const renderResultModal = () => {
    const selectedResult = (engine.testResults ?? []).find((r: any) => r.testId === selectedTestId);
    
    return (
      <Modal
        title="📊 测试结果详情"
        open={showResultModal}
        onCancel={() => setShowResultModal(false)}
        width={800}
        footer={[
          <Button key="download" icon={<DownloadOutlined />}>
            下载报告
          </Button>,
          <Button key="close" onClick={() => setShowResultModal(false)}>
            关闭
          </Button>
        ]}
      >
        {selectedResult && (
          <div>
            <Row gutter={16} className="mb-4">
              <Col span={8}>
                <Statistic
                  title="总体评分"
                  value={selectedResult.overallScore || 0}
                  suffix="分"
                  valueStyle={{
                    color: getScoreColor(selectedResult.overallScore || 0),
                    fontSize: '24px'
                  }}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="测试时长"
                  value={(selectedResult.duration / 1000 || 0).toFixed(1)}
                  suffix="秒"
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="建议数量"
                  value={selectedResult.recommendations?.length || 0}
                  suffix="条"
                />
              </Col>
            </Row>

            {selectedResult.recommendations && selectedResult.recommendations.length > 0 && (
              <div>
                <Title level={5}>🎯 优化建议</Title>
                <Timeline>
                  {selectedResult.recommendations.map((rec: any, index: number) => (
                    <Timeline.Item key={index} color={rec.priority === 'high' ? 'red' : rec.priority === 'medium' ? 'orange' : 'blue'}>
                      <Text strong>{rec.title}:</Text> {rec.description}
                    </Timeline.Item>
                  ))}
                </Timeline>
              </div>
            )}
          </div>
        )}
      </Modal>
    );
  };

  /**
   * 下载测试结果
   */
  const downloadResult = useCallback((result: TestResult) => {
    const dataStr = JSON.stringify(result, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `test-result-${result.testId}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, []);

  return (
    <div className={`unified-test-executor ${className}`}>
      {renderEngineStatus()}

      {/* 整合的统计面板 */}
      {showStats && renderStatsPanel()}

      {/* 整合的历史记录面板 */}
      {showHistory && renderHistoryPanel()}

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'config',
            label: (
              <span>
                <SettingOutlined />
                配置测试
              </span>
            ),
            children: renderConfigForm()
          },
          {
            key: 'monitor',
            label: (
              <span>
                <ClockCircleOutlined />
                监控进度 ({engine.getStats?.().runningTests ?? 0})
              </span>
            ),
            children: renderTestMonitor()
          },
          {
            key: 'results',
            label: (
              <span>
                <BarChartOutlined />
                查看结果 ({engine.getStats?.().totalTests ?? 0})
              </span>
            ),
            children: renderTestResults()
          },
          // 整合的新标签页
          ...(showStats ? [{
            key: 'stats',
            label: (
              <span>
                <BarChartOutlined />
                统计信息
              </span>
            ),
            children: renderStatsPanel()
          }] : []),
          ...(showHistory ? [{
            key: 'history',
            label: (
              <span>
                <HistoryOutlined />
                测试历史
              </span>
            ),
            children: renderHistoryPanel()
          }] : [])
        ]}
      />

      {renderResultModal()}
    </div>
  );
};

/**
 * 工具函数
 */
const _getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    pending: 'blue',
    running: 'orange',
    completed: 'green',
    failed: 'red',
    cancelled: 'gray'
  };
  return colors[status] || 'default';
};

const _getStatusText = (status: string): string => {
  const texts: Record<string, string> = {
    pending: '等待中',
    running: '运行中',
    completed: '已完成',
    failed: '失败',
    cancelled: '已取消'
  };
  return texts[status] || status;
};

export default UnifiedTestExecutor;

