/**
 * AccessibilityTestHistory.tsx - React组件
 * 
 * 文件路径: frontend\components\accessibility\AccessibilityTestHistory.tsx
 * 创建时间: 2025-10-29
 */

import React, { forwardRef } from 'react';
import { TestHistory } from '../common/TestHistory/TestHistory';
import { accessibilityTestConfig } from '../common/TestHistory/config';
import type { TestRecord } from '../common/TestHistory/types';

interface AccessibilityTestHistoryProps {
  onSelectTest?: (test: TestRecord) => void;
  onTestRerun?: (test: TestRecord) => void;
  onTestDelete?: (testId: string) => void;
  className?: string;
}

/**
 * AccessibilityTestHistory - 可访问性测试历史记录组件
 * 使用配置驱动的 TestHistory 组件
 */
export const AccessibilityTestHistory = forwardRef<any, AccessibilityTestHistoryProps>(
  ({ onSelectTest, onTestRerun, onTestDelete, className }, ref) => {
    return (
      <TestHistory
        config={accessibilityTestConfig}
        onRecordClick={onSelectTest}
        onRecordDelete={onTestDelete}
        className={className}
      />
    );
  }
);

AccessibilityTestHistory.displayName = 'AccessibilityTestHistory';

export default AccessibilityTestHistory;

