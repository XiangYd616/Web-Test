import React from 'react
interface StatisticsProps {
  // 定义组件属性
}
const Statistics: React.FC<StatisticsProps> = (props) => {
  return (
    <div className="statistics">
      <h1>Statistics</h1>
      <p>组件内容</p>
    </div>
  );
};
export default Statistics;