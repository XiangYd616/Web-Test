/**
 * SEO Test History Page - SEO测试历史页面
 *
 * 文件路径: frontend/pages/testing/seo/history.tsx
 * 创建时间: 2025-11-13
 *
 * 功能:使用配置驱动的TestHistory组件展示SEO测试历史
 */

import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * SEO测试历史页面组件
 * 演示最简单的用法 - 只传入配置即可
 */
const SEOTestHistoryPage: React.FC = () => <Navigate to="/test-history?type=seo" replace />;

export default SEOTestHistoryPage;
