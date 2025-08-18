import React from 'react;';
interface TestHistoryProps {
  // 定义组件属性
}
const TestHistory: React.FC<TestHistoryProps> = (props) => {
  return (
    <div className="testhistory">
      <h1>TestHistory</h1>
      <p>组件内容</p>
    </div>
  )
}
export default TestHistory;