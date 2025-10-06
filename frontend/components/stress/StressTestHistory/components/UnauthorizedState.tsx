/**
 * UnauthorizedState - 未登录状态组件
 * 
 * 文件路径: frontend/components/stress/StressTestHistory/components/UnauthorizedState.tsx
 * 创建时间: 2025-10-05
 */

import React from 'react';
import { Activity } from 'lucide-react';

export const UnauthorizedState: React.FC = () => {
  return (
    <div className="p-12 text-center">
      <div className="bg-gray-700/30 backdrop-blur-sm rounded-xl border border-gray-600/40 p-8 max-w-md mx-auto">
        <Activity className="w-16 h-16 mx-auto mb-6 text-blue-400" />
        <h3 className="text-xl font-semibold text-white mb-4">需要登录</h3>
        <p className="text-gray-300 mb-6">
          请登录以查看您的压力测试历史记录
        </p>
        <button
          type="button"
          onClick={() => window.location.href = '/login'}
          className="px-6 py-3 bg-blue-600/80 hover:bg-blue-600 text-white rounded-lg font-medium transition-all duration-200 backdrop-blur-sm border border-blue-500/30 hover:border-blue-500/60"
        >
          立即登录
        </button>
      </div>
    </div>
  );
};

