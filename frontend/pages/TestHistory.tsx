/**
 * 测试历史页面
 * 使用统一的测试历史组件和布局
 */

import { TestHistory as TestHistoryComponent } from '@/components/common/TestHistory/TestHistory';
import { getTestHistoryConfig, stressTestConfig } from '@/components/common/TestHistory/config';
import { FileText } from 'lucide-react';
import React, { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageLayout } from '../components/common/Layout';

const TestHistoryPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const testTypeParam = searchParams.get('type');
  const resolvedConfig = useMemo(
    () => (testTypeParam ? getTestHistoryConfig(testTypeParam) : null) || stressTestConfig,
    [testTypeParam]
  );
  const pageTitle = testTypeParam ? resolvedConfig.title : '测试历史';
  const pageDescription =
    testTypeParam && resolvedConfig.description
      ? resolvedConfig.description
      : '查看和管理您的所有测试记录，包括性能、安全、SEO等各类测试结果';
  return (
    <PageLayout
      title={pageTitle}
      description={pageDescription}
      icon={FileText}
      background="dark"
      maxWidth="xl"
    >
      <TestHistoryComponent config={resolvedConfig} />
    </PageLayout>
  );
};

export default TestHistoryPage;
