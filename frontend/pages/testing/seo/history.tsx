/**
 * SEO Test History Page - SEO测试历史页面
 * 
 * 文件路径: frontend/pages/testing/seo/history.tsx
 * 创建时间: 2025-11-13
 * 
 * 功能:使用配置驱动的TestHistory组件展示SEO测试历史
 */

import React from 'react';
import { TestHistory } from '@/components/common/TestHistory/TestHistory';
import { seoTestConfig } from '@/components/common/TestHistory/config';

/**
 * SEO测试历史页面组件
 * 演示最简单的用法 - 只传入配置即可
 */
const SEOTestHistoryPage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <TestHistory config={seoTestConfig} />
    </div>
  );
};

export default SEOTestHistoryPage;
