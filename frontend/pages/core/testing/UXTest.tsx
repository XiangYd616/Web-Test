import React from 'react
interface UXTestProps {
  // 定义组件属性
}
const UXTest: React.FC<UXTestProps> = (props) => {
  return (
    <div className="uxtest">
      <h1>UXTest</h1>
      <p>组件内容</p>
    </div>
  );
};
export default UXTest;