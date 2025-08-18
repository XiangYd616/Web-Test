import React from 'react;';
interface NavigationProps {
  // 定义组件属性
}
const Navigation: React.FC<NavigationProps> = (props) => {
  return (
    <div className="navigation">
      <h1>Navigation</h1>
      <p>组件内容</p>
    </div>
  )
}
export default Navigation;