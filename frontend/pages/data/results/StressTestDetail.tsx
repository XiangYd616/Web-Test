import React from 'react

interface StressTestDetailProps {
  // 定义组件属性
}

const StressTestDetail: React.FC<StressTestDetailProps> = (props) => {
  return (
    <div className="stresstestdetail">
      <h1>StressTestDetail</h1>
      <p>组件内容</p>
    </div>
  );
};

export default StressTestDetail;
