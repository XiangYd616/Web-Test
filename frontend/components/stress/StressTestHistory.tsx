/**
 * StressTestHistory.tsx - React组件
 *
 * 文件路径: frontend\components\stress\StressTestHistory.tsx
 * 创建时间: 2025-09-25
 * 重构: 2025-11-13 - 迁移到配置驱动的TestHistory组件
 */

import { forwardRef } from 'react';
import { TestHistory } from '../common/TestHistory/TestHistory';
import { stressTestConfig } from '../common/TestHistory/config';
import type { TestRecord } from '../common/TestHistory/types';

// StressTestHistory Props
interface StressTestHistoryProps {
  onSelectTest?: (test: TestRecord) => void;
  onTestRerun?: (test: TestRecord) => void;
  onTestDelete?: (testId: string) => Promise<void>;
  className?: string;
}

/**
 * StressTestHistory - 压力测试历史记录组件
 * 使用配置驱动的 TestHistory 组件
 */
export const StressTestHistory = forwardRef<any, StressTestHistoryProps>(
  ({ onSelectTest, onTestRerun, onTestDelete, className }, ref) => {
    return (
      <TestHistory
        config={stressTestConfig}
        onRecordClick={onSelectTest}
        onRecordDelete={onTestDelete}
        className={className}
      />
    );
  }
);

StressTestHistory.displayName = 'StressTestHistory';

export default StressTestHistory;
