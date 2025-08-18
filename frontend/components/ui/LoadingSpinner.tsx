import React from 'react;';

interface LoadingSpinnerProps {
  // 定义组件属性
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = (props) => {
  return (
    <div className="loadingspinner">
      <h1>LoadingSpinner</h1>
      <p>组件内容</p>
    </div>
  )
}

export default LoadingSpinner;
;