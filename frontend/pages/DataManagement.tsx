import React from 'react';
import DataManager from '../components/data/DataManager';

/**
 * 数据管理页面 - 重构版
 * 使用统一的数据管理组件，整合测试历史、统计分析、数据导出功能
 */
const DataManagement: React.FC = () => {
  return <DataManager />;
};

export default DataManagement;
