/**
 * 简化的认证检查组件
 */

import React from 'react';

interface SimpleAuthCheckProps {
  children: React.ReactNode;
  className?: string;
  requireAuth?: boolean;
}

const SimpleAuthCheck: React.FC<SimpleAuthCheckProps> = ({ 
  children, 
  className = '',
  requireAuth = false 
}) => {
  // 简化的认证逻辑 - 在实际应用中这里会检查真实的认证状态
  const isAuthenticated = true; // 暂时设为true以便测试

  if (requireAuth && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow">
          <h2 className="text-2xl font-bold text-center mb-6">需要登录</h2>
          <p className="text-gray-600 text-center mb-6">
            请先登录以访问此功能
          </p>
          <button 
            onClick={() => window.location.href = '/login'}
            className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600"
          >
            前往登录
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {children}
    </div>
  );
};

export default SimpleAuthCheck;
