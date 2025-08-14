import React from 'react';

interface DataManagementProps {
  className?: string;
}

const DataManagement: React.FC<DataManagementProps> = ({ className = '' }) => {
  return (
    <div className={`${className}`}>
      <h2 className="text-xl font-semibold mb-4">数据管理</h2>
      <div className="space-y-4">
        <div className="p-4 border rounded-lg">
          <h3 className="font-medium">数据导入</h3>
          <p className="text-gray-600">导入外部数据到系统</p>
        </div>
        <div className="p-4 border rounded-lg">
          <h3 className="font-medium">数据导出</h3>
          <p className="text-gray-600">导出系统数据</p>
        </div>
        <div className="p-4 border rounded-lg">
          <h3 className="font-medium">数据清理</h3>
          <p className="text-gray-600">清理和优化数据</p>
        </div>
      </div>
    </div>
  );
};

export { DataManagement };
export default DataManagement;
