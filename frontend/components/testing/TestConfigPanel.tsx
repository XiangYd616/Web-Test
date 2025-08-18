import React from 'react

interface TestConfigPanelProps {
  // 定义组件属性
}

const TestConfigPanel: React.FC<TestConfigPanelProps> = (props) => {
  return (
    <div className="testconfigpanel">
      <h1>TestConfigPanel</h1>
      <p>组件内容</p>
    </div>
  );
};

export default TestConfigPanel;
