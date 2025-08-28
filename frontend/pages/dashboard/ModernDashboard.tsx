// 现代化仪表板页面
import React from 'react';

interface ModernDashboardProps {
  children?: React.ReactNode;
}

const ModernDashboard: React.FC<ModernDashboardProps> = ({ children }) => {
  return (
    <div className="modern-dashboard p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          现代化仪表板
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">测试概览</h2>
            <p className="text-gray-600">测试统计和概览信息</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">性能监控</h2>
            <p className="text-gray-600">实时性能监控数据</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">系统状态</h2>
            <p className="text-gray-600">系统运行状态信息</p>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
};

export default ModernDashboard;
