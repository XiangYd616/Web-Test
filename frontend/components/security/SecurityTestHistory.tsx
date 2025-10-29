/**
 * SecurityTestHistory.tsx - React组件
 * 
 * 文件路径: frontend\components\security\SecurityTestHistory.tsx
 * 创建时间: 2025-09-25
 * 重构: 使用通用 TestHistory 组件
 */

import React, { forwardRef } from 'react';
import TestHistory from '../common/TestHistory';
import type { TestHistoryItem } from '../common/TestHistory';

// SecurityTestHistory Props
interface SecurityTestHistoryProps {
  onSelectTest?: (test: TestHistoryItem) => void;
  onTestRerun?: (test: TestHistoryItem) => void;
  onTestDelete?: (testId: string) => void;
}

/**
 * SecurityTestHistory - 安全测试历史记录组件
 * 使用通用 TestHistory 组件，传入 testType="security"
 */
export const SecurityTestHistory = forwardRef<any, SecurityTestHistoryProps>(
  ({ onSelectTest, onTestRerun, onTestDelete }, ref) => {
    return (
      <TestHistory
        testType="security"
        title="安全测试历史"
        description="查看和管理安全测试记录"
        onTestSelect={onSelectTest}
        onTestRerun={onTestRerun}
        onTestDelete={onTestDelete}
      />
    );
  }
);

SecurityTestHistory.displayName = 'SecurityTestHistory';

export default SecurityTestHistory;

