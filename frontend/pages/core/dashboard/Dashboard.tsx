import React from 'react
interface DashboardProps {
  // 定义组件属性
}
const Dashboard: React.FC<DashboardProps> = (props) => {
  return (
    <div className="dashboard">
      <h1>Dashboard</h1>
      <p>组件内容</p>
    </div>
  );
};
export default Dashboard;