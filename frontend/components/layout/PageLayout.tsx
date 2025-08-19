import React from "react";

interface PageLayoutProps {
  className?: string;
  children?: React.ReactNode;
}

const PageLayout: React.FC<PageLayoutProps> = ({ className, children, ...props }) => {
  return (
    <div className={`page-layout ${className || ""}`} {...props}>
      <h2 className="text-lg font-semibold mb-2">PageLayout</h2>
      {children || <p className="text-gray-500">��������ڿ�����...</p>}
    </div>
  );
};

export default PageLayout;
