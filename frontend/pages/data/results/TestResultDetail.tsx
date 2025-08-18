import React from 'react

interface TestResultDetailProps {
  // 定义组件属性
}

const TestResultDetail: React.FC<TestResultDetailProps> = (props) => {
  return (
    <div className="testresultdetail">
      <h1>TestResultDetail</h1>
      <p>组件内容</p>
    </div>
  );
};

export default TestResultDetail;
