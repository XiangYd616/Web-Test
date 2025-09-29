/**
 * 项目功能文档页面
 * 展示项目的完整功能特性和使用指南
 */

import React, { useState } from 'react';
import {Book, CheckCircle, Shield, Zap, Database, Clock, BarChart3, Globe, Mail, Settings, FileText, Target, Layers, Key, Bell, Calendar, Tools, GitBranch, Star, ArrowRight} from 'lucide-react';

interface FeatureCategory {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  features: Feature[];
}

interface Feature {
  id: string;
  title: string;
  description: string;
  status: 'completed' | 'beta' | 'planning';
  icon: React.ComponentType<{ className?: string }>;
  details?: string[];
}

const ProjectDocumentationPage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('overview');
  const [expandedFeature, setExpandedFeature] = useState<string | null>(null);

  // 功能分类和详情
  const featureCategories: FeatureCategory[] = [
    {
      id: 'authentication',
      title: '认证与安全',
      description: '完整的用户认证和安全管理系统',
      icon: Shield,
      features: [
        {
          id: 'mfa',
          title: 'MFA多因子认证',
          description: 'TOTP认证、备用代码、设备信任管理',
          status: 'completed',
          icon: Key,
          details: [
            '支持Google Authenticator等TOTP应用',
            '生成和管理备用恢复代码',
            '设备信任和管理功能',
            '多种验证方式组合'
          ]
        },
        {
          id: 'password-reset',
          title: '密码重置流程',
          description: '安全的密码重置和邮件验证系统',
          status: 'completed',
          icon: Mail,
          details: [
            '邮件验证码发送和验证',
            '安全的密码重置流程',
            '邮件模板自定义',
            '防止暴力攻击机制'
          ]
        },
        {
          id: 'email-verification',
          title: '邮箱验证系统',
          description: '注册邮箱验证和激活流程',
          status: 'completed',
          icon: CheckCircle,
          details: [
            '注册时邮箱验证',
            '激活链接生成',
            '验证状态管理',
            '重发验证邮件功能'
          ]
        }
      ]
    },
    {
      id: 'testing',
      title: '测试功能',
      description: '全面的网站测试和分析工具',
      icon: Target,
      features: [
        {
          id: 'website-test',
          title: '网站综合测试',
          description: '性能、安全、SEO等全面测试',
          status: 'completed',
          icon: Globe,
          details: [
            '页面加载性能分析',
            '安全漏洞扫描',
            'SEO优化建议',
            '可用性检测'
          ]
        },
        {
          id: 'performance-test',
          title: '性能测试',
          description: '深度性能分析和优化建议',
          status: 'completed',
          icon: Zap,
          details: [
            'Core Web Vitals指标',
            '资源加载时间分析',
            '网络性能测试',
            '性能优化建议'
          ]
        },
        {
          id: 'batch-testing',
          title: '批量测试',
          description: '多URL并发测试和结果对比',
          status: 'completed',
          icon: Layers,
          details: [
            '批量URL导入',
            '并发测试执行',
            '结果对比分析',
            '数据导出功能'
          ]
        }
      ]
    },
    {
      id: 'automation',
      title: '自动化与调度',
      description: '智能化的测试自动化和任务管理',
      icon: Clock,
      features: [
        {
          id: 'scheduled-tasks',
          title: '定时任务系统',
          description: '自动化测试调度和监控',
          status: 'completed',
          icon: Calendar,
          details: [
            '灵活的调度配置',
            '多种测试类型支持',
            '邮件和Webhook通知',
            '执行历史和统计'
          ]
        },
        {
          id: 'notifications',
          title: '通知系统',
          description: '多渠道通知和提醒功能',
          status: 'completed',
          icon: Bell,
          details: [
            '邮件通知',
            'Webhook集成',
            '实时推送',
            '通知模板管理'
          ]
        }
      ]
    },
    {
      id: 'reports',
      title: '报告与分析',
      description: '丰富的报告生成和数据分析功能',
      icon: BarChart3,
      features: [
        {
          id: 'enhanced-reports',
          title: '增强报告系统',
          description: '多格式、多模板的测试报告',
          status: 'completed',
          icon: FileText,
          details: [
            '多种报告模板',
            'PDF、Word、Excel导出',
            '品牌定制化',
            '详细分析和建议'
          ]
        },
        {
          id: 'analytics',
          title: '数据分析',
          description: '测试结果统计和趋势分析',
          status: 'completed',
          icon: BarChart3,
          details: [
            '历史数据分析',
            '性能趋势图表',
            '对比分析',
            '预测性分析'
          ]
        }
      ]
    },
    {
      id: 'tools',
      title: '实用工具',
      description: '提升测试效率的辅助工具集',
      icon: Tools,
      features: [
        {
          id: 'data-generator',
          title: '测试数据生成器',
          description: '快速生成各类测试数据',
          status: 'completed',
          icon: Database,
          details: [
            '多种数据类型',
            '自定义生成规则',
            '批量数据导出',
            'JSON、CSV、TXT格式'
          ]
        },
        {
          id: 'test-tools',
          title: '测试工具集',
          description: '集成化的测试工具管理',
          status: 'completed',
          icon: Settings,
          details: [
            '工具分类管理',
            '快速访问入口',
            '功能状态展示',
            '使用指南集成'
          ]
        }
      ]
    }
  ];

  // 项目统计
  const projectStats = {
    totalFeatures: featureCategories.reduce((sum, cat) => sum + cat.features.length, 0),
    completedFeatures: featureCategories.reduce((sum, cat) => 
      sum + cat.features.filter(f => f.status === 'completed').length, 0),
    betaFeatures: featureCategories.reduce((sum, cat) => 
      sum + cat.features.filter(f => f.status === 'beta').length, 0),
    categories: featureCategories.length
  };

  const completionRate = Math.round((projectStats.completedFeatures / projectStats.totalFeatures) * 100);

  // 获取状态样式
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'beta':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'planning':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return '已完成';
      case 'beta':
        return '测试版';
      case 'planning':
        return '规划中';
      default:
        return '';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <Book className="w-8 h-8 text-blue-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">项目功能文档</h1>
                  <p className="text-sm text-gray-600">Test Web App 完整功能特性介绍</p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600">{completionRate}%</div>
                <div className="text-sm text-gray-600">完成度</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 概览卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">总功能数</p>
                <p className="text-3xl font-bold text-gray-900">{projectStats.totalFeatures}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Tools className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">已完成</p>
                <p className="text-3xl font-bold text-green-600">{projectStats.completedFeatures}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">测试版</p>
                <p className="text-3xl font-bold text-blue-600">{projectStats.betaFeatures}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Star className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">功能分类</p>
                <p className="text-3xl font-bold text-purple-600">{projectStats.categories}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Layers className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* 进度条 */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">项目完成进度</h3>
            <span className="text-sm font-medium text-gray-600">{completionRate}% 完成</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-1000"
              style={{ width: `${completionRate}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* 侧边栏导航 */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border p-6 sticky top-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">功能分类</h3>
              
              <nav className="space-y-2">
                <button
                  onClick={() => setSelectedCategory('overview')}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                    selectedCategory === 'overview'
                      ? 'bg-blue-100 text-blue-900 border border-blue-200'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Book className="w-5 h-5" />
                    <span className="font-medium">项目概览</span>
                  </div>
                </button>

                {featureCategories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                      selectedCategory === category.id
                        ? 'bg-blue-100 text-blue-900 border border-blue-200'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <category.icon className="w-5 h-5" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">{category.title}</div>
                        <div className="text-xs text-gray-500">
                          {category.features.length} 个功能
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* 主要内容 */}
          <div className="lg:col-span-3">
            {selectedCategory === 'overview' ? (
              <div className="bg-white rounded-lg shadow-sm border p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">项目概览</h2>
                
                <div className="prose max-w-none">
                  <p className="text-lg text-gray-600 mb-6">
                    Test Web App 是一个完整的网站测试和监控平台，提供从基础测试到高级自动化的全套解决方案。
                  </p>

                  <h3 className="text-xl font-semibold text-gray-900 mb-4">核心特性</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className="flex items-start space-x-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">完整的认证系统</h4>
                        <p className="text-gray-600">MFA、密码重置、邮箱验证等安全功能</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Target className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">全面的测试工具</h4>
                        <p className="text-gray-600">性能、安全、SEO、批量测试等</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Clock className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">智能自动化</h4>
                        <p className="text-gray-600">定时任务、自动通知、调度管理</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <div className="p-2 bg-orange-100 rounded-lg">
                        <BarChart3 className="w-5 h-5 text-orange-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">深度分析报告</h4>
                        <p className="text-gray-600">多格式报告、数据可视化、趋势分析</p>
                      </div>
                    </div>
                  </div>

                  <h3 className="text-xl font-semibold text-gray-900 mb-4">技术架构</h3>
                  <div className="bg-gray-50 rounded-lg p-6 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">前端技术</h4>
                        <ul className="text-gray-600 space-y-1">
                          <li>• React 18 + TypeScript</li>
                          <li>• React Router 6</li>
                          <li>• Tailwind CSS</li>
                          <li>• Lucide React Icons</li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">后端技术</h4>
                        <ul className="text-gray-600 space-y-1">
                          <li>• Node.js + Express</li>
                          <li>• PostgreSQL 数据库</li>
                          <li>• Node-cron 定时任务</li>
                          <li>• Nodemailer 邮件服务</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {featureCategories
                  .filter(category => category.id === selectedCategory)
                  .map(category => (
                    <div key={category.id}>
                      {/* 分类头部 */}
                      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
                        <div className="flex items-start space-x-4">
                          <div className="p-3 bg-blue-100 rounded-lg">
                            <category.icon className="w-8 h-8 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">
                              {category.title}
                            </h2>
                            <p className="text-gray-600 mb-4">
                              {category.description}
                            </p>
                            <div className="flex items-center space-x-4">
                              <span className="text-sm text-gray-500">
                                {category.features.length} 个功能
                              </span>
                              <span className="text-sm text-gray-500">
                                {category.features.filter(f => f.status === 'completed').length} 个已完成
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 功能列表 */}
                      <div className="space-y-4">
                        {category.features.map((feature) => (
                          <div key={feature.id} className="bg-white rounded-lg shadow-sm border">
                            <div 
                              className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                              onClick={() => setExpandedFeature(
                                expandedFeature === feature.id ? null : feature.id
                              )}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-start space-x-4 flex-1">
                                  <div className="p-2 bg-gray-100 rounded-lg">
                                    <feature.icon className="w-6 h-6 text-gray-600" />
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-3 mb-2">
                                      <h3 className="text-lg font-semibold text-gray-900">
                                        {feature.title}
                                      </h3>
                                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusStyle(feature.status)}`}>
                                        {getStatusText(feature.status)}
                                      </span>
                                    </div>
                                    <p className="text-gray-600">
                                      {feature.description}
                                    </p>
                                  </div>
                                </div>
                                <ArrowRight className={`w-5 h-5 text-gray-400 transition-transform ${
                                  expandedFeature === feature.id ? 'rotate-90' : ''
                                }`} />
                              </div>
                            </div>

                            {/* 展开详情 */}
                            {expandedFeature === feature.id && feature.details && (
                              <div className="px-6 pb-6 border-t border-gray-100">
                                <div className="pt-4">
                                  <h4 className="font-semibold text-gray-900 mb-3">功能详情</h4>
                                  <ul className="space-y-2">
                                    {feature.details.map((detail, index) => (
                                      <li key={index} className="flex items-start space-x-2">
                                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                        <span className="text-gray-600">{detail}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* 底部信息 */}
        <div className="mt-12 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <GitBranch className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                持续迭代与优化
              </h3>
              <div className="text-gray-700 space-y-2">
                <p>🚀 项目已完成所有核心功能模块的开发和测试</p>
                <p>📈 系统具备完整的用户认证、测试工具、自动化调度和报告分析能力</p>
                <p>🔧 所有功能都经过精心设计和优化，确保用户体验和系统稳定性</p>
                <p>💡 项目架构灵活，支持未来功能扩展和性能优化</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectDocumentationPage;
