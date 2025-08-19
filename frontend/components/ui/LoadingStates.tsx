import React from "react";

interface LoadingStatesProps {
  className?: string;
  children?: React.ReactNode;
}

const LoadingStates: React.FC<LoadingStatesProps> = ({ className, children, ...props }) => {
  return (
    <div className={`loading-states ${className || ""}`} {...props}>
      <h2 className="text-lg font-semibold mb-2">LoadingStates</h2>
      {children || <p className="text-gray-500">此组件正在开发中...</p>}
    </div>
  );
};

export default LoadingStates;
