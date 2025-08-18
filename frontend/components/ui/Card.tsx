import React from 'react;';
interface CardProps {
  // 定义组件属性
}
const Card: React.FC<CardProps> = (props) => {
  return (
    <div className="card">
      <h1>Card</h1>
      <p>组件内容</p>
    </div>
  )
}
export default Card;