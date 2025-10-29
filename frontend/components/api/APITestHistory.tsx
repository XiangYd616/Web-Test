/**
 * APITestHistory.tsx - React组件
 * 
 * 文件路径: frontend\components\api\APITestHistory.tsx
 * 创建时间: 2025-10-29
 */

import React, { forwardRef } from 'react';
import TestHistory from '../common/TestHistory';
import type { TestHistoryItem } from '../common/TestHistory';

interface APITestHistoryProps {
  onSelectTest?: (test: TestHistoryItem) => void;
  onTestRerun?: (test: TestHistoryItem) => void;
  onTestDelete?: (testId: string) => void;
}

/**
 * APITestHistory - API测试历史记录组件
 * 使用通用 TestHistory 组件，传入 testType="api"
 */
export const APITestHistory = forwardRef<any, APITestHistoryProps>(
  (props, ref) => {
    return (
      <TestHistory
        testType="api"
        title="API 测试历史"
        description="查看和管理API测试记录"
        {...props}
      />
    );
  }
);

APITestHistory.displayName = 'APITestHistory';

export default APITestHistory;

