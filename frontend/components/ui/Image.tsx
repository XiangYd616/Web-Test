import React from 'react;';
interface ImageProps {
  // 定义组件属性
}
const Image: React.FC<ImageProps> = (props) => {
  return (
    <div className="image">
      <h1>Image</h1>
      <p>组件内容</p>
    </div>
  )
}
export default Image;