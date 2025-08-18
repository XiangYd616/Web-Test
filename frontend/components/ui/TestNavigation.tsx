import React from 'react

interface TestNavigationProps {
  // 定义组件属性
}

const TestNavigation: React.FC<TestNavigationProps> = (props) => {
  return (
    <div className="testnavigation">
      <h1>TestNavigation</h1>
      <p>组件内容</p>
    </div>
  );
};

export default TestNavigation;
