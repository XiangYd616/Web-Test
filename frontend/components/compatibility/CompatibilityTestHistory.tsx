/**
 * CompatibilityTestHistory.tsx - React组件
 * 
 * 文件路径: frontend\components\compatibility\CompatibilityTestHistory.tsx
 * 创建时间: 2025-10-29
 */

import React, { forwardRef } from 'react';
import { TestHistory } from '../common/TestHistory/TestHistory';
import { compatibilityTestConfig } from '../common/TestHistory/config';
import type { TestRecord } from '../common/TestHistory/types';

interface CompatibilityTestHistoryProps {
  onSelectTest?: (test: TestRecord) => void;
  onTestRerun?: (test: TestRecord) => void;
  onTestDelete?: (testId: string) => void;
  className?: string;
}

/**
 * CompatibilityTestHistory - 兼容性测试历史记录组件
 * 使用配置驱动的 TestHistory 组件
 */
export const CompatibilityTestHistory = forwardRef<any, CompatibilityTestHistoryProps>(
  ({ onSelectTest, onTestRerun, onTestDelete, className }, ref) => {
    return (
      <TestHistory
        config={compatibilityTestConfig}
        onRecordClick={onSelectTest}
        onRecordDelete={onTestDelete}
        className={className}
      />
    );
  }
);

CompatibilityTestHistory.displayName = 'CompatibilityTestHistory';

export default CompatibilityTestHistory;

