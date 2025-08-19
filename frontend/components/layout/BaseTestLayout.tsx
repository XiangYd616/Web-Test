import React from "react";

interface BaseTestLayoutProps {
  className?: string;
  children?: React.ReactNode;
}

const BaseTestLayout: React.FC<BaseTestLayoutProps> = ({ className, children, ...props }) => {
  return (
    <div className={`base-test-layout ${className || ""}`} {...props}>
      <h2 className="text-lg font-semibold mb-2">BaseTestLayout</h2>
      {children || <p className="text-gray-500">此组件正在开发中...</p>}
    </div>
  );
};

export default BaseTestLayout;
