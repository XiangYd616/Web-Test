import React from 'react;';
interface SelectProps {
  // 定义组件属性
}
const Select: React.FC<SelectProps> = (props) => {
  return (
    <div className="select">
      <h1>Select</h1>
      <p>组件内容</p>
    </div>
  )
}
export default Select;