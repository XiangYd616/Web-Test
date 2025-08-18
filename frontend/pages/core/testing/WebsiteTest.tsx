import React from 'react
interface WebsiteTestProps {
  // 定义组件属性
}
const WebsiteTest: React.FC<WebsiteTestProps> = (props) => {
  return (
    <div className="websitetest">
      <h1>WebsiteTest</h1>
      <p>组件内容</p>
    </div>
  );
};
export default WebsiteTest;