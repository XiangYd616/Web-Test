import React, { useState } from 'react';
import { 
  Card, 
  Form, 
  Input, 
  Switch, 
  Button, 
  Select, 
  Slider, 
  Space, 
  Typography, 
  Row, 
  Col,
  message,
  Divider
} from 'antd';
import { 
  SettingOutlined, 
  SaveOutlined, 
  ReloadOutlined,
  SecurityScanOutlined,
  BugOutlined,
  GlobalOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;

interface SettingsData {
  // 系统设置
  theme: 'light' | 'dark' | 'auto';
  language: 'zh-CN' | 'en-US';
  autoSave: boolean;
  
  // 测试设置
  maxConcurrentTests: number;
  testTimeout: number;
  retryAttempts: number;
  
  // 安全设置
  enableSecurityScan: boolean;
  strictMode: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  
  // 通知设置
  emailNotifications: boolean;
  browserNotifications: boolean;
  notificationEmail: string;
}

const Settings: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<SettingsData>({
    theme: 'light',
    language: 'zh-CN',
    autoSave: true,
    maxConcurrentTests: 5,
    testTimeout: 30,
    retryAttempts: 3,
    enableSecurityScan: true,
    strictMode: false,
    logLevel: 'info',
    emailNotifications: true,
    browserNotifications: false,
    notificationEmail: ''
  });

  const handleSave = async (values: SettingsData) => {
    setLoading(true);
    
    try {
      // 模拟保存设置
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSettings(values);
      message.success('设置保存成功！');
    } catch (error) {
      message.error('保存设置失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    form.resetFields();
    message.info('设置已重置为默认值');
  };

  const handleTestConnection = async () => {
    message.loading('正在测试连接...', 2);
    
    // 模拟连接测试
    setTimeout(() => {
      message.success('连接测试成功！');
    }, 2000);
  };

  return (
    <div className="settings-page" style={{ padding: '24px' }}>
      <Title level={2}>
        <SettingOutlined style={{ marginRight: 8 }} />
        系统设置
      </Title>
      <Text type="secondary">配置系统参数和测试选项</Text>

      <Form
        form={form}
        layout="vertical"
        initialValues={settings}
        onFinish={handleSave}
        style={{ marginTop: 24 }}
      >
        <Row gutter={[24, 24]}>
          {/* 基础设置 */}
          <Col xs={24} lg={12}>
            <Card 
              title={
                <Space>
                  <GlobalOutlined />
                  基础设置
                </Space>
              }
            >
              <Form.Item
                label="主题模式"
                name="theme"
                tooltip="选择界面主题"
              >
                <Select>
                  <Option value="light">浅色主题</Option>
                  <Option value="dark">深色主题</Option>
                  <Option value="auto">跟随系统</Option>
                </Select>
              </Form.Item>

              <Form.Item
                label="语言"
                name="language"
              >
                <Select>
                  <Option value="zh-CN">简体中文</Option>
                  <Option value="en-US">English</Option>
                </Select>
              </Form.Item>

              <Form.Item
                label="自动保存"
                name="autoSave"
                valuePropName="checked"
              >
                <Switch checkedChildren="开启" unCheckedChildren="关闭" />
              </Form.Item>
            </Card>
          </Col>

          {/* 测试设置 */}
          <Col xs={24} lg={12}>
            <Card 
              title={
                <Space>
                  <BugOutlined />
                  测试设置
                </Space>
              }
            >
              <Form.Item
                label="最大并发测试数"
                name="maxConcurrentTests"
                tooltip="同时运行的最大测试数量"
              >
                <Slider
                  min={1}
                  max={20}
                  marks={{
                    1: '1',
                    5: '5',
                    10: '10',
                    20: '20'
                  }}
                />
              </Form.Item>

              <Form.Item
                label="测试超时时间（秒）"
                name="testTimeout"
              >
                <Input type="number" min={10} max={300} />
              </Form.Item>

              <Form.Item
                label="重试次数"
                name="retryAttempts"
              >
                <Select>
                  <Option value={1}>1次</Option>
                  <Option value={2}>2次</Option>
                  <Option value={3}>3次</Option>
                  <Option value={5}>5次</Option>
                </Select>
              </Form.Item>
            </Card>
          </Col>

          {/* 安全设置 */}
          <Col xs={24} lg={12}>
            <Card 
              title={
                <Space>
                  <SecurityScanOutlined />
                  安全设置
                </Space>
              }
            >
              <Form.Item
                label="启用安全扫描"
                name="enableSecurityScan"
                valuePropName="checked"
              >
                <Switch checkedChildren="开启" unCheckedChildren="关闭" />
              </Form.Item>

              <Form.Item
                label="严格模式"
                name="strictMode"
                valuePropName="checked"
                tooltip="启用更严格的安全检查"
              >
                <Switch checkedChildren="开启" unCheckedChildren="关闭" />
              </Form.Item>

              <Form.Item
                label="日志级别"
                name="logLevel"
              >
                <Select>
                  <Option value="debug">调试</Option>
                  <Option value="info">信息</Option>
                  <Option value="warn">警告</Option>
                  <Option value="error">错误</Option>
                </Select>
              </Form.Item>
            </Card>
          </Col>

          {/* 通知设置 */}
          <Col xs={24} lg={12}>
            <Card title="通知设置">
              <Form.Item
                label="邮件通知"
                name="emailNotifications"
                valuePropName="checked"
              >
                <Switch checkedChildren="开启" unCheckedChildren="关闭" />
              </Form.Item>

              <Form.Item
                label="浏览器通知"
                name="browserNotifications"
                valuePropName="checked"
              >
                <Switch checkedChildren="开启" unCheckedChildren="关闭" />
              </Form.Item>

              <Form.Item
                label="通知邮箱"
                name="notificationEmail"
                rules={[
                  { type: 'email', message: '请输入有效的邮箱地址' }
                ]}
              >
                <Input placeholder="输入邮箱地址" />
              </Form.Item>

              <Button 
                type="link" 
                onClick={handleTestConnection}
                style={{ padding: 0 }}
              >
                测试连接
              </Button>
            </Card>
          </Col>
        </Row>

        <Divider />

        {/* 操作按钮 */}
        <Row justify="end">
          <Col>
            <Space>
              <Button 
                icon={<ReloadOutlined />} 
                onClick={handleReset}
              >
                重置
              </Button>
              <Button 
                type="primary" 
                icon={<SaveOutlined />} 
                htmlType="submit"
                loading={loading}
              >
                保存设置
              </Button>
            </Space>
          </Col>
        </Row>
      </Form>

      {/* 系统信息 */}
      <Card title="系统信息" style={{ marginTop: 24 }}>
        <Row gutter={[16, 16]}>
          <Col span={8}>
            <Text strong>版本号：</Text>
            <Text>v1.0.0</Text>
          </Col>
          <Col span={8}>
            <Text strong>构建时间：</Text>
            <Text>2024-01-15</Text>
          </Col>
          <Col span={8}>
            <Text strong>运行环境：</Text>
            <Text>开发环境</Text>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default Settings;
