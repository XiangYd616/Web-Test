import React from 'react
interface TestingToolsProps {
  // 定义组件属性
}
const TestingTools: React.FC<TestingToolsProps> = (props) => {
  return (
    <div className="testingtools">
      <h1>TestingTools</h1>
      <p>组件内容</p>
    </div>
  );
};
export default TestingTools;