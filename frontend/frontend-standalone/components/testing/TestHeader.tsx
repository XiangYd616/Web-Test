import { LucideIcon } from 'lucide-react';
import React from 'react';

export interface TestHeaderProps {
  // 基本信息
  title: string;
  description: string;
  icon: LucideIcon;

  // 主题色彩配置
  primaryColor?: 'blue' | 'green' | 'purple' | 'red' | 'yellow' | 'indigo' | 'pink' | 'orange';
  secondaryColor?: 'blue' | 'green' | 'purple' | 'red' | 'yellow' | 'indigo' | 'pink' | 'orange';

  // 标签页状态
  activeTab: 'test' | 'history';
  onTabChange: (tab: 'test' | 'history') => void;
  testTabLabel?: string;
  historyTabLabel?: string;

  // 测试状态
  testStatus?: 'idle' | 'running' | 'completed' | 'failed';
  isTestDisabled?: boolean;
  onStartTest?: () => void;
  onStopTest?: () => void;

  // 额外的控制按钮
  extraControls?: React.ReactNode;

  // 样式
  className?: string;
}

export const TestHeader: React.FC<TestHeaderProps> = ({
  title,
  description,
  icon: Icon,
  primaryColor = 'blue',
  secondaryColor = 'green',
  activeTab,
  onTabChange,
  testTabLabel = '测试',
  historyTabLabel = '测试历史',
  testStatus = 'idle',
  isTestDisabled = false,
  onStartTest,
  onStopTest,
  extraControls,
  className = ''
}) => {
  // 颜色配置映射
  const colorConfig = {
    blue: { from: 'from-blue-500', to: 'to-blue-600', bg: 'bg-blue-500/10', text: 'text-blue-400', accent: 'bg-blue-500' },
    green: { from: 'from-green-500', to: 'to-green-600', bg: 'bg-green-500/10', text: 'text-green-400', accent: 'bg-green-500' },
    purple: { from: 'from-purple-500', to: 'to-purple-600', bg: 'bg-purple-500/10', text: 'text-purple-400', accent: 'bg-purple-500' },
    red: { from: 'from-red-500', to: 'to-red-600', bg: 'bg-red-500/10', text: 'text-red-400', accent: 'bg-red-500' },
    yellow: { from: 'from-yellow-500', to: 'to-yellow-600', bg: 'bg-yellow-500/10', text: 'text-yellow-400', accent: 'bg-yellow-500' },
    indigo: { from: 'from-indigo-500', to: 'to-indigo-600', bg: 'bg-indigo-500/10', text: 'text-indigo-400', accent: 'bg-indigo-500' },
    pink: { from: 'from-pink-500', to: 'to-pink-600', bg: 'bg-pink-500/10', text: 'text-pink-400', accent: 'bg-pink-500' },
    orange: { from: 'from-orange-500', to: 'to-orange-600', bg: 'bg-orange-500/10', text: 'text-orange-400', accent: 'bg-orange-500' }
  };

  const primary = colorConfig[primaryColor];
  const secondary = colorConfig[secondaryColor];

  const getTestButtonConfig = () => {
    switch (testStatus) {
      case 'running':
        return {
          text: '停止测试',
          onClick: onStopTest,
          className: 'bg-red-600 hover:bg-red-700 text-white',
          disabled: false
        };
      case 'idle':
      default:
        return {
          text: '开始测试',
          onClick: onStartTest,
          className: isTestDisabled
            ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
            : `bg-gradient-to-r ${primary.from} ${primary.to} hover:${primary.from.replace('from-', 'from-').replace('-500', '-600')} hover:${primary.to.replace('to-', 'to-').replace('-600', '-700')} text-white`,
          disabled: isTestDisabled
        };
    }
  };

  const testButtonConfig = getTestButtonConfig();

  return (
    <div className={`relative overflow-hidden bg-gradient-to-br from-gray-800/90 via-gray-800/80 to-gray-900/90 backdrop-blur-sm rounded-xl border border-gray-700/50 shadow-2xl ${className}`}>
      {/* 背景装饰 */}
      <div className={`absolute inset-0 bg-gradient-to-r ${primary.bg} via-${secondary.bg} to-${primary.bg}`}></div>
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl ${primary.bg} to-transparent rounded-full blur-2xl`}></div>
      <div className={`absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr ${secondary.bg} to-transparent rounded-full blur-xl`}></div>

      {/* 内容区域 */}
      <div className="relative p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* 标题区域 */}
          <div className="flex items-center space-x-4">
            {/* 图标装饰 */}
            <div className="relative">
              <div className={`w-14 h-14 bg-gradient-to-br ${primary.from} ${secondary.to} rounded-xl flex items-center justify-center shadow-lg`}>
                <Icon className="w-8 h-8 text-white" />
              </div>
              <div className={`absolute -top-1 -right-1 w-4 h-4 ${primary.accent} rounded-full border-2 border-gray-800 animate-pulse`}></div>
            </div>

            {/* 标题文字 */}
            <div>
              <div className="flex items-center space-x-3">
                <h2 className={`text-2xl font-bold bg-gradient-to-r from-white via-${primaryColor}-100 to-${secondaryColor}-100 bg-clip-text text-transparent`}>
                  {title}
                </h2>
                <div className="flex items-center space-x-1">
                  <div className={`w-2 h-2 ${primary.accent} rounded-full animate-pulse`}></div>
                  <div className={`w-2 h-2 ${secondary.accent} rounded-full animate-pulse [animation-delay:0.2s]`}></div>
                  <div className={`w-2 h-2 ${primary.accent} rounded-full animate-pulse [animation-delay:0.4s]`}></div>
                </div>
              </div>
              <p className="text-gray-300 text-sm mt-1 flex items-center space-x-2">
                <Icon className={`w-4 h-4 ${primary.text}`} />
                <span>{description}</span>
              </p>
            </div>
          </div>

          {/* 右侧：控制区域 */}
          <div className="flex items-center space-x-3">
            {/* 额外控制按钮 */}
            {extraControls}

            {/* 标签页切换 */}
            <div className="flex items-center bg-gray-700/50 backdrop-blur-sm rounded-lg p-1 border border-gray-600/50">
              <button
                type="button"
                onClick={() => onTabChange('test')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${activeTab === 'test'
                  ? `bg-gradient-to-r ${primary.from} ${primary.to} text-white shadow-lg`
                  : 'text-gray-300 hover:text-white hover:bg-gray-600/50'
                  }`}
              >
                {testTabLabel}
              </button>
              <button
                type="button"
                onClick={() => onTabChange('history')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${activeTab === 'history'
                  ? `bg-gradient-to-r ${primary.from} ${primary.to} text-white shadow-lg`
                  : 'text-gray-300 hover:text-white hover:bg-gray-600/50'
                  }`}
              >
                {historyTabLabel}
              </button>
            </div>

            {/* 测试控制按钮 - 只在测试标签页显示 */}
            {activeTab === 'test' && (onStartTest || onStopTest) && (
              <button
                type="button"
                onClick={testButtonConfig.onClick}
                disabled={testButtonConfig.disabled}
                className={`flex items-center space-x-2 px-6 py-3 rounded-lg text-sm font-medium transition-all duration-200 shadow-lg ${testButtonConfig.className}`}
              >
                <Icon className="w-4 h-4" />
                <span>{testButtonConfig.text}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestHeader;
