import { AlertCircle, CheckCircle, Clock, Play, Square } from 'lucide-react';
import React, { ReactNode } from 'react';

export interface UnifiedTestPageLayoutProps {
  title: string;
  description?: string;
  testStatus: 'idle' | 'running' | 'completed' | 'failed';
  isTestDisabled?: boolean;
  onStartTest?: () => void;
  onStopTest?: () => void;
  children?: ReactNode;
  configPanel?: ReactNode;
  resultsPanel?: ReactNode;
  historyPanel?: ReactNode;
  // 兼容旧版本属性
  testType?: string;
  icon?: any;
  testTabLabel?: string;
  historyTabLabel?: string;
  onTestSelect?: (test: any) => void;
  onTestRerun?: (test: any) => void;
  testContent?: ReactNode;
  additionalComponents?: ReactNode;
}

const UnifiedTestPageLayout: React.FC<UnifiedTestPageLayoutProps> = ({
  title,
  description,
  testStatus,
  isTestDisabled = false,
  onStartTest,
  onStopTest,
  children,
  configPanel,
  resultsPanel,
  historyPanel,
  // 兼容旧版本属性
  testType,
  icon,
  testTabLabel,
  historyTabLabel,
  onTestSelect,
  onTestRerun,
  testContent,
  additionalComponents
}) => {
  const getStatusIcon = () => {
    switch (testStatus) {
      case 'running':
        return <Clock className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Play className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusText = () => {
    switch (testStatus) {
      case 'running':
        return '测试进行中...';
      case 'completed':
        return '测试完成';
      case 'failed':
        return '测试失败';
      default:
        return '准备就绪';
    }
  };

  const getStatusColor = () => {
    switch (testStatus) {
      case 'running':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'completed':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'failed':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面头部 */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
              {description && (
                <p className="mt-2 text-gray-600">{description}</p>
              )}
            </div>

            {/* 状态指示器 */}
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${getStatusColor()}`}>
              {getStatusIcon()}
              <span className="font-medium">{getStatusText()}</span>
            </div>
          </div>
        </div>

        {/* 主要内容区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左侧：配置面板 */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">测试配置</h2>
              {configPanel}

              {/* 控制按钮 */}
              <div className="mt-6 flex gap-3">
                {testStatus === 'running' ? (
                  <button
                    onClick={onStopTest}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <Square className="w-4 h-4" />
                    停止测试
                  </button>
                ) : (
                  <button
                    onClick={onStartTest}
                    disabled={isTestDisabled}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    开始测试
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 右侧：结果和历史 */}
          <div className="lg:col-span-2 space-y-8">
            {/* 测试结果 */}
            {resultsPanel && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">测试结果</h2>
                {resultsPanel}
              </div>
            )}

            {/* 自定义内容 */}
            {testContent || children}

            {/* 测试历史 */}
            {historyPanel && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">测试历史</h2>
                {historyPanel}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnifiedTestPageLayout;
