/**
 * RecordStatus - 记录状态标签组件
 * 
 * 文件路径: frontend/components/common/TestHistory/components/RecordCard/RecordStatus.tsx
 * 创建时间: 2025-10-05
 */

import React from 'react';
import { getStatusConfig, getStatusStyleClasses, getStatusText } from '../../../../../utils/testStatusUtils';
import { calculateTestCompletion } from '../../../../../utils/testStatusUtils';
import type { TestRecord } from '../../types';

interface RecordStatusProps {
  record: TestRecord;
}

export const RecordStatus: React.FC<RecordStatusProps> = ({ record }) => {
  const statusConfig = getStatusConfig(record.status);
  const StatusIcon = statusConfig?.icon;
  const isAnimated = record.status === 'running';

  return (
    <div className="mb-2">
      {/* 第一行：测试名称和状态 */}
      <div className="flex items-center gap-3 mb-2">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white truncate">
          {record.testName}
        </h3>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border ${getStatusStyleClasses(record.status)}`}
            role="status"
            aria-label={`测试状态: ${getStatusText(record.status)}`}
          >
            {StatusIcon && (
              <StatusIcon className={`w-4 h-4 ${isAnimated ? 'animate-pulse' : ''}`} />
            )}
            {getStatusText(record.status)}
          </span>

          {/* 代理使用标识 */}
          {record.config?.proxy?.enabled && (
            <span
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border bg-purple-100 dark:bg-purple-600/60 text-purple-800 dark:text-purple-200 border-purple-200 dark:border-purple-500/50"
              title={`代理: ${record.config.proxy?.type?.toUpperCase() || 'HTTP'} - ${record.config.proxy?.host}:${record.config.proxy?.port || 8080}`}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
              </svg>
              代理
            </span>
          )}
        </div>
      </div>

      {/* 错误信息和取消原因显示 */}
      {(record.status === 'failed' || record.status === 'cancelled') && record.errorMessage && (
        <div className="mb-3">
          <div className={`text-xs px-3 py-2 rounded-lg border-l-4 ${
            record.status === 'failed'
              ? 'bg-red-50 dark:bg-red-900/20 border-red-400 text-red-700 dark:text-red-300'
              : 'bg-orange-50 dark:bg-orange-900/20 border-orange-400 text-orange-700 dark:text-orange-300'
          }`}>
            <div className="font-medium mb-1">
              {record.status === 'failed' ? '失败原因' : '取消原因'}
            </div>
            <div className="text-xs opacity-90">
              {record.errorMessage}
            </div>
            {record.status === 'cancelled' && (
              <div className="text-xs opacity-75 mt-1">
                完成度: {calculateTestCompletion(record)}%
              </div>
            )}
          </div>
        </div>
      )}

      {/* URL */}
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 truncate">
        {record.url}
      </p>

      {/* 自定义标签 */}
      {record.tags && record.tags.length > 0 && (
        <div className="flex items-center gap-2 mb-3">
          {record.tags.slice(0, 3).map((tag, index) => (
            <span key={index} className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md bg-blue-100 dark:bg-blue-600/60 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-500/50">
              {tag}
            </span>
          ))}
          {record.tags.length > 3 && (
            <span className="text-xs text-gray-500 dark:text-gray-400">+{record.tags.length - 3}</span>
          )}
        </div>
      )}
    </div>
  );
};


