/**
 * UXTestHistory.tsx - React组件
 * 
 * 文件路径: frontend\components\ux\UXTestHistory.tsx
 * 创建时间: 2025-10-29
 */

import React, { forwardRef } from 'react';
import TestHistory from '../common/TestHistory';
import type { TestHistoryItem } from '../common/TestHistory';

interface UXTestHistoryProps {
  onSelectTest?: (test: TestHistoryItem) => void;
  onTestRerun?: (test: TestHistoryItem) => void;
  onTestDelete?: (testId: string) => void;
}

/**
 * UXTestHistory - UX测试历史记录组件
 * 使用通用 TestHistory 组件，传入 testType="ux"
 */
export const UXTestHistory = forwardRef<any, UXTestHistoryProps>(
  (props, ref) => {
    return (
      <TestHistory
        testType="ux"
        title="UX 测试历史"
        description="查看和管理UX测试记录"
        {...props}
      />
    );
  }
);

UXTestHistory.displayName = 'UXTestHistory';

export default UXTestHistory;

