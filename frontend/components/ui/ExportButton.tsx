import React from 'react;';
interface ExportButtonProps {
  // 定义组件属性
}
const ExportButton: React.FC<ExportButtonProps> = (props) => {
  return (
    <div className="exportbutton">
      <h1>ExportButton</h1>
      <p>组件内容</p>
    </div>
  )
}
export default ExportButton;