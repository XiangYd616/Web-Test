import React from 'react
interface ButtonProps {
  // 定义组件属性
}
const Button: React.FC<ButtonProps> = (props) => {
  return (
    <div className="button">
      <h1>Button</h1>
      <p>组件内容</p>
    </div>
  );
};
export default Button;