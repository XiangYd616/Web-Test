import React from "react";

interface TestPageHistoryProps {
  className?: string;
  children?: React.ReactNode;
}

const TestPageHistory: React.FC<TestPageHistoryProps> = ({ className, children, ...props }) => {
  return (
    <div className={`test-page-history ${className || ""}`} {...props}>
      <h2 className="text-lg font-semibold mb-2">TestPageHistory</h2>
      {children || <p className="text-gray-500">��������ڿ�����...</p>}
    </div>
  );
};

export default TestPageHistory;
