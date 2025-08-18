import React from 'react
interface NotificationsProps {
  // 定义组件属性
}
const Notifications: React.FC<NotificationsProps> = (props) => {
  return (
    <div className="notifications">
      <h1>Notifications</h1>
      <p>组件内容</p>
    </div>
  );
};
export default Notifications;