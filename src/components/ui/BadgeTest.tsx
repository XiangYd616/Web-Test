import React, { useState } from 'react';
import { 
  Badge, 
  StatusBadge, 
  NumberBadge, 
  DotBadge, 
  ProgressBadge, 
  TagBadge 
} from './Badge';
import { Card, CardHeader, CardTitle, CardBody } from './Card';
import { Button } from './Button';
import { Star, Heart, Download, Users } from 'lucide-react';

export const BadgeTest: React.FC = () => {
  const [notificationCount, setNotificationCount] = useState(5);
  const [tags, setTags] = useState(['React', 'TypeScript', 'Tailwind', 'Node.js']);

  const addNotification = () => setNotificationCount(prev => prev + 1);
  const clearNotifications = () => setNotificationCount(0);

  const removeTag = (tagToRemove: string) => {
    setTags(prev => prev.filter(tag => tag !== tagToRemove));
  };

  const addTag = () => {
    const newTags = ['Vue.js', 'Angular', 'Svelte', 'Next.js', 'Nuxt.js'];
    const availableTags = newTags.filter(tag => !tags.includes(tag));
    if (availableTags.length > 0) {
      const randomTag = availableTags[Math.floor(Math.random() * availableTags.length)];
      setTags(prev => [...prev, randomTag]);
    }
  };

  return (
    <div className="p-8 space-y-8 bg-gray-900 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Badge组件测试展示</h1>
        
        {/* 基础徽章 */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-white mb-6">基础徽章</h2>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <Badge variant="default">默认</Badge>
              <Badge variant="primary">主要</Badge>
              <Badge variant="secondary">次要</Badge>
              <Badge variant="success">成功</Badge>
              <Badge variant="warning">警告</Badge>
              <Badge variant="danger">危险</Badge>
              <Badge variant="info">信息</Badge>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <Badge variant="primary" outline>主要轮廓</Badge>
              <Badge variant="success" outline>成功轮廓</Badge>
              <Badge variant="warning" outline>警告轮廓</Badge>
              <Badge variant="danger" outline>危险轮廓</Badge>
              <Badge variant="info" outline>信息轮廓</Badge>
            </div>
          </div>
        </section>

        {/* 不同尺寸 */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-white mb-6">不同尺寸</h2>
          <div className="flex flex-wrap items-center gap-4">
            <Badge variant="primary" size="xs">超小</Badge>
            <Badge variant="primary" size="sm">小</Badge>
            <Badge variant="primary" size="md">中</Badge>
            <Badge variant="primary" size="lg">大</Badge>
          </div>
        </section>

        {/* 状态徽章 */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-white mb-6">状态徽章</h2>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <StatusBadge status="success" />
              <StatusBadge status="error" />
              <StatusBadge status="warning" />
              <StatusBadge status="pending" />
              <StatusBadge status="info" />
              <StatusBadge status="loading" />
            </div>
            
            <div className="flex flex-wrap gap-3">
              <StatusBadge status="success" text="测试通过" />
              <StatusBadge status="error" text="测试失败" />
              <StatusBadge status="warning" text="需要注意" />
              <StatusBadge status="pending" text="等待中" />
              <StatusBadge status="loading" text="处理中" />
            </div>
            
            <div className="flex flex-wrap gap-3">
              <StatusBadge status="success" showIcon={false} text="无图标" />
              <StatusBadge status="error" outline text="轮廓样式" />
              <StatusBadge status="info" size="lg" text="大尺寸" />
            </div>
          </div>
        </section>

        {/* 数字徽章 */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-white mb-6">数字徽章</h2>
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-6">
              <div className="relative">
                <Button variant="ghost">
                  消息
                  <NumberBadge count={notificationCount} className="absolute -top-2 -right-2" />
                </Button>
              </div>
              
              <div className="relative">
                <Button variant="ghost">
                  <Heart className="w-4 h-4" />
                  收藏
                  <NumberBadge count={23} variant="danger" className="absolute -top-2 -right-2" />
                </Button>
              </div>
              
              <div className="relative">
                <Button variant="ghost">
                  <Download className="w-4 h-4" />
                  下载
                  <NumberBadge count={156} max={99} variant="success" className="absolute -top-2 -right-2" />
                </Button>
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button onClick={addNotification} size="sm">
                添加通知
              </Button>
              <Button onClick={clearNotifications} variant="ghost" size="sm">
                清空通知
              </Button>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <NumberBadge count={0} showZero />
              <NumberBadge count={5} />
              <NumberBadge count={25} />
              <NumberBadge count={99} />
              <NumberBadge count={100} max={99} />
              <NumberBadge count={1000} max={999} />
            </div>
          </div>
        </section>

        {/* 点状态指示器 */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-white mb-6">点状态指示器</h2>
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2">
                <DotBadge status="success" />
                <span className="text-gray-300">在线</span>
              </div>
              <div className="flex items-center gap-2">
                <DotBadge status="error" />
                <span className="text-gray-300">离线</span>
              </div>
              <div className="flex items-center gap-2">
                <DotBadge status="warning" />
                <span className="text-gray-300">忙碌</span>
              </div>
              <div className="flex items-center gap-2">
                <DotBadge status="pending" pulse />
                <span className="text-gray-300">连接中</span>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-4">
              <DotBadge status="success" size="sm" />
              <DotBadge status="warning" size="md" />
              <DotBadge status="error" size="lg" />
            </div>
          </div>
        </section>

        {/* 进度徽章 */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-white mb-6">进度徽章</h2>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <ProgressBadge value={25} />
              <ProgressBadge value={50} />
              <ProgressBadge value={75} />
              <ProgressBadge value={90} />
              <ProgressBadge value={100} />
            </div>
            
            <div className="flex flex-wrap gap-3">
              <ProgressBadge value={15} max={20} showValue />
              <ProgressBadge value={8} max={10} showValue />
              <ProgressBadge value={156} max={200} showValue />
            </div>
            
            <div className="flex flex-wrap gap-3">
              <ProgressBadge value={25} variant="info" />
              <ProgressBadge value={50} variant="warning" />
              <ProgressBadge value={75} variant="success" />
            </div>
          </div>
        </section>

        {/* 标签徽章 */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-white mb-6">标签徽章</h2>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <TagBadge
                  key={tag}
                  removable
                  onRemove={() => removeTag(tag)}
                >
                  {tag}
                </TagBadge>
              ))}
            </div>
            
            <Button onClick={addTag} size="sm" variant="ghost">
              添加标签
            </Button>
            
            <div className="flex flex-wrap gap-2">
              <TagBadge color="#3b82f6">蓝色标签</TagBadge>
              <TagBadge color="#10b981">绿色标签</TagBadge>
              <TagBadge color="#f59e0b">黄色标签</TagBadge>
              <TagBadge color="#ef4444">红色标签</TagBadge>
              <TagBadge color="#8b5cf6">紫色标签</TagBadge>
            </div>
          </div>
        </section>

        {/* 实际应用场景 */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-white mb-6">实际应用场景</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* 测试记录卡片 */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>压力测试记录</CardTitle>
                  <StatusBadge status="success" text="已完成" />
                </div>
              </CardHeader>
              <CardBody>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">测试网站</span>
                    <span className="text-white">www.example.com</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">性能评分</span>
                    <ProgressBadge value={88} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">错误率</span>
                    <Badge variant="success" size="xs">0.0%</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">服务器状态</span>
                    <div className="flex items-center gap-2">
                      <DotBadge status="success" size="sm" />
                      <span className="text-green-400 text-sm">正常</span>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* 用户信息卡片 */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>用户信息</CardTitle>
                  <div className="flex items-center gap-2">
                    <DotBadge status="success" />
                    <span className="text-green-400 text-sm">在线</span>
                  </div>
                </div>
              </CardHeader>
              <CardBody>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">用户等级</span>
                    <Badge variant="warning">
                      <Star className="w-3 h-3" />
                      VIP
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">未读消息</span>
                    <NumberBadge count={12} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">关注者</span>
                    <Badge variant="info">
                      <Users className="w-3 h-3" />
                      1.2k
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">技能标签</span>
                    <div className="flex gap-1">
                      <TagBadge size="xs">React</TagBadge>
                      <TagBadge size="xs">TypeScript</TagBadge>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        </section>

        <div className="text-center text-gray-400 text-sm">
          <p>Badge组件库测试完成 ✅</p>
          <p className="mt-2">支持多种徽章类型、状态指示、进度显示和标签管理</p>
        </div>
      </div>
    </div>
  );
};
