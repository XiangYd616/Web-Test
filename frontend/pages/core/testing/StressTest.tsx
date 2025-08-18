import { PauseCircleOutlined, PlayCircleOutlined, ReloadOutlined, StopOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Col, Progress, Row, Space, Statistic, Typography } from 'antd';
import React, { useCallback, useEffect, useState } from 'react';

const { Title, Text } = Typography;

interface StressTestResult {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  requestsPerSecond: number;
}

interface StressTestConfig {
  url: string;
  concurrency: number;
  duration: number;
  requestCount: number;
}

const StressTest: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<StressTestResult | null>(null);
  const [config, setConfig] = useState<StressTestConfig>({
    url: 'https://example.com',
    concurrency: 10,
    duration: 60,
    requestCount: 1000
  });

  // 页面标题管理
  useEffect(() => {
    document.title = 'Stress Test - Test Web App'

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('页面变为可见状态');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // 开始压力测试
  const startTest = useCallback(() => {
    setIsRunning(true);
    setIsPaused(false);
    setProgress(0);
    setResults(null);

    console.log('开始压力测试:', config);

    // 模拟测试进度
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsRunning(false);

          // 模拟测试结果
          setResults({
            totalRequests: config.requestCount,
            successfulRequests: Math.floor(config.requestCount * 0.95),
            failedRequests: Math.floor(config.requestCount * 0.05),
            averageResponseTime: 250,
            minResponseTime: 100,
            maxResponseTime: 500,
            requestsPerSecond: config.concurrency * 2
          });

          return 100;
        }
        return prev + 1;
      });
    }, 100);

  }, [config]);

  // 暂停测试
  const pauseTest = useCallback(() => {
    setIsPaused(true);
    console.log('暂停压力测试');
  }, []);

  // 停止测试
  const stopTest = useCallback(() => {
    setIsRunning(false);
    setIsPaused(false);
    setProgress(0);
    console.log('停止压力测试');
  }, []);

  // 重置测试
  const resetTest = useCallback(() => {
    setIsRunning(false);
    setIsPaused(false);
    setProgress(0);
    setResults(null);
    console.log('重置压力测试');
  }, []);

  return (
    <div className="stress-test-container">
      <Title level={2}>压力测试</Title>

      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card title="测试配置" className="config-card">
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text strong>目标URL: </Text>
                <Text code>{config.url}</Text>
              </div>
              <div>
                <Text strong>并发数: </Text>
                <Text>{config.concurrency}</Text>
              </div>
              <div>
                <Text strong>持续时间: </Text>
                <Text>{config.duration}秒</Text>
              </div>
              <div>
                <Text strong>请求总数: </Text>
                <Text>{config.requestCount}</Text>
              </div>
            </Space>
          </Card>
        </Col>

        <Col span={24}>
          <Card title="测试控制" className="control-card">
            <Space>
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                onClick={startTest}
                disabled={isRunning}
                size="large"
              >
                开始测试
              </Button>

              <Button
                icon={<PauseCircleOutlined />}
                onClick={pauseTest}
                disabled={!isRunning || isPaused}
                size="large"
              >
                暂停
              </Button>

              <Button
                icon={<StopOutlined />}
                onClick={stopTest}
                disabled={!isRunning}
                size="large"
              >
                停止
              </Button>

              <Button
                icon={<ReloadOutlined />}
                onClick={resetTest}
                disabled={isRunning}
                size="large"
              >
                重置
              </Button>
            </Space>
          </Card>
        </Col>

        {isRunning && (
          <Col span={24}>
            <Card title="测试进度" className="progress-card">
              <Progress
                percent={progress}
                status={isPaused ? 'exception' : 'active'}
                strokeColor={{
                  '0%': '#108ee9',
                  '100%': '#87d068',
                }}
              />
              <div style={{ marginTop: 16 }}>
                <Text>当前进度: {progress}%</Text>
              </div>
            </Card>
          </Col>
        )}

        {results && (
          <Col span={24}>
            <Card title="测试结果" className="results-card">
              <Row gutter={16}>
                <Col span={6}>
                  <Statistic
                    title="总请求数"
                    value={results.totalRequests}
                    valueStyle={{ color: '#3f8600' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="成功请求"
                    value={results.successfulRequests}
                    valueStyle={{ color: '#3f8600' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="失败请求"
                    value={results.failedRequests}
                    valueStyle={{ color: '#cf1322' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="平均响应时间"
                    value={results.averageResponseTime}
                    suffix="ms"
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Col>
              </Row>

              <Row gutter={16} style={{ marginTop: 16 }}>
                <Col span={8}>
                  <Statistic
                    title="最小响应时间"
                    value={results.minResponseTime}
                    suffix="ms"
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="最大响应时间"
                    value={results.maxResponseTime}
                    suffix="ms"
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="每秒请求数"
                    value={results.requestsPerSecond}
                    suffix="req/s"
                  />
                </Col>
              </Row>
            </Card>
          </Col>
        )}
      </Row>

      {results && results.failedRequests > 0 && (
        <Alert
          message="测试完成"
          description={`测试已完成，共有 ${results.failedRequests} 个请求失败。请检查目标服务器状态。`}
          type="warning"
          showIcon
          style={{ marginTop: 16 }}
        />
      )}
    </div>
  );
};

export default StressTest;
