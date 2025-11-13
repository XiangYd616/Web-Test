/**
 * SEOTestHistory.tsx - React组件
 * 
 * 文件路径: frontend\components\seo\SEOTestHistory.tsx
 * 创建时间: 2025-10-29
 * 重构: 2025-11-13 - 迁移到配置驱动的TestHistory组件
 */

import React, { forwardRef } from 'react';
import { TestHistory } from '../common/TestHistory/TestHistory';
import { seoTestConfig } from '../common/TestHistory/config';
import type { TestRecord } from '../common/TestHistory/types';

interface SEOTestHistoryProps {
  onSelectTest?: (test: TestRecord) => void;
  onTestRerun?: (test: TestRecord) => void;
  onTestDelete?: (testId: string) => void;
  className?: string;
}

/**
 * SEOTestHistory - SEO测试历史记录组件
 * 使用配置驱动的 TestHistory 组件
 */
export const SEOTestHistory = forwardRef<any, SEOTestHistoryProps>(
  ({ onSelectTest, onTestRerun, onTestDelete, className }, ref) => {
    return (
      <TestHistory
        config={seoTestConfig}
        onRecordClick={onSelectTest}
        onRecordDelete={onTestDelete}
        className={className}
      />
    );
  }
);

SEOTestHistory.displayName = 'SEOTestHistory';

export default SEOTestHistory;

