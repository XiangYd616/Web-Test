import React from 'react'
import { Form, Input, Button, Card, Checkbox, Divider } from 'antd'
import { UserOutlined, LockOutlined, GoogleOutlined, GithubOutlined } from '@ant-design/icons'

const Login: React.FC = () => {
  const onFinish = (values: any) => {
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Test-Web 平台
          </h1>
          <p className="text-gray-600">企业级Web测试解决方案</p>
        </div>

        <Form
          name="login"
          initialValues={{ remember: true }}
          onFinish={onFinish}
          size="large"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名或邮箱!' }]}
          >
            <Input 
              prefix={<UserOutlined />} 
              placeholder="用户名或邮箱" 
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码!' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="密码"
            />
          </Form.Item>

          <Form.Item>
            <Form.Item name="remember" valuePropName="checked" noStyle>
              <Checkbox>记住我</Checkbox>
            </Form.Item>
            <a className="float-right" href="">
              忘记密码
            </a>
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" className="w-full">
              登录
            </Button>
          </Form.Item>

          <Divider>或</Divider>

          <div className="space-y-2">
            <Button 
              icon={<GoogleOutlined />} 
              className="w-full"
              onClick={() => console.log('Button clicked')}
            >
              使用 Google 登录
            </Button>
            <Button 
              icon={<GithubOutlined />} 
              className="w-full"
              onClick={() => console.log('Button clicked')}
            >
              使用 GitHub 登录
            </Button>
          </div>

          <div className="text-center mt-4">
            还没有账号? <a href="">立即注册</a>
          </div>
        </Form>
      </Card>
    </div>
  )
}

export default Login
