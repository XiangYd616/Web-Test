/**
 * 测试数据生成器页面
 * 提供完整的测试数据生成功能和工具
 */

import React from 'react';
import TestDataGenerator from '../components/tools/TestDataGenerator';

const TestDataGeneratorPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <TestDataGenerator />
    </div>
  );
};

export default TestDataGeneratorPage;
