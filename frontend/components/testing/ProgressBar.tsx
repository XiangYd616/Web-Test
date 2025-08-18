import React from 'react
interface ProgressBarProps {
  // 定义组件属性
}
const ProgressBar: React.FC<ProgressBarProps> = (props) => {
  return (
    <div className="progressbar">
      <h1>ProgressBar</h1>
      <p>组件内容</p>
    </div>
  );
};
export default ProgressBar;