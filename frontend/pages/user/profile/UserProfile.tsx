import React from 'react
interface UserProfileProps {
  // 定义组件属性
}
const UserProfile: React.FC<UserProfileProps> = (props) => {
  return (
    <div className="userprofile">
      <h1>UserProfile</h1>
      <p>组件内容</p>
    </div>
  );
};
export default UserProfile;