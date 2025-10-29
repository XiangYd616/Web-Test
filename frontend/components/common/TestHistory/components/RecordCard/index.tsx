/**
 * RecordCard - 测试记录卡片主组件
 * 
 * 文件路径: frontend/components/common/TestHistory/components/RecordCard/index.tsx
 * 创建时间: 2025-10-05
 */

import React from 'react';
import { RecordCheckbox } from './RecordCheckbox';
import { RecordStatus } from './RecordStatus';
import { RecordMetrics } from './RecordMetrics';
import { RecordActions } from './RecordActions';
import type { TestRecord } from '../../types';

interface RecordCardProps {
  record: TestRecord;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onQuickView: (record: TestRecord) => void;
  onDetailView: (record: TestRecord) => void;
  onExport: (record: TestRecord) => void;
  onDelete: (id: string) => void;
}

export const RecordCard: React.FC<RecordCardProps> = ({
  record,
  isSelected,
  onToggleSelect,
  onQuickView,
  onDetailView,
  onExport,
  onDelete
}) => {
  return (
    <article
      className="test-record-item bg-gray-800/40 dark:bg-gray-800/60 backdrop-blur-sm border border-gray-700/50 dark:border-gray-600/30 rounded-xl hover:bg-gray-800/60 dark:hover:bg-gray-700/50 transition-all duration-200 hover:shadow-lg hover:shadow-black/20"
      aria-label={`测试记录: ${record.testName}`}
    >
      <div className="flex items-start gap-4 p-6">
        {/* 复选框 */}
        <RecordCheckbox
          recordId={record.id}
          recordName={record.testName}
          isSelected={isSelected}
          onToggle={onToggleSelect}
        />

        {/* 主内容区 */}
        <div className="flex-1 min-w-0">
          {/* 状态和标签 */}
          <RecordStatus record={record} />

          {/* 指标网格 */}
          <RecordMetrics record={record} />
        </div>

        {/* 操作按钮 */}
        <RecordActions
          record={record}
          onQuickView={() => onQuickView(record)}
          onDetailView={() => onDetailView(record)}
          onExport={() => onExport(record)}
          onDelete={() => onDelete(record.id)}
        />
      </div>
    </article>
  );
};


