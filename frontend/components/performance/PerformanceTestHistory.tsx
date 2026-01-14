/**
 * PerformanceTestHistory.tsx - React组件
 *
 * 文件路径: frontend\components\performance\PerformanceTestHistory.tsx
 * 创建时间: 2025-10-29
 */

import { forwardRef } from 'react';
import { TestHistory } from '../common/TestHistory/TestHistory';
import { performanceTestConfig } from '../common/TestHistory/config';
import type { TestRecord } from '../common/TestHistory/types';

interface PerformanceTestHistoryProps {
  onSelectTest?: (test: TestRecord) => void;
  onTestRerun?: (test: TestRecord) => void;
  onTestDelete?: (testId: string) => Promise<void>;
  className?: string;
}

/**
 * PerformanceTestHistory - 性能测试历史记录组件
 * 使用配置驱动的 TestHistory 组件
 */
export const PerformanceTestHistory = forwardRef<any, PerformanceTestHistoryProps>(
  ({ onSelectTest, onTestRerun, onTestDelete, className }, ref) => {
    return (
      <TestHistory
        config={performanceTestConfig}
        onRecordClick={onSelectTest}
        onRecordDelete={onTestDelete}
        className={className}
      />
    );
  }
);

PerformanceTestHistory.displayName = 'PerformanceTestHistory';

export default PerformanceTestHistory;
