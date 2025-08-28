import React from 'react';
import { Play, Square, RotateCcw, Settings } from 'lucide-react';

interface StressTestHeaderProps {
  isRunning: boolean;
  currentStatus: string;
  statusMessage: string;
  testProgress: string;
  onStartTest: () => void;
  onStopTest: () => void;
  onResetTest: () => void;
  onShowSettings: () => void;
}

const StressTestHeader: React.FC<StressTestHeaderProps> = ({
  isRunning,
  currentStatus,
  statusMessage,
  testProgress,
  onStartTest,
  onStopTest,
  onResetTest,
  onShowSettings
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RUNNING':
        return 'text-green-400 bg-green-400/10';
      case 'COMPLETED':
        return 'text-blue-400 bg-blue-400/10';
      case 'FAILED':
        return 'text-red-400 bg-red-400/10';
      case 'CANCELLED':
        return 'text-yellow-400 bg-yellow-400/10';
      default:
        return 'text-gray-400 bg-gray-400/10';
    }
  };

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-gray-800/90 via-gray-800/80 to-gray-900/90 backdrop-blur-sm rounded-xl border border-gray-700/50 shadow-2xl">
      {/* 背景装饰 */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-purple-600/5 to-cyan-600/5"></div>
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-400/50 to-transparent"></div>
      
      <div className="relative p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* 标题区域 */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
                <Play className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-bold text-white">压力测试</h1>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(currentStatus)}`}>
                {currentStatus}
              </div>
            </div>
            
            <div className="space-y-1">
              <p className="text-gray-300">{statusMessage}</p>
              {testProgress && (
                <p className="text-sm text-gray-400">{testProgress}</p>
              )}
            </div>
          </div>

          {/* 控制按钮 */}
          <div className="flex items-center gap-3">
            <button
              onClick={onShowSettings}
              className="p-3 rounded-lg bg-gray-700/50 hover:bg-gray-700 text-gray-300 hover:text-white transition-all duration-200"
              title="设置"
            >
              <Settings className="w-5 h-5" />
            </button>
            
            <button
              onClick={onResetTest}
              disabled={isRunning}
              className="p-3 rounded-lg bg-gray-700/50 hover:bg-gray-700 text-gray-300 hover:text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              title="重置"
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            {!isRunning ? (
              <button
                onClick={onStartTest}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium rounded-lg transition-all duration-200 shadow-lg hover:shadow-blue-500/25 flex items-center gap-2"
              >
                <Play className="w-5 h-5" />
                开始测试
              </button>
            ) : (
              <button
                onClick={onStopTest}
                className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-medium rounded-lg transition-all duration-200 shadow-lg hover:shadow-red-500/25 flex items-center gap-2"
              >
                <Square className="w-5 h-5" />
                停止测试
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StressTestHeader;
