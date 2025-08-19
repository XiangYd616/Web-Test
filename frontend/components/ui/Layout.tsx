import React from "react";

interface LayoutProps {
  className?: string;
  children?: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ className, children, ...props }) => {
  return (
    <div className={`layout ${className || ""}`} {...props}>
      <h2 className="text-lg font-semibold mb-2">Layout</h2>
      {children || <p className="text-gray-500">此组件正在开发中...</p>}
    </div>
  );
};

export default Layout;
