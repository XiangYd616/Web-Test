import React from 'react';
import { UnifiedDataManagement } from '../components/data/UnifiedDataManagement';

/**
 * 数据管理页面 - 重构版
 * 使用统一的数据管理组件，整合测试历史、统计分析、数据导出功能
 */
const DataManagement: React.FC = () => {
  return <UnifiedDataManagement defaultTab="history" />;
};

export default DataManagement;
