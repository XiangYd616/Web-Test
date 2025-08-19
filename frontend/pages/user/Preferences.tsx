/**
 * 用户偏好设置页面
 * 
 * 提供个性化偏好配置功能
 * 
 * @component
 * @author Test-Web Team
 * @since 1.0.0
 */

import React, { useState } from 'react';
import { Card, Form, Switch, Select, Slider, Button, Typography, Space, Row, Col, message } from 'antd';
import { 
  SettingOutlined, 
  BellOutlined, 
  EyeOutlined, 
  ThunderboltOutlined,
  SaveOutlined
} from '@ant-design/icons';

const { Title, Paragraph } = Typography;
const { Option } = Select;

interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: 'zh-CN' | 'en-US';
  notifications: {
    email: boolean;
    push: boolean;
    sound: boolean;
  };
  dashboard: {
    autoRefresh: boolean;
    refreshInterval: number;
    defaultView: 'grid' | 'list';
  };
  testing: {
    autoSave: boolean;
    confirmBeforeDelete: boolean;
    defaultTimeout: number;
  };
}

const Preferences: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const [preferences, setPreferences] = useState<UserPreferences>({
    theme: 'light',
    language: 'zh-CN',
    notifications: {
      email: true,
      push: true,
      sound: false
    },
    dashboard: {
      autoRefresh: true,
      refreshInterval: 30,
      defaultView: 'grid'
    },
    testing: {
      autoSave: true,
      confirmBeforeDelete: true,
      defaultTimeout: 60
    }
  });

  const handleSave = async (values: any) => {
    setLoading(true);
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setPreferences({ ...preferences, ...values });
      message.success('偏好设置保存成功！');
    } catch (error) {
      message.error('保存失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="preferences-page">
      <div className="mb-6">
        <Title level={2}>
          <SettingOutlined className="mr-2" />
          偏好设置
        </Title>
        <Paragraph>
          个性化您的使用体验，配置界面主题、通知方式和默认行为。
        </Paragraph>
      </div>

      <Form
        form={form}
        layout="vertical"
        initialValues={preferences}
        onFinish={handleSave}
      >
        <Row gutter={24}>
          {/* 界面设置 */}
          <Col span={12}>
            <Card title={<><EyeOutlined /> 界面设置</>} className="mb-4">
              <Form.Item
                label="主题模式"
                name="theme"
                extra="选择您喜欢的界面主题"
              >
                <Select>
                  <Option value="light">浅色主题</Option>
                  <Option value="dark">深色主题</Option>
                  <Option value="auto">跟随系统</Option>
                </Select>
              </Form.Item>

              <Form.Item
                label="界面语言"
                name="language"
                extra="选择界面显示语言"
              >
                <Select>
                  <Option value="zh-CN">简体中文</Option>
                  <Option value="en-US">English</Option>
                </Select>
              </Form.Item>

              <Form.Item
                label="默认视图"
                name={['dashboard', 'defaultView']}
                extra="设置仪表板的默认显示方式"
              >
                <Select>
                  <Option value="grid">网格视图</Option>
                  <Option value="list">列表视图</Option>
                </Select>
              </Form.Item>
            </Card>
          </Col>

          {/* 通知设置 */}
          <Col span={12}>
            <Card title={<><BellOutlined /> 通知设置</>} className="mb-4">
              <Form.Item
                label="邮件通知"
                name={['notifications', 'email']}
                valuePropName="checked"
                extra="接收重要事件的邮件通知"
              >
                <Switch />
              </Form.Item>

              <Form.Item
                label="推送通知"
                name={['notifications', 'push']}
                valuePropName="checked"
                extra="接收浏览器推送通知"
              >
                <Switch />
              </Form.Item>

              <Form.Item
                label="声音提醒"
                name={['notifications', 'sound']}
                valuePropName="checked"
                extra="通知时播放提示音"
              >
                <Switch />
              </Form.Item>
            </Card>
          </Col>
        </Row>

        <Row gutter={24}>
          {/* 仪表板设置 */}
          <Col span={12}>
            <Card title="仪表板设置" className="mb-4">
              <Form.Item
                label="自动刷新"
                name={['dashboard', 'autoRefresh']}
                valuePropName="checked"
                extra="自动刷新仪表板数据"
              >
                <Switch />
              </Form.Item>

              <Form.Item
                label="刷新间隔 (秒)"
                name={['dashboard', 'refreshInterval']}
                extra="自动刷新的时间间隔"
              >
                <Slider
                  min={10}
                  max={300}
                  marks={{
                    10: '10s',
                    30: '30s',
                    60: '1m',
                    120: '2m',
                    300: '5m'
                  }}
                />
              </Form.Item>
            </Card>
          </Col>

          {/* 测试设置 */}
          <Col span={12}>
            <Card title={<><ThunderboltOutlined /> 测试设置</>} className="mb-4">
              <Form.Item
                label="自动保存"
                name={['testing', 'autoSave']}
                valuePropName="checked"
                extra="自动保存测试配置和结果"
              >
                <Switch />
              </Form.Item>

              <Form.Item
                label="删除确认"
                name={['testing', 'confirmBeforeDelete']}
                valuePropName="checked"
                extra="删除测试结果前显示确认对话框"
              >
                <Switch />
              </Form.Item>

              <Form.Item
                label="默认超时时间 (秒)"
                name={['testing', 'defaultTimeout']}
                extra="测试的默认超时时间"
              >
                <Slider
                  min={30}
                  max={300}
                  marks={{
                    30: '30s',
                    60: '1m',
                    120: '2m',
                    180: '3m',
                    300: '5m'
                  }}
                />
              </Form.Item>
            </Card>
          </Col>
        </Row>

        {/* 保存按钮 */}
        <Card>
          <Form.Item>
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
                onClick={() => form.resetFields()}
                size="large"
              >
                重置
              </Button>
            </Space>
          </Form.Item>
        </Card>
      </Form>
    </div>
  );
};

export default Preferences;
