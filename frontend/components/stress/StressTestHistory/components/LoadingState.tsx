/**
 * LoadingState - 加载状态组件
 * 
 * 文件路径: frontend/components/stress/StressTestHistory/components/LoadingState.tsx
 * 创建时间: 2025-10-05
 */

import React from 'react';
import { RefreshCw } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ 
  message = '加载中...' 
}) => {
  return (
    <div className="flex items-center justify-center py-12">
      <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
      <span className="ml-2 text-gray-600 dark:text-gray-400">{message}</span>
    </div>
  );
};

