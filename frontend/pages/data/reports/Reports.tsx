import React from 'react
interface ReportsProps {
  // 定义组件属性
}
const Reports: React.FC<ReportsProps> = (props) => {
  return (
    <div className="reports">
      <h1>Reports</h1>
      <p>组件内容</p>
    </div>
  );
};
export default Reports;