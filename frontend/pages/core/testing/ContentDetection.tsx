/**
 * 内容检测页面
 * 
 * 提供全面的内容安全扫描功能，包括恶意内容检测、敏感信息扫描、
 * 内容质量分析、合规性检查等
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
  EyeInvisibleOutlined,
  FileTextOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  SafetyOutlined,
  StopOutlined,
  WarningOutlined
} from '@ant-design/icons';
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Divider,
  Form,
  Input,
  List,
  Progress,
  Row,
  Select,
  Space,
  Statistic,
  Switch,
  Tabs,
  Tag,
  Typography
} from 'antd';
import React, { useState } from 'react';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

/**
 * 内容检测配置接口
 */
interface ContentDetectionConfig {
  url: string;
  checks: string[];
  depth: number;
  timeout: number;
  language: string;
  strictMode: boolean;
}

/**
 * 检查结果接口
 */
interface CheckResult {
  score: number;
  status: 'safe' | 'warning' | 'dangerous' | 'good' | 'fair' | 'poor' | 'risky';
  issues: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    message: string;
    count?: number;
    details?: any;
  }>;
  details: any;
}

/**
 * 内容检测结果接口
 */
interface ContentDetectionResult {
  testId: string;
  url: string;
  timestamp: string;
  checks: Record<string, CheckResult>;
  summary: {
    totalChecks: number;
    passed: number;
    failed: number;
    warnings: number;
    overallScore: number;
    riskLevel: 'low' | 'medium' | 'high';
  };
  issues: any[];
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

const ContentDetection: React.FC = () => {
  const [form] = Form.useForm();
  const [testProgress, setTestProgress] = useState<TestProgress>({
    progress: 0,
    message: '',
    status: 'idle'
  });
  const [results, setResults] = useState<ContentDetectionResult | null>(null);
  const [activeTab, setActiveTab] = useState('config');

  // 默认配置
  const defaultConfig: ContentDetectionConfig = {
    url: '',
    checks: ['malicious', 'sensitive', 'quality'],
    depth: 1,
    timeout: 30000,
    language: 'auto',
    strictMode: false
  };

  const [config, setConfig] = useState<ContentDetectionConfig>(defaultConfig);

  /**
   * 可用的检查类型
   */
  const checkTypes = [
    { value: 'malicious', label: '恶意内容检测', icon: <BugOutlined />, color: 'red' },
    { value: 'sensitive', label: '敏感信息扫描', icon: <EyeInvisibleOutlined />, color: 'orange' },
    { value: 'quality', label: '内容质量分析', icon: <FileTextOutlined />, color: 'blue' },
    { value: 'compliance', label: '合规性检查', icon: <SafetyOutlined />, color: 'green' },
    { value: 'privacy', label: '隐私合规', icon: <SafetyOutlined />, color: 'purple' },
    { value: 'accessibility', label: '可访问性', icon: <CheckCircleOutlined />, color: 'cyan' }
  ];

  /**
   * 开始内容检测
   */
  const handleStartTest = async () => {
    if (!config.url) {
      return;
    }

    setTestProgress({ progress: 0, message: '准备开始检测...', status: 'running' });
    setActiveTab('progress');

    try {
      // 模拟内容检测过程
      await simulateContentDetection();
    } catch (error) {
      setTestProgress({
        progress: 0,
        message: `检测失败: ${error instanceof Error ? error.message : '未知错误'}`,
        status: 'failed'
      });
    }
  };

  /**
   * 停止检测
   */
  const handleStopTest = () => {
    setTestProgress({ progress: 0, message: '检测已停止', status: 'idle' });
  };

  /**
   * 模拟内容检测过程
   */
  const simulateContentDetection = async () => {
    const steps = [
      { progress: 10, message: '开始内容检测' },
      { progress: 20, message: '获取页面内容' },
      { progress: 40, message: '执行恶意内容检查' },
      { progress: 60, message: '执行敏感信息扫描' },
      { progress: 80, message: '执行内容质量分析' },
      { progress: 95, message: '计算综合评分' },
      { progress: 100, message: '内容检测完成' }
    ];

    for (const step of steps) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setTestProgress({ ...step, status: 'running' });
    }

    // 生成模拟结果
    const mockResult: ContentDetectionResult = {
      testId: `content_${Date.now()}`,
      url: config.url,
      timestamp: new Date().toISOString(),
      checks: {
        malicious: {
          score: 95,
          status: 'safe',
          issues: [],
          details: {
            keywordsFound: [],
            suspiciousLinksCount: 0,
            maliciousScriptsCount: 0
          }
        },
        sensitive: {
          score: 85,
          status: 'warning',
          issues: [
            {
              type: 'sensitive_email',
              severity: 'medium',
              message: '发现email信息: 2处',
              count: 2
            }
          ],
          details: {
            email: 2
          }
        },
        quality: {
          score: 78,
          status: 'good',
          issues: [
            {
              type: 'content_too_short',
              severity: 'low',
              message: '部分页面内容较少',
              details: { length: 150 }
            }
          ],
          details: {
            textLength: 1250,
            titleLength: 45,
            duplicateRatio: 0.15
          }
        }
      },
      summary: {
        totalChecks: 3,
        passed: 1,
        failed: 0,
        warnings: 2,
        overallScore: 86,
        riskLevel: 'low'
      },
      issues: [],
      recommendations: [
        '考虑保护或移除页面中的邮箱地址',
        '增加页面内容的丰富度',
        '优化页面标题和描述'
      ],
      totalTime: 7000
    };

    setResults(mockResult);
    setTestProgress({ progress: 100, message: '检测完成', status: 'completed' });
    setActiveTab('results');
  };

  /**
   * 重置检测
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
    link.download = `content-detection-${results.testId}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  /**
   * 获取状态颜色
   */
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'safe':
      case 'good': return 'success';
      case 'warning':
      case 'fair': return 'warning';
      case 'dangerous':
      case 'poor':
      case 'risky': return 'error';
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

  /**
   * 获取风险等级标签
   */
  const getRiskLevelTag = (level: string) => {
    const configs = {
      low: { color: 'green', text: '低风险' },
      medium: { color: 'orange', text: '中风险' },
      high: { color: 'red', text: '高风险' }
    };
    const config = configs[level as keyof typeof configs] || configs.low;
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  return (
    <div className="content-detection-page">
      <div className="mb-6">
        <Title level={2}>
          <SafetyOutlined className="mr-2" />
          内容安全检测
        </Title>
        <Paragraph>
          全面的内容安全扫描，包括恶意内容检测、敏感信息扫描、内容质量分析和合规性检查。
        </Paragraph>
      </div>

      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab="检测配置" key="config">
          <Card title="检测配置" className="mb-4">
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
                      prefix={<SafetyOutlined />}
                      size="large"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="检测类型" name="checks">
                    <Select
                      mode="multiple"
                      placeholder="选择要执行的检测"
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
                  <Form.Item label="检测深度" name="depth">
                    <Select>
                      <Option value={1}>浅层检测</Option>
                      <Option value={2}>中等检测</Option>
                      <Option value={3}>深度检测</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item label="语言" name="language">
                    <Select>
                      <Option value="auto">自动检测</Option>
                      <Option value="zh">中文</Option>
                      <Option value="en">英文</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item label="超时时间(秒)" name="timeout">
                    <Select>
                      <Option value={10000}>10秒</Option>
                      <Option value={30000}>30秒</Option>
                      <Option value={60000}>60秒</Option>
                      <Option value={120000}>120秒</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="严格模式" name="strictMode" valuePropName="checked">
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
                    开始检测
                  </Button>
                  {testProgress.status === 'running' && (
                    <Button
                      icon={<StopOutlined />}
                      onClick={handleStopTest}
                      size="large"
                    >
                      停止检测
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

        <TabPane tab="检测进度" key="progress">
          <Card title="检测进度" className="mb-4">
            {testProgress.status === 'running' && (
              <div className="text-center">
                <Progress
                  type="circle"
                  percent={testProgress.progress}
                  size={120}
                  strokeColor={{
                    '0%': '#ff4d4f',
                    '50%': '#faad14',
                    '100%': '#52c41a',
                  }}
                />
                <div className="mt-4">
                  <Text strong>{testProgress.message}</Text>
                </div>
              </div>
            )}

            {testProgress.status === 'completed' && (
              <Alert
                message="检测完成"
                description="内容安全检测已成功完成，请查看结果。"
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
                message="检测失败"
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
                description="请配置检测参数并点击开始检测。"
                type="info"
                showIcon
              />
            )}
          </Card>
        </TabPane>

        <TabPane tab="检测结果" key="results" disabled={!results}>
          {results && (
            <div>
              {/* 总体概览 */}
              <Card title="检测概览" className="mb-4" extra={
                <Space>
                  <Button icon={<DownloadOutlined />} onClick={handleExport}>
                    导出结果
                  </Button>
                  <Button icon={<ReloadOutlined />} onClick={handleReset}>
                    重新检测
                  </Button>
                </Space>
              }>
                <Row gutter={16}>
                  <Col span={6}>
                    <Statistic
                      title="综合评分"
                      value={results.summary.overallScore}
                      suffix="分"
                      valueStyle={{ color: getScoreColor(results.summary.overallScore) }}
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title="风险等级"
                      value=""
                      formatter={() => getRiskLevelTag(results.summary.riskLevel)}
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title="检测项目"
                      value={results.summary.totalChecks}
                      suffix="项"
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title="检测时间"
                      value={Math.round(results.totalTime / 1000)}
                      suffix="秒"
                    />
                  </Col>
                </Row>

                <Divider />

                <Row gutter={16}>
                  <Col span={8}>
                    <Card size="small">
                      <Statistic
                        title={
                          <Space>
                            <CheckCircleOutlined style={{ color: '#52c41a' }} />
                            通过检查
                          </Space>
                        }
                        value={results.summary.passed}
                        suffix="项"
                        valueStyle={{ color: '#52c41a' }}
                      />
                    </Card>
                  </Col>
                  <Col span={8}>
                    <Card size="small">
                      <Statistic
                        title={
                          <Space>
                            <WarningOutlined style={{ color: '#faad14' }} />
                            警告项目
                          </Space>
                        }
                        value={results.summary.warnings}
                        suffix="项"
                        valueStyle={{ color: '#faad14' }}
                      />
                    </Card>
                  </Col>
                  <Col span={8}>
                    <Card size="small">
                      <Statistic
                        title={
                          <Space>
                            <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
                            失败项目
                          </Space>
                        }
                        value={results.summary.failed}
                        suffix="项"
                        valueStyle={{ color: '#ff4d4f' }}
                      />
                    </Card>
                  </Col>
                </Row>
              </Card>

              {/* 详细检测结果 */}
              <Card title="详细检测结果" className="mb-4">
                <Row gutter={16}>
                  {Object.entries(results.checks).map(([checkType, checkResult]) => {
                    const check = checkTypes.find(c => c.value === checkType);
                    return (
                      <Col span={8} key={checkType}>
                        <Card
                          size="small"
                          title={
                            <Space>
                              {check?.icon}
                              {check?.label}
                            </Space>
                          }
                          extra={
                            <Tag color={getStatusColor(checkResult.status)}>
                              {checkResult.status}
                            </Tag>
                          }
                        >
                          <Statistic
                            value={checkResult.score}
                            suffix="分"
                            valueStyle={{ color: getScoreColor(checkResult.score) }}
                          />

                          {checkResult.issues.length > 0 && (
                            <div className="mt-3">
                              <Text strong>发现问题:</Text>
                              <List
                                size="small"
                                dataSource={checkResult.issues}
                                renderItem={(issue) => (
                                  <List.Item>
                                    <Badge
                                      status={
                                        issue.severity === 'high' ? 'error' :
                                          issue.severity === 'medium' ? 'warning' : 'default'
                                      }
                                      text={issue.message}
                                    />
                                  </List.Item>
                                )}
                              />
                            </div>
                          )}
                        </Card>
                      </Col>
                    );
                  })}
                </Row>
              </Card>

              {/* 优化建议 */}
              <Card title="优化建议">
                <List
                  dataSource={results.recommendations}
                  renderItem={(recommendation, index) => (
                    <List.Item>
                      <Alert
                        message={recommendation}
                        type="info"
                        showIcon
                        className="w-full"
                      />
                    </List.Item>
                  )}
                />
              </Card>
            </div>
          )}
        </TabPane>
      </Tabs>
    </div>
  );
};

export default ContentDetection;
