import React from 'react'
import { Card, Result, Button } from 'antd'
import { SearchOutlined } from '@ant-design/icons'

const SEOAnalysis: React.FC = () => {
  return (
    <div className="seo-analysis-container p-6">
      <Card>
        <Result
          icon={<SearchOutlined className="text-purple-500" />}
          title="SEO分析"
          subTitle="搜索引擎优化分析功能开发中"
          extra={<Button type="primary">返回首页</Button>}
        />
      </Card>
    </div>
  )
}

export default SEOAnalysis
