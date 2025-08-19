import React from "react";

interface TestNavigationProps {
  className?: string;
  children?: React.ReactNode;
}

const TestNavigation: React.FC<TestNavigationProps> = ({ className, children, ...props }) => {
  return (
    <div className={`test-navigation ${className || ""}`} {...props}>
      <h2 className="text-lg font-semibold mb-2">TestNavigation</h2>
      {children || <p className="text-gray-500">��������ڿ�����...</p>}
    </div>
  );
};

export default TestNavigation;
