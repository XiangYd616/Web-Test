import React from 'react

interface TestingComponentsProps {
  // 定义组件属性
}

const TestingComponents: React.FC<TestingComponentsProps> = (props) => {
  return (
    <div className="testingcomponents">
      <h1>TestingComponents</h1>
      <p>组件内容</p>
    </div>
  );
};

export default TestingComponents;
