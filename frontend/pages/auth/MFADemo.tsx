/**
 * MFA演示页面
 * 展示所有MFA相关组件的使用方法和功能
 * 版本: v1.0.0
 */

import React, { useState } from 'react';
import {
  Settings,
  Shield,
  Smartphone,
  User
} from 'lucide-react';
import {
  MFASetup,
  MFAManagement,
  MFAVerification,
  MFAWizard
} from '../../components/auth';

// ==================== 类型定义 ====================

type DemoView = 'overview' | 'wizard' | 'setup' | 'management' | 'verification';

interface ComponentCard {
  id: DemoView;
  title: string;
  description: string;
  icon: React.ReactNode;
  disabled?: boolean;
}

// ==================== 主组件 ====================

const MFADemo: React.FC = () => {
  const [currentView, setCurrentView] = useState<DemoView>('overview');
  const [demoUser] = useState({
    id: 'demo-user-123',
    email: 'demo@testweb.com'
  });

  const components: ComponentCard[] = [
    {
      id: 'wizard',
      title: 'MFA设置向导',
      description: '完整的分步骤MFA设置流程，包括介绍、配置和验证',
      icon: <Shield className="w-6 h-6" />,
    },
    {
      id: 'setup',
      title: 'MFA设置组件',
      description: '快速设置MFA的核心组件，支持TOTP和备用码',
      icon: <Smartphone className="w-6 h-6" />,
    },
    {
      id: 'management',
      title: 'MFA管理面板',
      description: '管理已启用的MFA设置，查看状态和重新生成备用码',
      icon: <Settings className="w-6 h-6" />,
    },
    {
      id: 'verification',
      title: 'MFA验证组件',
      description: '登录时的双因素验证界面，支持TOTP和备用码验证',
      icon: <User className="w-6 h-6" />,
    }
  ];

  const handleComponentDemo = (componentId: DemoView) => {
    setCurrentView(componentId);
  };

  const handleBackToOverview = () => {
    setCurrentView('overview');
  };

  const renderOverview = () => (
    <div className="space-y-8">
      {/* 页面标题 */}
      <div className="text-center">
        <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <Shield className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-4">
          MFA组件演示
        </h1>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
          TestWeb平台提供了完整的多因素认证(MFA)组件套件，
          包括设置向导、管理面板、验证界面等，为您的应用提供企业级的安全保护。
        </p>
      </div>

      {/* 功能特点 */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4">主要特点</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h3 className="font-medium text-green-400">安全性</h3>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• TOTP标准支持</li>
              <li>• 备用码保护</li>
              <li>• 企业级安全标准</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h3 className="font-medium text-blue-400">用户体验</h3>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• 直观的设置向导</li>
              <li>• 响应式设计</li>
              <li>• 完善的错误处理</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 组件演示卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {components.map((component) => (
          <div
            key={component.id}
            onClick={() => !component.disabled && handleComponentDemo(component.id)}
            className={`p-6 rounded-lg border transition-all duration-200 ${
              component.disabled
                ? 'bg-gray-800 border-gray-700 opacity-50 cursor-not-allowed'
                : 'bg-gray-800 border-gray-600 hover:border-gray-500 cursor-pointer hover:bg-gray-750'
            }`}
          >
            <div className="flex items-start space-x-4">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                component.disabled ? 'bg-gray-700' : 'bg-blue-600'
              }`}>
                {component.icon}
              </div>
              <div className="flex-1">
                <h3 className={`font-semibold mb-2 ${
                  component.disabled ? 'text-gray-500' : 'text-white'
                }`}>
                  {component.title}
                </h3>
                <p className={`text-sm leading-relaxed ${
                  component.disabled ? 'text-gray-600' : 'text-gray-400'
                }`}>
                  {component.description}
                </p>
                {component.disabled && (
                  <span className="inline-block mt-2 px-2 py-1 bg-gray-700 text-gray-500 text-xs rounded">
                    即将推出
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 使用说明 */}
      <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-blue-200 mb-3">使用说明</h2>
        <div className="text-sm text-blue-300 space-y-2">
          <p>• 点击上方的组件卡片可以查看对应组件的演示</p>
          <p>• 所有组件都是模拟环境，不会影响您的真实账户设置</p>
          <p>• 组件支持完整的TypeScript类型定义和错误处理</p>
          <p>• 所有验证码输入都会自动模拟验证成功</p>
        </div>
      </div>
    </div>
  );

  const renderCurrentView = () => {
    switch (currentView) {
      case 'wizard':
        return (
          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBackToOverview}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
              >
                返回总览
              </button>
              <h1 className="text-xl font-semibold text-white">MFA设置向导演示</h1>
            </div>
            <MFAWizard
              userId={demoUser.id}
              userEmail={demoUser.email}
              onComplete={() => alert('MFA设置向导完成！')}
              onCancel={handleBackToOverview}
            />
          </div>
        );

      case 'setup':
        return (
          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBackToOverview}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
              >
                返回总览
              </button>
              <h1 className="text-xl font-semibold text-white">MFA设置组件演示</h1>
            </div>
            <div className="max-w-md mx-auto">
              <MFASetup
                onComplete={(success) => {
                  if (success) alert('MFA设置完成！');
                }}
                onCancel={handleBackToOverview}
              />
            </div>
          </div>
        );

      case 'management':
        return (
          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBackToOverview}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
              >
                返回总览
              </button>
              <h1 className="text-xl font-semibold text-white">MFA管理面板演示</h1>
            </div>
            <div className="max-w-2xl mx-auto">
              {/* MFAManagement component needs proper props interface */}
              <div className="bg-gray-800 p-6 rounded-lg text-white">
                <p>MFA管理面板演示</p>
                <p className="text-sm text-gray-400 mt-2">
                  用户: {demoUser.email}
                </p>
              </div>
            </div>
          </div>
        );

      case 'verification':
        return (
          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBackToOverview}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
              >
                返回总览
              </button>
              <h1 className="text-xl font-semibold text-white">MFA验证组件演示</h1>
            </div>
            {/* MFAVerification component demo */}
            <div className="max-w-md mx-auto bg-gray-800 p-6 rounded-lg text-white">
              <h2 className="text-xl font-semibold mb-4">MFA验证演示</h2>
              <p className="text-gray-400">Email: {demoUser.email}</p>
              <button
                onClick={() => alert('验证成功！')}
                className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                模拟验证
              </button>
            </div>
          </div>
        );

      default:
        return renderOverview();
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {renderCurrentView()}
      </div>
    </div>
  );
};

export default MFADemo;
