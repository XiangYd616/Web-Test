/**
 * CompatibilityTestHistory.tsx - React组件
 * 
 * 文件路径: frontend\components\compatibility\CompatibilityTestHistory.tsx
 * 创建时间: 2025-10-29
 */

import React, { forwardRef } from 'react';
import TestHistory from '../common/TestHistory';
import type { TestHistoryItem } from '../common/TestHistory';

interface CompatibilityTestHistoryProps {
  onSelectTest?: (test: TestHistoryItem) => void;
  onTestRerun?: (test: TestHistoryItem) => void;
  onTestDelete?: (testId: string) => void;
}

/**
 * CompatibilityTestHistory - 兼容性测试历史记录组件
 * 使用通用 TestHistory 组件，传入 testType="compatibility"
 */
export const CompatibilityTestHistory = forwardRef<any, CompatibilityTestHistoryProps>(
  (props, ref) => {
    return (
      <TestHistory
        testType="compatibility"
        title="兼容性测试历史"
        description="查看和管理兼容性测试记录"
        {...props}
      />
    );
  }
);

CompatibilityTestHistory.displayName = 'CompatibilityTestHistory';

export default CompatibilityTestHistory;

