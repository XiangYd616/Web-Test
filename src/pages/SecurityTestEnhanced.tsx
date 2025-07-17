/**
 * 增强版安全测试页面
 * 展示URL验证和错误处理的改进功能
 */

import React from 'react';
import SecurityTestDemo from '../components/security/SecurityTestDemo';

const SecurityTestEnhanced: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-8">
      <SecurityTestDemo />
    </div>
  );
};

export default SecurityTestEnhanced;
