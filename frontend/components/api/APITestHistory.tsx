/**
 * APITestHistory.tsx - React组件
 *
 * 文件路径: frontend\components\api\APITestHistory.tsx
 * 创建时间: 2025-10-29
 */

import { forwardRef } from 'react';
import { TestHistory } from '../common/TestHistory/TestHistory';
import { apiTestConfig } from '../common/TestHistory/config';
import type { TestRecord } from '../common/TestHistory/types';

interface APITestHistoryProps {
  onSelectTest?: (test: TestRecord) => void;
  onTestRerun?: (test: TestRecord) => void;
  onTestDelete?: (testId: string) => Promise<void>;
  className?: string;
}

/**
 * APITestHistory - API测试历史记录组件
 * 使用配置驱动的 TestHistory 组件
 */
export const APITestHistory = forwardRef<any, APITestHistoryProps>(
  ({ onSelectTest, onTestRerun, onTestDelete, className }, ref) => {
    return (
      <TestHistory
        config={apiTestConfig}
        onRecordClick={onSelectTest}
        onRecordDelete={onTestDelete}
        className={className}
      />
    );
  }
);

APITestHistory.displayName = 'APITestHistory';

export default APITestHistory;
