/**
 * DatabaseTest.tsx - 数据库测试页面
 */

import React from 'react';
import { Database } from 'lucide-react';

const DatabaseTest: React.FC = () => {
  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center mb-6">
        <Database className="w-8 h-8 mr-3 text-blue-500" />
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          数据库测试
        </h1>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="text-center py-12">
          <Database className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
            数据库测试功能
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            此功能正在开发中，敬请期待...
          </p>
        </div>
      </div>
    </div>
  );
};

export default DatabaseTest;

