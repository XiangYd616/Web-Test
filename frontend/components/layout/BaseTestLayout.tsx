import {LucideIcon} from 'lucide-react';
import React from 'react';
import {useAuthCheck} from '../auth/WithAuthCheck';

// 基础测试页面布局 - 提供共同的结构但允许完全自定义内容
interface BaseTestLayoutProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
  // 认证相关
  requireAuth?: boolean;
  authFeature?: string;
  authDescription?: string;
}

export const BaseTestLayout: React.FC<BaseTestLayoutProps> = ({
  title,
  description,
  icon: Icon,
  children,
  className = '',
  requireAuth = true,
  authFeature,
  authDescription
}) => {
  // 认证检查（如果需要）
  const authCheck = useAuthCheck({
    feature: authFeature || title,
    description: authDescription || `使用${title}功能`
  });

  // 如果需要认证但未登录，显示登录提示
  if (requireAuth && !authCheck.isAuthenticated) {
    
        return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            {/* 页面头部 */
      }
            <div className="text-center mb-8">
              <div className="flex items-center justify-center mb-4">
                {Icon && <Icon className="w-12 h-12 text-blue-400 mr-4" />}
                <h1 className="text-4xl font-bold text-white">{title}</h1>
              </div>
              {description && (
                <p className="text-xl text-gray-300 max-w-2xl mx-auto">{description}</p>
              )}
            </div>

            {/* 登录提示 */}
            <authCheck.LoginPromptComponent />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 ${className}`}>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* 页面头部 */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              {Icon && <Icon className="w-12 h-12 text-blue-400 mr-4" />}
              <h1 className="text-4xl font-bold text-white">{title}</h1>
            </div>
            {description && (
              <p className="text-xl text-gray-300 max-w-3xl mx-auto">{description}</p>
            )}
          </div>

          {/* 自定义内容区域 */}
          <div className="space-y-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

// 共享的测试状态指示器组件
interface TestStatusIndicatorProps {
  status: 'idle' | 'running' | 'completed' | 'failed' | 'starting';
  message?: string;
  progress?: number;
}

export const TestStatusIndicator: React.FC<TestStatusIndicatorProps> = ({
  status,
  message,
  progress
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'idle':
        return { color: 'gray', text: '准备就绪' };
      case 'starting':
        return { color: 'yellow', text: '正在启动...' };
      case 'running':
        return { color: 'blue', text: '测试进行中...' };
      case 'completed':
        return { color: 'green', text: '测试完成' };
      case 'failed':
        return { color: 'red', text: '测试失败' };
      default:
        return { color: 'gray', text: '未知状态' };
    }
  };

  const config = getStatusConfig();

  return (
    <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${config.color === 'gray' ? 'bg-gray-400' :
              config.color === 'yellow' ? 'bg-yellow-400 animate-pulse' :
                config.color === 'blue' ? 'bg-blue-400 animate-pulse' :
                  config.color === 'green' ? 'bg-green-400' :
                    'bg-red-400'
            }`} />
          <span className="text-white font-medium">{config.text}</span>
          {message && <span className="text-gray-300">- {message}</span>}
        </div>

        {status === 'running' && progress !== undefined && (
          <div className="flex items-center space-x-2">
            <div className="w-32 bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-400 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-sm text-gray-300">{progress}%</span>
          </div>
        )}
      </div>
    </div>
  );
};

// 共享的测试控制按钮组件
interface TestControlButtonsProps {
  status: 'idle' | 'running' | 'completed' | 'failed' | 'starting';
  onStart?: () => void;
  onStop?: () => void;
  onReset?: () => void;
  isDisabled?: boolean;
  startLabel?: string;
  stopLabel?: string;
  resetLabel?: string;
}

export const TestControlButtons: React.FC<TestControlButtonsProps> = ({
  status,
  onStart,
  onStop,
  onReset,
  isDisabled = false,
  startLabel = '开始测试',
  stopLabel = '停止测试',
  resetLabel = '重置'
}) => {
  return (
    <div className="flex items-center space-x-4">
      {(status === 'idle' || status === 'completed' || status === 'failed') && onStart && (
        <button
          onClick={onStart}
          disabled={isDisabled}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
        >
          {startLabel}
        </button>
      )}

      {(status === 'running' || status === 'starting') && onStop && (
        <button
          onClick={onStop}
          className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
        >
          {stopLabel}
        </button>
      )}

      {onReset && (
        <button
          onClick={onReset}
          disabled={status === 'running' || status === 'starting'}
          className="px-6 py-3 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
        >
          {resetLabel}
        </button>
      )}
    </div>
  );
};

// 共享的测试结果卡片组件
interface TestResultCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  headerActions?: React.ReactNode;
}

export const TestResultCard: React.FC<TestResultCardProps> = ({
  title,
  children,
  className = '',
  headerActions
}) => {
  return (
    <div className={`bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-white">{title}</h3>
        {headerActions}
      </div>
      {children}
    </div>
  );
};

export default BaseTestLayout;
