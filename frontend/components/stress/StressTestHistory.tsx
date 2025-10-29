/**
 * StressTestHistory.tsx - React组件
 * 
 * 文件路径: frontend\components\stress\StressTestHistory.tsx
 * 创建时间: 2025-09-25
 * 重构: 使用通用 TestHistory 组件
 */

import React, { forwardRef } from 'react';
import TestHistory from '../common/TestHistory';
import type { TestHistoryItem } from '../common/TestHistory';

// StressTestHistory Props
interface StressTestHistoryProps {
  onSelectTest?: (test: TestHistoryItem) => void;
  onTestRerun?: (test: TestHistoryItem) => void;
  onTestDelete?: (testId: string) => void;
  className?: string;
}

/**
 * StressTestHistory - 压力测试历史记录组件
 * 使用通用 TestHistory 组件，传入 testType="stress"
 */
export const StressTestHistory = forwardRef<any, StressTestHistoryProps>(
  ({ onSelectTest, onTestRerun, onTestDelete, className }, ref) => {
    return (
      <TestHistory
        testType="stress"
        title="压力测试历史"
        description="查看和管理压力测试记录"
        onTestSelect={onSelectTest}
        onTestRerun={onTestRerun}
        onTestDelete={onTestDelete}
      />
    );
  }
);

StressTestHistory.displayName = 'StressTestHistory';

export default StressTestHistory;

