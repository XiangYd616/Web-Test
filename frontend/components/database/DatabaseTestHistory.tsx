/**
 * DatabaseTestHistory.tsx - React组件
 * 
 * 文件路径: frontend\components\database\DatabaseTestHistory.tsx
 * 创建时间: 2025-10-29
 */

import React, { forwardRef } from 'react';
import TestHistory from '../common/TestHistory';
import type { TestHistoryItem } from '../common/TestHistory';

interface DatabaseTestHistoryProps {
  onSelectTest?: (test: TestHistoryItem) => void;
  onTestRerun?: (test: TestHistoryItem) => void;
  onTestDelete?: (testId: string) => void;
}

/**
 * DatabaseTestHistory - 数据库测试历史记录组件
 * 使用通用 TestHistory 组件，传入 testType="database"
 */
export const DatabaseTestHistory = forwardRef<any, DatabaseTestHistoryProps>(
  (props, ref) => {
    return (
      <TestHistory
        testType="database"
        title="数据库测试历史"
        description="查看和管理数据库测试记录"
        {...props}
      />
    );
  }
);

DatabaseTestHistory.displayName = 'DatabaseTestHistory';

export default DatabaseTestHistory;

