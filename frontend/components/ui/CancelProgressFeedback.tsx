import React from "react";

interface CancelProgressFeedbackProps {
  className?: string;
  children?: React.ReactNode;
}

const CancelProgressFeedback: React.FC<CancelProgressFeedbackProps> = ({ className, children, ...props }) => {
  return (
    <div className={`cancel-progress-feedback ${className || ""}`} {...props}>
      <h2 className="text-lg font-semibold mb-2">CancelProgressFeedback</h2>
      {children || <p className="text-gray-500">��������ڿ�����...</p>}
    </div>
  );
};

export default CancelProgressFeedback;
