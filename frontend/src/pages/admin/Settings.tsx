import React from 'react'
import { Card, Result, Button } from 'antd'
import { SettingOutlined } from '@ant-design/icons'

const Settings: React.FC = () => {
  return (
    <div className="settings-container p-6">
      <Card>
        <Result
          icon={<SettingOutlined className="text-gray-500" />}
          title="系统设置"
          subTitle="系统配置功能开发中"
          extra={<Button type="primary">返回首页</Button>}
        />
      </Card>
    </div>
  )
}

export default Settings
