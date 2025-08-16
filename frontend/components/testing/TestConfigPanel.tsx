/**
 * 统一的测试配置面板
 * 支持所有9种测试类型的配置
 */

import React, { useState, useEffect } from 'react';
import { TestConfig, TestType, APITestConfig, PerformanceTestConfig } from '../../types/testConfig';

interface TestConfigPanelProps {
  testType: TestType;
  initialConfig?: TestConfig;
  onConfigChange: (config: TestConfig) => void;
  onValidationChange: (isValid: boolean, errors: string[]) => void;
}

export const TestConfigPanel: React.FC<TestConfigPanelProps> = ({
  testType,
  initialConfig,
  onConfigChange,
  onValidationChange
}) => {
  const [config, setConfig] = useState<TestConfig>(initialConfig || getDefaultConfig(testType));
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    const validationErrors = validateConfig(testType, config);
    setErrors(validationErrors);
    onValidationChange(validationErrors.length === 0, validationErrors);
    onConfigChange(config);
  }, [config, testType, onConfigChange, onValidationChange]);

  const updateConfig = (updates: Partial<TestConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const renderBasicConfig = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          测试URL *
        </label>
        <input
          type="url"
          value={config.url}
          onChange={(e) => updateConfig({ url: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="https://example.com"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          超时时间 (毫秒)
        </label>
        <input
          type="number"
          value={config.timeout || 30000}
          onChange={(e) => updateConfig({ timeout: parseInt(e.target.value) })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          min="5000"
          max="300000"
        />
      </div>
    </div>
  );

  const renderAPIConfig = () => {
    const apiConfig = config as APITestConfig;
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            HTTP方法
          </label>
          <select
            value={apiConfig.method || 'GET'}
            onChange={(e) => updateConfig({ method: e.target.value as any })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            请求头 (JSON格式)
          </label>
          <textarea
            value={JSON.stringify(apiConfig.headers || {}, null, 2)}
            onChange={(e) => {
              try {
                const headers = JSON.parse(e.target.value);
                updateConfig({ headers });
              } catch (error) {
                // 忽略JSON解析错误，用户输入时可能不完整
              }
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={4}
            placeholder='{"Content-Type": "application/json"}'
          />
        </div>

        {(apiConfig.method === 'POST' || apiConfig.method === 'PUT') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              请求体
            </label>
            <textarea
              value={apiConfig.body || ''}
              onChange={(e) => updateConfig({ body: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={4}
              placeholder='{"key": "value"}'
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            认证配置
          </label>
          <div className="space-y-2">
            <select
              value={apiConfig.auth?.type || 'none'}
              onChange={(e) => {
                const type = e.target.value;
                if (type === 'none') {
                  updateConfig({ auth: undefined });
                } else {
                  updateConfig({ auth: { type: type as any } });
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="none">无认证</option>
              <option value="bearer">Bearer Token</option>
              <option value="basic">Basic Auth</option>
              <option value="apikey">API Key</option>
            </select>

            {apiConfig.auth?.type === 'bearer' && (
              <input
                type="text"
                value={apiConfig.auth.token || ''}
                onChange={(e) => updateConfig({ 
                  auth: { ...apiConfig.auth, token: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Bearer Token"
              />
            )}

            {apiConfig.auth?.type === 'basic' && (
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={apiConfig.auth.username || ''}
                  onChange={(e) => updateConfig({ 
                    auth: { ...apiConfig.auth, username: e.target.value }
                  })}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="用户名"
                />
                <input
                  type="password"
                  value={apiConfig.auth.password || ''}
                  onChange={(e) => updateConfig({ 
                    auth: { ...apiConfig.auth, password: e.target.value }
                  })}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="密码"
                />
              </div>
            )}

            {apiConfig.auth?.type === 'apikey' && (
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={apiConfig.auth.apiKeyHeader || 'X-API-Key'}
                  onChange={(e) => updateConfig({ 
                    auth: { ...apiConfig.auth, apiKeyHeader: e.target.value }
                  })}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Header名称"
                />
                <input
                  type="text"
                  value={apiConfig.auth.apiKey || ''}
                  onChange={(e) => updateConfig({ 
                    auth: { ...apiConfig.auth, apiKey: e.target.value }
                  })}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="API Key"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderPerformanceConfig = () => {
    const perfConfig = config as PerformanceTestConfig;
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            设备类型
          </label>
          <select
            value={perfConfig.device || 'desktop'}
            onChange={(e) => updateConfig({ device: e.target.value as any })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="desktop">桌面设备</option>
            <option value="mobile">移动设备</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            测试类别
          </label>
          <div className="space-y-2">
            {['performance', 'accessibility', 'best-practices', 'seo'].map(category => (
              <label key={category} className="flex items-center">
                <input
                  type="checkbox"
                  checked={perfConfig.categories?.includes(category as any) || false}
                  onChange={(e) => {
                    const categories = perfConfig.categories || [];
                    if (e.target.checked) {
                      updateConfig({ categories: [...categories, category as any] });
                    } else {
                      updateConfig({ categories: categories.filter(c => c !== category) });
                    }
                  }}
                  className="mr-2"
                />
                <span className="text-sm">{getCategoryLabel(category)}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            网络节流
          </label>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs text-gray-500">RTT (ms)</label>
              <input
                type="number"
                value={perfConfig.throttling?.rttMs || 40}
                onChange={(e) => updateConfig({
                  throttling: { 
                    ...perfConfig.throttling, 
                    rttMs: parseInt(e.target.value) 
                  }
                })}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500">吞吐量 (Kbps)</label>
              <input
                type="number"
                value={perfConfig.throttling?.throughputKbps || 10240}
                onChange={(e) => updateConfig({
                  throttling: { 
                    ...perfConfig.throttling, 
                    throughputKbps: parseInt(e.target.value) 
                  }
                })}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500">CPU减速</label>
              <input
                type="number"
                value={perfConfig.throttling?.cpuSlowdownMultiplier || 1}
                onChange={(e) => updateConfig({
                  throttling: { 
                    ...perfConfig.throttling, 
                    cpuSlowdownMultiplier: parseInt(e.target.value) 
                  }
                })}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                min="1"
                max="10"
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSpecificConfig = () => {
    switch (testType) {
      case TestType.API:
        return renderAPIConfig();
      case TestType.PERFORMANCE:
        return renderPerformanceConfig();
      // 其他测试类型的配置将在后续添加
      default:
        return null;
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {getTestTypeLabel(testType)} 配置
      </h3>

      {renderBasicConfig()}
      
      {renderSpecificConfig()}

      {errors.length > 0 && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <h4 className="text-sm font-medium text-red-800 mb-2">配置错误:</h4>
          <ul className="text-sm text-red-700 space-y-1">
            {errors.map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

// 辅助函数
function getDefaultConfig(testType: TestType): TestConfig {
  const baseConfig = {
    url: '',
    timeout: 30000
  };

  switch (testType) {
    case TestType.API:
      return { ...baseConfig, method: 'GET' as const } as APITestConfig;
    case TestType.PERFORMANCE:
      return { 
        ...baseConfig, 
        device: 'desktop' as const,
        categories: ['performance'] as const
      } as PerformanceTestConfig;
    // 其他类型的默认配置
    default:
      return baseConfig;
  }
}

function validateConfig(testType: TestType, config: TestConfig): string[] {
  const errors: string[] = [];

  if (!config.url) {
    errors.push('URL是必需的');
  } else if (!isValidURL(config.url)) {
    errors.push('URL格式不正确');
  }

  if (config.timeout && (config.timeout < 5000 || config.timeout > 300000)) {
    errors.push('超时时间必须在5秒到5分钟之间');
  }

  // 特定测试类型的验证
  switch (testType) {
    case TestType.API:
      const apiConfig = config as APITestConfig;
      if (apiConfig.auth?.type === 'bearer' && !apiConfig.auth.token) {
        errors.push('Bearer认证需要提供token');
      }
      if (apiConfig.auth?.type === 'basic' && (!apiConfig.auth.username || !apiConfig.auth.password)) {
        errors.push('Basic认证需要提供用户名和密码');
      }
      if (apiConfig.auth?.type === 'apikey' && !apiConfig.auth.apiKey) {
        errors.push('API Key认证需要提供API Key');
      }
      break;
  }

  return errors;
}

function isValidURL(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function getTestTypeLabel(testType: TestType): string {
  const labels = {
    [TestType.API]: 'API测试',
    [TestType.PERFORMANCE]: '性能测试',
    [TestType.SECURITY]: '安全测试',
    [TestType.SEO]: 'SEO测试',
    [TestType.STRESS]: '压力测试',
    [TestType.INFRASTRUCTURE]: '基础设施测试',
    [TestType.UX]: 'UX测试',
    [TestType.COMPATIBILITY]: '兼容性测试',
    [TestType.WEBSITE]: '网站综合测试'
  };
  return labels[testType];
}

function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    performance: '性能',
    accessibility: '可访问性',
    'best-practices': '最佳实践',
    seo: 'SEO'
  };
  return labels[category] || category;
}
