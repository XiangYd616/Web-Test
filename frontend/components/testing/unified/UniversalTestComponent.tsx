/**
 * 通用测试组件 - 统一重构版本
 * 
 * 整合功能：
 * - TestRunner.tsx 的测试运行功能
 * - UnifiedTestExecutor.tsx 的统一执行功能
 * - ModernTestRunner 的现代化界面
 * - UnifiedTestPanel 的面板功能
 * 
 * 设计目标：
 * - 消除重复组件
 * - 提供统一的测试界面
 * - 支持所有测试类型
 * - 现代化的用户体验
 * - 保持向后兼容性
 */

import Logger from '@/utils/logger';
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Card,
  Button,
  Input,
  Select,
  Space,
  Typography,
  Progress,
  Table,
  Tabs,
  Modal,
  Form,
  Row,
  Col,
  Statistic,
  Badge,
  Divider,
  Timeline,
  Alert,
  Tooltip,
  Drawer
} from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  StopOutlined,
  ReloadOutlined,
  SettingOutlined,
  HistoryOutlined,
  BarChartOutlined,
  DownloadOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';

// 导入统一的Hook和类型
import { useCoreTestEngine } from '../../../hooks/useCoreTestEngine';
import { useNotification } from '../../../hooks/useNotification';
import {
  TestType,
  TestTypeEnum,
  TestConfig,
  TestResult,
  BaseTestConfig
} from '../../../types/api';

// 测试进度接口
interface TestProgress {
  percentage: number;
  currentStep?: string;
  completedSteps: string[];
  totalSteps: number;
  startTime: string;
  estimatedEndTime?: string;
}

// 导入子组件
import { TestConfigForm } from '../shared/TestConfigForm';
import { TestResultsViewer } from '../shared/TestResultsViewer';
import { TestHistoryPanel } from '../shared/TestHistoryPanel';
import { TestStatsPanel } from '../shared/TestStatsPanel';
import { TestProgressMonitor } from '../shared/TestProgressMonitor';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

// 组件属性接口
export interface UniversalTestComponentProps {
  // 基础配置
  testType?: TestType;
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  className?: string;

  // 默认配置
  defaultConfig?: Partial<TestConfig>;
  defaultUrl?: string;

  // 功能开关
  showHistory?: boolean;
  showStats?: boolean;
  showAdvancedOptions?: boolean;
  showRealTimeMetrics?: boolean;
  enableQueue?: boolean;
  enableWebSocket?: boolean;
  enableExport?: boolean;
  allowMultipleTests?: boolean;

  // 限制配置
  maxConcurrentTests?: number;
  defaultTimeout?: number;

  // 回调函数
  onTestStart?: (config: TestConfig) => void;
  onTestComplete?: (result: TestResult) => void;
  onTestError?: (error: string) => void;
  onTestProgress?: (progress: TestProgress) => void;
  onConfigChange?: (config: TestConfig) => void;
}

// 测试类型选项
const TEST_TYPE_OPTIONS = [
  { value: TestTypeEnum.PERFORMANCE, label: '🚀 性能测试', color: '#1890ff' },
  { value: TestTypeEnum.SECURITY, label: '🔒 安全测试', color: '#f5222d' },
  { value: 'seo', label: '📊 SEO分析', color: '#52c41a' },
  { value: TestTypeEnum.API, label: '🔌 API测试', color: '#13c2c2' },
  { value: TestTypeEnum.STRESS, label: '⚡ 压力测试', color: '#faad14' },
  { value: TestTypeEnum.COMPATIBILITY, label: '🌍 兼容性测试', color: '#722ed1' },
  { value: TestTypeEnum.ACCESSIBILITY, label: '♿ 可访问性测试', color: '#eb2f96' },
  { value: TestTypeEnum.UX, label: '🎨 用户体验测试', color: '#fa8c16' },
  { value: TestTypeEnum.NETWORK, label: '🌐 网络测试', color: '#096dd9' },
  { value: TestTypeEnum.DATABASE, label: '🗄️ 数据库测试', color: '#389e0d' }
];

// 获取测试类型配置
const getTestTypeConfig = (testType: TestType) => {
  return TEST_TYPE_OPTIONS.find(option => option.value === testType) || TEST_TYPE_OPTIONS[0];
};

// 状态颜色映射
const STATUS_COLORS = {
  running: '#1890ff',
  completed: '#52c41a',
  failed: '#f5222d',
  cancelled: '#8c8c8c',
  pending: '#faad14'
};

// 获取分数颜色
const getScoreColor = (score: number): string => {
  if (score >= 80) return '#3f8600';
  if (score >= 60) return '#faad14';
  return '#cf1322';
};

/**
 * 通用测试组件
 */
export const UniversalTestComponent: React.FC<UniversalTestComponentProps> = ({
  testType: defaultTestType = TestTypeEnum.PERFORMANCE,
  title,
  description,
  icon,
  className = '',
  defaultConfig = {},
  defaultUrl = '',
  showHistory = true,
  showStats = true,
  showAdvancedOptions = false,
  showRealTimeMetrics = true,
  enableQueue = true,
  enableWebSocket = true,
  enableExport = true,
  allowMultipleTests = false,
  maxConcurrentTests = 3,
  defaultTimeout = 300000,
  onTestStart,
  onTestComplete,
  onTestError,
  onTestProgress,
  onConfigChange
}) => {
  const [form] = Form.useForm();
  const { showNotification } = useNotification();

  // 组件状态
  const [selectedTestType, setSelectedTestType] = useState<TestType>(defaultTestType);
  const [activeTab, setActiveTab] = useState<string>('config');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [selectedResult, setSelectedResult] = useState<TestResult | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);

  // 使用核心测试引擎Hook
  const engine = useCoreTestEngine({
    testType: selectedTestType,
    defaultConfig: {
      name: `${getTestTypeConfig(selectedTestType).label}`,
      type: selectedTestType,
      url: defaultUrl,
      options: {},
      ...defaultConfig
    },
    maxConcurrentTests,
    defaultTimeout,
    enableQueue,
    enableWebSocket,
    onTestComplete: (result) => {
      showNotification('测试完成', 'success');
      onTestComplete?.(result);
    },
    onTestError: (error) => {
      showNotification(`测试失败: ${error}`, 'error');
      onTestError?.(error);
    },
    onTestStarted: () => {
      showNotification('测试已启动', 'info');
    },
    onTestProgress,
    onConfigChange
  });

  // 当前测试类型配置
  const currentTestTypeConfig = useMemo(() => {
    return getTestTypeConfig(selectedTestType);
  }, [selectedTestType]);

  // 表单初始值
  const initialValues = useMemo(() => ({
    url: defaultUrl || engine.config.url,
    testType: selectedTestType,
    ...engine.config.options
  }), [defaultUrl, engine.config, selectedTestType]);

  // 处理配置变更
  const handleConfigChange = useCallback(() => {
    const values = form.getFieldsValue();
    const newConfig: TestConfig = {
      name: `${currentTestTypeConfig.label} - ${new Date().toLocaleString()}`,
      type: selectedTestType,
      url: values.url || '',
      options: {
        ...values,
        testType: selectedTestType
      }
    };
    
    engine.setConfig(newConfig);
    onConfigChange?.(newConfig);
  }, [form, selectedTestType, currentTestTypeConfig, engine, onConfigChange]);

  // 开始测试
  const handleStartTest = useCallback(async () => {
    try {
      await form.validateFields();
      const values = form.getFieldsValue();
      
      const testConfig: TestConfig = {
        name: `${currentTestTypeConfig.label} - ${new Date().toLocaleString()}`,
        type: selectedTestType,
        url: values.url,
        options: {
          ...values,
          testType: selectedTestType
        }
      };

      onTestStart?.(testConfig);
      await engine.startTest(testConfig);
      setActiveTab('progress');
    } catch (error) {
      if (error.errorFields) {
        showNotification('请检查表单配置', 'warning');
      } else {
        Logger.error('启动测试失败:', error);
      }
    }
  }, [form, selectedTestType, currentTestTypeConfig, engine, onTestStart, showNotification]);

  // 停止测试
  const handleStopTest = useCallback(async () => {
    try {
      await engine.stopTest();
      showNotification('测试已停止', 'info');
    } catch (error) {
      Logger.error('停止测试失败:', error);
    }
  }, [engine, showNotification]);

  // 重新运行测试
  const handleRetryTest = useCallback(async () => {
    try {
      await handleStartTest();
    } catch (error) {
      Logger.error('重试测试失败:', error);
    }
  }, [handleStartTest]);

  // 导出结果
  const handleExportResult = useCallback(async (testId: string, format: 'json' | 'pdf' | 'csv' = 'json') => {
    try {
      const blob = await engine.exportTestResult(testId, format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `test-result-${testId}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showNotification('结果导出成功', 'success');
    } catch (error) {
      showNotification('导出失败', 'error');
      Logger.error('导出结果失败:', error);
    }
  }, [engine, showNotification]);

  // 查看测试结果详情
  const handleViewResult = useCallback((result: TestResult) => {
    setSelectedResult(result);
    setShowResultModal(true);
  }, []);

  // 删除测试结果
  const handleDeleteResult = useCallback((resultId: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个测试结果吗？',
      onOk: () => {
        // 这里应该调用删除API
        showNotification('结果已删除', 'success');
      }
    });
  }, [showNotification]);

  // 渲染配置表单
  const renderConfigForm = () => (
    <Card title="测试配置" className="mb-4">
      <Form
        form={form}
        layout="vertical"
        initialValues={initialValues}
        onValuesChange={handleConfigChange}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="testType"
              label="测试类型"
              rules={[{ required: true, message: '请选择测试类型' }]}
            >
              <Select
                value={selectedTestType}
                onChange={setSelectedTestType}
                placeholder="选择测试类型"
              >
                {TEST_TYPE_OPTIONS.map(option => (
                  <Option key={option.value} value={option.value}>
                    <Badge color={option.color} text={option.label} />
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="url"
              label="测试URL"
              rules={[
                { required: true, message: '请输入测试URL' },
                { type: 'url', message: '请输入有效的URL' }
              ]}
            >
              <Input 
                placeholder="https://example.com"
                prefix={currentTestTypeConfig.label.split(' ')[0]}
              />
            </Form.Item>
          </Col>
        </Row>

        {/* 高级选项 */}
        {showAdvancedOptions && (
          <TestConfigForm
            testType={selectedTestType}
            form={form}
            onChange={handleConfigChange}
          />
        )}
      </Form>
    </Card>
  );

  // 渲染操作按钮
  const renderActionButtons = () => (
    <Card className="mb-4">
      <Space size="middle">
        <Button
          type="primary"
          icon={<PlayCircleOutlined />}
          onClick={handleStartTest}
          loading={engine.isRunning}
          disabled={engine.isRunning || !engine.isConfigValid}
        >
          {engine.isRunning ? '测试中...' : '开始测试'}
        </Button>

        {engine.isRunning && (
          <Button
            icon={<StopOutlined />}
            onClick={handleStopTest}
            danger
          >
            停止测试
          </Button>
        )}

        <Button
          icon={<ReloadOutlined />}
          onClick={handleRetryTest}
          disabled={engine.isRunning}
        >
          重新运行
        </Button>

        <Button
          icon={<SettingOutlined />}
          onClick={() => setShowSettingsModal(true)}
        >
          高级设置
        </Button>

        {showHistory && (
          <Button
            icon={<HistoryOutlined />}
            onClick={() => setShowHistoryDrawer(true)}
          >
            测试历史
          </Button>
        )}

        {showStats && (
          <Button
            icon={<BarChartOutlined />}
            onClick={() => setActiveTab('stats')}
          >
            统计信息
          </Button>
        )}
      </Space>
    </Card>
  );

  // 渲染进度监控
  const renderProgressMonitor = () => {
    if (!engine.isRunning && !engine.currentProgress) {
      return (
        <Card title="测试状态" className="mb-4">
          <div className="text-center py-8">
            <Text type="secondary">暂无运行中的测试</Text>
          </div>
        </Card>
      );
    }

    return (
      <TestProgressMonitor
        isRunning={engine.isRunning}
        progress={engine.progress}
        currentStep={engine.currentTest}
        testId={engine.state.testId}
        enableRealTime={showRealTimeMetrics}
        onCancel={() => engine.stopTest()}
      />
    );
  };

  // 渲染结果表格
  const renderResultsTable = () => {
    const columns = [
      {
        title: '测试ID',
        dataIndex: 'id',
        key: 'id',
        width: 120,
        render: (id: string) => (
          <Text code copyable={{ text: id }}>
            {id.substring(0, 8)}...
          </Text>
        )
      },
      {
        title: '测试类型',
        dataIndex: 'type',
        key: 'type',
        width: 120,
        render: (type: string) => {
          const config = getTestTypeConfig(type as TestType);
          return <Badge color={config.color} text={config.label} />;
        }
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        width: 100,
        render: (status: string) => (
          <Badge
            color={STATUS_COLORS[status] || '#8c8c8c'}
            text={status}
          />
        )
      },
      {
        title: '得分',
        dataIndex: 'score',
        key: 'score',
        width: 100,
        render: (score: number) => score ? (
          <Text style={{ color: getScoreColor(score) }}>
            {score}
          </Text>
        ) : '-'
      },
      {
        title: '开始时间',
        dataIndex: 'startTime',
        key: 'startTime',
        width: 150,
        render: (time: string) => new Date(time).toLocaleString()
      },
      {
        title: '持续时间',
        dataIndex: 'duration',
        key: 'duration',
        width: 100,
        render: (duration: number) => duration ? `${Math.round(duration / 1000)}s` : '-'
      },
      {
        title: '操作',
        key: 'actions',
        width: 150,
        render: (_, record: TestResult) => (
          <Space size="small">
            <Tooltip title="查看详情">
              <Button
                type="link"
                size="small"
                onClick={() => handleViewResult(record)}
              >
                查看
              </Button>
            </Tooltip>
            {enableExport && (
              <Tooltip title="导出结果">
                <Button
                  type="link"
                  size="small"
                  icon={<DownloadOutlined />}
                  onClick={() => handleExportResult(record.id)}
                />
              </Tooltip>
            )}
            <Tooltip title="删除">
              <Button
                type="link"
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleDeleteResult(record.id)}
              />
            </Tooltip>
          </Space>
        )
      }
    ];

    return (
      <Card title="测试结果" className="mb-4">
        <Table
          columns={columns}
          dataSource={engine.results}
          rowKey="id"
          size="small"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`
          }}
        />
      </Card>
    );
  };

  // 渲染统计面板
  const renderStatsPanel = () => {
    const stats = engine.getStats();
    
    return (
      <div>
        <Row gutter={16} className="mb-4">
          <Col span={6}>
            <Card>
              <Statistic
                title="总测试数"
                value={stats.totalTests}
                prefix={<BarChartOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="运行中"
                value={stats.runningTests}
                valueStyle={{ color: '#1890ff' }}
                prefix={<ClockCircleOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="已完成"
                value={stats.completedTests}
                valueStyle={{ color: '#3f8600' }}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="失败"
                value={stats.failedTests}
                valueStyle={{ color: '#cf1322' }}
                prefix={<ExclamationCircleOutlined />}
              />
            </Card>
          </Col>
        </Row>
        
        {showStats && <TestStatsPanel stats={stats} />}
      </div>
    );
  };

  // 渲染主要内容
  const renderMainContent = () => (
    <Tabs activeKey={activeTab} onChange={setActiveTab} className="mb-4">
      <TabPane tab="配置" key="config">
        {renderConfigForm()}
      </TabPane>
      
      <TabPane tab="进度" key="progress">
        {renderProgressMonitor()}
      </TabPane>
      
      <TabPane tab="结果" key="results">
        {renderResultsTable()}
      </TabPane>
      
      {showStats && (
        <TabPane tab="统计" key="stats">
          {renderStatsPanel()}
        </TabPane>
      )}
    </Tabs>
  );

  return (
    <div className={`universal-test-component ${className}`}>
      {/* 标题区域 */}
      {(title || description) && (
        <Card className="mb-4">
          <Space align="start">
            {icon && <div className="text-2xl">{icon}</div>}
            <div>
              {title && <Title level={3}>{title}</Title>}
              {description && <Paragraph>{description}</Paragraph>}
            </div>
          </Space>
        </Card>
      )}

      {/* 错误提示 */}
      {engine.error && (
        <Alert
          message="测试错误"
          description={engine.error}
          type="error"
          closable
          className="mb-4"
          onClose={engine.clearError}
        />
      )}

      {/* 配置验证错误 */}
      {!engine.isConfigValid && engine.configErrors.length > 0 && (
        <Alert
          message="配置错误"
          description={
            <ul>
              {engine.configErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          }
          type="warning"
          className="mb-4"
        />
      )}

      {/* 操作按钮 */}
      {renderActionButtons()}

      {/* 主要内容 */}
      {renderMainContent()}

      {/* 设置模态框 */}
      <Modal
        title="高级设置"
        open={showSettingsModal}
        onCancel={() => setShowSettingsModal(false)}
        footer={[
          <Button key="cancel" onClick={() => setShowSettingsModal(false)}>
            取消
          </Button>,
          <Button key="ok" type="primary" onClick={() => setShowSettingsModal(false)}>
            确定
          </Button>
        ]}
      >
        <TestConfigForm
          testType={selectedTestType}
          form={form}
          onChange={handleConfigChange}
          showAdvanced
        />
      </Modal>

      {/* 历史记录抽屉 */}
      <Drawer
        title="测试历史"
        placement="right"
        width={600}
        open={showHistoryDrawer}
        onClose={() => setShowHistoryDrawer(false)}
      >
        <TestHistoryPanel
          testType={selectedTestType}
          onViewResult={handleViewResult}
          onRetryTest={(config) => engine.startTest(config)}
        />
      </Drawer>

      {/* 结果详情模态框 */}
      <Modal
        title="测试结果详情"
        open={showResultModal}
        onCancel={() => setShowResultModal(false)}
        width={1000}
        footer={[
          enableExport && selectedResult && (
            <Button
              key="export"
              icon={<DownloadOutlined />}
              onClick={() => handleExportResult(selectedResult.id)}
            >
              导出
            </Button>
          ),
          <Button key="close" onClick={() => setShowResultModal(false)}>
            关闭
          </Button>
        ].filter(Boolean)}
      >
        {selectedResult && (
          <TestResultsViewer result={selectedResult} />
        )}
      </Modal>
    </div>
  );
};

export default UniversalTestComponent;
