import React from "react";

interface ThemeToggleProps {
  className?: string;
  children?: React.ReactNode;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ className, children, ...props }) => {
  return (
    <div className={`theme-toggle ${className || ""}`} {...props}>
      <h2 className="text-lg font-semibold mb-2">ThemeToggle</h2>
      {children || <p className="text-gray-500">��������ڿ�����...</p>}
    </div>
  );
};

export default ThemeToggle;
