/**
 * 测试历史页面
 * 使用统一的测试历史组件和布局
 */

import { FileText } from 'lucide-react';
import React from 'react';
import { PageLayout } from '../components/common/UnifiedLayout';
import { UnifiedTestHistory } from '../components/common/UnifiedTestHistory';

const TestHistory: React.FC = () => {
  return (
    <PageLayout
      title="测试历史"
      description="查看和管理您的所有测试记录，包括性能、安全、SEO等各类测试结果"
      icon={FileText}
      background="dark"
      maxWidth="xl"
    >
      <UnifiedTestHistory
        showStatistics={true}
        showFilters={true}
        showBatchActions={true}
      />
    </PageLayout>
  );
};

export default TestHistory;
