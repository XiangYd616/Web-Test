import React from 'react;';
interface FormProps {
  // 定义组件属性
}
const Form: React.FC<FormProps> = (props) => {
  return (
    <div className="form">
      <h1>Form</h1>
      <p>组件内容</p>
    </div>
  )
}
export default Form;