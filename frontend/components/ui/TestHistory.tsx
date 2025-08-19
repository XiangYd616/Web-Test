import React from "react";

interface TestHistoryProps {
  className?: string;
  children?: React.ReactNode;
}

const TestHistory: React.FC<TestHistoryProps> = ({ className, children, ...props }) => {
  return (
    <div className={`test-history ${className || ""}`} {...props}>
      <h2 className="text-lg font-semibold mb-2">TestHistory</h2>
      {children || <p className="text-gray-500">��������ڿ�����...</p>}
    </div>
  );
};

export default TestHistory;
