/**
 * StressTestForm.tsx - React组件
 * 
 * 文件路径: frontend\components\stress\StressTestForm.tsx
 * 创建时间: 2025-09-25
 */

import React from 'react';
import { Globe, Users, Clock, Zap } from 'lucide-react';
import { URLInput } from '../ui';

interface StressTestConfig {
  url: string;
  users: number;
  duration: number;
  testType: string;
}

interface StressTestFormProps {
  config: StressTestConfig;
  onConfigChange: (config: StressTestConfig) => void;
  isRunning: boolean;
  error?: string;
}

const StressTestForm: React.FC<StressTestFormProps> = ({
  config,
  onConfigChange,
  isRunning,
  error
}) => {
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onConfigChange({ ...config, url: e.target.value });
  };

  const handleUsersChange = (users: number) => {
    onConfigChange({ ...config, users });
  };

  const handleDurationChange = (duration: number) => {
    onConfigChange({ ...config, duration });
  };

  const handleTestTypeChange = (testType: string) => {
    onConfigChange({ ...config, testType });
  };

  return (
    <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <Zap className="w-5 h-5 text-blue-400" />
        测试配置
      </h3>

      <div className="space-y-6">
        {/* URL输入 */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
            <Globe className="w-4 h-4" />
            目标URL
          </label>
          <URLInput
            value={config.url}
            onChange={handleUrlChange}
            placeholder="请输入要测试的URL"
            disabled={isRunning}
            className="w-full"
          />
        </div>

        {/* 并发用户数 */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
            <Users className="w-4 h-4" />
            并发用户数
          </label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="1"
              max="1000"
              value={config.users}
              onChange={(e) => handleUsersChange(parseInt(e.target.value))}
              disabled={isRunning}
              className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="1000"
                value={config.users}
                onChange={(e) => handleUsersChange(parseInt(e.target.value) || 1)}
                disabled={isRunning}
                className="w-20 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <span className="text-sm text-gray-400">用户</span>
            </div>
          </div>
        </div>

        {/* 测试持续时间 */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            测试持续时间
          </label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="10"
              max="3600"
              value={config.duration}
              onChange={(e) => handleDurationChange(parseInt(e.target.value))}
              disabled={isRunning}
              className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="10"
                max="3600"
                value={config.duration}
                onChange={(e) => handleDurationChange(parseInt(e.target.value) || 10)}
                disabled={isRunning}
                className="w-20 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <span className="text-sm text-gray-400">秒</span>
            </div>
          </div>
        </div>

        {/* 测试类型 */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            测试类型
          </label>
          <select
            value={config.testType}
            onChange={(e) => handleTestTypeChange(e.target.value)}
            disabled={isRunning}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="load">负载测试</option>
            <option value="stress">压力测试</option>
            <option value="spike">峰值测试</option>
            <option value="volume">容量测试</option>
          </select>
        </div>

        {/* 错误显示 */}
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StressTestForm;
