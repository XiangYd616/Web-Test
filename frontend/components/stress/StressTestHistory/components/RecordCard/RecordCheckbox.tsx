/**
 * RecordCheckbox - 记录复选框组件
 * 
 * 文件路径: frontend/components/stress/StressTestHistory/components/RecordCard/RecordCheckbox.tsx
 * 创建时间: 2025-10-05
 */

import React from 'react';

interface RecordCheckboxProps {
  recordId: string;
  recordName: string;
  isSelected: boolean;
  onToggle: (id: string) => void;
}

export const RecordCheckbox: React.FC<RecordCheckboxProps> = ({
  recordId,
  recordName,
  isSelected,
  onToggle
}) => {
  return (
    <div className="flex items-center pt-1">
      <label className="relative cursor-pointer group">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggle(recordId)}
          className="sr-only"
          aria-label={`选择测试记录: ${recordName}`}
        />
        <div className={`
          w-5 h-5 rounded-md border-2 transition-all duration-200 flex items-center justify-center
          ${isSelected
            ? 'bg-blue-600 border-blue-600 shadow-lg shadow-blue-500/25'
            : 'bg-gray-700/50 border-gray-600/60 hover:border-gray-500/80 hover:bg-gray-600/50'
          }
          group-hover:scale-105 group-active:scale-95
        `}>
          {isSelected && (
            <svg
              className="w-3 h-3 text-white animate-in fade-in duration-150"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              />
            </svg>
          )}
        </div>
      </label>
    </div>
  );
};

