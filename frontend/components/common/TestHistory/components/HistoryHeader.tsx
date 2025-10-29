/**
 * HistoryHeader - 历史记录头部组件
 * 
 * 文件路径: frontend/components/common/TestHistory/components/HistoryHeader.tsx
 * 创建时间: 2025-10-05
 */

import React from 'react';
import { BarChart3, RefreshCw, Trash2 } from 'lucide-react';

interface HistoryHeaderProps {
  loading: boolean;
  selectedCount: number;
  onRefresh: () => void;
  onBatchDelete: () => void;
  onClearSelection: () => void;
}

export const HistoryHeader: React.FC<HistoryHeaderProps> = ({
  loading,
  selectedCount,
  onRefresh,
  onBatchDelete,
  onClearSelection
}) => {
  return (
    <div className="test-records-header p-6 border-b border-gray-700/40 dark:border-gray-600/30">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-500/20 backdrop-blur-sm rounded-lg flex items-center justify-center border border-blue-500/30">
            <BarChart3 className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">测试历史</h2>
            <p className="text-sm text-gray-300 mt-1">
              查看和管理压力测试记录
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {selectedCount > 0 && (
            <>
              <button
                type="button"
                onClick={onBatchDelete}
                disabled={loading}
                aria-label={`批量删除 ${selectedCount} 条记录`}
                title={`删除选中的 ${selectedCount} 条测试记录`}
                className="test-action-button inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-400 bg-red-900/20 hover:bg-red-800/30 border border-red-600/40 hover:border-red-500/60 rounded-lg transition-all duration-200 disabled:opacity-50 backdrop-blur-sm"
              >
                <Trash2 className="w-4 h-4" />
                删除选中 ({selectedCount})
              </button>
              <button
                type="button"
                onClick={onClearSelection}
                className="test-action-button inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-400 bg-gray-700/30 hover:bg-gray-600/40 border border-gray-600/40 hover:border-gray-500/60 rounded-lg transition-all duration-200 backdrop-blur-sm"
                title="清除选择"
              >
                清除选择
              </button>
            </>
          )}
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            aria-label={loading ? '正在刷新测试记录' : '刷新测试记录'}
            title={loading ? '正在刷新测试记录...' : '刷新测试记录列表'}
            className="test-action-button inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700/50 hover:bg-gray-600/60 border border-gray-600/40 hover:border-gray-500/60 rounded-lg transition-all duration-200 disabled:opacity-50 backdrop-blur-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </button>
        </div>
      </div>
    </div>
  );
};


