/**
 * NetworkTestHistory.tsx - React组件
 * 
 * 文件路径: frontend\components\network\NetworkTestHistory.tsx
 * 创建时间: 2025-10-29
 */

import React, { forwardRef } from 'react';
import TestHistory from '../common/TestHistory';
import type { TestHistoryItem } from '../common/TestHistory';

interface NetworkTestHistoryProps {
  onSelectTest?: (test: TestHistoryItem) => void;
  onTestRerun?: (test: TestHistoryItem) => void;
  onTestDelete?: (testId: string) => void;
}

/**
 * NetworkTestHistory - 网络测试历史记录组件
 * 使用通用 TestHistory 组件，传入 testType="network"
 */
export const NetworkTestHistory = forwardRef<any, NetworkTestHistoryProps>(
  (props, ref) => {
    return (
      <TestHistory
        testType="network"
        title="网络测试历史"
        description="查看和管理网络测试记录"
        {...props}
      />
    );
  }
);

NetworkTestHistory.displayName = 'NetworkTestHistory';

export default NetworkTestHistory;

