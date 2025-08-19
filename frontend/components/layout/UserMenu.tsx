import React from "react";

interface UserMenuProps {
  className?: string;
  children?: React.ReactNode;
}

const UserMenu: React.FC<UserMenuProps> = ({ className, children, ...props }) => {
  return (
    <div className={`user-menu ${className || ""}`} {...props}>
      <h2 className="text-lg font-semibold mb-2">UserMenu</h2>
      {children || <p className="text-gray-500">此组件正在开发中...</p>}
    </div>
  );
};

export default UserMenu;
