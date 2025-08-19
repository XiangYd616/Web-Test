import React from "react";

interface NavigationProps {
  className?: string;
  children?: React.ReactNode;
}

const Navigation: React.FC<NavigationProps> = ({ className, children, ...props }) => {
  return (
    <div className={`navigation ${className || ""}`} {...props}>
      <h2 className="text-lg font-semibold mb-2">Navigation</h2>
      {children || <p className="text-gray-500">此组件正在开发中...</p>}
    </div>
  );
};

export default Navigation;
