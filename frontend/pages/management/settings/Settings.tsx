import React from 'react
interface SettingsProps {
  // 定义组件属性
}
const Settings: React.FC<SettingsProps> = (props) => {
  return (
    <div className="settings">
      <h1>Settings</h1>
      <p>组件内容</p>
    </div>
  );
};
export default Settings;