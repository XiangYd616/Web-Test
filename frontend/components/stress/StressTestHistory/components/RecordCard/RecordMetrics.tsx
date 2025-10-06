/**
 * RecordMetrics - 记录指标网格组件
 * 
 * 文件路径: frontend/components/stress/StressTestHistory/components/RecordCard/RecordMetrics.tsx
 * 创建时间: 2025-10-05
 */

import React from 'react';
import {
  formatTime,
  formatDuration,
  formatNumber,
  formatScore,
  formatPercentage,
  getTotalRequests,
  getAverageResponseTime,
  getErrorRate,
  getScoreColorClass,
  getErrorRateColorClass
} from '../../utils';
import type { TestRecord } from '../../types';

interface RecordMetricsProps {
  record: TestRecord;
}

export const RecordMetrics: React.FC<RecordMetricsProps> = ({ record }) => {
  const avgTime = getAverageResponseTime(record);
  const errorRate = getErrorRate(record);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 text-sm">
      {/* 创建时间 */}
      <div>
        <span className="text-gray-500 dark:text-gray-400">创建时间</span>
        <p className="font-medium text-gray-900 dark:text-white">
          {formatTime(record.createdAt)}
        </p>
      </div>

      {/* 测试时长 */}
      <div>
        <span className="text-gray-500 dark:text-gray-400">测试时长</span>
        <p className="font-medium text-gray-900 dark:text-white">
          {formatDuration(record)}
        </p>
      </div>

      {/* 总请求数 */}
      <div>
        <span className="text-gray-500 dark:text-gray-400">总请求数</span>
        <p className="font-medium text-gray-900 dark:text-white">
          {formatNumber(getTotalRequests(record))}
        </p>
      </div>

      {/* 平均响应时间 */}
      <div>
        <span className="text-gray-500 dark:text-gray-400">平均响应时间</span>
        <p className="font-medium text-gray-900 dark:text-white">
          {avgTime ? `${avgTime.toFixed(0)}ms` : '-'}
        </p>
      </div>

      {/* 性能评分 */}
      <div>
        <span className="text-gray-500 dark:text-gray-400">性能评分</span>
        <p className={`font-medium ${getScoreColorClass(record.overallScore)}`}>
          {formatScore(record)}
        </p>
      </div>

      {/* 错误率 */}
      <div>
        <span className="text-gray-500 dark:text-gray-400">错误率</span>
        <p className={`font-medium ${getErrorRateColorClass(errorRate)}`}>
          {formatPercentage(record)}
        </p>
      </div>
    </div>
  );
};

