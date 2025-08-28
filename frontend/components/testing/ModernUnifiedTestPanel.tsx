/**
 * 🚀 现代化统一测试引擎面板
 * 基于阿里巴巴hooks最佳实践，使用新的useUnifiedTestEngine Hook
 */

import {
  BarChartOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  LineChartOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  SettingOutlined,
  StopOutlined
} from '@ant-design/icons';
import {
  Badge,
  Button,
  Card,
  Empty,
  Form, Input,
  Progress,
  Select,
  Space,
  Tag, Tooltip,
  Typography
} from 'antd';
import React, { useCallback, useMemo, useState } from 'react';
import { useTestExecution, useTestResultAnalysis, useUnifiedTestEngine } from '../../hooks/useUnifiedTestEngine';
import { TestType } from '../../types/enums';
import type { TestResult } from '../../types/unifiedEngine.types';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

interface ModernUnifiedTestPanelProps {
  testType?: TestType;
  className?: string;
  onTestComplete?: (testId: string, result: TestResult) => void;
  onTestError?: (error: Error) => void;
  showHistory?: boolean;
  showStats?: boolean;
  allowMultipleTests?: boolean;
}

/**
 * 现代化统一测试引擎面板组件
 */
export const ModernUnifiedTestPanel: React.FC<ModernUnifiedTestPanelProps> = ({
  testType: defaultTestType,
  className = '',
  onTestComplete,
  onTestError
}) => {
  const [form] = Form.useForm();
  const [selectedTestType, setSelectedTestType] = useState<TestType>((defaultTestType as TestType) || TestType.PERFORMANCE);
  const [activeTab, setActiveTab] = useState<'config' | 'progress' | 'results'>('config');

  // 使用统一测试引擎Hook
  const engine = useUnifiedTestEngine();

  // 使用特定测试类型的执行Hook
  const testExecution = useTestExecution(selectedTestType);

  // 当前活跃测试
  const activeTestsArray = useMemo(() =>
    Array.from(engine.activeTests.values()).filter(test =>
      test.status === 'running' || test.status === 'pending'
    ), [engine.activeTests]
  );

  // 已完成测试
  const completedTestsArray = useMemo(() =>
    Array.from(engine.activeTests.values()).filter(test =>
      test.status === 'completed' || test.status === 'failed'
    ), [engine.activeTests]
  );

  /**
   * 执行测试
   */
  const handleExecuteTest = useCallback(async () => {
    try {
      const values = await form.validateFields();

      const testId = await testExecution.executeTest(values, {
        priority: 'normal',
        tags: [selectedTestType, 'unified-engine']
      });

      console.log(`🚀 测试已启动: ${testId}`);

      // 切换到进度标签页
      setActiveTab('progress');

      // 订阅测试更新
      engine.subscribeToTest(testId);

    } catch (error) {
      console.error('测试执行失败:', error);
      onTestError?.(error as Error);
    }
  }, [form, testExecution, selectedTestType, engine, onTestError]);

  /**
   * 取消测试
   */
  const handleCancelTest = useCallback(async (testId: string) => {
    const success = await engine.cancelTest(testId);
    if (success) {
      console.log(`🛑 测试已取消: ${testId}`);
    }
  }, [engine]);

  /**
   * 清理已完成的测试
   */
  const handleClearCompleted = useCallback(() => {
    engine.clearCompletedTests();
  }, [engine]);

  /**
   * 渲染测试配置表单
   */
  const renderConfigForm = () => (
    <Card title="测试配置" className="mb-4">
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          url: '',
          testType: selectedTestType
        }}
      >
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
            {engine.supportedTypes.map(type => (
              <Option key={type} value={type}>
                {getTestTypeLabel(type)}
              </Option>
            ))}
          </Select>
        </Form.Item>

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

        {renderTestTypeSpecificFields()}

        <Form.Item>
          <Space>
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={handleExecuteTest}
              loading={engine.executingTest}
              disabled={!engine.isConnected}
            >
              开始测试
            </Button>

            <Button
              icon={<ReloadOutlined />}
              onClick={() => engine.fetchSupportedTypes()}
              loading={false}
            >
              刷新类型
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
          <>
            <Form.Item label="设备类型" name="device">
              <Select defaultValue="desktop">
                <Option value="desktop">桌面端</Option>
                <Option value="mobile">移动端</Option>
              </Select>
            </Form.Item>
            <Form.Item label="网络限制" name="throttling">
              <Select defaultValue="simulated3G">
                <Option value="none">无限制</Option>
                <Option value="simulated3G">模拟3G</Option>
                <Option value="applied3G">真实3G</Option>
                <Option value="applied4G">真实4G</Option>
              </Select>
            </Form.Item>
          </>
        );

      case 'stress':
        return (
          <>
            <Form.Item
              label="并发用户数"
              name="users"
              rules={[{ required: true, message: '请输入并发用户数' }]}
            >
              <Input type="number" min={1} max={1000} placeholder="100" />
            </Form.Item>
            <Form.Item
              label="测试时长(秒)"
              name="duration"
              rules={[{ required: true, message: '请输入测试时长' }]}
            >
              <Input type="number" min={10} max={3600} placeholder="300" />
            </Form.Item>
          </>
        );

      case 'api':
        return (
          <Form.Item label="API端点" name="endpoints">
            <Input.TextArea
              rows={4}
              placeholder="请输入API端点配置（JSON格式）"
            />
          </Form.Item>
        );

      default:
        return null;
    }
  };

  /**
   * 渲染进度监控
   */
  const renderProgressMonitor = () => (
    <Card title="测试进度" className="mb-4">
      {activeTestsArray.length === 0 ? (
        <Empty description="暂无运行中的测试" />
      ) : (
        <Space direction="vertical" className="w-full">
          {activeTestsArray.map(test => (
            <Card key={test.testId} size="small" className="mb-2">
              <div className="flex justify-between items-center mb-2">
                <Text strong>{test.testId}</Text>
                <Space>
                  <Tag color={getStatusColor(test.status)}>
                    {getStatusText(test.status)}
                  </Tag>
                  <Button
                    size="small"
                    icon={<StopOutlined />}
                    onClick={() => handleCancelTest(test.testId)}
                    danger
                  >
                    取消
                  </Button>
                </Space>
              </div>

              <Progress
                percent={test.progress}
                status={test.status === 'failed' ? 'exception' : 'active'}
                strokeColor={{
                  '0%': '#108ee9',
                  '100%': '#87d068',
                }}
              />

              <Text type="secondary" className="text-sm">
                {test.currentStep}
              </Text>
            </Card>
          ))}
        </Space>
      )}
    </Card>
  );

  /**
   * 渲染测试结果
   */
  const renderTestResults = () => (
    <Card
      title="测试结果"
      extra={
        <Button
          size="small"
          icon={<DeleteOutlined />}
          onClick={handleClearCompleted}
          disabled={completedTestsArray.length === 0}
        >
          清理已完成
        </Button>
      }
      className="mb-4"
    >
      {engine.testResults.size === 0 ? (
        <Empty description="暂无测试结果" />
      ) : (
        <Space direction="vertical" className="w-full">
          {Array.from(engine.testResults.entries()).map(([testId, result]) => (
            <TestResultCard
              key={testId}
              testId={testId}
              result={result}
              onViewDetails={() => setActiveTab('results')}
            />
          ))}
        </Space>
      )}
    </Card>
  );

  /**
   * 渲染引擎状态
   */
  const renderEngineStatus = () => (
    <Card size="small" className="mb-4">
      <Space className="w-full justify-between">
        <Space>
          <Badge
            status={engine.isConnected ? 'success' : 'error'}
            text={engine.isConnected ? '引擎已连接' : '引擎未连接'}
          />
          <Text type="secondary">v{engine.engineVersion}</Text>
        </Space>

        <Space>
          <Tooltip title="活跃测试">
            <Badge count={engine.getStats().runningTests} showZero>
              <ClockCircleOutlined style={{ fontSize: 16 }} />
            </Badge>
          </Tooltip>

          <Tooltip title="总结果">
            <Badge count={engine.getStats().totalResults} showZero>
              <LineChartOutlined style={{ fontSize: 16 }} />
            </Badge>
          </Tooltip>
        </Space>
      </Space>
    </Card>
  );

  return (
    <div className={`unified-test-panel ${className}`}>
      {renderEngineStatus()}

      <div className="mb-4">
        <Space>
          <Button
            type={activeTab === 'config' ? 'primary' : 'default'}
            onClick={() => setActiveTab('config')}
            icon={<SettingOutlined />}
          >
            配置
          </Button>
          <Button
            type={activeTab === 'progress' ? 'primary' : 'default'}
            onClick={() => setActiveTab('progress')}
            icon={<ClockCircleOutlined />}
          >
            进度 ({activeTestsArray.length})
          </Button>
          <Button
            type={activeTab === 'results' ? 'primary' : 'default'}
            onClick={() => setActiveTab('results')}
            icon={<BarChartOutlined />}
          >
            结果 ({engine.testResults.size})
          </Button>
        </Space>
      </div>

      {activeTab === 'config' && renderConfigForm()}
      {activeTab === 'progress' && renderProgressMonitor()}
      {activeTab === 'results' && renderTestResults()}
    </div>
  );
};

/**
 * 测试结果卡片组件
 */
const TestResultCard: React.FC<{
  testId: string;
  result: any;
  onViewDetails: () => void;
}> = ({ testId, result, onViewDetails }) => {
  const analysis = useTestResultAnalysis(testId);

  return (
    <Card size="small" className="mb-2">
      <div className="flex justify-between items-center">
        <Space>
          <Text strong>{result.testName || testId}</Text>
          <Tag color={analysis.analysis?.scoreColor}>
            {result.overallScore}分 ({analysis.analysis?.grade})
          </Tag>
        </Space>

        <Space>
          <Text type="secondary" className="text-sm">
            {new Date(result.timestamp).toLocaleString()}
          </Text>
          <Button size="small" onClick={onViewDetails}>
            查看详情
          </Button>
        </Space>
      </div>

      {analysis.analysis?.hasRecommendations && (
        <div className="mt-2">
          <Text type="secondary" className="text-sm">
            {analysis.analysis.recommendationCount.total} 条建议
          </Text>
        </div>
      )}
    </Card>
  );
};

/**
 * 工具函数
 */
const getTestTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    performance: '性能测试',
    security: '安全测试',
    api: 'API测试',
    stress: '压力测试',
    database: '数据库测试',
    network: '网络测试',
    ux: '用户体验测试',
    seo: 'SEO测试',
    compatibility: '兼容性测试',
    website: '网站测试'
  };
  return labels[type] || type;
};

const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    pending: 'blue',
    running: 'orange',
    completed: 'green',
    failed: 'red',
    cancelled: 'gray'
  };
  return colors[status] || 'default';
};

const getStatusText = (status: string): string => {
  const texts: Record<string, string> = {
    pending: '等待中',
    running: '运行中',
    completed: '已完成',
    failed: '失败',
    cancelled: '已取消'
  };
  return texts[status] || status;
};

export default ModernUnifiedTestPanel;
