/**
 * DatabaseTestHistory.tsx - React组件
 *
 * 文件路径: frontend\components\database\DatabaseTestHistory.tsx
 * 创建时间: 2025-10-29
 */

import { forwardRef } from 'react';
import { TestHistory } from '../common/TestHistory/TestHistory';
import { databaseTestConfig } from '../common/TestHistory/config';
import type { TestRecord } from '../common/TestHistory/types';

interface DatabaseTestHistoryProps {
  onSelectTest?: (test: TestRecord) => void;
  onTestRerun?: (test: TestRecord) => void;
  onTestDelete?: (testId: string) => Promise<void>;
  className?: string;
}

/**
 * DatabaseTestHistory - 数据库测试历史记录组件
 * 使用配置驱动的 TestHistory 组件
 */
export const DatabaseTestHistory = forwardRef<any, DatabaseTestHistoryProps>(
  ({ onSelectTest, onTestRerun, onTestDelete, className }, ref) => {
    return (
      <TestHistory
        config={databaseTestConfig}
        onRecordClick={onSelectTest}
        onRecordDelete={onTestDelete}
        className={className}
      />
    );
  }
);

DatabaseTestHistory.displayName = 'DatabaseTestHistory';

export default DatabaseTestHistory;
