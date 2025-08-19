import React from "react";

interface UrlInputProps {
  className?: string;
  children?: React.ReactNode;
}

const UrlInput: React.FC<UrlInputProps> = ({ className, children, ...props }) => {
  return (
    <div className={`url-input ${className || ""}`} {...props}>
      <h2 className="text-lg font-semibold mb-2">UrlInput</h2>
      {children || <p className="text-gray-500">此组件正在开发中...</p>}
    </div>
  );
};

export default UrlInput;
