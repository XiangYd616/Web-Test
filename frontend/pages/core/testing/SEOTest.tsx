import React from 'react
interface SEOTestProps {
  // 定义组件属性
}
const SEOTest: React.FC<SEOTestProps> = (props) => {
  return (
    <div className="seotest">
      <h1>SEOTest</h1>
      <p>组件内容</p>
    </div>
  );
};
export default SEOTest;