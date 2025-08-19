import React from "react";

interface SimpleURLInputProps {
  className?: string;
  children?: React.ReactNode;
}

const SimpleURLInput: React.FC<SimpleURLInputProps> = ({ className, children, ...props }) => {
  return (
    <div className={`simple-url-input ${className || ""}`} {...props}>
      <h2 className="text-lg font-semibold mb-2">SimpleURLInput</h2>
      {children || <p className="text-gray-500">此组件正在开发中...</p>}
    </div>
  );
};

export default SimpleURLInput;
