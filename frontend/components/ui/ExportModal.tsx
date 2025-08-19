import React from "react";

interface ExportModalProps {
  className?: string;
  children?: React.ReactNode;
}

const ExportModal: React.FC<ExportModalProps> = ({ className, children, ...props }) => {
  return (
    <div className={`export-modal ${className || ""}`} {...props}>
      <h2 className="text-lg font-semibold mb-2">ExportModal</h2>
      {children || <p className="text-gray-500">此组件正在开发中...</p>}
    </div>
  );
};

export default ExportModal;
