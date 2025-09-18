/**
 * 欢迎页面 - 新用户首次登录引导
 * 为新用户提供友好的欢迎体验和基础介绍
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Rocket,
  Users,
  Shield,
  Zap,
  BarChart3,
  CheckCircle,
  ArrowRight,
  Sparkles,
  Target,
  Globe
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface FeatureHighlight {
  icon: React.ComponentType<any>;
  title: string;
  description: string;
  color: string;
}

const Welcome: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);

  const features: FeatureHighlight[] = [
    {
      icon: Zap,
      title: '压力测试',
      description: '模拟高并发场景，测试系统性能极限',
      color: 'text-red-500'
    },
    {
      icon: Shield,
      title: '安全测试',
      description: '全面的安全漏洞扫描和风险评估',
      color: 'text-blue-500'
    },
    {
      icon: Globe,
      title: 'SEO优化',
      description: '深度SEO分析，提升搜索引擎排名',
      color: 'text-green-500'
    },
    {
      icon: BarChart3,
      title: '性能监控',
      description: '实时性能监控和智能分析报告',
      color: 'text-purple-500'
    }
  ];

  const steps = [
    {
      title: '欢迎使用 Test-Web 平台',
      subtitle: '让我们开始您的测试之旅',
      content: (
        <div className="text-center">
          <div className="mx-auto w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-6">
            <Rocket className="h-12 w-12 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            欢迎, {user?.profile?.fullName || user?.username}! 🎉
          </h2>
          <p className="text-lg text-gray-600 mb-6">
            感谢选择我们的测试平台。我们将引导您快速了解平台功能，让您轻松开始测试工作。
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {features.map((feature, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-4">
                <feature.icon className={`h-8 w-8 ${feature.color} mx-auto mb-2`} />
                <h4 className="font-semibold text-gray-900 text-sm mb-1">{feature.title}</h4>
                <p className="text-xs text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      )
    },
    {
      title: '选择您的角色类型',
      subtitle: '帮助我们为您提供个性化体验',
      content: (
        <div className="text-center">
          <div className="mx-auto w-24 h-24 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center mb-6">
            <Users className="h-12 w-12 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">您主要使用平台做什么？</h2>
          <p className="text-gray-600 mb-8">选择最符合您需求的选项，我们将为您定制最佳体验</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border-2 border-gray-200 rounded-lg p-6 hover:border-blue-500 cursor-pointer transition-colors">
              <Target className="h-8 w-8 text-blue-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">测试工程师</h3>
              <p className="text-gray-600 text-sm">
                我需要执行各种测试，分析结果，优化系统性能
              </p>
              <div className="mt-4 text-xs text-gray-500">
                推荐功能: 压力测试、性能分析、安全扫描
              </div>
            </div>

            <div className="bg-white border-2 border-gray-200 rounded-lg p-6 hover:border-purple-500 cursor-pointer transition-colors">
              <BarChart3 className="h-8 w-8 text-purple-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">项目管理者</h3>
              <p className="text-gray-600 text-sm">
                我需要查看团队测试情况，分析项目质量状况
              </p>
              <div className="mt-4 text-xs text-gray-500">
                推荐功能: 统计报告、团队管理、质量监控
              </div>
            </div>

            <div className="bg-white border-2 border-gray-200 rounded-lg p-6 hover:border-green-500 cursor-pointer transition-colors">
              <Shield className="h-8 w-8 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">安全专家</h3>
              <p className="text-gray-600 text-sm">
                我专注于系统安全，需要进行安全评估和风险分析
              </p>
              <div className="mt-4 text-xs text-gray-500">
                推荐功能: 安全扫描、漏洞检测、合规检查
              </div>
            </div>

            <div className="bg-white border-2 border-gray-200 rounded-lg p-6 hover:border-orange-500 cursor-pointer transition-colors">
              <Globe className="h-8 w-8 text-orange-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">运维开发</h3>
              <p className="text-gray-600 text-sm">
                我负责系统运维，需要监控性能和健康状态
              </p>
              <div className="mt-4 text-xs text-gray-500">
                推荐功能: 系统监控、性能分析、CI/CD集成
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: '快速设置',
      subtitle: '个性化您的测试环境',
      content: (
        <div className="text-center">
          <div className="mx-auto w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center mb-6">
            <Sparkles className="h-12 w-12 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">完善您的个人资料</h2>
          <p className="text-gray-600 mb-8">设置这些信息将帮助我们为您提供更好的服务</p>
          
          <div className="max-w-md mx-auto space-y-4">
            <div className="text-left">
              <label className="block text-sm font-medium text-gray-700 mb-1">显示名称</label>
              <input
                type="text"
                placeholder="您希望其他人如何称呼您"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                defaultValue={user?.profile?.fullName || ''}
              />
            </div>
            
            <div className="text-left">
              <label className="block text-sm font-medium text-gray-700 mb-1">公司/组织</label>
              <input
                type="text"
                placeholder="您所在的公司或组织名称"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="text-left">
              <label className="block text-sm font-medium text-gray-700 mb-1">主要关注的测试类型</label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500">
                <option value="">请选择...</option>
                <option value="performance">性能测试</option>
                <option value="security">安全测试</option>
                <option value="api">API测试</option>
                <option value="compatibility">兼容性测试</option>
                <option value="seo">SEO优化</option>
                <option value="stress">压力测试</option>
              </select>
            </div>

            <div className="text-left">
              <label className="flex items-center space-x-2">
                <input type="checkbox" className="rounded" />
                <span className="text-sm text-gray-700">接收测试完成通知</span>
              </label>
            </div>

            <div className="text-left">
              <label className="flex items-center space-x-2">
                <input type="checkbox" className="rounded" />
                <span className="text-sm text-gray-700">订阅平台更新和技巧</span>
              </label>
            </div>
          </div>
        </div>
      )
    },
    {
      title: '开始使用',
      subtitle: '一切就绪，开始您的测试之旅',
      content: (
        <div className="text-center">
          <div className="mx-auto w-24 h-24 bg-gradient-to-br from-green-500 to-teal-600 rounded-full flex items-center justify-center mb-6">
            <CheckCircle className="h-12 w-12 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">🎉 欢迎加入 Test-Web!</h2>
          <p className="text-lg text-gray-600 mb-8">
            您的账户已设置完成。现在可以开始探索强大的测试功能了！
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-blue-50 rounded-lg p-4">
              <Zap className="h-8 w-8 text-blue-500 mx-auto mb-2" />
              <h3 className="font-semibold text-gray-900 mb-1">立即开始测试</h3>
              <p className="text-sm text-gray-600">选择一个测试工具开始您的第一个测试</p>
            </div>
            
            <div className="bg-purple-50 rounded-lg p-4">
              <BarChart3 className="h-8 w-8 text-purple-500 mx-auto mb-2" />
              <h3 className="font-semibold text-gray-900 mb-1">查看仪表板</h3>
              <p className="text-sm text-gray-600">了解系统状态和您的测试历史</p>
            </div>
            
            <div className="bg-green-50 rounded-lg p-4">
              <Users className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <h3 className="font-semibold text-gray-900 mb-1">探索帮助</h3>
              <p className="text-sm text-gray-600">查看文档和教程，快速上手</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/stress-test')}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Zap className="h-5 w-5 mr-2" />
              开始第一个测试
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <BarChart3 className="h-5 w-5 mr-2" />
              进入仪表板
            </button>
          </div>
        </div>
      )
    }
  ];

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const skipOnboarding = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* 进度指示器 */}
        <div className="mb-12">
          <div className="flex items-center justify-center mb-4">
            {steps.map((_, index) => (
              <div key={index} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                    index <= currentStep
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {index < currentStep ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <span className="text-sm font-medium">{index + 1}</span>
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`w-12 h-1 mx-2 transition-colors ${
                      index < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="text-center">
            <h1 className="text-xl font-semibold text-gray-900 mb-1">
              {steps[currentStep].title}
            </h1>
            <p className="text-gray-600">{steps[currentStep].subtitle}</p>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          {steps[currentStep].content}
        </div>

        {/* 导航按钮 */}
        <div className="flex items-center justify-between">
          <div>
            {currentStep > 0 && (
              <button
                onClick={prevStep}
                className="inline-flex items-center px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                ← 上一步
              </button>
            )}
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={skipOnboarding}
              className="px-4 py-2 text-gray-500 hover:text-gray-700 transition-colors"
            >
              跳过引导
            </button>
            
            {currentStep < steps.length - 1 ? (
              <button
                onClick={nextStep}
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                下一步
                <ArrowRight className="h-4 w-4 ml-2" />
              </button>
            ) : (
              <button
                onClick={() => navigate('/dashboard')}
                className="inline-flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                开始使用
                <ArrowRight className="h-4 w-4 ml-2" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Welcome;
