/**
 * WebsiteTestHistory.tsx - React组件
 * 
 * 文件路径: frontend\components\website\WebsiteTestHistory.tsx
 * 创建时间: 2025-10-29
 */

import React, { forwardRef } from 'react';
import TestHistory from '../common/TestHistory';
import type { TestHistoryItem } from '../common/TestHistory';

interface WebsiteTestHistoryProps {
  onSelectTest?: (test: TestHistoryItem) => void;
  onTestRerun?: (test: TestHistoryItem) => void;
  onTestDelete?: (testId: string) => void;
}

/**
 * WebsiteTestHistory - 网站测试历史记录组件
 * 使用通用 TestHistory 组件，传入 testType="website"
 */
export const WebsiteTestHistory = forwardRef<any, WebsiteTestHistoryProps>(
  (props, ref) => {
    return (
      <TestHistory
        testType="website"
        title="网站测试历史"
        description="查看和管理网站测试记录"
        {...props}
      />
    );
  }
);

WebsiteTestHistory.displayName = 'WebsiteTestHistory';

export default WebsiteTestHistory;

