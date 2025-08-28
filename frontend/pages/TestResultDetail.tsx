// 自动生成的页面组件
import React from 'react';

interface TestResultDetailProps {
  children?: React.ReactNode;
}

const TestResultDetail: React.FC<TestResultDetailProps> = ({ children }) => {
  return (
    <div className="page-container p-6 themed-bg-primary">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold themed-text-primary mb-6">
          TestResultDetail
        </h1>
        <div className="themed-card rounded-lg shadow p-6">
          <p className="themed-text-secondary mb-4">
            TestResultDetail页面正在开发中...
          </p>
          {children}
        </div>
      </div>
    </div>
  );
};

export default TestResultDetail;
