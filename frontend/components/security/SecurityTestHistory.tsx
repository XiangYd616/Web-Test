/**
 * SecurityTestHistory.tsx - React组件
 * 
 * 文件路径: frontend\components\security\SecurityTestHistory.tsx
 * 创建时间: 2025-09-25
 * 重构: 使用通用 TestHistory 组件
 */

import React, { forwardRef } from 'react';
import { TestHistory } from '../common/TestHistory/TestHistory';
import { securityTestConfig } from '../common/TestHistory/config';
import type { TestRecord } from '../common/TestHistory/types';

// SecurityTestHistory Props
interface SecurityTestHistoryProps {
  onSelectTest?: (test: TestRecord) => void;
  onTestRerun?: (test: TestRecord) => void;
  onTestDelete?: (testId: string) => void;
  className?: string;
}

/**
 * SecurityTestHistory - 安全测试历史记录组件
 * 使用配置驱动的 TestHistory 组件
 */
export const SecurityTestHistory = forwardRef<any, SecurityTestHistoryProps>(
  ({ onSelectTest, onTestRerun, onTestDelete, className }, ref) => {
    return (
      <TestHistory
        config={securityTestConfig}
        onRecordClick={onSelectTest}
        onRecordDelete={onTestDelete}
        className={className}
      />
    );
  }
);

SecurityTestHistory.displayName = 'SecurityTestHistory';

export default SecurityTestHistory;

