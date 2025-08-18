import React from 'react
interface TestConfigProps {
  // 定义组件属性
}
const TestConfig: React.FC<TestConfigProps> = (props) => {
  return (
    <div className="testconfig">
      <h1>TestConfig</h1>
      <p>组件内容</p>
    </div>
  );
};
export default TestConfig;