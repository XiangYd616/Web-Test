import React from 'react';

interface CompatibilityTestProps {
  // 定义组件属性
}

const CompatibilityTest: React.FC<CompatibilityTestProps> = (props) => {
  return (
    <div className="compatibilitytest">
      <h1>CompatibilityTest</h1>
      <p>组件内容</p>
    </div>
  );
};

export default CompatibilityTest;
