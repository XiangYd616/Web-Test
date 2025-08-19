import React from "react";

interface ResultsDisplayProps {
  className?: string;
  children?: React.ReactNode;
}

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ className, children, ...props }) => {
  return (
    <div className={`results-display ${className || ""}`} {...props}>
      <h2 className="text-lg font-semibold mb-2">ResultsDisplay</h2>
      {children || <p className="text-gray-500">此组件正在开发中...</p>}
    </div>
  );
};

export default ResultsDisplay;
