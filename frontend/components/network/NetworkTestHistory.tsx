/**
 * NetworkTestHistory.tsx - React组件
 *
 * 文件路径: frontend\components\network\NetworkTestHistory.tsx
 * 创建时间: 2025-10-29
 */

import { forwardRef } from 'react';
import { TestHistory } from '../common/TestHistory/TestHistory';
import { networkTestConfig } from '../common/TestHistory/config';
import type { TestRecord } from '../common/TestHistory/types';

interface NetworkTestHistoryProps {
  onSelectTest?: (test: TestRecord) => void;
  onTestRerun?: (test: TestRecord) => void;
  onTestDelete?: (testId: string) => Promise<void>;
  className?: string;
}

/**
 * NetworkTestHistory - 网络测试历史记录组件
 * 使用配置驡动的 TestHistory 组件
 */
export const NetworkTestHistory = forwardRef<any, NetworkTestHistoryProps>(
  ({ onSelectTest, onTestRerun, onTestDelete, className }, ref) => {
    return (
      <TestHistory
        config={networkTestConfig}
        onRecordClick={onSelectTest}
        onRecordDelete={onTestDelete}
        className={className}
      />
    );
  }
);

NetworkTestHistory.displayName = 'NetworkTestHistory';

export default NetworkTestHistory;
