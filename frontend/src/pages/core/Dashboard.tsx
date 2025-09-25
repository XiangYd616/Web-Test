import React from 'react'
import { Card, Row, Col, Statistic, Badge, Timeline } from 'antd'
import { 
  DashboardOutlined,
  ThunderboltOutlined,
  SecurityScanOutlined,
  BugOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined 
} from '@ant-design/icons'

const Dashboard: React.FC = () => {
  return (
    <div className="dashboard-container p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          <DashboardOutlined className="mr-2" />
          控制台概览
        </h1>
        <p className="text-gray-600">欢迎使用Test-Web企业级测试平台</p>
      </div>

      {/* 统计卡片区域 */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="总测试次数"
              value={1128}
              prefix={<ThunderboltOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="安全扫描"
              value={267}
              prefix={<SecurityScanOutlined />}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="发现问题"
              value={45}
              prefix={<BugOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="成功率"
              value={93.2}
              precision={1}
              suffix="%"
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        {/* 快速操作 */}
        <Col xs={24} lg={12}>
          <Card title="快速开始" className="h-full">
            <div className="space-y-4">
              <div className="flex items-center p-3 bg-blue-50 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors">
                <ThunderboltOutlined className="text-blue-500 text-lg mr-3" />
                <div>
                  <h4 className="font-semibold">压力测试</h4>
                  <p className="text-sm text-gray-600">检测网站性能和承载能力</p>
                </div>
              </div>
              
              <div className="flex items-center p-3 bg-green-50 rounded-lg cursor-pointer hover:bg-green-100 transition-colors">
                <SecurityScanOutlined className="text-green-500 text-lg mr-3" />
                <div>
                  <h4 className="font-semibold">安全检测</h4>
                  <p className="text-sm text-gray-600">扫描潜在安全漏洞</p>
                </div>
              </div>

              <div className="flex items-center p-3 bg-purple-50 rounded-lg cursor-pointer hover:bg-purple-100 transition-colors">
                <BugOutlined className="text-purple-500 text-lg mr-3" />
                <div>
                  <h4 className="font-semibold">兼容性测试</h4>
                  <p className="text-sm text-gray-600">检测跨浏览器兼容性</p>
                </div>
              </div>
            </div>
          </Card>
        </Col>

        {/* 最近活动 */}
        <Col xs={24} lg={12}>
          <Card title="最近活动" className="h-full">
            <Timeline
              items={[
                {
                  color: 'green',
                  children: (
                    <div>
                      <Badge status="success" />
                      <span className="ml-2">性能测试完成</span>
                      <div className="text-xs text-gray-500 mt-1">
                        <ClockCircleOutlined className="mr-1" />
                        2 分钟前
                      </div>
                    </div>
                  ),
                },
                {
                  color: 'blue',
                  children: (
                    <div>
                      <Badge status="processing" />
                      <span className="ml-2">SEO分析正在进行</span>
                      <div className="text-xs text-gray-500 mt-1">
                        <ClockCircleOutlined className="mr-1" />
                        5 分钟前
                      </div>
                    </div>
                  ),
                },
                {
                  color: 'red',
                  children: (
                    <div>
                      <Badge status="error" />
                      <span className="ml-2">安全扫描发现问题</span>
                      <div className="text-xs text-gray-500 mt-1">
                        <ClockCircleOutlined className="mr-1" />
                        15 分钟前
                      </div>
                    </div>
                  ),
                },
                {
                  color: 'gray',
                  children: (
                    <div>
                      <Badge status="default" />
                      <span className="ml-2">用户登录系统</span>
                      <div className="text-xs text-gray-500 mt-1">
                        <ClockCircleOutlined className="mr-1" />
                        30 分钟前
                      </div>
                    </div>
                  ),
                },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default Dashboard
