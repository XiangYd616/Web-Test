import React from "react";

interface TestTypeHistoryProps {
  className?: string;
  children?: React.ReactNode;
}

const TestTypeHistory: React.FC<TestTypeHistoryProps> = ({ className, children, ...props }) => {
  return (
    <div className={`test-type-history ${className || ""}`} {...props}>
      <h2 className="text-lg font-semibold mb-2">TestTypeHistory</h2>
      {children || <p className="text-gray-500">此组件正在开发中...</p>}
    </div>
  );
};

export default TestTypeHistory;
