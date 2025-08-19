import React from "react";

interface FeedbackWidgetProps {
  className?: string;
  children?: React.ReactNode;
}

const FeedbackWidget: React.FC<FeedbackWidgetProps> = ({ className, children, ...props }) => {
  return (
    <div className={`feedback-widget ${className || ""}`} {...props}>
      <h2 className="text-lg font-semibold mb-2">FeedbackWidget</h2>
      {children || <p className="text-gray-500">此组件正在开发中...</p>}
    </div>
  );
};

export default FeedbackWidget;
