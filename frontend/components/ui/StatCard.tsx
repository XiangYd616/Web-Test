import React from 'react;';
interface StatCardProps {
  // 定义组件属性
}
const StatCard: React.FC<StatCardProps> = (props) => {
  return (
    <div className="statcard">
      <h1>StatCard</h1>
      <p>组件内容</p>
    </div>
  )
}
export default StatCard;