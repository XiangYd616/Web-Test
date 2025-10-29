/**
 * PerformanceTestHistory.tsx - React组件
 * 
 * 文件路径: frontend\components\performance\PerformanceTestHistory.tsx
 * 创建时间: 2025-10-29
 */

import React, { forwardRef } from 'react';
import TestHistory from '../common/TestHistory';
import type { TestHistoryItem } from '../common/TestHistory';

interface PerformanceTestHistoryProps {
  onSelectTest?: (test: TestHistoryItem) => void;
  onTestRerun?: (test: TestHistoryItem) => void;
  onTestDelete?: (testId: string) => void;
}

/**
 * PerformanceTestHistory - 性能测试历史记录组件
 * 使用通用 TestHistory 组件，传入 testType="performance"
 */
export const PerformanceTestHistory = forwardRef<any, PerformanceTestHistoryProps>(
  (props, ref) => {
    return (
      <TestHistory
        testType="performance"
        title="性能测试历史"
        description="查看和管理性能测试记录"
        {...props}
      />
    );
  }
);

PerformanceTestHistory.displayName = 'PerformanceTestHistory';

export default PerformanceTestHistory;

