/**
 * AccessibilityTestHistory.tsx - React组件
 * 
 * 文件路径: frontend\components\accessibility\AccessibilityTestHistory.tsx
 * 创建时间: 2025-10-29
 */

import React, { forwardRef } from 'react';
import TestHistory from '../common/TestHistory';
import type { TestHistoryItem } from '../common/TestHistory';

interface AccessibilityTestHistoryProps {
  onSelectTest?: (test: TestHistoryItem) => void;
  onTestRerun?: (test: TestHistoryItem) => void;
  onTestDelete?: (testId: string) => void;
}

/**
 * AccessibilityTestHistory - 可访问性测试历史记录组件
 * 使用通用 TestHistory 组件，传入 testType="accessibility"
 */
export const AccessibilityTestHistory = forwardRef<any, AccessibilityTestHistoryProps>(
  (props, ref) => {
    return (
      <TestHistory
        testType="accessibility"
        title="可访问性测试历史"
        description="查看和管理可访问性测试记录"
        {...props}
      />
    );
  }
);

AccessibilityTestHistory.displayName = 'AccessibilityTestHistory';

export default AccessibilityTestHistory;

