import React from 'react;';
interface InputProps {
  // 定义组件属性
}
const Input: React.FC<InputProps> = (props) => {
  return (
    <div className="input">
      <h1>Input</h1>
      <p>组件内容</p>
    </div>
  )
}
export default Input;