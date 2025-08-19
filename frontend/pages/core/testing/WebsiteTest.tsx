/**
 * 网站综合测试页面
 * 
 * 提供完整的网站综合测试功能，包括健康检查、SEO、性能、安全性、
 * 可访问性和最佳实践检查
 * 
 * @component
 * @author Test-Web Team
 * @since 1.0.0
 */

import {
  BugOutlined,
  CheckCircleOutlined,
  DownloadOutlined,
  ExclamationCircleOutlined,
  GlobalOutlined,
  InfoCircleOutlined,
  MobileOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  SearchOutlined,
  SecurityScanOutlined,
  StopOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  Col,
  Collapse,
  Divider,
  Form,
  Input,
  InputNumber,
  Progress,
  Row,
  Select,
  Space,
  Statistic,
  Switch,
  Table,
  Tabs,
  Tag,
  Typography
} from 'antd';
import React, { useState } from 'react';
import { websiteTestService } from '../../../services/websiteTestService';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;
const { Panel } = Collapse;

/**
 * 网站测试配置接口
 */
interface WebsiteTestConfig {
  url: string;
  checks: string[];
  depth: number;
  maxPages: number;
  timeout: number;
  followExternalLinks: boolean;
}

/**
 * 页面测试结果接口
 */
interface PageResult {
  url: string;
  status: 'healthy' | 'warning' | 'error';
  statusCode: number;
  loadTime: number;
  score: number;
  checks: {
    health?: any;
    seo?: any;
    performance?: any;
    security?: any;
    accessibility?: any;
    bestPractices?: any;
  };
  issues: string[];
}

/**
 * 网站测试结果接口
 */
interface WebsiteTestResult {
  testId: string;
  url: string;
  timestamp: string;
  pages: Record<string, PageResult>;
  summary: {
    totalPages: number;
    healthyPages: number;
    warningPages: number;
    errorPages: number;
    overallScore: number;
    categories: Record<string, number>;
  };
  recommendations: string[];
  totalTime: number;
}

/**
 * 测试进度状态接口
 */
interface TestProgress {
  progress: number;
  message: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
}

const WebsiteTest: React.FC = () => {
  const [form] = Form.useForm();
  const [testProgress, setTestProgress] = useState<TestProgress>({
    progress: 0,
    message: '',
    status: 'idle'
  });
  const [results, setResults] = useState<WebsiteTestResult | null>(null);
  const [activeTab, setActiveTab] = useState('config');

  // 默认配置
  const defaultConfig = websiteTestService.getDefaultConfig();
  const [config, setConfig] = useState<WebsiteTestConfig>(defaultConfig);

  /**
   * 可用的检查类型
   */
  const checkTypes = [
    { value: 'health', label: '健康检查', icon: <CheckCircleOutlined />, color: 'green' },
    { value: 'seo', label: 'SEO优化', icon: <SearchOutlined />, color: 'blue' },
    { value: 'performance', label: '性能测试', icon: <ThunderboltOutlined />, color: 'orange' },
    { value: 'security', label: '安全检查', icon: <SecurityScanOutlined />, color: 'red' },
    { value: 'accessibility', label: '可访问性', icon: <MobileOutlined />, color: 'purple' },
    { value: 'best-practices', label: '最佳实践', icon: <BugOutlined />, color: 'cyan' }
  ];

  /**
   * 开始网站测试
   */
  const handleStartTest = async () => {
    if (!config.url) {
      return;
    }

    // 验证配置
    const errors = websiteTestService.validateConfig(config);
    if (errors.length > 0) {
      setTestProgress({
        progress: 0,
        message: `配置错误: ${errors.join(', ')}`,
        status: 'failed'
      });
      return;
    }

    setTestProgress({ progress: 0, message: '准备开始测试...', status: 'running' });
    setActiveTab('progress');

    try {
      // 启动真实的网站测试
      const testId = await websiteTestService.startWebsiteTest(config);

      // 轮询测试进度
      websiteTestService.pollTestProgress(
        testId,
        (progress) => {
          setTestProgress({
            progress: progress.progress,
            message: progress.message,
            status: 'running'
          });
        },
        (result) => {
          setResults(result);
          setTestProgress({
            progress: 100,
            message: '测试完成',
            status: 'completed'
          });
          setActiveTab('results');
        },
        (error) => {
          setTestProgress({
            progress: 0,
            message: `测试失败: ${error.message}`,
            status: 'failed'
          });
        }
      );
    } catch (error) {
      setTestProgress({
        progress: 0,
        message: `启动测试失败: ${error instanceof Error ? error.message : '未知错误'}`,
        status: 'failed'
      });
    }
  };

  /**
   * 停止测试
   */
  const handleStopTest = () => {
    setTestProgress({ progress: 0, message: '测试已停止', status: 'idle' });
  };

  /**
   * 模拟网站测试过程
   */
  const simulateWebsiteTest = async () => {
    const steps = [
      { progress: 10, message: '开始网站综合测试' },
      { progress: 20, message: '发现网站页面' },
      { progress: 30, message: '发现 5 个页面' },
      { progress: 50, message: '测试页面: ' + config.url },
      { progress: 70, message: '测试页面: ' + config.url + '/about' },
      { progress: 85, message: '测试页面: ' + config.url + '/contact' },
      { progress: 95, message: '计算综合评分' },
      { progress: 100, message: '网站综合测试完成' }
    ];

    for (const step of steps) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setTestProgress({ ...step, status: 'running' });
    }

    // 生成模拟结果
    const mockResult: WebsiteTestResult = {
      testId: `website_${Date.now()}`,
      url: config.url,
      timestamp: new Date().toISOString(),
      pages: {
        [config.url]: {
          url: config.url,
          status: 'healthy',
          statusCode: 200,
          loadTime: 1250,
          score: 88,
          checks: {
            health: { score: 95, issues: [] },
            seo: { score: 85, issues: ['缺少meta描述'] },
            performance: { score: 82, issues: ['图片未优化'] },
            security: { score: 90, issues: [] }
          },
          issues: ['缺少meta描述', '图片未优化']
        },
        [config.url + '/about']: {
          url: config.url + '/about',
          status: 'warning',
          statusCode: 200,
          loadTime: 1800,
          score: 75,
          checks: {
            health: { score: 85, issues: ['加载时间较长'] },
            seo: { score: 70, issues: ['H1标签重复'] },
            performance: { score: 65, issues: ['CSS未压缩'] },
            security: { score: 85, issues: [] }
          },
          issues: ['加载时间较长', 'H1标签重复', 'CSS未压缩']
        }
      },
      summary: {
        totalPages: 2,
        healthyPages: 1,
        warningPages: 1,
        errorPages: 0,
        overallScore: 82,
        categories: {
          health: 90,
          seo: 78,
          performance: 74,
          security: 88
        }
      },
      recommendations: [
        '优化图片大小和格式',
        '添加缺失的meta描述',
        '压缩CSS和JavaScript文件',
        '减少页面加载时间',
        '修复重复的H1标签'
      ],
      totalTime: 8000
    };

    setResults(mockResult);
    setTestProgress({ progress: 100, message: '测试完成', status: 'completed' });
    setActiveTab('results');
  };

  /**
   * 重置测试
   */
  const handleReset = () => {
    setResults(null);
    setTestProgress({ progress: 0, message: '', status: 'idle' });
    setActiveTab('config');
    form.resetFields();
    setConfig(defaultConfig);
  };

  /**
   * 导出结果
   */
  const handleExport = () => {
    if (!results) return;

    const dataStr = JSON.stringify(results, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `website-test-${results.testId}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  /**
   * 获取状态颜色
   */
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'success';
      case 'warning': return 'warning';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  /**
   * 获取分数颜色
   */
  const getScoreColor = (score: number) => {
    if (score >= 80) return '#52c41a';
    if (score >= 60) return '#faad14';
    return '#ff4d4f';
  };

  return (
    <div className="website-test-page">
      <div className="mb-6">
        <Title level={2}>
          <GlobalOutlined className="mr-2" />
          网站综合测试
        </Title>
        <Paragraph>
          对网站进行全面的健康检查，包括SEO优化、性能测试、安全检查、可访问性和最佳实践验证。
        </Paragraph>
      </div>

      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab="测试配置" key="config">
          <Card title="测试配置" className="mb-4">
            <Form
              form={form}
              layout="vertical"
              initialValues={config}
              onValuesChange={(_, values) => setConfig({ ...config, ...values })}
            >
              <Row gutter={16}>
                <Col span={24}>
                  <Form.Item
                    label="网站URL"
                    name="url"
                    rules={[
                      { required: true, message: '请输入网站URL' },
                      { type: 'url', message: '请输入有效的URL' }
                    ]}
                  >
                    <Input
                      placeholder="https://example.com"
                      prefix={<GlobalOutlined />}
                      size="large"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="检查类型" name="checks">
                    <Select
                      mode="multiple"
                      placeholder="选择要执行的检查"
                      optionLabelProp="label"
                    >
                      {checkTypes.map(check => (
                        <Option key={check.value} value={check.value} label={check.label}>
                          <Space>
                            <Tag color={check.color} icon={check.icon}>
                              {check.label}
                            </Tag>
                          </Space>
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item label="检查深度" name="depth">
                    <InputNumber min={1} max={5} />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item label="最大页面数" name="maxPages">
                    <InputNumber min={1} max={50} />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item label="超时时间(秒)" name="timeout">
                    <InputNumber
                      min={30}
                      max={300}
                      formatter={value => `${value}s`}
                      parser={value => value?.replace('s', '') || ''}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="跟踪外部链接" name="followExternalLinks" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item>
                <Space>
                  <Button
                    type="primary"
                    icon={<PlayCircleOutlined />}
                    onClick={handleStartTest}
                    disabled={testProgress.status === 'running'}
                    size="large"
                  >
                    开始测试
                  </Button>
                  {testProgress.status === 'running' && (
                    <Button
                      icon={<StopOutlined />}
                      onClick={handleStopTest}
                      size="large"
                    >
                      停止测试
                    </Button>
                  )}
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={handleReset}
                    size="large"
                  >
                    重置
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Card>
        </TabPane>

        <TabPane tab="测试进度" key="progress">
          <Card title="测试进度" className="mb-4">
            {testProgress.status === 'running' && (
              <div className="text-center">
                <Progress
                  type="circle"
                  percent={testProgress.progress}
                  size={120}
                  strokeColor={{
                    '0%': '#108ee9',
                    '100%': '#87d068',
                  }}
                />
                <div className="mt-4">
                  <Text strong>{testProgress.message}</Text>
                </div>
              </div>
            )}

            {testProgress.status === 'completed' && (
              <Alert
                message="测试完成"
                description="网站综合测试已成功完成，请查看结果。"
                type="success"
                showIcon
                action={
                  <Button size="small" onClick={() => setActiveTab('results')}>
                    查看结果
                  </Button>
                }
              />
            )}

            {testProgress.status === 'failed' && (
              <Alert
                message="测试失败"
                description={testProgress.message}
                type="error"
                showIcon
                action={
                  <Button size="small" onClick={handleReset}>
                    重新开始
                  </Button>
                }
              />
            )}

            {testProgress.status === 'idle' && (
              <Alert
                message="等待开始"
                description="请配置测试参数并点击开始测试。"
                type="info"
                showIcon
              />
            )}
          </Card>
        </TabPane>

        <TabPane tab="测试结果" key="results" disabled={!results}>
          {results && (
            <div>
              {/* 总体概览 */}
              <Card title="测试概览" className="mb-4" extra={
                <Space>
                  <Button icon={<DownloadOutlined />} onClick={handleExport}>
                    导出结果
                  </Button>
                  <Button icon={<ReloadOutlined />} onClick={handleReset}>
                    重新测试
                  </Button>
                </Space>
              }>
                <Row gutter={16}>
                  <Col span={6}>
                    <Statistic
                      title="总体评分"
                      value={results.summary.overallScore}
                      suffix="分"
                      valueStyle={{ color: getScoreColor(results.summary.overallScore) }}
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title="测试页面"
                      value={results.summary.totalPages}
                      suffix="个"
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title="健康页面"
                      value={results.summary.healthyPages}
                      suffix="个"
                      valueStyle={{ color: '#52c41a' }}
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title="测试时间"
                      value={Math.round(results.totalTime / 1000)}
                      suffix="秒"
                    />
                  </Col>
                </Row>

                <Divider />

                <Row gutter={16}>
                  {Object.entries(results.summary.categories).map(([category, score]) => {
                    const checkType = checkTypes.find(c => c.value === category);
                    return (
                      <Col span={6} key={category}>
                        <Card size="small">
                          <Statistic
                            title={
                              <Space>
                                {checkType?.icon}
                                {checkType?.label}
                              </Space>
                            }
                            value={score}
                            suffix="分"
                            valueStyle={{ color: getScoreColor(score) }}
                          />
                        </Card>
                      </Col>
                    );
                  })}
                </Row>
              </Card>

              {/* 页面详情 */}
              <Card title="页面详情" className="mb-4">
                <Table
                  dataSource={Object.values(results.pages).map((page, index) => ({
                    key: index,
                    ...page
                  }))}
                  columns={[
                    {
                      title: 'URL',
                      dataIndex: 'url',
                      key: 'url',
                      render: (url: string) => (
                        <a href={url} target="_blank" rel="noopener noreferrer">
                          {url}
                        </a>
                      )
                    },
                    {
                      title: '状态',
                      dataIndex: 'status',
                      key: 'status',
                      render: (status: string) => (
                        <Tag color={getStatusColor(status)}>
                          {status === 'healthy' ? '健康' :
                            status === 'warning' ? '警告' : '错误'}
                        </Tag>
                      )
                    },
                    {
                      title: '评分',
                      dataIndex: 'score',
                      key: 'score',
                      render: (score: number) => (
                        <span style={{ color: getScoreColor(score) }}>
                          {score}分
                        </span>
                      )
                    },
                    {
                      title: '加载时间',
                      dataIndex: 'loadTime',
                      key: 'loadTime',
                      render: (time: number) => `${time}ms`
                    },
                    {
                      title: '问题数',
                      dataIndex: 'issues',
                      key: 'issues',
                      render: (issues: string[]) => (
                        <Tag color={issues.length > 0 ? 'orange' : 'green'}>
                          {issues.length}
                        </Tag>
                      )
                    }
                  ]}
                  expandable={{
                    expandedRowRender: (record: PageResult) => (
                      <div>
                        <Title level={5}>检查详情</Title>
                        <Row gutter={16}>
                          {Object.entries(record.checks).map(([checkType, checkResult]: [string, any]) => {
                            const check = checkTypes.find(c => c.value === checkType);
                            return (
                              <Col span={8} key={checkType}>
                                <Card size="small" title={
                                  <Space>
                                    {check?.icon}
                                    {check?.label}
                                  </Space>
                                }>
                                  <Statistic
                                    value={checkResult?.score || 0}
                                    suffix="分"
                                    valueStyle={{ color: getScoreColor(checkResult?.score || 0) }}
                                  />
                                  {checkResult?.issues && checkResult.issues.length > 0 && (
                                    <div className="mt-2">
                                      <Text type="secondary">问题:</Text>
                                      <ul className="mt-1">
                                        {checkResult.issues.map((issue: string, idx: number) => (
                                          <li key={idx}><Text type="danger">{issue}</Text></li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </Card>
                              </Col>
                            );
                          })}
                        </Row>

                        {record.issues.length > 0 && (
                          <div className="mt-4">
                            <Title level={5}>页面问题</Title>
                            <ul>
                              {record.issues.map((issue, idx) => (
                                <li key={idx}>
                                  <Text type="danger">
                                    <ExclamationCircleOutlined className="mr-1" />
                                    {issue}
                                  </Text>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )
                  }}
                />
              </Card>

              {/* 优化建议 */}
              <Card title="优化建议">
                <div>
                  {results.recommendations.map((recommendation, index) => (
                    <Alert
                      key={index}
                      message={recommendation}
                      type="info"
                      showIcon
                      icon={<InfoCircleOutlined />}
                      className="mb-2"
                    />
                  ))}
                </div>
              </Card>
            </div>
          )}
        </TabPane>
      </Tabs>
    </div>
  );
};

export default WebsiteTest;
