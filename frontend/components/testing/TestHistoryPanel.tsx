import React from 'react

interface TestHistoryPanelProps {
  // 定义组件属性
}

const TestHistoryPanel: React.FC<TestHistoryPanelProps> = (props) => {
  return (
    <div className="testhistorypanel">
      <h1>TestHistoryPanel</h1>
      <p>组件内容</p>
    </div>
  );
};

export default TestHistoryPanel;
