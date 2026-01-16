/**
 * WebsiteTestHistory.tsx - React组件
 *
 * 文件路径: frontend\components\website\WebsiteTestHistory.tsx
 * 创建时间: 2025-10-29
 */

import { forwardRef } from 'react';
import { websiteTestConfig } from '../common/TestHistory/config';
import { TestHistory } from '../common/TestHistory/TestHistory';
import type { TestRecord } from '../common/TestHistory/types';

interface WebsiteTestHistoryProps {
  onSelectTest?: (test: TestRecord) => void;
  onTestRerun?: (test: TestRecord) => void;
  onTestDelete?: (testId: string) => Promise<void>;
  className?: string;
}

/**
 * WebsiteTestHistory - 网站测试历史记录组件
 * 使用配置驱动的 TestHistory 组件
 */
export const WebsiteTestHistory = forwardRef<any, WebsiteTestHistoryProps>(
  ({ onSelectTest, onTestRerun, onTestDelete, className }, ref) => (
    <TestHistory
      config={websiteTestConfig}
      onRecordClick={onSelectTest}
      onRecordDelete={onTestDelete}
      className={className}
    />
  )
);

WebsiteTestHistory.displayName = 'WebsiteTestHistory';

export default WebsiteTestHistory;
