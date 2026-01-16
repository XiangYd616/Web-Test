/**
 * UXTestHistory.tsx - React组件
 *
 * 文件路径: frontend\components\ux\UXTestHistory.tsx
 * 创建时间: 2025-10-29
 */

import { forwardRef } from 'react';
import { uxTestConfig } from '../common/TestHistory/config';
import { TestHistory } from '../common/TestHistory/TestHistory';
import type { TestRecord } from '../common/TestHistory/types';

interface UXTestHistoryProps {
  onSelectTest?: (test: TestRecord) => void;
  onTestRerun?: (test: TestRecord) => void;
  onTestDelete?: (testId: string) => Promise<void>;
  className?: string;
}

/**
 * UXTestHistory - UX测试历史记录组件
 * 使用配置驱动的 TestHistory 组件
 */
export const UXTestHistory = forwardRef<any, UXTestHistoryProps>(
  ({ onSelectTest, onTestRerun, onTestDelete, className }, ref) => (
    <TestHistory
      config={uxTestConfig}
      onRecordClick={onSelectTest}
      onRecordDelete={onTestDelete}
      className={className}
    />
  )
);

UXTestHistory.displayName = 'UXTestHistory';

export default UXTestHistory;
