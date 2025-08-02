import React, { useState } from 'react';
import {
  Button, DeleteButton, IconButton, GhostButton,
  Card, CardHeader, CardTitle, CardBody, CardFooter,
  Modal, ModalBody, ModalFooter, ConfirmModal,
  Input, PasswordInput, SearchInput, Select, Textarea,
  Badge, StatusBadge, NumberBadge, DotBadge, ProgressBadge,
  Checkbox, SimpleCheckbox
} from './index';
import { 
  User, Mail, Settings, Search, Download, Trash2, 
  Eye, Bell, Star, Heart, Globe, Phone 
} from 'lucide-react';

export const ComponentLibraryTest: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    country: '',
    bio: '',
    notifications: false,
    newsletter: false
  });

  const countryOptions = [
    { value: 'cn', label: '中国' },
    { value: 'us', label: '美国' },
    { value: 'jp', label: '日本' },
    { value: 'uk', label: '英国' }
  ];

  const handleInputChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
  };

  const handleCheckboxChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.checked
    }));
  };

  return (
    <div className="p-8 space-y-12 bg-gray-900 min-h-screen">
      <div className="max-w-6xl mx-auto">
        
        {/* 页面标题 */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            组件库综合测试
          </h1>
          <p className="text-gray-400 text-lg">
            测试所有组件的集成效果和交互功能
          </p>
        </div>

        {/* 按钮组件测试 */}
        <section>
          <h2 className="text-2xl font-semibold text-white mb-6">按钮组件</h2>
          <Card>
            <CardBody>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-3">
                  <Button>主要按钮</Button>
                  <Button variant="secondary">次要按钮</Button>
                  <Button variant="outline">轮廓按钮</Button>
                  <GhostButton>幽灵按钮</GhostButton>
                  <DeleteButton>删除按钮</DeleteButton>
                </div>
                
                <div className="flex flex-wrap gap-3">
                  <Button size="sm">小按钮</Button>
                  <Button size="md">中按钮</Button>
                  <Button size="lg">大按钮</Button>
                  <Button loading>加载中</Button>
                  <Button disabled>禁用按钮</Button>
                </div>
                
                <div className="flex flex-wrap gap-3">
                  <IconButton 
                    icon={<Settings className="w-4 h-4" />} 
                    aria-label="设置"
                  />
                  <IconButton 
                    icon={<Search className="w-4 h-4" />} 
                    variant="secondary"
                    aria-label="搜索"
                  />
                  <IconButton 
                    icon={<Download className="w-4 h-4" />} 
                    variant="outline"
                    aria-label="下载"
                  />
                  <IconButton 
                    icon={<Trash2 className="w-4 h-4" />} 
                    variant="danger"
                    aria-label="删除"
                  />
                </div>
              </div>
            </CardBody>
          </Card>
        </section>

        {/* 卡片组件测试 */}
        <section>
          <h2 className="text-2xl font-semibold text-white mb-6">卡片组件</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>默认卡片</CardTitle>
              </CardHeader>
              <CardBody>
                <p className="text-gray-300">这是一个默认样式的卡片。</p>
              </CardBody>
              <CardFooter>
                <Button size="sm">操作</Button>
              </CardFooter>
            </Card>

            <Card variant="outlined" hover>
              <CardHeader>
                <CardTitle>轮廓卡片</CardTitle>
              </CardHeader>
              <CardBody>
                <p className="text-gray-300">带悬停效果的轮廓卡片。</p>
                <div className="mt-3 flex gap-2">
                  <StatusBadge status="success" />
                  <NumberBadge count={5} />
                </div>
              </CardBody>
            </Card>

            <Card variant="elevated">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>阴影卡片</CardTitle>
                  <DotBadge status="success" />
                </div>
              </CardHeader>
              <CardBody>
                <p className="text-gray-300">带阴影效果的卡片。</p>
                <ProgressBadge value={75} className="mt-2" />
              </CardBody>
            </Card>
          </div>
        </section>

        {/* 表单组件测试 */}
        <section>
          <h2 className="text-2xl font-semibold text-white mb-6">表单组件</h2>
          <Card>
            <CardHeader>
              <CardTitle>用户信息表单</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="姓名"
                  leftIcon={<User className="w-4 h-4" />}
                  placeholder="请输入姓名"
                  value={formData.name}
                  onChange={handleInputChange('name')}
                />
                
                <Input
                  label="邮箱"
                  type="email"
                  leftIcon={<Mail className="w-4 h-4" />}
                  placeholder="请输入邮箱"
                  value={formData.email}
                  onChange={handleInputChange('email')}
                />
                
                <PasswordInput
                  label="密码"
                  placeholder="请输入密码"
                  value={formData.password}
                  onChange={handleInputChange('password')}
                />
                
                <Select
                  label="国家"
                  placeholder="请选择国家"
                  options={countryOptions}
                  value={formData.country}
                  onChange={handleInputChange('country')}
                />
              </div>
              
              <div className="mt-6">
                <Textarea
                  label="个人简介"
                  placeholder="请简单介绍一下自己..."
                  value={formData.bio}
                  onChange={handleInputChange('bio')}
                  rows={3}
                />
              </div>
              
              <div className="mt-6 space-y-3">
                <Checkbox
                  label="接收邮件通知"
                  description="我们会向您发送重要的系统通知"
                  checked={formData.notifications}
                  onChange={handleCheckboxChange('notifications')}
                />
                
                <Checkbox
                  label="订阅新闻邮件"
                  description="获取最新的产品更新和技术资讯"
                  checked={formData.newsletter}
                  onChange={handleCheckboxChange('newsletter')}
                />
              </div>
            </CardBody>
            <CardFooter>
              <Button variant="ghost">取消</Button>
              <Button>保存</Button>
            </CardFooter>
          </Card>
        </section>

        {/* 徽章组件测试 */}
        <section>
          <h2 className="text-2xl font-semibold text-white mb-6">徽章组件</h2>
          <Card>
            <CardBody>
              <div className="space-y-6">
                <div>
                  <h3 className="text-white font-medium mb-3">状态徽章</h3>
                  <div className="flex flex-wrap gap-3">
                    <StatusBadge status="success" text="测试通过" />
                    <StatusBadge status="error" text="测试失败" />
                    <StatusBadge status="warning" text="需要注意" />
                    <StatusBadge status="pending" text="等待中" />
                    <StatusBadge status="loading" text="处理中" />
                  </div>
                </div>
                
                <div>
                  <h3 className="text-white font-medium mb-3">数字徽章</h3>
                  <div className="flex flex-wrap items-center gap-6">
                    <div className="relative">
                      <Button variant="ghost">
                        <Bell className="w-4 h-4" />
                        通知
                        <NumberBadge count={3} className="absolute -top-2 -right-2" />
                      </Button>
                    </div>
                    <div className="relative">
                      <Button variant="ghost">
                        <Heart className="w-4 h-4" />
                        收藏
                        <NumberBadge count={25} variant="danger" className="absolute -top-2 -right-2" />
                      </Button>
                    </div>
                    <div className="relative">
                      <Button variant="ghost">
                        <Star className="w-4 h-4" />
                        关注
                        <NumberBadge count={156} max={99} variant="warning" className="absolute -top-2 -right-2" />
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-white font-medium mb-3">进度徽章</h3>
                  <div className="flex flex-wrap gap-3">
                    <ProgressBadge value={25} />
                    <ProgressBadge value={50} />
                    <ProgressBadge value={75} />
                    <ProgressBadge value={90} />
                    <ProgressBadge value={100} />
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </section>

        {/* 模态框测试 */}
        <section>
          <h2 className="text-2xl font-semibold text-white mb-6">模态框组件</h2>
          <Card>
            <CardBody>
              <div className="flex gap-4">
                <Button onClick={() => setModalOpen(true)}>
                  打开模态框
                </Button>
                <DeleteButton onClick={() => setConfirmOpen(true)}>
                  确认删除
                </DeleteButton>
              </div>
            </CardBody>
          </Card>
        </section>

        {/* 搜索功能测试 */}
        <section>
          <h2 className="text-2xl font-semibold text-white mb-6">搜索功能</h2>
          <Card>
            <CardBody>
              <div className="max-w-md">
                <SearchInput
                  placeholder="搜索组件..."
                  onSearch={(value) => alert(`搜索: ${value}`)}
                />
              </div>
            </CardBody>
          </Card>
        </section>

        {/* 实际应用场景模拟 */}
        <section>
          <h2 className="text-2xl font-semibold text-white mb-6">实际应用场景</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* 测试记录卡片 */}
            <Card hover>
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
                    <span className="text-gray-400">创建时间</span>
                    <span className="text-gray-300">2025/08/02 10:30</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">服务器状态</span>
                    <div className="flex items-center gap-2">
                      <DotBadge status="success" />
                      <span className="text-green-400 text-sm">正常</span>
                    </div>
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
                <Button size="sm">查看报告</Button>
              </CardFooter>
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
                  <div className="flex items-center gap-3">
                    <User className="w-8 h-8 text-gray-400" />
                    <div>
                      <div className="text-white font-medium">张三</div>
                      <div className="text-gray-400 text-sm">高级开发工程师</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">邮箱</span>
                    <span className="text-gray-300">zhang@example.com</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">手机</span>
                    <span className="text-gray-300">138****8888</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">未读消息</span>
                    <NumberBadge count={7} />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">完成度</span>
                    <ProgressBadge value={85} />
                  </div>
                </div>
              </CardBody>
              <CardFooter>
                <Button variant="ghost" size="sm">
                  <Mail className="w-4 h-4" />
                  发送消息
                </Button>
                <Button variant="ghost" size="sm">
                  <Phone className="w-4 h-4" />
                  拨打电话
                </Button>
              </CardFooter>
            </Card>
          </div>
        </section>

        {/* 模态框组件 */}
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title="组件库测试模态框"
          description="这是一个测试模态框，展示各种组件的集成效果"
          size="lg"
        >
          <ModalBody>
            <div className="space-y-4">
              <p className="text-gray-300">
                这个模态框展示了组件库的集成效果。所有组件都可以在模态框中正常工作。
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="测试输入"
                  placeholder="在模态框中输入"
                  leftIcon={<Globe className="w-4 h-4" />}
                />
                <Select
                  label="测试选择"
                  placeholder="选择选项"
                  options={[
                    { value: 'option1', label: '选项1' },
                    { value: 'option2', label: '选项2' }
                  ]}
                />
              </div>
              
              <div className="flex flex-wrap gap-2">
                <StatusBadge status="success" text="模态框正常" />
                <StatusBadge status="info" text="组件集成" />
                <ProgressBadge value={100} />
              </div>
            </div>
          </ModalBody>
          
          <ModalFooter>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              取消
            </Button>
            <Button onClick={() => setModalOpen(false)}>
              确定
            </Button>
          </ModalFooter>
        </Modal>

        {/* 确认对话框 */}
        <ConfirmModal
          isOpen={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          onConfirm={() => alert('删除操作已确认！')}
          title="确认删除"
          message="您确定要删除这个测试项目吗？此操作无法撤销。"
          confirmText="删除"
          cancelText="取消"
          variant="danger"
        />

        {/* 测试总结 */}
        <section className="text-center">
          <Card variant="elevated">
            <CardBody>
              <h2 className="text-2xl font-semibold text-white mb-4">
                🎉 组件库测试完成
              </h2>
              <p className="text-gray-300 mb-4">
                所有组件都已成功集成并正常工作！
              </p>
              <div className="flex justify-center gap-3">
                <StatusBadge status="success" text="测试通过" />
                <StatusBadge status="info" text="集成完成" />
                <ProgressBadge value={100} />
              </div>
            </CardBody>
          </Card>
        </section>
      </div>
    </div>
  );
};
