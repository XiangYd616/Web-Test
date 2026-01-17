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
 * 统一跳转到测试历史入口
 */
const SeoHistoryRedirectPage: React.FC = () => <Navigate to="/test-history?type=seo" replace />;

export default SeoHistoryRedirectPage;
