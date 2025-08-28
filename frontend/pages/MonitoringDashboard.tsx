// 自动生成的页面组件
import React from 'react';

interface MonitoringDashboardProps {
  children?: React.ReactNode;
}

const MonitoringDashboard: React.FC<MonitoringDashboardProps> = ({ children }) => {
  return (
    <div className="page-container p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          MonitoringDashboard
        </h1>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600 mb-4">
            MonitoringDashboard页面正在开发中...
          </p>
          {children}
        </div>
      </div>
    </div>
  );
};

export default MonitoringDashboard;
