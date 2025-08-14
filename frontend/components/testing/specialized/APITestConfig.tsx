import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Copy, Upload, Download, Play } from 'lucide-react';
import { configService } from '../../../services/configService';

interface APIEndpoint {
  id: string;
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  expectedStatus: number[];
  description?: string;
  headers?: Record<string, string>;
  body?: string;
  params?: Record<string, string>;
  priority: 'low' | 'medium' | 'high';
  tags: string[];
}

interface APITestConfigProps {
  config: any;
  onConfigChange: (config: any) => void;
  onSaveConfig?: (config: any) => void;
  disabled?: boolean;
}

export const APITestConfig: React.FC<APITestConfigProps> = ({
  config,
  onConfigChange,
  onSaveConfig,
  disabled = false
}) => {
  const [endpoints, setEndpoints] = useState<APIEndpoint[]>(config.endpoints || []);
  const [baseUrl, setBaseUrl] = useState(config.baseUrl || '');
  const [globalHeaders, setGlobalHeaders] = useState(config.headers || {});
  const [testSettings, setTestSettings] = useState({
    timeout: config.timeout || 10000,
    retries: config.retries || 3,
    followRedirects: config.followRedirects || true,
    validateSSL: config.validateSSL || true,
    validateSchema: config.validateSchema || false,
    loadTest: config.loadTest || false,
    testSecurity: config.testSecurity || false,
    testPerformance: config.testPerformance || false
  });

  // 更新配置
  useEffect(() => {
    const newConfig = {
      ...config,
      baseUrl,
      endpoints,
      headers: globalHeaders,
      ...testSettings
    };
    onConfigChange(newConfig);
  }, [baseUrl, endpoints, globalHeaders, testSettings]);

  // 添加端点
  const addEndpoint = () => {
    const newEndpoint: APIEndpoint = {
      id: Date.now().toString(),
      name: '新端点',
      method: 'GET',
      path: '/api/endpoint',
      expectedStatus: [200],
      description: '',
      priority: 'medium',
      tags: []
    };
    setEndpoints([...endpoints, newEndpoint]);
  };

  // 删除端点
  const removeEndpoint = (id: string) => {
    setEndpoints(endpoints.filter(ep => ep.id !== id));
  };

  // 复制端点
  const duplicateEndpoint = (endpoint: APIEndpoint) => {
    const newEndpoint = {
      ...endpoint,
      id: Date.now().toString(),
      name: `${endpoint.name} (副本)`
    };
    setEndpoints([...endpoints, newEndpoint]);
  };

  // 更新端点
  const updateEndpoint = (id: string, updates: Partial<APIEndpoint>) => {
    setEndpoints(endpoints.map(ep =>
      ep.id === id ? { ...ep, ...updates } : ep
    ));
  };

  // 导入OpenAPI规范
  const importOpenAPI = async (file: File) => {
    try {
      const text = await file.text();
      const spec = JSON.parse(text);

      // 解析OpenAPI规范并生成端点
      const importedEndpoints = parseOpenAPISpec(spec);
      setEndpoints([...endpoints, ...importedEndpoints]);

      if (spec.servers && spec.servers[0]) {
        setBaseUrl(spec.servers[0].url);
      }
    } catch (error) {
      console.error('导入OpenAPI规范失败:', error);
    }
  };

  // 解析OpenAPI规范
  const parseOpenAPISpec = (spec: any): APIEndpoint[] => {
    const endpoints: APIEndpoint[] = [];

    if (spec.paths) {
      Object.entries(spec.paths).forEach(([path, methods]: [string, any]) => {
        Object.entries(methods).forEach(([method, details]: [string, any]) => {
          if (['get', 'post', 'put', 'delete', 'patch'].includes(method.toLowerCase())) {
            endpoints.push({
              id: `${method}-${path}-${Date.now()}`,
              name: details.summary || `${method.toUpperCase()} ${path}`,
              method: method.toUpperCase() as any,
              path,
              expectedStatus: [200],
              description: details.description || '',
              priority: 'medium',
              tags: details.tags || []
            });
          }
        });
      });
    }

    return endpoints;
  };

  // 测试单个端点
  const testSingleEndpoint = async (endpoint: APIEndpoint) => {
    try {
      const url = baseUrl + endpoint.path;
      const response = await fetch(url, {
        method: endpoint.method,
        headers: {
          ...globalHeaders,
          ...endpoint.headers,
          'Content-Type': 'application/json'
        },
        body: endpoint.body ? JSON.stringify(JSON.parse(endpoint.body)) : undefined
      });

      console.log(`端点 ${endpoint.name} 测试结果:`, {
        status: response.status,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });

      return response.ok;
    } catch (error) {
      console.error(`端点 ${endpoint.name} 测试失败:`, error);
      return false;
    }
  };

  return (
    <div className="space-y-6">
      {/* 基础配置 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">基础配置</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              基础URL
            </label>
            <input
              type="url"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              disabled={disabled}
              placeholder="https://api.example.com"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              超时时间 (毫秒)
            </label>
            <input
              type="number"
              value={testSettings.timeout}
              onChange={(e) => setTestSettings(prev => ({ ...prev, timeout: parseInt(e.target.value) }))}
              disabled={disabled}
              min="1000"
              max="300000"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>

        {/* 测试选项 */}
        <div className="mt-4">
          <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">测试选项</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { key: 'validateSSL', label: 'SSL验证' },
              { key: 'followRedirects', label: '跟随重定向' },
              { key: 'validateSchema', label: '模式验证' },
              { key: 'testSecurity', label: '安全测试' },
              { key: 'testPerformance', label: '性能测试' },
              { key: 'loadTest', label: '负载测试' }
            ].map(option => (
              <label key={option.key} className="flex items-center">
                <input
                  type="checkbox"
                  checked={testSettings[option.key]}
                  onChange={(e) => setTestSettings(prev => ({ ...prev, [option.key]: e.target.checked }))}
                  disabled={disabled}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{option.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* 端点配置 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">API端点</h3>
          <div className="flex items-center space-x-2">
            <input
              type="file"
              accept=".json,.yaml,.yml"
              onChange={(e) => e.target.files?.[0] && importOpenAPI(e.target.files[0])}
              className="hidden"
              id="openapi-import"
            />
            <label
              htmlFor="openapi-import"
              className="p-2 text-gray-600 hover:text-blue-600 transition-colors cursor-pointer"
              title="导入OpenAPI规范"
            >
              <Upload className="w-4 h-4" />
            </label>
            <button
              onClick={addEndpoint}
              disabled={disabled}
              className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>添加端点</span>
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {endpoints.map((endpoint) => (
            <div key={endpoint.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <select
                    value={endpoint.method}
                    onChange={(e) => updateEndpoint(endpoint.id, { method: e.target.value as any })}
                    disabled={disabled}
                    className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    {['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map(method => (
                      <option key={method} value={method}>{method}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={endpoint.name}
                    onChange={(e) => updateEndpoint(endpoint.id, { name: e.target.value })}
                    disabled={disabled}
                    className="flex-1 px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="端点名称"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => testSingleEndpoint(endpoint)}
                    disabled={disabled || !baseUrl}
                    className="p-1 text-green-600 hover:text-green-700 transition-colors disabled:opacity-50"
                    title="测试此端点"
                  >
                    <Play className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => duplicateEndpoint(endpoint)}
                    disabled={disabled}
                    className="p-1 text-blue-600 hover:text-blue-700 transition-colors disabled:opacity-50"
                    title="复制端点"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => removeEndpoint(endpoint.id)}
                    disabled={disabled}
                    className="p-1 text-red-600 hover:text-red-700 transition-colors disabled:opacity-50"
                    title="删除端点"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={endpoint.path}
                  onChange={(e) => updateEndpoint(endpoint.id, { path: e.target.value })}
                  disabled={disabled}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="/api/endpoint"
                />
                <input
                  type="text"
                  value={endpoint.expectedStatus.join(',')}
                  onChange={(e) => updateEndpoint(endpoint.id, {
                    expectedStatus: e.target.value.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n))
                  })}
                  disabled={disabled}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="200,201,204"
                />
              </div>

              {endpoint.description !== undefined && (
                <textarea
                  value={endpoint.description}
                  onChange={(e) => updateEndpoint(endpoint.id, { description: e.target.value })}
                  disabled={disabled}
                  className="mt-3 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="端点描述"
                  rows={2}
                />
              )}
            </div>
          ))}

          {endpoints.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <p>暂无API端点</p>
              <p className="text-sm mt-2">点击"添加端点"或导入OpenAPI规范开始配置</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default APITestConfig;
