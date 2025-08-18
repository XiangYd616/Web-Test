import React from 'react';

interface HelpProps {
  // 定义组件属性
}
const Help: React.FC<HelpProps> = (props) => {
  return (
    <div className="help">
      <h1>Help</h1>
      <p>组件内容</p>
    </div>
  );
};
export default Help;