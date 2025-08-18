import React from 'react
interface UXProps {
  // 定义组件属性
}
const UX: React.FC<UXProps> = (props) => {
  return (
    <div className="ux">
      <h1>UX</h1>
      <p>组件内容</p>
    </div>
  );
};
export default UX;