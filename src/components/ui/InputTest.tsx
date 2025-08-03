import React, { useState } from 'react';
import { User, Mail, Phone, Globe, Settings } from 'lucide-react';

import { Button } from './Button';
import { Card, CardHeader, CardTitle, CardBody } from './Card';

export const InputTest: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    website: '',
    age: '',
    bio: '',
    country: '',
    testType: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [searchValue, setSearchValue] = useState('');

  const handleInputChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));

    // 清除错误
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name) newErrors.name = '姓名不能为空';
    if (!formData.email) newErrors.email = '邮箱不能为空';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = '邮箱格式不正确';
    if (!formData.password) newErrors.password = '密码不能为空';
    else if (formData.password.length < 6) newErrors.password = '密码至少6位';
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = '密码不一致';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      alert('表单验证通过！');
    }
  };

  const countryOptions = [
    { value: 'cn', label: '中国' },
    { value: 'us', label: '美国' },
    { value: 'jp', label: '日本' },
    { value: 'kr', label: '韩国' },
    { value: 'uk', label: '英国' }
  ];

  const testTypeOptions = [
    { value: 'stress', label: '压力测试' },
    { value: 'performance', label: '性能测试' },
    { value: 'seo', label: 'SEO测试' },
    { value: 'security', label: '安全测试' },
    { value: 'compatibility', label: '兼容性测试' }
  ];

  return (
    <div className="p-8 space-y-8 bg-gray-900 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Input组件测试展示</h1>

        {/* 基础输入框 */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-white mb-6">基础输入框</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Input
              label="默认输入框"
              placeholder="请输入内容"
              description="这是一个默认样式的输入框"
            />

            <Input
              label="填充样式"
              variant="filled"
              placeholder="填充样式输入框"
            />

            <Input
              label="轮廓样式"
              variant="outlined"
              placeholder="轮廓样式输入框"
            />
          </div>
        </section>

        {/* 不同尺寸 */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-white mb-6">不同尺寸</h2>
          <div className="space-y-4">
            <Input size="sm" placeholder="小尺寸输入框" />
            <Input size="md" placeholder="中等尺寸输入框" />
            <Input size="lg" placeholder="大尺寸输入框" />
          </div>
        </section>

        {/* 带图标的输入框 */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-white mb-6">带图标的输入框</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="用户名"
              leftIcon={<User className="h-4 w-4" />}
              placeholder="请输入用户名"
            />

            <Input
              label="邮箱地址"
              leftIcon={<Mail className="h-4 w-4" />}
              rightIcon={<Settings className="h-4 w-4" />}
              placeholder="请输入邮箱"
            />
          </div>
        </section>

        {/* 状态展示 */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-white mb-6">状态展示</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Input
              label="正常状态"
              placeholder="正常输入框"
            />

            <Input
              label="错误状态"
              placeholder="错误输入框"
              error="这是错误信息"
            />

            <Input
              label="成功状态"
              placeholder="成功输入框"
              success="验证通过"
            />

            <Input
              label="加载状态"
              placeholder="加载中..."
              loading
            />
          </div>
        </section>

        {/* 专用输入组件 */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-white mb-6">专用输入组件</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <PasswordInput
              label="密码输入"
              placeholder="请输入密码"
              description="密码将被安全加密"
            />

            <SearchInput
              label="搜索输入"
              placeholder="搜索测试记录..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onSearch={(value) => alert(`搜索: ${value}`)}
              onClear={() => setSearchValue('')}
            />

            <NumberInput
              label="数字输入"
              placeholder="请输入数字"
              min={0}
              max={100}
              step={1}
            />

            <Input
              label="禁用状态"
              placeholder="禁用的输入框"
              disabled
            />
          </div>
        </section>

        {/* Textarea和Select */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-white mb-6">文本域和选择框</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Textarea
              label="文本域"
              placeholder="请输入多行文本..."
              description="支持多行文本输入"
              rows={4}
            />

            <div className="space-y-4">
              <Select
                label="国家选择"
                placeholder="请选择国家"
                options={countryOptions}
                description="选择您所在的国家"
              />

              <Select
                label="测试类型"
                placeholder="请选择测试类型"
                options={testTypeOptions}
                required
              />
            </div>
          </div>
        </section>

        {/* 完整表单示例 */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-white mb-6">完整表单示例</h2>
          <Card>
            <CardHeader>
              <CardTitle>用户注册表单</CardTitle>
            </CardHeader>
            <CardBody>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input
                    label="姓名"
                    leftIcon={<User className="h-4 w-4" />}
                    placeholder="请输入姓名"
                    value={formData.name}
                    onChange={handleInputChange('name')}
                    error={errors.name}
                    required
                  />

                  <Input
                    label="邮箱"
                    type="email"
                    leftIcon={<Mail className="h-4 w-4" />}
                    placeholder="请输入邮箱"
                    value={formData.email}
                    onChange={handleInputChange('email')}
                    error={errors.email}
                    required
                  />

                  <PasswordInput
                    label="密码"
                    placeholder="请输入密码"
                    value={formData.password}
                    onChange={handleInputChange('password')}
                    error={errors.password}
                    description="密码至少6位"
                    required
                  />

                  <PasswordInput
                    label="确认密码"
                    placeholder="请再次输入密码"
                    value={formData.confirmPassword}
                    onChange={handleInputChange('confirmPassword')}
                    error={errors.confirmPassword}
                    required
                  />

                  <Input
                    label="手机号"
                    type="tel"
                    leftIcon={<Phone className="h-4 w-4" />}
                    placeholder="请输入手机号"
                    value={formData.phone}
                    onChange={handleInputChange('phone')}
                  />

                  <Input
                    label="个人网站"
                    type="url"
                    leftIcon={<Globe className="h-4 w-4" />}
                    placeholder="https://example.com"
                    value={formData.website}
                    onChange={handleInputChange('website')}
                  />

                  <NumberInput
                    label="年龄"
                    placeholder="请输入年龄"
                    min={1}
                    max={120}
                    value={formData.age}
                    onChange={handleInputChange('age')}
                  />

                  <Select
                    label="国家"
                    placeholder="请选择国家"
                    options={countryOptions}
                    value={formData.country}
                    onChange={handleInputChange('country')}
                  />
                </div>

                <Textarea
                  label="个人简介"
                  placeholder="请简单介绍一下自己..."
                  value={formData.bio}
                  onChange={handleInputChange('bio')}
                  rows={4}
                />

                <div className="flex justify-end gap-3">
                  <Button type="button" variant="ghost">
                    取消
                  </Button>
                  <Button type="submit">
                    提交注册
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        </section>

        <div className="text-center text-gray-400 text-sm">
          <p>Input组件库测试完成 ✅</p>
          <p className="mt-2">支持多种输入类型、状态管理、表单验证和无障碍功能</p>
        </div>
      </div>
    </div>
  );
};
