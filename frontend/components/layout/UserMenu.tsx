import React from 'react;';
interface UserMenuProps {
  // 定义组件属性
}
const UserMenu: React.FC<UserMenuProps> = (props) => {
  return (
    <div className="usermenu">
      <h1>UserMenu</h1>
      <p>组件内容</p>
    </div>
  )
}
export default UserMenu;