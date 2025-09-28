/**
 * StressTestTabs.tsx - React组件
 * 
 * 文件路径: frontend\components\stress\StressTestTabs.tsx
 * 创建时间: 2025-09-25
 */

import React from 'react';
import { Play, Clock } from 'lucide-react';

interface StressTestTabsProps {
  activeTab: 'test' | 'history';
  onTabChange: (tab: 'test' | 'history') => void;
  testMode: 'real' | 'local';
  onModeChange: (mode: 'real' | 'local') => void;
}

const StressTestTabs: React.FC<StressTestTabsProps> = ({
  activeTab,
  onTabChange,
  testMode,
  onModeChange
}) => {
  return (
    <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* 标签页切换 */}
        <div className="flex items-center bg-gray-700/50 rounded-md p-0.5">
          <button
            onClick={() => onTabChange('test')}
            className={`px-4 py-2 rounded text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
              activeTab === 'test'
                ? 'bg-blue-500 text-white shadow-lg'
                : 'text-gray-300 hover:text-white hover:bg-gray-600/50'
            }`}
          >
            <Play className="w-4 h-4" />
            压力测试
          </button>
          <button
            onClick={() => onTabChange('history')}
            className={`px-4 py-2 rounded text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
              activeTab === 'history'
                ? 'bg-blue-500 text-white shadow-lg'
                : 'text-gray-300 hover:text-white hover:bg-gray-600/50'
            }`}
          >
            <Clock className="w-4 h-4" />
            测试历史
          </button>
        </div>

        {/* 测试模式切换 */}
        {activeTab === 'test' && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">测试模式:</span>
            <div className="flex items-center bg-gray-700/50 rounded-md p-0.5">
              <button
                onClick={() => onModeChange('real')}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-all duration-200 ${
                  testMode === 'real'
                    ? 'bg-green-500 text-white shadow-lg'
                    : 'text-gray-300 hover:text-white hover:bg-gray-600/50'
                }`}
              >
                真实测试
              </button>
              <button
                onClick={() => onModeChange('local')}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-all duration-200 ${
                  testMode === 'local'
                    ? 'bg-purple-500 text-white shadow-lg'
                    : 'text-gray-300 hover:text-white hover:bg-gray-600/50'
                }`}
              >
                本地测试
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StressTestTabs;
