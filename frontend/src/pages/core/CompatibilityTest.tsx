import React from 'react'
import { Card, Result, Button } from 'antd'
import { BugOutlined } from '@ant-design/icons'

const CompatibilityTest: React.FC = () => {
  return (
    <div className="compatibility-test-container p-6">
      <Card>
        <Result
          icon={<BugOutlined className="text-green-500" />}
          title="兼容性测试"
          subTitle="跨浏览器和设备兼容性检测功能开发中"
          extra={<Button type="primary">返回首页</Button>}
        />
      </Card>
    </div>
  )
}

export default CompatibilityTest
