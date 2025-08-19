import React from "react";

interface URLInputProps {
  className?: string;
  children?: React.ReactNode;
}

const URLInput: React.FC<URLInputProps> = ({ className, children, ...props }) => {
  return (
    <div className={`url-input ${className || ""}`} {...props}>
      <h2 className="text-lg font-semibold mb-2">URLInput</h2>
      {children || <p className="text-gray-500">此组件正在开发中...</p>}
    </div>
  );
};

export default URLInput;
