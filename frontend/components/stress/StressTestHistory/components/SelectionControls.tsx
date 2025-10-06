/**
 * SelectionControls - 选择控制组件
 * 
 * 文件路径: frontend/components/stress/StressTestHistory/components/SelectionControls.tsx
 * 创建时间: 2025-10-05
 */

import React from 'react';

interface SelectionControlsProps {
  recordsCount: number;
  selectedCount: number;
  isAllSelected: boolean;
  onToggleSelectAll: () => void;
}

export const SelectionControls: React.FC<SelectionControlsProps> = ({
  recordsCount,
  selectedCount,
  isAllSelected,
  onToggleSelectAll
}) => {
  if (recordsCount === 0) {
    return null;
  }

  return (
    <div className="flex items-center">
      <label className="flex items-center gap-3 cursor-pointer group">
        <div className="relative">
          <input
            type="checkbox"
            checked={isAllSelected}
            onChange={onToggleSelectAll}
            className="sr-only"
            aria-label="全选/取消全选测试记录"
            title={selectedCount === 0
              ? '全选所有记录'
              : isAllSelected
                ? '取消全选'
                : `已选择 ${selectedCount} 项，点击全选`}
          />
          <div className={`
            w-5 h-5 rounded-md border-2 transition-all duration-200 flex items-center justify-center
            ${isAllSelected
              ? 'bg-blue-600 border-blue-600 shadow-lg shadow-blue-500/25'
              : selectedCount > 0
                ? 'bg-blue-600/50 border-blue-500 shadow-md shadow-blue-500/20'
                : 'bg-gray-700/50 border-gray-600/60 hover:border-gray-500/80 hover:bg-gray-600/50'
            }
            group-hover:scale-105 group-active:scale-95
          `}>
            {selectedCount > 0 && (
              <svg
                className={`w-3 h-3 text-white transition-all duration-150 ${isAllSelected ? 'animate-in fade-in' : 'opacity-75'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {isAllSelected ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M20 12H4"
                  />
                )}
              </svg>
            )}
          </div>
        </div>
        <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">
          {selectedCount === 0
            ? '全选'
            : isAllSelected
              ? '全选'
              : `${selectedCount}项`}
        </span>
      </label>
    </div>
  );
};

