import React from "react";

interface PaginationProps {
  className?: string;
  children?: React.ReactNode;
}

const Pagination: React.FC<PaginationProps> = ({ className, children, ...props }) => {
  return (
    <div className={`pagination ${className || ""}`} {...props}>
      <h2 className="text-lg font-semibold mb-2">Pagination</h2>
      {children || <p className="text-gray-500">此组件正在开发中...</p>}
    </div>
  );
};

export default Pagination;
