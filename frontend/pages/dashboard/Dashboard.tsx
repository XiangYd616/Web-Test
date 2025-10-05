/**
 * Dashboard.tsx - 主仪表板页面
 */

import React from 'react';

interface DashboardProps {
  className?: string;
}

const Dashboard: React.FC<DashboardProps> = ({ className = '' }) => {
  return (
    <div className={`dashboard ${className}`}>
      <h1 className="text-2xl font-bold mb-6">仪表板</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">测试概览</h2>
          <p className="text-gray-600 dark:text-gray-400">查看所有测试的统计信息</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">最近的测试</h2>
          <p className="text-gray-600 dark:text-gray-400">查看最近执行的测试</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">系统状态</h2>
          <p className="text-gray-600 dark:text-gray-400">查看系统健康状况</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

