import React from 'react
interface TestManagerProps {
  // 定义组件属性
}
const TestManager: React.FC<TestManagerProps> = (props) => {
  return (
    <div className="testmanager">
      <h1>TestManager</h1>
      <p>组件内容</p>
    </div>
  );
};
export default TestManager;