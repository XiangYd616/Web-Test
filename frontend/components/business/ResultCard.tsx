import React from "react";

interface ResultCardProps {
  className?: string;
  children?: React.ReactNode;
  result?: any;
  onClick?: () => void;
  onDelete?: () => void;
}

const ResultCard: React.FC<ResultCardProps> = ({ className, children, ...props }) => {
  return (
    <div className={`result-card ${className || ""}`} {...props}>
      <h2 className="text-lg font-semibold mb-2">ResultCard</h2>
      {children || <p className="text-gray-500">��������ڿ�����...</p>}
    </div>
  );
};

export default ResultCard;
