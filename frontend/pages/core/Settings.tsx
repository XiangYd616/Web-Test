import {
  GlobalOutlined,
  ReloadOutlined,
  SaveOutlined,
  SecurityScanOutlined,
  SettingOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  message,
  Row,
  Select,
  Slider,
  Space,
  Switch,
  Typography
} from 'antd';
import React, { useState } from 'react';

const { Title, Text } = Typography;
const { Option } = Select;

interface SettingsData {
  general: {
    theme: string;
    language: string;
    autoSave: boolean;
    notifications: boolean;
  };
  testing: {
    maxConcurrentTests: number;
    defaultTimeout: number;
    retryAttempts: number;
    enableLogging: boolean;
  };
  performance: {
    cacheEnabled: boolean;
    compressionLevel: number;
    maxMemoryUsage: number;
  };
  security: {
    enableSSL: boolean;
    apiKeyRequired: boolean;
    sessionTimeout: number;
  };
}

const Settings: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  // 默认设置
  const defaultSettings: SettingsData = {
    general: {
      theme: 'light',
      language: 'zh-CN',
      autoSave: true,
      notifications: true,
    },
    testing: {
      maxConcurrentTests: 5,
      defaultTimeout: 30,
      retryAttempts: 3,
      enableLogging: true,
    },
    performance: {
      cacheEnabled: true,
      compressionLevel: 6,
      maxMemoryUsage: 80,
    },
    security: {
      enableSSL: true,
      apiKeyRequired: false,
      sessionTimeout: 60,
    },
  };

  const handleSave = async (values: any) => {
    setLoading(true);
    try {
      // 模拟保存操作
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 保存到localStorage
      localStorage.setItem('test-web-settings', JSON.stringify(values));

      message.success('设置保存成功！');
    } catch (error) {
      message.error('保存失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    form.setFieldsValue(defaultSettings);
    message.info('已重置为默认设置');
  };

  return (
    <div className="settings-container">
      <div className="page-header">
        <Title level={2} className="page-title">
          <SettingOutlined /> 系统设置
        </Title>
        <Text type="secondary" className="page-description">
          配置Test-Web平台的各项参数和偏好设置
        </Text>
      </div>

      <Form
        form={form}
        layout="vertical"
        initialValues={defaultSettings}
        onFinish={handleSave}
        style={{ marginTop: 24 }}
      >
        {/* 通用设置 */}
        <Card title={<><GlobalOutlined /> 通用设置</>} style={{ marginBottom: 24 }}>
          <Row gutter={24}>
            <Col span={12}>
              <Form.Item
                label="主题模式"
                name={['general', 'theme']}
                tooltip="选择界面主题"
              >
                <Select>
                  <Option value="light">浅色主题</Option>
                  <Option value="dark">深色主题</Option>
                  <Option value="auto">跟随系统</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="语言"
                name={['general', 'language']}
              >
                <Select>
                  <Option value="zh-CN">简体中文</Option>
                  <Option value="en-US">English</Option>
                  <Option value="ja-JP">日本語</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={24}>
            <Col span={12}>
              <Form.Item
                label="自动保存"
                name={['general', 'autoSave']}
                valuePropName="checked"
              >
                <Switch checkedChildren="开启" unCheckedChildren="关闭" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="桌面通知"
                name={['general', 'notifications']}
                valuePropName="checked"
              >
                <Switch checkedChildren="开启" unCheckedChildren="关闭" />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* 测试设置 */}
        <Card title={<><ThunderboltOutlined /> 测试设置</>} style={{ marginBottom: 24 }}>
          <Row gutter={24}>
            <Col span={12}>
              <Form.Item
                label="最大并发测试数"
                name={['testing', 'maxConcurrentTests']}
                tooltip="同时运行的最大测试数量"
              >
                <Slider min={1} max={20} marks={{ 1: '1', 10: '10', 20: '20' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="默认超时时间（秒）"
                name={['testing', 'defaultTimeout']}
              >
                <Input type="number" min={5} max={300} addonAfter="秒" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={24}>
            <Col span={12}>
              <Form.Item
                label="重试次数"
                name={['testing', 'retryAttempts']}
              >
                <Select>
                  <Option value={0}>不重试</Option>
                  <Option value={1}>1次</Option>
                  <Option value={3}>3次</Option>
                  <Option value={5}>5次</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="启用详细日志"
                name={['testing', 'enableLogging']}
                valuePropName="checked"
              >
                <Switch checkedChildren="开启" unCheckedChildren="关闭" />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* 性能设置 */}
        <Card title="⚡ 性能设置" style={{ marginBottom: 24 }}>
          <Row gutter={24}>
            <Col span={12}>
              <Form.Item
                label="启用缓存"
                name={['performance', 'cacheEnabled']}
                valuePropName="checked"
              >
                <Switch checkedChildren="开启" unCheckedChildren="关闭" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="压缩级别"
                name={['performance', 'compressionLevel']}
              >
                <Slider min={0} max={9} marks={{ 0: '无', 5: '中等', 9: '最高' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="最大内存使用率（%）"
            name={['performance', 'maxMemoryUsage']}
          >
            <Slider min={50} max={95} marks={{ 50: '50%', 70: '70%', 90: '90%' }} />
          </Form.Item>
        </Card>

        {/* 安全设置 */}
        <Card title={<><SecurityScanOutlined /> 安全设置</>} style={{ marginBottom: 24 }}>
          <Row gutter={24}>
            <Col span={12}>
              <Form.Item
                label="启用SSL"
                name={['security', 'enableSSL']}
                valuePropName="checked"
              >
                <Switch checkedChildren="开启" unCheckedChildren="关闭" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="需要API密钥"
                name={['security', 'apiKeyRequired']}
                valuePropName="checked"
              >
                <Switch checkedChildren="开启" unCheckedChildren="关闭" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="会话超时时间（分钟）"
            name={['security', 'sessionTimeout']}
          >
            <Input type="number" min={5} max={480} addonAfter="分钟" />
          </Form.Item>
        </Card>

        {/* 操作按钮 */}
        <Card>
          <Space>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={loading}
              size="large"
            >
              保存设置
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={handleReset}
              size="large"
            >
              重置默认
            </Button>
          </Space>
        </Card>
      </Form>
    </div>
  );
};

export default Settings;
