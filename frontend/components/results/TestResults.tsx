import React from 'react;';
interface TestResultsProps {
  // 定义组件属性
}
const TestResults: React.FC<TestResultsProps> = (props) => {
  return (
    <div className="testresults">
      <h1>TestResults</h1>
      <p>组件内容</p>
    </div>
  )
}
export default TestResults;