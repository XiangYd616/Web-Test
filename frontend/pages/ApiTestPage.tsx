/**
 * API测试页面
 * 用于演示和测试前后端API集成
 * 版本: v1.0.0
 */

import React, { useState, useEffect } from 'react';
import { Card, Button, Input, Select, Alert, Spin, Tabs, Space, Typography, Divider } from 'antd';
import { PlayCircleOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { unifiedApiService } from '../services/api/apiService';
import { testApiService } from '../services/api/testApiService';
import { projectApiService } from '../services/api/projectApiService';
import type { ApiResponse } from '../types/unified/apiResponse';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;
const { TabPane } = Tabs;

interface TestResult {
  endpoint: string;
  method: string;
  status: 'success' | 'error' | 'pending';
  response?: any;
  error?: string;
  duration?: number;
}

const ApiTestPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [customEndpoint, setCustomEndpoint] = useState('/api/v1/system/health');
  const [customMethod, setCustomMethod] = useState<'GET' | 'POST' | 'PUT' | 'DELETE'>('GET');
  const [customBody, setCustomBody] = useState('{}');

  // ==================== 预定义测试用例 ====================

  const predefinedTests = [
    {
      name: '系统健康检查',
      endpoint: '/api/v1/system/health',
      method: 'GET' as const,
      description: '检查系统健康状态'
    },
    {
      name: '获取系统指标',
      endpoint: '/api/v1/system/metrics',
      method: 'GET' as const,
      description: '获取系统性能指标'
    },
    {
      name: '获取项目列表',
      endpoint: '/api/v1/projects',
      method: 'GET' as const,
      description: '获取用户项目列表'
    },
    {
      name: '获取测试配置',
      endpoint: '/api/v1/configurations',
      method: 'GET' as const,
      description: '获取测试配置列表'
    },
    {
      name: '获取仪表板数据',
      endpoint: '/api/v1/analytics/dashboard',
      method: 'GET' as const,
      description: '获取分析仪表板数据'
    }
  ];

  // ==================== 测试执行函数 ====================

  const executeTest = async (endpoint: string, method: string, body?: any): Promise<TestResult> => {
    const startTime = Date.now();
    
    try {
      let response: ApiResponse;
      
      switch (method.toUpperCase()) {
        case 'GET':
          response = await unifiedApiService.get(endpoint);
          break;
        case 'POST':
          response = await unifiedApiService.post(endpoint, body);
          break;
        case 'PUT':
          response = await unifiedApiService.put(endpoint, body);
          break;
        case 'DELETE':
          response = await unifiedApiService.delete(endpoint);
          break;
        default:
          throw new Error(`不支持的HTTP方法: ${method}`);
      }

      const duration = Date.now() - startTime;

      return {
        endpoint,
        method,
        status: response.success ? 'success' : 'error',
        response,
        duration
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      return {
        endpoint,
        method,
        status: 'error',
        error: error instanceof Error ? error.message : '未知错误',
        duration
      };
    }
  };

  // ==================== 批量测试执行 ====================

  const runAllTests = async () => {
    setLoading(true);
    setTestResults([]);

    const results: TestResult[] = [];

    for (const test of predefinedTests) {
      // 添加pending状态
      const pendingResult: TestResult = {
        endpoint: test.endpoint,
        method: test.method,
        status: 'pending'
      };
      results.push(pendingResult);
      setTestResults([...results]);

      // 执行测试
      const result = await executeTest(test.endpoint, test.method);
      
      // 更新结果
      results[results.length - 1] = result;
      setTestResults([...results]);

      // 添加延迟以便观察过程
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setLoading(false);
  };

  // ==================== 单个测试执行 ====================

  const runSingleTest = async (test: typeof predefinedTests[0]) => {
    setLoading(true);

    const result = await executeTest(test.endpoint, test.method);
    
    setTestResults(prev => {
      const newResults = prev.filter(r => r.endpoint !== test.endpoint);
      return [...newResults, result];
    });

    setLoading(false);
  };

  // ==================== 自定义测试执行 ====================

  const runCustomTest = async () => {
    setLoading(true);

    let body;
    try {
      body = customMethod !== 'GET' && customBody ? JSON.parse(customBody) : undefined;
    } catch (error) {
      setTestResults(prev => [...prev, {
        endpoint: customEndpoint,
        method: customMethod,
        status: 'error',
        error: 'JSON格式错误'
      }]);
      setLoading(false);
      return;
    }

    const result = await executeTest(customEndpoint, customMethod, body);
    
    setTestResults(prev => {
      const newResults = prev.filter(r => r.endpoint !== customEndpoint);
      return [...newResults, result];
    });

    setLoading(false);
  };

  // ==================== 结果渲染函数 ====================

  const renderTestResult = (result: TestResult) => {
    const getStatusIcon = () => {
      switch (result.status) {
        case 'success':
          return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
        case 'error':
          return <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />;
        case 'pending':
          return <Spin size="small" />;
        default:
          return null;
      }
    };

    const getStatusColor = () => {
      switch (result.status) {
        case 'success':
          return '#f6ffed';
        case 'error':
          return '#fff2f0';
        case 'pending':
          return '#f0f9ff';
        default:
          return '#fafafa';
      }
    };

    return (
      <Card
        key={`${result.endpoint}-${result.method}`}
        size="small"
        style={{ 
          marginBottom: 8,
          backgroundColor: getStatusColor(),
          border: `1px solid ${result.status === 'success' ? '#b7eb8f' : result.status === 'error' ? '#ffccc7' : '#91d5ff'}`
        }}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Space>
            {getStatusIcon()}
            <Text strong>{result.method}</Text>
            <Text code>{result.endpoint}</Text>
            {result.duration && (
              <Text type="secondary">({result.duration}ms)</Text>
            )}
          </Space>

          {result.error && (
            <Alert
              message="错误"
              description={result.error}
              type="error"
              size="small"
              showIcon
            />
          )}

          {result.response && (
            <div>
              <Text strong>响应:</Text>
              <pre style={{ 
                background: '#f5f5f5', 
                padding: 8, 
                borderRadius: 4, 
                fontSize: 12,
                maxHeight: 200,
                overflow: 'auto'
              }}>
                {JSON.stringify(result.response, null, 2)}
              </pre>
            </div>
          )}
        </Space>
      </Card>
    );
  };

  // ==================== 组件渲染 ====================

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <Title level={2}>API集成测试</Title>
      <Paragraph>
        此页面用于测试前后端API集成的正确性。您可以运行预定义的测试用例，
        或者自定义API端点进行测试。
      </Paragraph>

      <Tabs defaultActiveKey="predefined">
        <TabPane tab="预定义测试" key="predefined">
          <Space direction="vertical" style={{ width: '100%' }}>
            <Card>
              <Space>
                <Button
                  type="primary"
                  icon={<PlayCircleOutlined />}
                  onClick={runAllTests}
                  loading={loading}
                  size="large"
                >
                  运行所有测试
                </Button>
                <Text type="secondary">
                  将依次执行所有预定义的API测试用例
                </Text>
              </Space>
            </Card>

            <Divider />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
              {predefinedTests.map((test, index) => (
                <Card
                  key={index}
                  title={test.name}
                  size="small"
                  extra={
                    <Button
                      size="small"
                      onClick={() => runSingleTest(test)}
                      loading={loading}
                    >
                      测试
                    </Button>
                  }
                >
                  <Space direction="vertical" size="small">
                    <Text><strong>端点:</strong> <Text code>{test.endpoint}</Text></Text>
                    <Text><strong>方法:</strong> <Text code>{test.method}</Text></Text>
                    <Text type="secondary">{test.description}</Text>
                  </Space>
                </Card>
              ))}
            </div>
          </Space>
        </TabPane>

        <TabPane tab="自定义测试" key="custom">
          <Card title="自定义API测试">
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text strong>API端点:</Text>
                <Input
                  value={customEndpoint}
                  onChange={(e) => setCustomEndpoint(e.target.value)}
                  placeholder="/api/v1/endpoint"
                  style={{ marginTop: 4 }}
                />
              </div>

              <div>
                <Text strong>HTTP方法:</Text>
                <Select
                  value={customMethod}
                  onChange={setCustomMethod}
                  style={{ width: '100%', marginTop: 4 }}
                >
                  <Option value="GET">GET</Option>
                  <Option value="POST">POST</Option>
                  <Option value="PUT">PUT</Option>
                  <Option value="DELETE">DELETE</Option>
                </Select>
              </div>

              {customMethod !== 'GET' && (
                <div>
                  <Text strong>请求体 (JSON):</Text>
                  <TextArea
                    value={customBody}
                    onChange={(e) => setCustomBody(e.target.value)}
                    placeholder='{"key": "value"}'
                    rows={4}
                    style={{ marginTop: 4 }}
                  />
                </div>
              )}

              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                onClick={runCustomTest}
                loading={loading}
                block
              >
                执行测试
              </Button>
            </Space>
          </Card>
        </TabPane>

        <TabPane tab="测试结果" key="results">
          <Card title={`测试结果 (${testResults.length})`}>
            {testResults.length === 0 ? (
              <Alert
                message="暂无测试结果"
                description="请先运行一些测试用例"
                type="info"
                showIcon
              />
            ) : (
              <div>
                {testResults.map(renderTestResult)}
              </div>
            )}
          </Card>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default ApiTestPage;
