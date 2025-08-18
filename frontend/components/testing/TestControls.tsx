import React from 'react
interface TestControlsProps {
  // 定义组件属性
}
const TestControls: React.FC<TestControlsProps> = (props) => {
  return (
    <div className="testcontrols">
      <h1>TestControls</h1>
      <p>组件内容</p>
    </div>
  );
};
export default TestControls;