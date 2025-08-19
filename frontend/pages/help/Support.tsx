/**
 * 技术支持页面
 * 
 * 提供技术支持和联系方式
 * 
 * @component
 * @author Test-Web Team
 * @since 1.0.0
 */

import React, { useState } from 'react';
import { Card, Form, Input, Button, Typography, Space, Row, Col, message, Select } from 'antd';
import { 
  CustomerServiceOutlined,
  MailOutlined,
  PhoneOutlined,
  WechatOutlined,
  QqOutlined,
  SendOutlined
} from '@ant-design/icons';

const { Title, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const Support: React.FC = () => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      // 模拟提交
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      message.success('支持请求已提交，我们会在24小时内回复您！');
      form.resetFields();
    } catch (error) {
      message.error('提交失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const contactMethods = [
    {
      title: '邮件支持',
      icon: <MailOutlined style={{ color: '#1890ff' }} />,
      content: 'support@test-web.com',
      description: '工作日24小时内回复',
      action: () => window.open('mailto:support@test-web.com')
    },
    {
      title: '电话支持',
      icon: <PhoneOutlined style={{ color: '#52c41a' }} />,
      content: '400-123-4567',
      description: '工作日 9:00-18:00',
      action: () => window.open('tel:400-123-4567')
    },
    {
      title: '微信支持',
      icon: <WechatOutlined style={{ color: '#52c41a' }} />,
      content: 'test-web-support',
      description: '扫码添加客服微信',
      action: () => message.info('请搜索微信号：test-web-support')
    },
    {
      title: 'QQ群',
      icon: <QqOutlined style={{ color: '#1890ff' }} />,
      content: '123456789',
      description: '技术交流群',
      action: () => message.info('请搜索QQ群：123456789')
    }
  ];

  return (
    <div className="support-page">
      <div className="mb-6">
        <Title level={2}>
          <CustomerServiceOutlined className="mr-2" />
          技术支持
        </Title>
        <Paragraph>
          遇到问题？我们的技术支持团队随时为您提供帮助。
        </Paragraph>
      </div>

      <Row gutter={24}>
        {/* 联系方式 */}
        <Col span={12}>
          <Card title="联系我们" className="mb-4">
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              {contactMethods.map((method, index) => (
                <Card 
                  key={index}
                  size="small" 
                  hoverable
                  style={{ cursor: 'pointer' }}
                  onClick={method.action}
                >
                  <Card.Meta
                    avatar={method.icon}
                    title={method.title}
                    description={
                      <div>
                        <div style={{ fontWeight: 500, marginBottom: 4 }}>
                          {method.content}
                        </div>
                        <div style={{ color: '#666', fontSize: '12px' }}>
                          {method.description}
                        </div>
                      </div>
                    }
                  />
                </Card>
              ))}
            </Space>
          </Card>

          {/* 服务时间 */}
          <Card title="服务时间">
            <Space direction="vertical" size="small">
              <div>
                <strong>技术支持：</strong>工作日 9:00-18:00
              </div>
              <div>
                <strong>紧急支持：</strong>7×24小时（付费用户）
              </div>
              <div>
                <strong>邮件支持：</strong>24小时内回复
              </div>
              <div>
                <strong>社区支持：</strong>全天候
              </div>
            </Space>
          </Card>
        </Col>

        {/* 提交支持请求 */}
        <Col span={12}>
          <Card title="提交支持请求">
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
            >
              <Form.Item
                label="问题类型"
                name="type"
                rules={[{ required: true, message: '请选择问题类型' }]}
              >
                <Select placeholder="请选择问题类型">
                  <Option value="technical">技术问题</Option>
                  <Option value="account">账户问题</Option>
                  <Option value="billing">计费问题</Option>
                  <Option value="feature">功能建议</Option>
                  <Option value="bug">Bug报告</Option>
                  <Option value="other">其他问题</Option>
                </Select>
              </Form.Item>

              <Form.Item
                label="联系邮箱"
                name="email"
                rules={[
                  { required: true, message: '请输入邮箱地址' },
                  { type: 'email', message: '请输入有效的邮箱地址' }
                ]}
              >
                <Input placeholder="your@email.com" />
              </Form.Item>

              <Form.Item
                label="问题标题"
                name="subject"
                rules={[{ required: true, message: '请输入问题标题' }]}
              >
                <Input placeholder="简要描述您的问题" />
              </Form.Item>

              <Form.Item
                label="详细描述"
                name="description"
                rules={[{ required: true, message: '请详细描述您的问题' }]}
              >
                <TextArea 
                  rows={6} 
                  placeholder="请详细描述您遇到的问题，包括操作步骤、错误信息等"
                />
              </Form.Item>

              <Form.Item
                label="优先级"
                name="priority"
                initialValue="medium"
              >
                <Select>
                  <Option value="low">低 - 一般咨询</Option>
                  <Option value="medium">中 - 影响使用</Option>
                  <Option value="high">高 - 严重问题</Option>
                  <Option value="urgent">紧急 - 系统故障</Option>
                </Select>
              </Form.Item>

              <Form.Item>
                <Button 
                  type="primary" 
                  htmlType="submit"
                  icon={<SendOutlined />}
                  loading={submitting}
                  size="large"
                  block
                >
                  提交支持请求
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>
      </Row>

      {/* 常见问题快速链接 */}
      <Card title="快速帮助" className="mt-6">
        <Row gutter={16}>
          <Col span={6}>
            <Card size="small" hoverable>
              <div className="text-center">
                <div style={{ fontSize: 24, marginBottom: 8 }}>📚</div>
                <div>使用文档</div>
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small" hoverable>
              <div className="text-center">
                <div style={{ fontSize: 24, marginBottom: 8 }}>❓</div>
                <div>常见问题</div>
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small" hoverable>
              <div className="text-center">
                <div style={{ fontSize: 24, marginBottom: 8 }}>🎥</div>
                <div>视频教程</div>
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small" hoverable>
              <div className="text-center">
                <div style={{ fontSize: 24, marginBottom: 8 }}>💬</div>
                <div>社区论坛</div>
              </div>
            </Card>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default Support;
