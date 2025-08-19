import React from "react";

interface FormProps {
  className?: string;
  children?: React.ReactNode;
}

const Form: React.FC<FormProps> = ({ className, children, ...props }) => {
  return (
    <div className={`form ${className || ""}`} {...props}>
      <h2 className="text-lg font-semibold mb-2">Form</h2>
      {children || <p className="text-gray-500">此组件正在开发中...</p>}
    </div>
  );
};

export default Form;
