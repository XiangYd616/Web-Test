/**
 * RecordActions - 记录操作按钮组组件
 * 
 * 文件路径: frontend/components/common/TestHistory/components/RecordCard/RecordActions.tsx
 * 创建时间: 2025-10-05
 */

import React from 'react';
import { Eye, ExternalLink, Download, Trash2 } from 'lucide-react';
import type { TestRecord } from '../../types';

interface RecordActionsProps {
  record: TestRecord;
  onQuickView: () => void;
  onDetailView: () => void;
  onExport: () => void;
  onDelete: () => void;
}

export const RecordActions: React.FC<RecordActionsProps> = ({
  record,
  onQuickView,
  onDetailView,
  onExport,
  onDelete
}) => {
  return (
    <div className="test-record-actions flex items-center gap-2 ml-4">
      {/* 快速查看 */}
      <button
        type="button"
        onClick={onQuickView}
        aria-label={`快速查看: ${record.testName}`}
        className="test-record-action-button p-2 text-gray-400 hover:text-blue-400 hover:bg-gray-700/50 border border-gray-600/30 hover:border-blue-500/50 rounded-lg transition-all duration-200 backdrop-blur-sm"
        title="快速查看"
      >
        <Eye className="w-4 h-4" />
      </button>

      {/* 详细页面 */}
      <button
        type="button"
        onClick={onDetailView}
        aria-label={`详细页面: ${record.testName}`}
        className="test-record-action-button p-2 text-gray-400 hover:text-purple-400 hover:bg-gray-700/50 border border-gray-600/30 hover:border-purple-500/50 rounded-lg transition-all duration-200 backdrop-blur-sm"
        title="详细页面"
      >
        <ExternalLink className="w-4 h-4" />
      </button>

      {/* 导出 */}
      <button
        type="button"
        onClick={onExport}
        aria-label={`导出测试记录: ${record.testName}`}
        className="test-record-action-button p-2 text-gray-400 hover:text-green-400 hover:bg-gray-700/50 border border-gray-600/30 hover:border-green-500/50 rounded-lg transition-all duration-200 backdrop-blur-sm"
        title="导出记录"
      >
        <Download className="w-4 h-4" />
      </button>

      {/* 删除 */}
      <button
        type="button"
        onClick={onDelete}
        aria-label={`删除测试记录: ${record.testName}`}
        className="delete-record-button p-2 text-white border border-red-600 hover:border-red-700 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
        style={{
          backgroundColor: '#dc2626 !important',
          color: 'white !important',
          borderColor: '#dc2626 !important'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.setProperty('background-color', '#b91c1c', 'important');
          e.currentTarget.style.setProperty('border-color', '#b91c1c', 'important');
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.setProperty('background-color', '#dc2626', 'important');
          e.currentTarget.style.setProperty('border-color', '#dc2626', 'important');
        }}
        title="删除记录"
      >
        <Trash2 className="w-4 h-4" style={{ color: 'white !important' }} />
      </button>
    </div>
  );
};


