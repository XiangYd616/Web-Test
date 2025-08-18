import React from 'react

interface UserBookmarksProps {
  // 定义组件属性
}

const UserBookmarks: React.FC<UserBookmarksProps> = (props) => {
  return (
    <div className="userbookmarks">
      <h1>UserBookmarks</h1>
      <p>组件内容</p>
    </div>
  );
};

export default UserBookmarks;
