import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Form, 
  Input, 
  Button, 
  Select, 
  InputNumber, 
  Progress, 
  Typography, 
  Space, 
  Row, 
  Col,
  Alert,
  Statistic,
  Table,
  Tag
} from 'antd';
import { 
  PlayCircleOutlined, 
  PauseCircleOutlined, 
  StopOutlined,
  ThunderboltOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

interface TestConfig {
  url: string;
  method: string;
  concurrency: number;
  duration: number;
  requestsPerSecond: number;
  headers: string;
  body: string;
}

interface TestResult {
  timestamp: string;
  responseTime: number;
  statusCode: number;
  success: boolean;
}

interface TestStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  requestsPerSecond: number;
}

const StressTest: React.FC = () => {
  const [form] = Form.useForm();
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState<TestStats>({
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    minResponseTime: 0,
    maxResponseTime: 0,
    requestsPerSecond: 0,
  });
  const [results, setResults] = useState<TestResult[]>([]);

  // 模拟测试运行
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRunning && !isPaused) {
      interval = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev + 1;
          if (newProgress >= 100) {
            setIsRunning(false);
            return 100;
          }
          return newProgress;
        });

        // 模拟测试结果
        const newResult: TestResult = {
          timestamp: new Date().toISOString(),
          responseTime: Math.random() * 1000 + 100,
          statusCode: Math.random() > 0.1 ? 200 : 500,
          success: Math.random() > 0.1,
        };

        setResults(prev => [newResult, ...prev.slice(0, 99)]);
        
        // 更新统计
        setStats(prev => ({
          totalRequests: prev.totalRequests + 1,
          successfulRequests: prev.successfulRequests + (newResult.success ? 1 : 0),
          failedRequests: prev.failedRequests + (newResult.success ? 0 : 1),
          averageResponseTime: (prev.averageResponseTime + newResult.responseTime) / 2,
          minResponseTime: Math.min(prev.minResponseTime || newResult.responseTime, newResult.responseTime),
          maxResponseTime: Math.max(prev.maxResponseTime, newResult.responseTime),
          requestsPerSecond: Math.random() * 100 + 50,
        }));
      }, 100);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, isPaused]);

  const handleStart = (values: TestConfig) => {
    setIsRunning(true);
    setIsPaused(false);
    setProgress(0);
    setResults([]);
    setStats({
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      minResponseTime: 0,
      maxResponseTime: 0,
      requestsPerSecond: 0,
    });
  };

  const handlePause = () => {
    setIsPaused(!isPaused);
  };

  const handleStop = () => {
    setIsRunning(false);
    setIsPaused(false);
  };

  const columns = [
    {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (timestamp: string) => new Date(timestamp).toLocaleTimeString(),
      width: 100,
    },
    {
      title: '响应时间',
      dataIndex: 'responseTime',
      key: 'responseTime',
      render: (time: number) => `${time.toFixed(0)}ms`,
      width: 100,
    },
    {
      title: '状态码',
      dataIndex: 'statusCode',
      key: 'statusCode',
      render: (code: number) => (
        <Tag color={code === 200 ? 'green' : 'red'}>
          {code}
        </Tag>
      ),
      width: 80,
    },
    {
      title: '结果',
      dataIndex: 'success',
      key: 'success',
      render: (success: boolean) => (
        <Tag color={success ? 'green' : 'red'}>
          {success ? '成功' : '失败'}
        </Tag>
      ),
      width: 80,
    },
  ];

  return (
    <div className="stress-test-container">
      <div className="stress-test-header">
        <Title level={2}>
          <ThunderboltOutlined /> 压力测试
        </Title>
        <Text type="secondary">
          配置并执行HTTP压力测试，实时监控性能指标
        </Text>
      </div>

      <Row gutter={24} style={{ marginTop: 24 }}>
        {/* 配置面板 */}
        <Col span={8}>
          <Card title="测试配置">
            <Form
              form={form}
              layout="vertical"
              onFinish={handleStart}
              initialValues={{
                method: 'GET',
                concurrency: 10,
                duration: 60,
                requestsPerSecond: 100,
              }}
            >
              <Form.Item
                label="目标URL"
                name="url"
                rules={[{ required: true, message: '请输入测试URL' }]}
              >
                <Input placeholder="https://api.example.com" />
              </Form.Item>

              <Form.Item
                label="请求方法"
                name="method"
              >
                <Select>
                  <Option value="GET">GET</Option>
                  <Option value="POST">POST</Option>
                  <Option value="PUT">PUT</Option>
                  <Option value="DELETE">DELETE</Option>
                </Select>
              </Form.Item>

              <Form.Item
                label="并发数"
                name="concurrency"
              >
                <InputNumber min={1} max={1000} style={{ width: '100%' }} />
              </Form.Item>

              <Form.Item
                label="测试时长（秒）"
                name="duration"
              >
                <InputNumber min={1} max={3600} style={{ width: '100%' }} />
              </Form.Item>

              <Form.Item
                label="每秒请求数"
                name="requestsPerSecond"
              >
                <InputNumber min={1} max={10000} style={{ width: '100%' }} />
              </Form.Item>

              <Form.Item
                label="请求头"
                name="headers"
              >
                <TextArea 
                  rows={3} 
                  placeholder="Content-Type: application/json"
                />
              </Form.Item>

              <Form.Item
                label="请求体"
                name="body"
              >
                <TextArea 
                  rows={3} 
                  placeholder='{"key": "value"}'
                />
              </Form.Item>

              <Space style={{ width: '100%' }}>
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  icon={<PlayCircleOutlined />}
                  disabled={isRunning}
                >
                  开始测试
                </Button>
                <Button 
                  icon={isPaused ? <PlayCircleOutlined /> : <PauseCircleOutlined />}
                  onClick={handlePause}
                  disabled={!isRunning}
                >
                  {isPaused ? '继续' : '暂停'}
                </Button>
                <Button 
                  danger
                  icon={<StopOutlined />}
                  onClick={handleStop}
                  disabled={!isRunning}
                >
                  停止
                </Button>
              </Space>
            </Form>
          </Card>
        </Col>

        {/* 结果面板 */}
        <Col span={16}>
          {/* 进度条 */}
          {isRunning && (
            <Alert
              message={
                <div>
                  <Text>测试进行中...</Text>
                  <Progress 
                    percent={progress} 
                    status={isPaused ? 'exception' : 'active'}
                    style={{ marginTop: 8 }}
                  />
                </div>
              }
              type="info"
              style={{ marginBottom: 16 }}
            />
          )}

          {/* 统计信息 */}
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={6}>
              <Card size="small">
                <Statistic
                  title="总请求数"
                  value={stats.totalRequests}
                  prefix={<ClockCircleOutlined />}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic
                  title="成功请求"
                  value={stats.successfulRequests}
                  prefix={<CheckCircleOutlined />}
                  valueStyle={{ color: '#3f8600' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic
                  title="失败请求"
                  value={stats.failedRequests}
                  prefix={<ExclamationCircleOutlined />}
                  valueStyle={{ color: '#cf1322' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic
                  title="平均响应时间"
                  value={stats.averageResponseTime}
                  precision={0}
                  suffix="ms"
                />
              </Card>
            </Col>
          </Row>

          {/* 详细结果 */}
          <Card title="实时结果" size="small">
            <Table
              columns={columns}
              dataSource={results}
              pagination={false}
              scroll={{ y: 400 }}
              size="small"
              rowKey="timestamp"
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default StressTest;
