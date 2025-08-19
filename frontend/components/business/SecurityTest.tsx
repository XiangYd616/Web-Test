import React from "react";

interface SecurityTestProps {
  className?: string;
  children?: React.ReactNode;
}

const SecurityTest: React.FC<SecurityTestProps> = ({ className, children, ...props }) => {
  return (
    <div className={`security-test ${className || ""}`} {...props}>
      <h2 className="text-lg font-semibold mb-2">SecurityTest</h2>
      {children || <p className="text-gray-500">��������ڿ�����...</p>}
    </div>
  );
};

export default SecurityTest;
