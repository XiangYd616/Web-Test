import React from 'react'
import { Card, Result, Button } from 'antd'
import { SecurityScanOutlined } from '@ant-design/icons'

const ContentDetection: React.FC = () => {
  return (
    <div className="content-detection-container p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          <SecurityScanOutlined className="mr-2" />
          内容检测
        </h1>
        <p className="text-gray-600">智能识别网站内容中的潜在风险和合规问题</p>
      </div>

      <Card>
        <Result
          icon={<SecurityScanOutlined className="text-blue-500" />}
          title="内容检测功能"
          subTitle="该功能正在开发中，即将为您提供全面的内容安全检测服务"
          extra={
            <Button type="primary">
              了解更多
            </Button>
          }
        />
      </Card>
    </div>
  )
}

export default ContentDetection
