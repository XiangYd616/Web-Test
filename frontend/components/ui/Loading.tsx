import React from 'react;';
interface LoadingProps {
  // 定义组件属性
}
const Loading: React.FC<LoadingProps> = (props) => {
  return (
    <div className="loading">
      <h1>Loading</h1>
      <p>组件内容</p>
    </div>
  )
}
export default Loading;