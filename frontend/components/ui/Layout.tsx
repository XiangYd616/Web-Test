import React from 'react
interface LayoutProps {
  // 定义组件属性
}
const Layout: React.FC<LayoutProps> = (props) => {
  return (
    <div className="layout">
      <h1>Layout</h1>
      <p>组件内容</p>
    </div>
  );
};
export default Layout;