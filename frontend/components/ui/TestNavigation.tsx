/**
 * TestNavigation.tsx - React组件
 * 
 * 文件路径: frontend\components\ui\TestNavigation.tsx
 * 创建时间: 2025-09-25
 */

import React from 'react';
import type { FC } from 'react';
import { Card, CardHeader, CardTitle, CardBody } from './Card';
import { Button } from './Button';
import { Badge, StatusBadge } from './Badge';

import { Layout, Square, MessageSquare, Type, Award, Layers, ExternalLink, CheckCircle } from 'lucide-react';

export const TestNavigation: React.FC = () => {
  const testPages = [
    {
      id: 'card',
      name: 'Card 卡片组件',
      description: '测试卡片组件的各种变体、尺寸和子组件',
      icon: Square,
      url: '/stress-test?test-card',
      status: 'complete' as const,
      features: ['4种变体', '5种内边距', '子组件系统', '悬停效果']
    },
    {
      id: 'modal',
      name: 'Modal 模态框组件',
      description: '测试模态框的尺寸、动画、焦点管理和键盘导航',
      icon: Layout,
      url: '/stress-test?test-modal',
      status: 'complete' as const,
      features: ['6种尺寸', '焦点管理', '键盘导航', '动画效果']
    },
    {
      id: 'input',
      name: 'Input 输入组件',
      description: '测试各种输入组件、表单验证和状态管理',
      icon: Type,
      url: '/stress-test?test-input',
      status: 'complete' as const,
      features: ['多种输入类型', '表单验证', '状态管理', '图标支持']
    },
    {
      id: 'badge',
      name: 'Badge 徽章组件',
      description: '测试状态徽章、数字徽章、进度徽章等',
      icon: Award,
      url: '/stress-test?test-badge',
      status: 'complete' as const,
      features: ['6种徽章类型', '状态指示', '进度显示', '标签管理']
    },
    {
      id: 'all',
      name: '综合集成测试',
      description: '测试所有组件的集成效果和交互功能',
      icon: Layers,
      url: '/stress-test?test-all',
      status: 'complete' as const,
      features: ['组件集成', '交互测试', '实际场景', '完整功能']
    }
  ];

  const openTestPage = (url: string) => {
    window.open(url, '_blank');
  };

  return (
    <div className="p-8 space-y-8 bg-gray-900 min-h-screen">
      <div className="max-w-6xl mx-auto">

        {/* 页面标题 */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            🧪 组件库测试中心
          </h1>
          <p className="text-gray-400 text-lg mb-6">
            全面测试所有组件的功能和集成效果
          </p>

          {/* 总体状态 */}
          <div className="flex justify-center gap-4">
            <StatusBadge status="success" text="所有组件已完成" />
            <Badge variant="info">6个组件</Badge>
            <Badge variant="success">5个测试页面</Badge>
          </div>
        </div>

        {/* 快速访问 */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-white mb-6">🚀 快速访问</h2>
          <Card variant="elevated">
            <CardBody>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {testPages.map((page) => (
                  <Button
                    key={page.id}
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-center gap-2"
                    onClick={() => openTestPage(page.url)}
                  >
                    <page.icon className="w-6 h-6" />
                    <span className="text-sm font-medium">{page.name.split(' ')[0]}</span>
                  </Button>
                ))}
              </div>
            </CardBody>
          </Card>
        </section>

        {/* 详细测试页面 */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-white mb-6">📋 详细测试页面</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {testPages.map((page) => {
              const Icon = page.icon;
              return (
                <Card key={page.id} hover>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-600/20 rounded-lg">
                          <Icon className="w-5 h-5 text-blue-400" />
                        </div>
                        <CardTitle className="text-lg">{page.name}</CardTitle>
                      </div>
                      <StatusBadge
                        status={page.status === 'complete' ? 'success' : 'pending'}
                        text={page.status === 'complete' ? '已完成' : '开发中'}
                        size="sm"
                      />
                    </div>
                  </CardHeader>

                  <CardBody>
                    <p className="text-gray-300 mb-4">{page.description}</p>

                    <div className="space-y-3">
                      <div>
                        <h4 className="text-sm font-medium text-gray-400 mb-2">核心特性</h4>
                        <div className="flex flex-wrap gap-1">
                          {page.features.map((feature, index) => (
                            <Badge key={index} variant="secondary" size="xs">
                              {feature}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardBody>

                  <CardBody className="pt-0">
                    <Button
                      className="w-full"
                      onClick={() => openTestPage(page.url)}
                    >
                      <ExternalLink className="w-4 h-4" />
                      打开测试页面
                    </Button>
                  </CardBody>
                </Card>
              );
            })}
          </div>
        </section>

        {/* 测试指南 */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-white mb-6">📖 测试指南</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            <Card>
              <CardHeader>
                <CardTitle>🎯 测试重点</CardTitle>
              </CardHeader>
              <CardBody>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-white font-medium">功能完整性</div>
                      <div className="text-gray-400 text-sm">确保所有组件功能正常工作</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-white font-medium">样式一致性</div>
                      <div className="text-gray-400 text-sm">检查组件样式是否统一协调</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-white font-medium">交互体验</div>
                      <div className="text-gray-400 text-sm">测试悬停、点击、键盘导航等</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-white font-medium">响应式设计</div>
                      <div className="text-gray-400 text-sm">在不同屏幕尺寸下的表现</div>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>🔧 测试方法</CardTitle>
              </CardHeader>
              <CardBody>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                      1
                    </div>
                    <div>
                      <div className="text-white font-medium">单组件测试</div>
                      <div className="text-gray-400 text-sm">逐个测试每个组件的功能</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                      2
                    </div>
                    <div>
                      <div className="text-white font-medium">集成测试</div>
                      <div className="text-gray-400 text-sm">测试组件之间的协作效果</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                      3
                    </div>
                    <div>
                      <div className="text-white font-medium">场景测试</div>
                      <div className="text-gray-400 text-sm">在实际应用场景中验证</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                      4
                    </div>
                    <div>
                      <div className="text-white font-medium">性能测试</div>
                      <div className="text-gray-400 text-sm">检查加载速度和运行性能</div>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        </section>

        {/* 测试统计 */}
        <section>
          <h2 className="text-2xl font-semibold text-white mb-6">📊 测试统计</h2>
          <Card variant="elevated">
            <CardBody>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                <div>
                  <div className="text-3xl font-bold text-blue-400 mb-2">6</div>
                  <div className="text-gray-400">核心组件</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-green-400 mb-2">5</div>
                  <div className="text-gray-400">测试页面</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-yellow-400 mb-2">100%</div>
                  <div className="text-gray-400">完成度</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-purple-400 mb-2">0</div>
                  <div className="text-gray-400">已知问题</div>
                </div>
              </div>
            </CardBody>
          </Card>
        </section>

        {/* 页脚 */}
        <div className="text-center text-gray-400 text-sm mt-12">
          <p>🎉 组件库测试中心 - 确保每个组件都完美工作</p>
          <p className="mt-2">访问任意测试页面开始全面测试</p>
        </div>
      </div>
    </div>
  );
};
