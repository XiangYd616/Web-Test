import React from 'react

interface TestProgressPanelProps {
  // 定义组件属性
}

const TestProgressPanel: React.FC<TestProgressPanelProps> = (props) => {
  return (
    <div className="testprogresspanel">
      <h1>TestProgressPanel</h1>
      <p>组件内容</p>
    </div>
  );
};

export default TestProgressPanel;
