/**
 * TestEngineStatus.tsx - 测试引擎状态组件（占位符）
 * 原文件损坏，已临时替换为占位符
 */

import React from 'react';
import { Activity } from 'lucide-react';

interface TestEngineStatusProps {
  engineId?: string;
  showDetails?: boolean;
}

const TestEngineStatus: React.FC<TestEngineStatusProps> = ({
  engineId,
  showDetails = true
}) => {
  return (
    <div className="test-engine-status p-6">
      <div className="flex items-center mb-6">
        <Activity className="w-8 h-8 mr-3 text-blue-500" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          测试引擎状态
        </h2>
      </div>
      
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <p className="text-yellow-800 dark:text-yellow-200">
          ⚠️ 此组件正在重建中，原文件因编码问题已被替换。
        </p>
        <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-2">
          功能暂时不可用，请稍后再试。
        </p>
      </div>
    </div>
  );
};

export default TestEngineStatus;

