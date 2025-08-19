/**
 * 用户资料页面
 *
 * 提供完整的用户资料管理功能，包括头像上传、个人信息编辑、
 * 安全设置、偏好配置等
 *
 * @component
 * @author Test-Web Team
 * @since 1.0.0
 */

import {
  BellOutlined,
  CameraOutlined,
  EditOutlined,
  EyeInvisibleOutlined,
  GlobalOutlined,
  KeyOutlined,
  LockOutlined,
  MailOutlined,
  PhoneOutlined,
  SaveOutlined,
  UserOutlined
} from '@ant-design/icons';
import type { UploadProps } from 'antd';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Col,
  DatePicker,
  Divider,
  Form,
  Input,
  message,
  Modal,
  Row,
  Select,
  Space,
  Statistic,
  Switch,
  Tabs,
  Typography,
  Upload
} from 'antd';
import React, { useState } from 'react';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;
const { TextArea } = Input;

/**
 * 用户信息接口
 */
interface UserProfile {
  id: string;
  username: string;
  email: string;
  phone?: string;
  fullName: string;
  avatar?: string;
  bio?: string;
  location?: string;
  website?: string;
  company?: string;
  position?: string;
  birthday?: string;
  gender?: 'male' | 'female' | 'other';
  timezone: string;
  language: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  twoFactorEnabled: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

/**
 * 安全设置接口
 */
interface SecuritySettings {
  twoFactorEnabled: boolean;
  loginNotifications: boolean;
  securityAlerts: boolean;
  sessionTimeout: number;
  allowedIPs: string[];
  apiKeyEnabled: boolean;
}

/**
 * 通知设置接口
 */
interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  testCompletionNotifications: boolean;
  securityAlerts: boolean;
  marketingEmails: boolean;
  weeklyReports: boolean;
}

const Profile: React.FC = () => {
  const [form] = Form.useForm();
  const [securityForm] = Form.useForm();
  const [notificationForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [activeTab, setActiveTab] = useState('profile');

  // 模拟用户数据
  const [userProfile, setUserProfile] = useState<UserProfile>({
    id: 'user_123',
    username: 'testuser',
    email: 'user@example.com',
    phone: '+86 138****8888',
    fullName: '测试用户',
    avatar: '',
    bio: '专业的网站测试工程师，专注于性能优化和安全测试。',
    location: '北京, 中国',
    website: 'https://example.com',
    company: 'Test-Web科技',
    position: '高级测试工程师',
    birthday: '1990-01-01',
    gender: 'male',
    timezone: 'Asia/Shanghai',
    language: 'zh-CN',
    emailVerified: true,
    phoneVerified: false,
    twoFactorEnabled: false,
    lastLoginAt: '2025-08-19T10:30:00Z',
    createdAt: '2024-01-01T00:00:00Z'
  });

  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    twoFactorEnabled: false,
    loginNotifications: true,
    securityAlerts: true,
    sessionTimeout: 60,
    allowedIPs: [],
    apiKeyEnabled: false
  });

  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    emailNotifications: true,
    pushNotifications: true,
    testCompletionNotifications: true,
    securityAlerts: true,
    marketingEmails: false,
    weeklyReports: true
  });

  /**
   * 头像上传配置
   */
  const uploadProps: UploadProps = {
    name: 'avatar',
    listType: 'picture-card',
    className: 'avatar-uploader',
    showUploadList: false,
    beforeUpload: (file) => {
      const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png';
      if (!isJpgOrPng) {
        message.error('只能上传 JPG/PNG 格式的图片!');
        return false;
      }
      const isLt2M = file.size / 1024 / 1024 < 2;
      if (!isLt2M) {
        message.error('图片大小不能超过 2MB!');
        return false;
      }

      // 模拟上传
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      return false; // 阻止自动上传
    },
  };

  /**
   * 保存个人资料
   */
  const handleSaveProfile = async (values: any) => {
    setLoading(true);
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1000));

      setUserProfile({ ...userProfile, ...values });
      setEditMode(false);
      message.success('个人资料更新成功！');
    } catch (error) {
      message.error('更新失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 保存安全设置
   */
  const handleSaveSecurity = async (values: SecuritySettings) => {
    setLoading(true);
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1000));

      setSecuritySettings(values);
      message.success('安全设置更新成功！');
    } catch (error) {
      message.error('更新失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 保存通知设置
   */
  const handleSaveNotifications = async (values: NotificationSettings) => {
    setLoading(true);
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1000));

      setNotificationSettings(values);
      message.success('通知设置更新成功！');
    } catch (error) {
      message.error('更新失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 启用双因子认证
   */
  const handleEnable2FA = () => {
    Modal.confirm({
      title: '启用双因子认证',
      content: '启用双因子认证将大大提高您账户的安全性。您需要使用认证应用扫描二维码。',
      onOk: async () => {
        // 模拟启用2FA
        setSecuritySettings({ ...securitySettings, twoFactorEnabled: true });
        message.success('双因子认证已启用！');
      }
    });
  };

  return (
    <div className="profile-page">
      <div className="mb-6">
        <Title level={2}>
          <UserOutlined className="mr-2" />
          个人资料
        </Title>
        <Paragraph>
          管理您的个人信息、安全设置和通知偏好。
        </Paragraph>
      </div>

      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab="基本信息" key="profile">
          <Row gutter={24}>
            <Col span={8}>
              {/* 头像和基本信息卡片 */}
              <Card className="text-center">
                <div className="mb-4">
                  <Upload {...uploadProps}>
                    <Avatar
                      size={120}
                      src={avatarUrl || userProfile.avatar}
                      icon={<UserOutlined />}
                      className="mb-2"
                    />
                    <div className="upload-overlay">
                      <CameraOutlined />
                    </div>
                  </Upload>
                </div>

                <Title level={4}>{userProfile.fullName}</Title>
                <Text type="secondary">@{userProfile.username}</Text>

                <div className="mt-4">
                  <Space direction="vertical" size="small">
                    <div>
                      <Badge
                        status={userProfile.emailVerified ? "success" : "warning"}
                        text={userProfile.emailVerified ? "邮箱已验证" : "邮箱未验证"}
                      />
                    </div>
                    <div>
                      <Badge
                        status={userProfile.phoneVerified ? "success" : "warning"}
                        text={userProfile.phoneVerified ? "手机已验证" : "手机未验证"}
                      />
                    </div>
                    <div>
                      <Badge
                        status={userProfile.twoFactorEnabled ? "success" : "default"}
                        text={userProfile.twoFactorEnabled ? "双因子认证已启用" : "双因子认证未启用"}
                      />
                    </div>
                  </Space>
                </div>

                <Divider />

                <Row gutter={16}>
                  <Col span={12}>
                    <Statistic
                      title="注册时间"
                      value={new Date(userProfile.createdAt).toLocaleDateString()}
                      valueStyle={{ fontSize: '14px' }}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title="最后登录"
                      value={new Date(userProfile.lastLoginAt || '').toLocaleString()}
                      valueStyle={{ fontSize: '14px' }}
                    />
                  </Col>
                </Row>
              </Card>
            </Col>

            <Col span={16}>
              {/* 详细信息表单 */}
              <Card
                title="个人信息"
                extra={
                  <Button
                    type={editMode ? "default" : "primary"}
                    icon={editMode ? <SaveOutlined /> : <EditOutlined />}
                    onClick={() => editMode ? form.submit() : setEditMode(true)}
                    loading={loading}
                  >
                    {editMode ? '保存' : '编辑'}
                  </Button>
                }
              >
                <Form
                  form={form}
                  layout="vertical"
                  initialValues={userProfile}
                  onFinish={handleSaveProfile}
                  disabled={!editMode}
                >
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        label="用户名"
                        name="username"
                        rules={[{ required: true, message: '请输入用户名' }]}
                      >
                        <Input prefix={<UserOutlined />} />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        label="全名"
                        name="fullName"
                        rules={[{ required: true, message: '请输入全名' }]}
                      >
                        <Input />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        label="邮箱"
                        name="email"
                        rules={[
                          { required: true, message: '请输入邮箱' },
                          { type: 'email', message: '请输入有效的邮箱地址' }
                        ]}
                      >
                        <Input prefix={<MailOutlined />} />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        label="手机号"
                        name="phone"
                      >
                        <Input prefix={<PhoneOutlined />} />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Form.Item
                    label="个人简介"
                    name="bio"
                  >
                    <TextArea rows={3} placeholder="介绍一下自己..." />
                  </Form.Item>

                  <Row gutter={16}>
                    <Col span={8}>
                      <Form.Item
                        label="公司"
                        name="company"
                      >
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item
                        label="职位"
                        name="position"
                      >
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item
                        label="地区"
                        name="location"
                      >
                        <Input prefix={<GlobalOutlined />} />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Row gutter={16}>
                    <Col span={8}>
                      <Form.Item
                        label="网站"
                        name="website"
                      >
                        <Input placeholder="https://" />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item
                        label="时区"
                        name="timezone"
                      >
                        <Select>
                          <Option value="Asia/Shanghai">北京时间 (UTC+8)</Option>
                          <Option value="America/New_York">纽约时间 (UTC-5)</Option>
                          <Option value="Europe/London">伦敦时间 (UTC+0)</Option>
                          <Option value="Asia/Tokyo">东京时间 (UTC+9)</Option>
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item
                        label="语言"
                        name="language"
                      >
                        <Select>
                          <Option value="zh-CN">简体中文</Option>
                          <Option value="en-US">English</Option>
                          <Option value="ja-JP">日本語</Option>
                        </Select>
                      </Form.Item>
                    </Col>
                  </Row>

                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        label="生日"
                        name="birthday"
                      >
                        <DatePicker
                          style={{ width: '100%' }}
                          placeholder="选择生日"
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        label="性别"
                        name="gender"
                      >
                        <Select placeholder="选择性别">
                          <Option value="male">男</Option>
                          <Option value="female">女</Option>
                          <Option value="other">其他</Option>
                        </Select>
                      </Form.Item>
                    </Col>
                  </Row>
                </Form>
              </Card>
            </Col>
          </Row>
        </TabPane>

        <TabPane tab="安全设置" key="security">
          <Row gutter={24}>
            <Col span={12}>
              <Card title={<><LockOutlined /> 账户安全</>}>
                <Form
                  form={securityForm}
                  layout="vertical"
                  initialValues={securitySettings}
                  onFinish={handleSaveSecurity}
                >
                  <Form.Item
                    label="双因子认证"
                    extra="为您的账户添加额外的安全保护"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <Text strong>双因子认证 (2FA)</Text>
                        <br />
                        <Text type="secondary">
                          {securitySettings.twoFactorEnabled ? '已启用' : '未启用'}
                        </Text>
                      </div>
                      <Button
                        type={securitySettings.twoFactorEnabled ? "default" : "primary"}
                        icon={<SafetyOutlined />}
                        onClick={handleEnable2FA}
                        disabled={securitySettings.twoFactorEnabled}
                      >
                        {securitySettings.twoFactorEnabled ? '已启用' : '启用'}
                      </Button>
                    </div>
                  </Form.Item>

                  <Divider />

                  <Form.Item
                    label="登录通知"
                    name="loginNotifications"
                    valuePropName="checked"
                  >
                    <Switch
                      checkedChildren="开启"
                      unCheckedChildren="关闭"
                    />
                  </Form.Item>

                  <Form.Item
                    label="安全警报"
                    name="securityAlerts"
                    valuePropName="checked"
                  >
                    <Switch
                      checkedChildren="开启"
                      unCheckedChildren="关闭"
                    />
                  </Form.Item>

                  <Form.Item
                    label="会话超时时间"
                    name="sessionTimeout"
                    extra="分钟后自动退出登录"
                  >
                    <Select>
                      <Option value={15}>15分钟</Option>
                      <Option value={30}>30分钟</Option>
                      <Option value={60}>1小时</Option>
                      <Option value={120}>2小时</Option>
                      <Option value={480}>8小时</Option>
                    </Select>
                  </Form.Item>

                  <Form.Item
                    label="API密钥"
                    name="apiKeyEnabled"
                    valuePropName="checked"
                    extra="启用API访问密钥"
                  >
                    <Switch
                      checkedChildren="开启"
                      unCheckedChildren="关闭"
                    />
                  </Form.Item>

                  <Form.Item>
                    <Button
                      type="primary"
                      htmlType="submit"
                      icon={<SaveOutlined />}
                      loading={loading}
                    >
                      保存安全设置
                    </Button>
                  </Form.Item>
                </Form>
              </Card>
            </Col>

            <Col span={12}>
              <Card title={<><KeyOutlined /> 密码管理</>}>
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                  <div>
                    <Text strong>更改密码</Text>
                    <br />
                    <Text type="secondary">定期更改密码以保护账户安全</Text>
                    <br />
                    <Button
                      type="primary"
                      icon={<LockOutlined />}
                      className="mt-2"
                    >
                      更改密码
                    </Button>
                  </div>

                  <Divider />

                  <div>
                    <Text strong>登录历史</Text>
                    <br />
                    <Text type="secondary">查看最近的登录活动</Text>
                    <br />
                    <Button
                      icon={<EyeInvisibleOutlined />}
                      className="mt-2"
                    >
                      查看登录历史
                    </Button>
                  </div>

                  <Divider />

                  <div>
                    <Text strong>活跃会话</Text>
                    <br />
                    <Text type="secondary">管理您的活跃登录会话</Text>
                    <br />
                    <Button
                      danger
                      className="mt-2"
                    >
                      终止所有会话
                    </Button>
                  </div>
                </Space>
              </Card>
            </Col>
          </Row>
        </TabPane>

        <TabPane tab="通知设置" key="notifications">
          <Card title={<><BellOutlined /> 通知偏好</>}>
            <Form
              form={notificationForm}
              layout="vertical"
              initialValues={notificationSettings}
              onFinish={handleSaveNotifications}
            >
              <Row gutter={24}>
                <Col span={12}>
                  <Title level={5}>基本通知</Title>

                  <Form.Item
                    label="邮件通知"
                    name="emailNotifications"
                    valuePropName="checked"
                    extra="接收重要的邮件通知"
                  >
                    <Switch
                      checkedChildren="开启"
                      unCheckedChildren="关闭"
                    />
                  </Form.Item>

                  <Form.Item
                    label="推送通知"
                    name="pushNotifications"
                    valuePropName="checked"
                    extra="接收浏览器推送通知"
                  >
                    <Switch
                      checkedChildren="开启"
                      unCheckedChildren="关闭"
                    />
                  </Form.Item>

                  <Form.Item
                    label="测试完成通知"
                    name="testCompletionNotifications"
                    valuePropName="checked"
                    extra="测试完成时发送通知"
                  >
                    <Switch
                      checkedChildren="开启"
                      unCheckedChildren="关闭"
                    />
                  </Form.Item>
                </Col>

                <Col span={12}>
                  <Title level={5}>高级通知</Title>

                  <Form.Item
                    label="安全警报"
                    name="securityAlerts"
                    valuePropName="checked"
                    extra="账户安全相关的警报"
                  >
                    <Switch
                      checkedChildren="开启"
                      unCheckedChildren="关闭"
                    />
                  </Form.Item>

                  <Form.Item
                    label="营销邮件"
                    name="marketingEmails"
                    valuePropName="checked"
                    extra="产品更新和营销信息"
                  >
                    <Switch
                      checkedChildren="开启"
                      unCheckedChildren="关闭"
                    />
                  </Form.Item>

                  <Form.Item
                    label="周报"
                    name="weeklyReports"
                    valuePropName="checked"
                    extra="每周测试活动报告"
                  >
                    <Switch
                      checkedChildren="开启"
                      unCheckedChildren="关闭"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Divider />

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<SaveOutlined />}
                  loading={loading}
                >
                  保存通知设置
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default Profile;
