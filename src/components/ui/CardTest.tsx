import React from 'react';
import { 
  Card, 
  CardHeader, 
  CardBody, 
  CardFooter, 
  CardTitle, 
  CardDescription, 
  SimpleCard 
} from './Card';
import { Button, DeleteButton, IconButton } from './Button';
import { Eye, Download, Trash2 } from 'lucide-react';

export const CardTest: React.FC = () => {
  return (
    <div className="p-8 space-y-8 bg-gray-900 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Card组件测试展示</h1>
        
        {/* 基础卡片变体 */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-white mb-6">基础卡片变体</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* 默认卡片 */}
            <Card>
              <CardHeader>
                <CardTitle>默认卡片</CardTitle>
                <CardDescription>标准的深色主题卡片样式</CardDescription>
              </CardHeader>
              <CardBody>
                <p className="text-gray-300 text-sm">
                  这是默认样式的卡片内容区域。
                </p>
              </CardBody>
            </Card>

            {/* 轮廓卡片 */}
            <Card variant="outlined">
              <CardHeader>
                <CardTitle>轮廓卡片</CardTitle>
                <CardDescription>透明背景，突出边框</CardDescription>
              </CardHeader>
              <CardBody>
                <p className="text-gray-300 text-sm">
                  轮廓样式适合需要突出边界的场景。
                </p>
              </CardBody>
            </Card>

            {/* 阴影卡片 */}
            <Card variant="elevated">
              <CardHeader>
                <CardTitle>阴影卡片</CardTitle>
                <CardDescription>带有阴影效果的卡片</CardDescription>
              </CardHeader>
              <CardBody>
                <p className="text-gray-300 text-sm">
                  阴影效果让卡片更有层次感。
                </p>
              </CardBody>
            </Card>

            {/* 玻璃卡片 */}
            <Card variant="glass">
              <CardHeader>
                <CardTitle>玻璃卡片</CardTitle>
                <CardDescription>毛玻璃效果</CardDescription>
              </CardHeader>
              <CardBody>
                <p className="text-gray-300 text-sm">
                  现代化的毛玻璃效果设计。
                </p>
              </CardBody>
            </Card>
          </div>
        </section>

        {/* 悬停效果展示 */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-white mb-6">悬停效果</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card hover>
              <CardHeader>
                <CardTitle>悬停效果卡片</CardTitle>
                <CardDescription>鼠标悬停时会有交互效果</CardDescription>
              </CardHeader>
              <CardBody>
                <p className="text-gray-300 text-sm">
                  将鼠标悬停在这个卡片上查看效果。
                </p>
              </CardBody>
            </Card>

            <Card variant="elevated" hover>
              <CardHeader>
                <CardTitle>阴影悬停卡片</CardTitle>
                <CardDescription>阴影效果 + 悬停交互</CardDescription>
              </CardHeader>
              <CardBody>
                <p className="text-gray-300 text-sm">
                  组合效果让交互更加丰富。
                </p>
              </CardBody>
            </Card>
          </div>
        </section>

        {/* 实际应用场景 */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-white mb-6">实际应用场景</h2>
          
          {/* 测试记录卡片 */}
          <div className="space-y-4">
            <Card hover className="transition-all duration-200">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>压力测试 - www.baidu.com</CardTitle>
                    <CardDescription>https://www.baidu.com</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-green-600/20 text-green-400 text-xs rounded-md border border-green-600/30">
                      已完成
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardBody>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">创建时间</span>
                    <p className="text-white font-medium">2025/08/02 09:13</p>
                  </div>
                  <div>
                    <span className="text-gray-400">测试时长</span>
                    <p className="text-white font-medium">30秒</p>
                  </div>
                  <div>
                    <span className="text-gray-400">性能评分</span>
                    <p className="text-white font-medium">88.6分</p>
                  </div>
                  <div>
                    <span className="text-gray-400">错误率</span>
                    <p className="text-white font-medium">0.0%</p>
                  </div>
                </div>
              </CardBody>
              <CardFooter>
                <div className="flex items-center gap-2">
                  <IconButton 
                    icon={<Eye className="w-4 h-4" />} 
                    variant="ghost" 
                    size="sm"
                    aria-label="查看详情"
                  />
                  <IconButton 
                    icon={<Download className="w-4 h-4" />} 
                    variant="ghost" 
                    size="sm"
                    aria-label="下载报告"
                  />
                  <IconButton 
                    icon={<Trash2 className="w-4 h-4" />} 
                    variant="danger" 
                    size="sm"
                    aria-label="删除记录"
                  />
                </div>
                <Button size="sm" variant="primary">
                  查看报告
                </Button>
              </CardFooter>
            </Card>

            {/* 使用SimpleCard的简化版本 */}
            <SimpleCard
              title="SEO测试 - example.com"
              description="https://example.com"
              variant="outlined"
              hover
              footer={
                <div className="flex items-center justify-between w-full">
                  <span className="px-2 py-1 bg-red-600/20 text-red-400 text-xs rounded-md border border-red-600/30">
                    已失败
                  </span>
                  <Button size="sm" variant="secondary">
                    重新测试
                  </Button>
                </div>
              }
            >
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">SEO评分</span>
                  <p className="text-white font-medium">45分</p>
                </div>
                <div>
                  <span className="text-gray-400">问题数量</span>
                  <p className="text-white font-medium">12个</p>
                </div>
              </div>
            </SimpleCard>
          </div>
        </section>

        {/* 不同内边距展示 */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-white mb-6">内边距变体</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card padding="sm">
              <CardTitle>小内边距</CardTitle>
              <CardDescription>适合紧凑布局</CardDescription>
            </Card>
            
            <Card padding="md">
              <CardTitle>中等内边距</CardTitle>
              <CardDescription>默认推荐大小</CardDescription>
            </Card>
            
            <Card padding="lg">
              <CardTitle>大内边距</CardTitle>
              <CardDescription>适合重要内容</CardDescription>
            </Card>
          </div>
        </section>

        <div className="text-center text-gray-400 text-sm">
          <p>Card组件测试完成 ✅</p>
          <p className="mt-2">所有变体和功能都已验证</p>
        </div>
      </div>
    </div>
  );
};
