/**
 * 🎯 统一测试引擎执行器组件
 * 提供完整的测试执行、监控和结果展示功能
 */

import {
  BarChartOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  DownloadOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  SettingOutlined,
  StopOutlined
} from '@ant-design/icons';
import {
  Badge,
  Button,
  Card,
  Col,
  Divider,
  Empty,
  Form, Input,
  Modal,
  Progress,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
  Timeline,
  Typography
} from 'antd';
import React, { useCallback, useState } from 'react';
import { useTestResultAnalysis, useUnifiedTestEngine } from '../../hooks/useUnifiedTestEngine';
import { TestPriority, TestType } from '../../types/enums';
import type { TestResult } from '../../types/unifiedEngine.types';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

interface UnifiedTestExecutorProps {
  className?: string;
  onTestComplete?: (testId: string, result: TestResult) => void;
  onTestError?: (error: Error) => void;
}

/**
 * 统一测试引擎执行器组件
 */
export const UnifiedTestExecutor: React.FC<UnifiedTestExecutorProps> = ({
  className = '',
  onTestComplete,
  onTestError
}) => {
  const [form] = Form.useForm();
  const [selectedTestType, setSelectedTestType] = useState<TestType>(TestType.PERFORMANCE);
  const [activeTab, setActiveTab] = useState<string>('config');
  const [selectedTestId, setSelectedTestId] = useState<string>('');
  const [showResultModal, setShowResultModal] = useState(false);

  // 使用统一测试引擎Hook
  const engine = useUnifiedTestEngine();

  // 当前选中测试的结果分析
  const resultAnalysis = useTestResultAnalysis(selectedTestId);

  /**
   * 执行测试
   */
  const handleExecuteTest = useCallback(async () => {
    try {
      const values = await form.validateFields();

      const testId = await engine.executeTest({
        testType: selectedTestType,
        config: values,
        options: {
          priority: TestPriority.MEDIUM,
          tags: [selectedTestType, 'unified-engine', 'web-ui']
        }
      });

      console.log(`🚀 测试已启动: ${testId}`);

      // 切换到监控标签页
      setActiveTab('monitor');

      // 订阅测试更新
      engine.subscribeToTest(testId);

    } catch (error) {
      console.error('测试执行失败:', error);
      onTestError?.(error as Error);
    }
  }, [form, engine, selectedTestType, onTestError]);

  /**
   * 查看测试结果
   */
  const handleViewResult = useCallback((testId: string) => {
    setSelectedTestId(testId);
    setShowResultModal(true);
  }, []);

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
                {engine.supportedTypes.map(type => (
                  <Option key={type} value={type}>
                    {getTestTypeLabel(type)}
                  </Option>
                ))}
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
              onClick={() => engine.fetchSupportedTypes()}
              loading={false}
            >
              刷新引擎
            </Button>

            <Button
              icon={<DeleteOutlined />}
              onClick={() => engine.clearCompletedTests()}
              disabled={engine.getStats().completedTests === 0}
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
    const stats = engine.getStats();

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
   * 渲染测试监控
   */
  const renderTestMonitor = () => {
    const activeTestsArray = Array.from(engine.activeTests.values())
      .filter(test => test.status === 'running' || test.status === 'pending');

    return (
      <Card title="📊 测试监控" className="mb-4">
        {activeTestsArray.length === 0 ? (
          <Empty
            description="暂无运行中的测试"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <Space direction="vertical" className="w-full">
            {activeTestsArray.map(test => (
              <Card key={test.testId} size="small" className="mb-2">
                <div className="flex justify-between items-center mb-3">
                  <Space>
                    <Text strong>{test.testId}</Text>
                    <Tag color={getStatusColor(test.status)}>
                      {getStatusText(test.status)}
                    </Tag>
                  </Space>

                  <Space>
                    <Button
                      size="small"
                      icon={<EyeOutlined />}
                      onClick={() => handleViewResult(test.testId)}
                    >
                      查看
                    </Button>
                    <Button
                      size="small"
                      icon={<StopOutlined />}
                      onClick={() => engine.cancelTest(test.testId)}
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
                  showInfo={true}
                />

                <div className="mt-2">
                  <Text type="secondary" className="text-sm">
                    {test.currentStep}
                  </Text>
                  <div className="text-xs text-gray-400 mt-1">
                    开始时间: {new Date(test.startTime).toLocaleString()}
                  </div>
                </div>
              </Card>
            ))}
          </Space>
        )}
      </Card>
    );
  };

  /**
   * 渲染测试结果列表
   */
  const renderTestResults = () => {
    const resultsArray = Array.from(engine.testResults.entries());

    const columns = [
      {
        title: '测试ID',
        dataIndex: 'testId',
        key: 'testId',
        width: 200,
        render: (testId: string) => (
          <Text code copyable={{ text: testId }}>
            {testId.substring(0, 12)}...
          </Text>
        )
      },
      {
        title: '测试类型',
        dataIndex: 'testType',
        key: 'testType',
        render: (type: string) => (
          <Tag color="blue">{getTestTypeLabel(type)}</Tag>
        )
      },
      {
        title: '评分',
        dataIndex: 'overallScore',
        key: 'score',
        render: (score: number) => (
          <Space>
            <Progress
              type="circle"
              size={40}
              percent={score}
              strokeColor={getScoreColor(score)}
            />
            <Text strong>{score}分</Text>
          </Space>
        )
      },
      {
        title: '时长',
        dataIndex: 'duration',
        key: 'duration',
        render: (duration: number) => `${(duration / 1000).toFixed(1)}s`
      },
      {
        title: '完成时间',
        dataIndex: 'timestamp',
        key: 'timestamp',
        render: (timestamp: string) => new Date(timestamp).toLocaleString()
      },
      {
        title: '操作',
        key: 'actions',
        render: (_: any, record: [string, TestResult]) => (
          <Space>
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleViewResult(record[0])}
            >
              查看
            </Button>
            <Button
              size="small"
              icon={<DownloadOutlined />}
              onClick={() => downloadResult(record[1])}
            >
              下载
            </Button>
          </Space>
        )
      }
    ];

    return (
      <Card title="📋 测试结果" className="mb-4">
        <Table
          dataSource={resultsArray}
          columns={columns}
          rowKey={([testId]) => testId}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条结果`
          }}
          locale={{
            emptyText: <Empty description="暂无测试结果" />
          }}
        />
      </Card>
    );
  };

  /**
   * 渲染结果详情模态框
   */
  const renderResultModal = () => (
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
      {resultAnalysis.hasResult && resultAnalysis.result && (
        <div>
          <Row gutter={16} className="mb-4">
            <Col span={8}>
              <Statistic
                title="总体评分"
                value={resultAnalysis.result.overallScore}
                suffix="分"
                valueStyle={{
                  color: getScoreColor(resultAnalysis.result.overallScore),
                  fontSize: '24px'
                }}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="测试时长"
                value={(resultAnalysis.result.duration / 1000).toFixed(1)}
                suffix="秒"
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="建议数量"
                value={resultAnalysis.analysis?.recommendationCount.total || 0}
                suffix="条"
              />
            </Col>
          </Row>

          {resultAnalysis.analysis?.hasRecommendations && (
            <div>
              <Title level={5}>🎯 优化建议</Title>
              <Timeline>
                {resultAnalysis.result.recommendations.immediate.map((rec, index) => (
                  <Timeline.Item key={index} color="red">
                    <Text strong>立即处理:</Text> {rec}
                  </Timeline.Item>
                ))}
                {resultAnalysis.result.recommendations.shortTerm.map((rec, index) => (
                  <Timeline.Item key={index} color="orange">
                    <Text strong>短期优化:</Text> {rec}
                  </Timeline.Item>
                ))}
                {resultAnalysis.result.recommendations.longTerm.map((rec, index) => (
                  <Timeline.Item key={index} color="blue">
                    <Text strong>长期规划:</Text> {rec}
                  </Timeline.Item>
                ))}
              </Timeline>
            </div>
          )}
        </div>
      )}
    </Modal>
  );

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
                监控进度 ({engine.getStats().runningTests})
              </span>
            ),
            children: renderTestMonitor()
          },
          {
            key: 'results',
            label: (
              <span>
                <BarChartOutlined />
                查看结果 ({engine.getStats().totalResults})
              </span>
            ),
            children: renderTestResults()
          }
        ]}
      />

      {renderResultModal()}
    </div>
  );
};

/**
 * 工具函数
 */
const getTestTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    performance: '🚀 性能测试',
    security: '🔒 安全测试',
    api: '🔌 API测试',
    stress: '⚡ 压力测试',
    database: '🗄️ 数据库测试',
    network: '🌐 网络测试',
    ux: '👤 用户体验测试',
    seo: '🔍 SEO测试',
    compatibility: '🔧 兼容性测试',
    website: '🌍 网站测试'
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

const getScoreColor = (score: number): string => {
  if (score >= 80) return '#3f8600';
  if (score >= 60) return '#faad14';
  return '#cf1322';
};

export default UnifiedTestExecutor;
