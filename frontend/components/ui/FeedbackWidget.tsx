import React from 'react

interface FeedbackWidgetProps {
  // 定义组件属性
}

const FeedbackWidget: React.FC<FeedbackWidgetProps> = (props) => {
  return (
    <div className="feedbackwidget">
      <h1>FeedbackWidget</h1>
      <p>组件内容</p>
    </div>
  );
};

export default FeedbackWidget;
