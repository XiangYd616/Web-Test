/**
 * 🔧 测试配置表单组件
 * 从UnifiedTestExecutor中提取的专用配置表单
 * 支持所有测试类型的配置
 */

import {
  PlayCircleOutlined,
  ReloadOutlined,
  SettingOutlined
} from '@ant-design/icons';
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  Row,
  Select,
  Space
} from 'antd';
import React from 'react';
import { TestType } from '../../../types/enums';

const { Option } = Select;

export interface TestConfigFormProps {
  form: any;
  selectedTestType: TestType;
  supportedTypes: string[];
  onTestTypeChange: (type: TestType) => void;
  onExecuteTest: () => void;
  onRefreshEngine: () => void;
  onClearHistory: () => void;
  isExecuting: boolean;
  isConnected: boolean;
  completedTestsCount: number;
  className?: string;
}

/**
 * 获取测试类型标签
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

/**
 * 渲染测试类型特定字段
 */
const renderTestTypeSpecificFields = (testType: TestType) => {
  switch (testType) {
    case TestType.PERFORMANCE:
      return (
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item label="性能预算" name="performanceBudget">
              <Select defaultValue="standard">
                <Option value="strict">🎯 严格模式</Option>
                <Option value="standard">📊 标准模式</Option>
                <Option value="relaxed">🔄 宽松模式</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="设备类型" name="device">
              <Select defaultValue="desktop">
                <Option value="mobile">📱 移动设备</Option>
                <Option value="tablet">📱 平板设备</Option>
                <Option value="desktop">💻 桌面设备</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="网络条件" name="network">
              <Select defaultValue="4g">
                <Option value="3g">🐌 3G网络</Option>
                <Option value="4g">📶 4G网络</Option>
                <Option value="wifi">📡 WiFi网络</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>
      );

    case TestType.STRESS:
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

    case TestType.API:
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

    case TestType.SECURITY:
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
 * 测试配置表单组件
 */
export const TestConfigForm: React.FC<TestConfigFormProps> = ({
  form,
  selectedTestType,
  supportedTypes,
  onTestTypeChange,
  onExecuteTest,
  onRefreshEngine,
  onClearHistory,
  isExecuting,
  isConnected,
  completedTestsCount,
  className = ''
}) => {
  return (
    <Card title="🔧 测试配置" className={`mb-4 ${className}`}>
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
                onChange={onTestTypeChange}
                loading={false}
              >
                {supportedTypes.map(type => (
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
              <Input placeholder="https://example.com" />
            </Form.Item>
          </Col>
        </Row>

        {renderTestTypeSpecificFields(selectedTestType)}

        <Form.Item>
          <Space>
            <Button
              type="primary"
              size="large"
              icon={<PlayCircleOutlined />}
              onClick={onExecuteTest}
              loading={isExecuting}
              disabled={!isConnected}
            >
              开始测试
            </Button>

            <Button
              icon={<ReloadOutlined />}
              onClick={onRefreshEngine}
              loading={false}
            >
              刷新引擎
            </Button>

            <Button
              icon={<SettingOutlined />}
              onClick={onClearHistory}
              disabled={completedTestsCount === 0}
            >
              清理历史
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default TestConfigForm;
