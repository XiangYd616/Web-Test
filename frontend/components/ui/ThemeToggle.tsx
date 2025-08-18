import React from 'react;';
interface ThemeToggleProps {
  // 定义组件属性
}
const ThemeToggle: React.FC<ThemeToggleProps> = (props) => {
  return (
    <div className="themetoggle">
      <h1>ThemeToggle</h1>
      <p>组件内容</p>
    </div>
  )
}
export default ThemeToggle;