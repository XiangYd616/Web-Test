/**
 * 用户设置页面
 *
 * 提供用户账户和系统设置功能
 *
 * @component
 * @author Test-Web Team
 * @since 1.0.0
 */

import {
    BellOutlined,
    LockOutlined,
    MailOutlined,
    PhoneOutlined,
    SaveOutlined,
    SecurityScanOutlined,
    UserOutlined
} from '@ant-design/icons';
import { Button, Card, Divider, Form, Input, Select, Space, Switch, Typography, message } from 'antd';
import React, { useState } from 'react';

const { Title, Paragraph } = Typography;
const { Option } = Select;

interface UserSettings {
    profile: {
        username: string;
        email: string;
        phone: string;
        company: string;
    };
    security: {
        twoFactorAuth: boolean;
        loginNotification: boolean;
        sessionTimeout: number;
    };
    notifications: {
        emailNotifications: boolean;
        pushNotifications: boolean;
        testAlerts: boolean;
        weeklyReport: boolean;
    };
}

const Settings: React.FC = () => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);

    const [settings, setSettings] = useState<UserSettings>({
        profile: {
            username: 'testuser',
            email: 'user@test-web.com',
            phone: '+86 138 0013 8000',
            company: 'Test Company'
        },
        security: {
            twoFactorAuth: true,
            loginNotification: true,
            sessionTimeout: 30
        },
        notifications: {
            emailNotifications: true,
            pushNotifications: false,
            testAlerts: true,
            weeklyReport: true
        }
    });

    const handleSave = async (values: any) => {
        setLoading(true);
        try {
            // 模拟API调用
            await new Promise(resolve => setTimeout(resolve, 1000));

            setSettings({ ...settings, ...values });
            message.success('设置保存成功！');
        } catch (error) {
            message.error('保存失败，请重试');
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordChange = () => {
        message.info('密码修改功能开发中...');
    };

    return (
        <div className="user-settings">
            <div style={{ marginBottom: 24 }}>
                <Title level={2}>
                    <UserOutlined style={{ marginRight: 8 }} />
                    账户设置
                </Title>
                <Paragraph>
                    管理您的账户信息、安全设置和通知偏好。
                </Paragraph>
            </div>

            <Form
                form={form}
                layout="vertical"
                initialValues={settings}
                onFinish={handleSave}
            >
                {/* 基本信息 */}
                <Card title={<><UserOutlined /> 基本信息</>} style={{ marginBottom: 24 }}>
                    <Form.Item
                        label="用户名"
                        name={['profile', 'username']}
                        rules={[{ required: true, message: '请输入用户名' }]}
                    >
                        <Input prefix={<UserOutlined />} placeholder="请输入用户名" />
                    </Form.Item>

                    <Form.Item
                        label="邮箱地址"
                        name={['profile', 'email']}
                        rules={[
                            { required: true, message: '请输入邮箱地址' },
                            { type: 'email', message: '请输入有效的邮箱地址' }
                        ]}
                    >
                        <Input prefix={<MailOutlined />} placeholder="请输入邮箱地址" />
                    </Form.Item>

                    <Form.Item
                        label="手机号码"
                        name={['profile', 'phone']}
                    >
                        <Input prefix={<PhoneOutlined />} placeholder="请输入手机号码" />
                    </Form.Item>

                    <Form.Item
                        label="公司名称"
                        name={['profile', 'company']}
                    >
                        <Input placeholder="请输入公司名称" />
                    </Form.Item>
                </Card>

                {/* 安全设置 */}
                <Card title={<><SecurityScanOutlined /> 安全设置</>} style={{ marginBottom: 24 }}>
                    <Form.Item
                        label="双因子认证"
                        name={['security', 'twoFactorAuth']}
                        valuePropName="checked"
                        extra="启用双因子认证可以提高账户安全性"
                    >
                        <Switch />
                    </Form.Item>

                    <Form.Item
                        label="登录通知"
                        name={['security', 'loginNotification']}
                        valuePropName="checked"
                        extra="新设备登录时发送邮件通知"
                    >
                        <Switch />
                    </Form.Item>

                    <Form.Item
                        label="会话超时时间"
                        name={['security', 'sessionTimeout']}
                        extra="无操作自动退出的时间（分钟）"
                    >
                        <Select style={{ width: 200 }}>
                            <Option value={15}>15分钟</Option>
                            <Option value={30}>30分钟</Option>
                            <Option value={60}>1小时</Option>
                            <Option value={120}>2小时</Option>
                            <Option value={480}>8小时</Option>
                        </Select>
                    </Form.Item>

                    <Divider />

                    <Space>
                        <Button
                            icon={<LockOutlined />}
                            onClick={handlePasswordChange}
                        >
                            修改密码
                        </Button>
                        <Button danger>
                            注销所有设备
                        </Button>
                    </Space>
                </Card>

                {/* 通知设置 */}
                <Card title={<><BellOutlined /> 通知设置</>} style={{ marginBottom: 24 }}>
                    <Form.Item
                        label="邮件通知"
                        name={['notifications', 'emailNotifications']}
                        valuePropName="checked"
                        extra="接收重要事件的邮件通知"
                    >
                        <Switch />
                    </Form.Item>

                    <Form.Item
                        label="推送通知"
                        name={['notifications', 'pushNotifications']}
                        valuePropName="checked"
                        extra="接收浏览器推送通知"
                    >
                        <Switch />
                    </Form.Item>

                    <Form.Item
                        label="测试提醒"
                        name={['notifications', 'testAlerts']}
                        valuePropName="checked"
                        extra="测试完成或失败时发送通知"
                    >
                        <Switch />
                    </Form.Item>

                    <Form.Item
                        label="周报推送"
                        name={['notifications', 'weeklyReport']}
                        valuePropName="checked"
                        extra="每周发送测试活动汇总报告"
                    >
                        <Switch />
                    </Form.Item>
                </Card>

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

export default Settings;
