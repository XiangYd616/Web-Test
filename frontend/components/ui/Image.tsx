import React from "react";

interface ImageProps {
  className?: string;
  children?: React.ReactNode;
}

const Image: React.FC<ImageProps> = ({ className, children, ...props }) => {
  return (
    <div className={`image ${className || ""}`} {...props}>
      <h2 className="text-lg font-semibold mb-2">Image</h2>
      {children || <p className="text-gray-500">此组件正在开发中...</p>}
    </div>
  );
};

export default Image;
