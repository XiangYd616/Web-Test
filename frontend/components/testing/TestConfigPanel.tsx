import React, { useState, useEffect } from 'react';
import {Settings, Save, RotateCcw} from 'lucide-react';

interface TestConfigPanelProps {
  testType: string;
  config: any;
  onConfigChange: (config: any) => void;
  onSaveConfig?: (config: any) => void;
  onLoadConfig?: () => void;
  className?: string;
  disabled?: boolean;
}

export const TestConfigPanel: React.FC<TestConfigPanelProps> = ({
  testType,
  config,
  onConfigChange,
  onSaveConfig,
  onLoadConfig,
  className = '',
  disabled = false
}) => {
  const [localConfig, setLocalConfig] = useState(config);
  const [savedConfigs, setSavedConfigs] = useState<any[]>([]);
  const [showPresets, setShowPresets] = useState(false);

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  const handleConfigChange = (key: string, value: any) => {
    const newConfig = { ...localConfig, [key]: value };
    setLocalConfig(newConfig);
    onConfigChange(newConfig);
  };

  const handleSaveConfig = () => {
    onSaveConfig?.(localConfig);
  };

  const handleResetConfig = () => {
    const defaultConfig = getDefaultConfig(testType);
    setLocalConfig(defaultConfig);
    onConfigChange(defaultConfig);
  };

  const getDefaultConfig = (type: string) => {
    const defaults = {
      api: { timeout: 30000, retries: 3, followRedirects: true },
      security: { checkSSL: true, checkHeaders: true, checkCookies: true },
      stress: { duration: 60, concurrency: 10, rampUp: 5 },
      seo: { checkTechnical: true, checkContent: true, checkMobile: true },
      compatibility: { browsers: ['chrome', 'firefox', 'safari'], devices: ['desktop', 'mobile'] },
      ux: { checkPerformance: true, checkAccessibility: true, checkUsability: true }
    };
    return defaults[type] || {};
  };

  const renderConfigFields = () => {
    switch (testType) {
      case 'api':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                超时时间 (毫秒)
              </label>
              <input
                type="number"
                value={localConfig.timeout || 30000}
                onChange={(e) => handleConfigChange('timeout', parseInt(e.target.value))}
                disabled={disabled}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                重试次数
              </label>
              <input
                type="number"
                value={localConfig.retries || 3}
                onChange={(e) => handleConfigChange('retries', parseInt(e.target.value))}
                disabled={disabled}
                min="0"
                max="10"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="followRedirects"
                checked={localConfig.followRedirects || false}
                onChange={(e) => handleConfigChange('followRedirects', e.target.checked)}
                disabled={disabled}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="followRedirects" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                跟随重定向
              </label>
            </div>
          </>
        );

      case 'stress':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                测试时长 (秒)
              </label>
              <input
                type="number"
                value={localConfig.duration || 60}
                onChange={(e) => handleConfigChange('duration', parseInt(e.target.value))}
                disabled={disabled}
                min="10"
                max="3600"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                并发用户数
              </label>
              <input
                type="number"
                value={localConfig.concurrency || 10}
                onChange={(e) => handleConfigChange('concurrency', parseInt(e.target.value))}
                disabled={disabled}
                min="1"
                max="1000"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                预热时间 (秒)
              </label>
              <input
                type="number"
                value={localConfig.rampUp || 5}
                onChange={(e) => handleConfigChange('rampUp', parseInt(e.target.value))}
                disabled={disabled}
                min="0"
                max="300"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>
          </>
        );

      default:
        return (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Settings className="w-8 h-8 mx-auto mb-2" />
            <p>该测试类型的配置选项正在开发中</p>
          </div>
        );
    }
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* 头部 */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">测试配置</h3>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleResetConfig}
              disabled={disabled}
              className="p-2 text-gray-600 hover:text-blue-600 transition-colors disabled:opacity-50"
              title="重置为默认配置"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={handleSaveConfig}
              disabled={disabled}
              className="p-2 text-gray-600 hover:text-green-600 transition-colors disabled:opacity-50"
              title="保存配置"
            >
              <Save className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 配置表单 */}
      <div className="p-6">
        <div className="space-y-4">
          {renderConfigFields()}
        </div>
      </div>
    </div>
  );
};

export default TestConfigPanel;
