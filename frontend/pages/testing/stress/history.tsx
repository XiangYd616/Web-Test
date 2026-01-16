/**
 * Stress Test History Page - 压力测试历史页面
 *
 * 文件路径: frontend/pages/testing/stress/history.tsx
 * 创建时间: 2025-11-13
 *
 * 功能:使用配置驱动的TestHistory组件展示压力测试历史
 */

import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * 压力测试历史页面组件
 */
const StressTestHistoryPage: React.FC = () => <Navigate to="/test-history?type=stress" replace />;

export default StressTestHistoryPage;
