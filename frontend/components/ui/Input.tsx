import React from "react";

interface InputProps {
  className?: string;
  children?: React.ReactNode;
}

const Input: React.FC<InputProps> = ({ className, children, ...props }) => {
  return (
    <div className={`input ${className || ""}`} {...props}>
      <h2 className="text-lg font-semibold mb-2">Input</h2>
      {children || <p className="text-gray-500">此组件正在开发中...</p>}
    </div>
  );
};

export default Input;
