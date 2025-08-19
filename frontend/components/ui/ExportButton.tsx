import React from "react";

interface ExportButtonProps {
  className?: string;
  children?: React.ReactNode;
}

const ExportButton: React.FC<ExportButtonProps> = ({ className, children, ...props }) => {
  return (
    <div className={`export-button ${className || ""}`} {...props}>
      <h2 className="text-lg font-semibold mb-2">ExportButton</h2>
      {children || <p className="text-gray-500">此组件正在开发中...</p>}
    </div>
  );
};

export default ExportButton;
