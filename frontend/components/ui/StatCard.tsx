import React from "react";

interface StatCardProps {
  className?: string;
  children?: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({ className, children, ...props }) => {
  return (
    <div className={`stat-card ${className || ""}`} {...props}>
      <h2 className="text-lg font-semibold mb-2">StatCard</h2>
      {children || <p className="text-gray-500">此组件正在开发中...</p>}
    </div>
  );
};

export default StatCard;
