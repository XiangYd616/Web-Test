import React from 'react';

interface MonitoringDashboardProps {
  className?: string;
}

const MonitoringDashboard: React.FC<MonitoringDashboardProps> = ({ className = '' }) => {
  return (
    <div className={`monitoring-dashboard ${className}`}>
      <h1>监控面板</h1>
      <div className="dashboard-content">
        <p>监控面板功能正在开发中...</p>
      </div>
    </div>
  );
};

export default MonitoringDashboard;
