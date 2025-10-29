/**
 * SEOTestHistory.tsx - React组件
 * 
 * 文件路径: frontend\components\seo\SEOTestHistory.tsx
 * 创建时间: 2025-10-29
 */

import React, { forwardRef } from 'react';
import TestHistory from '../common/TestHistory';
import type { TestHistoryItem } from '../common/TestHistory';

interface SEOTestHistoryProps {
  onSelectTest?: (test: TestHistoryItem) => void;
  onTestRerun?: (test: TestHistoryItem) => void;
  onTestDelete?: (testId: string) => void;
}

/**
 * SEOTestHistory - SEO测试历史记录组件
 * 使用通用 TestHistory 组件，传入 testType="seo"
 */
export const SEOTestHistory = forwardRef<any, SEOTestHistoryProps>(
  (props, ref) => {
    return (
      <TestHistory
        testType="seo"
        title="SEO 测试历史"
        description="查看和管理SEO测试记录"
        {...props}
      />
    );
  }
);

SEOTestHistory.displayName = 'SEOTestHistory';

export default SEOTestHistory;

