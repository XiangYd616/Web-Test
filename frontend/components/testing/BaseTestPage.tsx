import React from 'react
interface BaseTestPageProps {
  // 定义组件属性
}
const BaseTestPage: React.FC<BaseTestPageProps> = (props) => {
  return (
    <div className="basetestpage">
      <h1>BaseTestPage</h1>
      <p>组件内容</p>
    </div>
  );
};
export default BaseTestPage;