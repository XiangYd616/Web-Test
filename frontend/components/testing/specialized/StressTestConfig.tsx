import React, { useState, useEffect } from 'react';
import {Activity, Users, Clock, TrendingUp, AlertCircle} from 'lucide-react';

interface StressTestConfigProps {
  config: any;
  onConfigChange: (config: any) => void;
  onSaveConfig?: (config: any) => void;
  disabled?: boolean;
}

export const StressTestConfig: React.FC<StressTestConfigProps> = ({
  config,
  onConfigChange,
  onSaveConfig,
  disabled = false
}) => {
  const [loadSettings, setLoadSettings] = useState({
    duration: config.duration || 60,
    concurrency: config.concurrency || 10,
    rampUp: config.rampUp || 5,
    rampDown: config.rampDown || 5,
    requestsPerSecond: config.requestsPerSecond || 0,
    thinkTime: config.thinkTime || 1000
  });

  const [testScenarios, setTestScenarios] = useState(config.scenarios || [
    {
      id: '1',
      name: '基础负载测试',
      description: '模拟正常用户访问',
      weight: 70,
      actions: [
        { type: 'visit', url: '/', weight: 100 }
      ]
    }
  ]);

  const [advancedSettings, setAdvancedSettings] = useState({
    timeout: config.timeout || 30000,
    keepAlive: config.keepAlive ?? true,
    followRedirects: config.followRedirects ?? true,
    userAgent: config.userAgent || 'StressTestBot/1.0',
    headers: config.headers || {},
    cookies: config.cookies || {},
    proxy: config.proxy || ''
  });

  // 更新配置
  useEffect(() => {
    const newConfig = {
      ...config,
      ...loadSettings,
      scenarios: testScenarios,
      ...advancedSettings
    };
    onConfigChange(newConfig);
  }, [loadSettings, testScenarios, advancedSettings]);

  const handleLoadSettingChange = (key: string, value: any) => {
    setLoadSettings(prev => ({ ...prev, [key]: value }));
  };

  const calculateEstimatedRequests = () => {
    const { duration, concurrency, requestsPerSecond, thinkTime } = loadSettings;

    if (requestsPerSecond > 0) {
      return duration * requestsPerSecond;
    } else {
      // 基于并发用户和思考时间计算
      const requestsPerUser = duration / (thinkTime / 1000);
      return Math.round(requestsPerUser * concurrency);
    }
  };

  const getLoadLevel = () => {
    const requests = calculateEstimatedRequests();
    if (requests < 1000) return { level: '轻度', color: 'text-green-600 bg-green-100' };
    if (requests < 10000) return { level: '中度', color: 'text-yellow-600 bg-yellow-100' };
    if (requests < 100000) return { level: '重度', color: 'text-orange-600 bg-orange-100' };
    return { level: '极重', color: 'text-red-600 bg-red-100' };
  };

  const loadLevel = getLoadLevel();

  return (
    <div className="space-y-6">
      {/* 负载设置 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <Activity className="w-5 h-5 mr-2" />
          负载设置
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Clock className="w-4 h-4 inline mr-1" />
              测试时长 (秒)
            </label>
            <input
              type="number"
              value={loadSettings.duration}
              onChange={(e) => handleLoadSettingChange('duration', parseInt(e.target.value))}
              disabled={disabled}
              min="10"
              max="3600"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Users className="w-4 h-4 inline mr-1" />
              并发用户数
            </label>
            <input
              type="number"
              value={loadSettings.concurrency}
              onChange={(e) => handleLoadSettingChange('concurrency', parseInt(e.target.value))}
              disabled={disabled}
              min="1"
              max="1000"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <TrendingUp className="w-4 h-4 inline mr-1" />
              预热时间 (秒)
            </label>
            <input
              type="number"
              value={loadSettings.rampUp}
              onChange={(e) => handleLoadSettingChange('rampUp', parseInt(e.target.value))}
              disabled={disabled}
              min="0"
              max="300"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              冷却时间 (秒)
            </label>
            <input
              type="number"
              value={loadSettings.rampDown}
              onChange={(e) => handleLoadSettingChange('rampDown', parseInt(e.target.value))}
              disabled={disabled}
              min="0"
              max="300"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              请求频率 (RPS)
            </label>
            <input
              type="number"
              value={loadSettings.requestsPerSecond}
              onChange={(e) => handleLoadSettingChange('requestsPerSecond', parseInt(e.target.value))}
              disabled={disabled}
              min="0"
              max="10000"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              0表示不限制频率
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              思考时间 (毫秒)
            </label>
            <input
              type="number"
              value={loadSettings.thinkTime}
              onChange={(e) => handleLoadSettingChange('thinkTime', parseInt(e.target.value))}
              disabled={disabled}
              min="0"
              max="60000"
              step="100"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>

        {/* 负载预估 */}
        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <h4 className="font-medium text-gray-900 dark:text-white mb-2">负载预估</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600 dark:text-gray-400">预计请求数:</span>
              <span className="ml-2 font-medium text-gray-900 dark:text-white">
                {calculateEstimatedRequests().toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">负载等级:</span>
              <span className={`ml-2 px-2 py-1 text-xs rounded-full ${loadLevel.color}`}>
                {loadLevel.level}
              </span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">峰值并发:</span>
              <span className="ml-2 font-medium text-gray-900 dark:text-white">
                {loadSettings.concurrency}
              </span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">总时长:</span>
              <span className="ml-2 font-medium text-gray-900 dark:text-white">
                {loadSettings.duration + loadSettings.rampUp + loadSettings.rampDown}秒
              </span>
            </div>
          </div>
        </div>

        {/* 警告提示 */}
        {loadLevel.level === '极重' && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
              <div>
                <h4 className="font-medium text-red-800 dark:text-red-200">高负载警告</h4>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                  当前配置将产生极高的负载，请确保：
                </p>
                <ul className="text-sm text-red-700 dark:text-red-300 mt-2 list-disc list-inside space-y-1">
                  <li>目标服务器能够承受此负载</li>
                  <li>您有权限进行此级别的压力测试</li>
                  <li>测试不会影响生产环境的正常运行</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 测试场景 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">测试场景</h3>

        <div className="space-y-4">
          {testScenarios.map((scenario, index) => (
            <div key={scenario.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex-1">
                  <input
                    type="text"
                    value={scenario.name}
                    onChange={(e) => {
                      const newScenarios = [...testScenarios];
                      newScenarios[index].name = e.target.value;
                      setTestScenarios(newScenarios);
                    }}
                    disabled={disabled}
                    className="font-medium text-gray-900 dark:text-white bg-transparent border-none p-0 focus:ring-0"
                    placeholder="场景名称"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">权重:</span>
                  <input
                    type="number"
                    value={scenario.weight}
                    onChange={(e) => {
                      const newScenarios = [...testScenarios];
                      newScenarios[index].weight = parseInt(e.target.value);
                      setTestScenarios(newScenarios);
                    }}
                    disabled={disabled}
                    min="1"
                    max="100"
                    className="w-16 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">%</span>
                </div>
              </div>

              <textarea
                value={scenario.description}
                onChange={(e) => {
                  const newScenarios = [...testScenarios];
                  newScenarios[index].description = e.target.value;
                  setTestScenarios(newScenarios);
                }}
                disabled={disabled}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="场景描述"
                rows={2}
              />
            </div>
          ))}
        </div>
      </div>

      {/* 高级设置 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">高级设置</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              请求超时 (毫秒)
            </label>
            <input
              type="number"
              value={advancedSettings.timeout}
              onChange={(e) => setAdvancedSettings(prev => ({ ...prev, timeout: parseInt(e.target.value) }))}
              disabled={disabled}
              min="1000"
              max="300000"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              用户代理
            </label>
            <input
              type="text"
              value={advancedSettings.userAgent}
              onChange={(e) => setAdvancedSettings(prev => ({ ...prev, userAgent: e.target.value }))}
              disabled={disabled}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={advancedSettings.keepAlive}
              onChange={(e) => setAdvancedSettings(prev => ({ ...prev, keepAlive: e.target.checked }))}
              disabled={disabled}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">保持连接活跃</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={advancedSettings.followRedirects}
              onChange={(e) => setAdvancedSettings(prev => ({ ...prev, followRedirects: e.target.checked }))}
              disabled={disabled}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">跟随重定向</span>
          </label>
        </div>
      </div>
    </div>
  );
};

export default StressTestConfig;
