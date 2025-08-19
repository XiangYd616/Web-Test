import React from "react";

interface LoadingSpinnerProps {
  className?: string;
  children?: React.ReactNode;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ className, children, ...props }) => {
  return (
    <div className={`loading-spinner ${className || ""}`} {...props}>
      <h2 className="text-lg font-semibold mb-2">LoadingSpinner</h2>
      {children || <p className="text-gray-500">此组件正在开发中...</p>}
    </div>
  );
};

export default LoadingSpinner;
