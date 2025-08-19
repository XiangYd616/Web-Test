import React from "react";

interface UXProps {
  className?: string;
  children?: React.ReactNode;
}

const UX: React.FC<UXProps> = ({ className, children, ...props }) => {
  return (
    <div className={`ux ${className || ""}`} {...props}>
      <h2 className="text-lg font-semibold mb-2">UX</h2>
      {children || <p className="text-gray-500">此组件正在开发中...</p>}
    </div>
  );
};

export default UX;
