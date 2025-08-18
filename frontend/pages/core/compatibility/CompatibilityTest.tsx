import React, { useState, useEffect } from 'react';
import { Card, Button, Table, Tag, Progress, Alert, Space, Typography, Row, Col } from 'antd';
import { PlayCircleOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

interface CompatibilityResult {
  id: string;
  browser: string;
  version: string;
  status: 'passed' | 'failed' | 'warning';
  score: number;
  issues: string[];
}

interface CompatibilityTestProps {
  // 组件属性定义
}

const CompatibilityTest: React.FC<CompatibilityTestProps> = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<CompatibilityResult[]>([]);
  const [progress, setProgress] = useState(0);

  // 模拟兼容性测试数据
  const mockResults: CompatibilityResult[] = [
    {
      id: '1',
      browser: 'Chrome',
      version: '120.0',
      status: 'passed',
      score: 95,
      issues: []
    },
    {
      id: '2',
      browser: 'Firefox',
      version: '119.0',
      status: 'warning',
      score: 88,
      issues: ['CSS Grid 部分支持', 'WebP 图片格式兼容性']
    },
    {
      id: '3',
      browser: 'Safari',
      version: '17.0',
      status: 'failed',
      score: 72,
      issues: ['Flexbox 兼容性问题', 'ES6 模块支持不完整', 'CSS 变量支持有限']
    },
    {
      id: '4',
      browser: 'Edge',
      version: '119.0',
      status: 'passed',
      score: 92,
      issues: ['部分 CSS 属性需要前缀']
    }
  ];

  const startTest = async () => {
    setIsRunning(true);
    setProgress(0);
    setResults([]);

    // 模拟测试进度
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 200));
      setProgress(i);
    }

    setResults(mockResults);
    setIsRunning(false);
  };

  const columns = [
    {
      title: '浏览器',
      dataIndex: 'browser',
      key: 'browser',
      render: (text: string) => <Text strong>{text}</Text>
    },
    {
      title: '版本',
      dataIndex: 'version',
      key: 'version'
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const config = {
          passed: { color: 'green', icon: <CheckCircleOutlined />, text: '通过' },
          warning: { color: 'orange', icon: <CheckCircleOutlined />, text: '警告' },
          failed: { color: 'red', icon: <CloseCircleOutlined />, text: '失败' }
        };
        const { color, icon, text } = config[status as keyof typeof config];
        return <Tag color={color} icon={icon}>{text}</Tag>;
      }
    },
    {
      title: '兼容性评分',
      dataIndex: 'score',
      key: 'score',
      render: (score: number) => (
        <Progress 
          percent={score} 
          size="small" 
          status={score >= 90 ? 'success' : score >= 70 ? 'normal' : 'exception'}
        />
      )
    },
    {
      title: '问题数量',
      dataIndex: 'issues',
      key: 'issues',
      render: (issues: string[]) => (
        <Text type={issues.length > 0 ? 'warning' : 'success'}>
          {issues.length} 个问题
        </Text>
      )
    }
  ];

  const expandedRowRender = (record: CompatibilityResult) => {
    if (record.issues.length === 0) {
      return <Text type="success">✅ 没有发现兼容性问题</Text>;
    }

    return (
      <div>
        <Text strong>发现的问题：</Text>
        <ul style={{ marginTop: 8 }}>
          {record.issues.map((issue, index) => (
            <li key={index}>
              <Text type="warning">{issue}</Text>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  const getOverallScore = () => {
    if (results.length === 0) return 0;
    return Math.round(results.reduce((sum, result) => sum + result.score, 0) / results.length);
  };

  const getStatusCounts = () => {
    const counts = { passed: 0, warning: 0, failed: 0 };
    results.forEach(result => {
      counts[result.status]++;
    });
    return counts;
  };

  const statusCounts = getStatusCounts();

  return (
    <div className="compatibility-test-page">
      <div style={{ padding: '24px' }}>
        <Title level={2}>浏览器兼容性测试</Title>
        <Text type="secondary">
          测试网站在不同浏览器中的兼容性表现，发现潜在的兼容性问题
        </Text>

        <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
          <Col span={24}>
            <Card>
              <Space direction="vertical" style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Title level={4}>兼容性测试</Title>
                  <Button
                    type="primary"
                    icon={<PlayCircleOutlined />}
                    onClick={startTest}
                    loading={isRunning}
                    disabled={isRunning}
                  >
                    {isRunning ? '测试中...' : '开始测试'}
                  </Button>
                </div>

                {isRunning && (
                  <div>
                    <Text>正在测试浏览器兼容性...</Text>
                    <Progress percent={progress} style={{ marginTop: 8 }} />
                  </div>
                )}

                {results.length > 0 && (
                  <>
                    <Row gutter={16} style={{ marginTop: 16 }}>
                      <Col span={6}>
                        <Card size="small">
                          <div style={{ textAlign: 'center' }}>
                            <Title level={3} style={{ margin: 0, color: '#52c41a' }}>
                              {getOverallScore()}
                            </Title>
                            <Text type="secondary">总体评分</Text>
                          </div>
                        </Card>
                      </Col>
                      <Col span={6}>
                        <Card size="small">
                          <div style={{ textAlign: 'center' }}>
                            <Title level={3} style={{ margin: 0, color: '#52c41a' }}>
                              {statusCounts.passed}
                            </Title>
                            <Text type="secondary">通过</Text>
                          </div>
                        </Card>
                      </Col>
                      <Col span={6}>
                        <Card size="small">
                          <div style={{ textAlign: 'center' }}>
                            <Title level={3} style={{ margin: 0, color: '#faad14' }}>
                              {statusCounts.warning}
                            </Title>
                            <Text type="secondary">警告</Text>
                          </div>
                        </Card>
                      </Col>
                      <Col span={6}>
                        <Card size="small">
                          <div style={{ textAlign: 'center' }}>
                            <Title level={3} style={{ margin: 0, color: '#ff4d4f' }}>
                              {statusCounts.failed}
                            </Title>
                            <Text type="secondary">失败</Text>
                          </div>
                        </Card>
                      </Col>
                    </Row>

                    <Alert
                      message="兼容性测试完成"
                      description={`共测试了 ${results.length} 个浏览器，总体兼容性评分为 ${getOverallScore()} 分`}
                      type={getOverallScore() >= 90 ? 'success' : getOverallScore() >= 70 ? 'warning' : 'error'}
                      showIcon
                      style={{ marginTop: 16 }}
                    />

                    <Table
                      columns={columns}
                      dataSource={results}
                      rowKey="id"
                      expandable={{
                        expandedRowRender,
                        rowExpandable: (record) => record.issues.length > 0
                      }}
                      pagination={false}
                      style={{ marginTop: 16 }}
                    />
                  </>
                )}
              </Space>
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default CompatibilityTest;
