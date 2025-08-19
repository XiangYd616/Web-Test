import React from "react";

interface TestingToolsProps {
  className?: string;
  children?: React.ReactNode;
}

const TestingTools: React.FC<TestingToolsProps> = ({ className, children, ...props }) => {
  return (
    <div className={`testing-tools ${className || ""}`} {...props}>
      <h2 className="text-lg font-semibold mb-2">TestingTools</h2>
      {children || <p className="text-gray-500">此组件正在开发中...</p>}
    </div>
  );
};

export default TestingTools;
