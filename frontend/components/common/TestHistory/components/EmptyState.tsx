/**
 * EmptyState - 空状态组件
 * 
 * 文件路径: frontend/components/common/TestHistory/components/EmptyState.tsx
 * 创建时间: 2025-10-05
 */

import React from 'react';
import { BarChart3 } from 'lucide-react';

interface EmptyStateProps {
  hasFilters: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ hasFilters }) => {
  return (
    <div className="text-center py-12">
      <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
        暂无测试记录
      </h3>
      <p className="text-gray-600 dark:text-gray-400">
        {hasFilters
          ? '没有找到符合条件的测试记录'
          : '开始您的第一次压力测试吧'}
      </p>
    </div>
  );
};


