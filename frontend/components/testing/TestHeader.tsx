import React from 'react
interface TestHeaderProps {
  // 定义组件属性
}
const TestHeader: React.FC<TestHeaderProps> = (props) => {
  return (
    <div className="testheader">
      <h1>TestHeader</h1>
      <p>组件内容</p>
    </div>
  );
};
export default TestHeader;