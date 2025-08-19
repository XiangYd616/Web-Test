import React from "react";

interface SelectProps {
  className?: string;
  children?: React.ReactNode;
}

const Select: React.FC<SelectProps> = ({ className, children, ...props }) => {
  return (
    <div className={`select ${className || ""}`} {...props}>
      <h2 className="text-lg font-semibold mb-2">Select</h2>
      {children || <p className="text-gray-500">��������ڿ�����...</p>}
    </div>
  );
};

export default Select;
