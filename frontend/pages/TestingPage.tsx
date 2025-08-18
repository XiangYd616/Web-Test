import React from 'react
interface TestingPageProps {
  // 定义组件属性
}
const TestingPage: React.FC<TestingPageProps> = (props) => {
  return (
    <div className="testingpage">
      <h1>TestingPage</h1>
      <p>组件内容</p>
    </div>
  );
};
export default TestingPage;