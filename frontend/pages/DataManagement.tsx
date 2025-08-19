import React from 'react';
import { DataManagement as DataManagementComponent } from '../components/data/DataManagement';

/**
 * 数据管理页面 - 重构版
 * 使用统一的数据管理组件，整合测试历史、统计分析、数据导出功能
 */
const DataManagement: React.FC = () => {
  return <DataManagementComponent defaultTab="history" />;
};

export default DataManagement;
