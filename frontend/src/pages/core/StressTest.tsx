import React, { useState } from 'react'
import { Card, Form, Input, Button, Select, Progress, Alert } from 'antd'
import { ThunderboltOutlined, PlayCircleOutlined } from '@ant-design/icons'

const { Option } = Select

const StressTest: React.FC = () => {
  const [testing, setTesting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [form] = Form.useForm()

  const handleStartTest = async (values: any) => {
    setTesting(true)
    setProgress(0)
    
    // 模拟测试进度
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          setTesting(false)
          return 100
        }
        return prev + 10
      })
    }, 500)
  }

  return (
    <div className="stress-test-container p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          <ThunderboltOutlined className="mr-2" />
          压力测试
        </h1>
        <p className="text-gray-600">测试网站在高负载下的性能表现</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 测试配置 */}
        <Card title="测试配置" className="h-fit">
          <Form
            form={form}
            layout="vertical"
            onFinish={handleStartTest}
            disabled={testing}
          >
            <Form.Item
              label="测试URL"
              name="url"
              rules={[
                { required: true, message: '请输入测试URL' },
                { type: 'url', message: '请输入有效的URL' }
              ]}
            >
              <Input placeholder="https://example.com" />
            </Form.Item>

            <Form.Item
              label="并发用户数"
              name="concurrency"
              initialValue={10}
              rules={[{ required: true, message: '请输入并发用户数' }]}
            >
              <Select>
                <Option value={10}>10 用户</Option>
                <Option value={50}>50 用户</Option>
                <Option value={100}>100 用户</Option>
                <Option value={500}>500 用户</Option>
              </Select>
            </Form.Item>

            <Form.Item
              label="测试时长"
              name="duration"
              initialValue={60}
              rules={[{ required: true, message: '请选择测试时长' }]}
            >
              <Select>
                <Option value={30}>30 秒</Option>
                <Option value={60}>1 分钟</Option>
                <Option value={300}>5 分钟</Option>
                <Option value={600}>10 分钟</Option>
              </Select>
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={testing}
                icon={<PlayCircleOutlined />}
                size="large"
                className="w-full"
              >
                {testing ? '测试进行中...' : '开始压力测试'}
              </Button>
            </Form.Item>
          </Form>
        </Card>

        {/* 测试结果 */}
        <Card title="测试进度" className="h-fit">
          {testing && (
            <div className="space-y-4">
              <Progress percent={progress} status={progress === 100 ? 'success' : 'active'} />
              <div className="text-center text-gray-600">
                测试进行中，请稍候...
              </div>
            </div>
          )}

          {progress === 100 && (
            <Alert
              message="测试完成"
              description="压力测试已完成，可以查看详细报告。"
              type="success"
              showIcon
            />
          )}

          {!testing && progress === 0 && (
            <div className="text-center text-gray-500 py-8">
              请配置测试参数并开始测试
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

export default StressTest
