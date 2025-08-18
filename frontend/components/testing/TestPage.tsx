import React from 'react
interface TestPageProps {
  // 定义组件属性
}
const TestPage: React.FC<TestPageProps> = (props) => {
  return (
    <div className="testpage">
      <h1>TestPage</h1>
      <p>组件内容</p>
    </div>
  );
};
export default TestPage;