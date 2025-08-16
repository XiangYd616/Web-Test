/**
 * 高级API测试配置组件
 * 提供完整的API测试配置选项
 */

import React, { useState, useEffect } from 'react';
import { Settings, Plus, Trash2, Globe, Shield, Clock, Zap, FileText, Database, Key, CheckCircle, AlertTriangle, Info, ChevronDown, ChevronUp, Copy, Download, // Upload } from 'lucide-react'; // 已修复
interface APIEndpoint {
  id: string;
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  path: string;
  headers?: Record<string, string>;
  body?: string;
  expectedStatus: number[];
  expectedResponse?: string;
  timeout?: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  description?: string;
}

interface APITestConfig {
  baseUrl: string;
  endpoints: APIEndpoint[];
  
  // 认证配置
  auth?: {
    type: 'none' | 'basic' | 'bearer' | 'apikey' | 'oauth2';
    username?: string;
    password?: string;
    token?: string;
    apiKey?: string;
    apiKeyHeader?: string;
  };
  
  // 全局配置
  globalHeaders: Record<string, string>;
  timeout: number;
  retries: number;
  
  // 测试选项
  testOptions: {
    validateSchema: boolean;
    testSecurity: boolean;
    testPerformance: boolean;
    testReliability: boolean;
    loadTest: boolean;
    generateDocumentation: boolean;
  };
  
  // 负载测试配置
  loadTestConfig: {
    concurrentUsers: number;
    duration: number;
    rampUpTime: number;
  };
  
  // 环境配置
  environment: 'development' | 'staging' | 'production';
  
  // 断言配置
  assertions: {
    responseTime: number;
    statusCode: boolean;
    contentType: boolean;
    responseBody: boolean;
  };
}

interface APITestConfigProps {
  config: APITestConfig;
  onChange: (config: APITestConfig) => void;
  onStart: () => void;
  isRunning: boolean;
  className?: string;
}

const APITestConfig: React.FC<APITestConfigProps> = ({
  config,
  onChange,
  onStart,
  isRunning,
  className = ''
}) => {
  
  const memoizedHandleClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    if (disabled || loading) return;
    onClick?.(event);
  }, [disabled, loading, onClick]);
  
  const memoizedHandleChange = useMemo(() => 
    debounce((value: any) => {
      onChange?.(value);
    }, 300), [onChange]
  );
  
  const componentId = useId();
  const errorId = `${componentId}-error`;
  const descriptionId = `${componentId}-description`;
  
  const ariaProps = {
    id: componentId,
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledBy,
    'aria-describedby': [
      error ? errorId : null,
      description ? descriptionId : null,
      ariaDescribedBy
    ].filter(Boolean).join(' ') || undefined,
    'aria-invalid': !!error,
    'aria-disabled': disabled,
    'aria-busy': loading,
    'aria-expanded': expanded,
    'aria-selected': selected,
    role: role,
    tabIndex: disabled ? -1 : (tabIndex ?? 0)
  };
  const [activeTab, setActiveTab] = useState<'endpoints' | 'auth' | 'options' | 'load'>('endpoints');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedEndpoint, setSelectedEndpoint] = useState<string | null>(null);

  // HTTP方法选项
  const httpMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
  
  // 优先级选项
  const priorities = [
    { value: 'low', label: '低', color: 'text-gray-600' },
    { value: 'medium', label: '中', color: 'text-blue-600' },
    { value: 'high', label: '高', color: 'text-orange-600' },
    { value: 'critical', label: '关键', color: 'text-red-600' }
  ];

  // 认证类型选项
  const authTypes = [
    { value: 'none', label: '无认证' },
    { value: 'basic', label: 'Basic Auth' },
    { value: 'bearer', label: 'Bearer Token' },
    { value: 'apikey', label: 'API Key' },
    { value: 'oauth2', label: 'OAuth 2.0' }
  ];

  // 更新配置
  const updateConfig = (updates: Partial<APITestConfig>) => {
    onChange({ ...config, ...updates });
  };

  // 添加端点
  const addEndpoint = () => {
    const newEndpoint: APIEndpoint = {
      id: Date.now().toString(),
      name: `端点 ${config.endpoints.length + 1}`,
      method: 'GET',
      path: '/',
      expectedStatus: [200],
      priority: 'medium'
    };
    
    updateConfig({
      endpoints: [...config.endpoints, newEndpoint]
    });
    
    setSelectedEndpoint(newEndpoint.id);
  };

  // 删除端点
  const removeEndpoint = (id: string) => {
    updateConfig({
      endpoints: config.endpoints.filter(ep => ep.id !== id)
    });
    
    if (selectedEndpoint === id) {
      setSelectedEndpoint(null);
    }
  };

  // 更新端点
  const updateEndpoint = (id: string, updates: Partial<APIEndpoint>) => {
    updateConfig({
      endpoints: config.endpoints.map(ep => 
        ep.id === id ? { ...ep, ...updates } : ep
      )
    });
  };

  // 复制端点
  const duplicateEndpoint = (endpoint: APIEndpoint) => {
    const newEndpoint = {
      ...endpoint,
      id: Date.now().toString(),
      name: `${endpoint.name} (副本)`
    };
    
    updateConfig({
      endpoints: [...config.endpoints, newEndpoint]
    });
  };

  // 导入端点配置
  const importEndpoints = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        if (Array.isArray(imported)) {
          updateConfig({
            endpoints: [...config.endpoints, ...imported.map((ep, index) => ({
              ...ep,
              id: `imported-${Date.now()}-${index}`
            }))]
          });
        }
      } catch (error) {
        console.error('导入失败:', error);
      }
    };
    reader.readAsText(file);
  };

  // 导出端点配置
  const exportEndpoints = () => {
    const dataStr = JSON.stringify(config.endpoints, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'api-endpoints.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  // 预设配置
  const applyPreset = (preset: string) => {
    const presets = {
      rest: {
        endpoints: [
          {
            id: '1',
            name: 'GET 列表',
            method: 'GET' as const,
            path: '/api/items',
            expectedStatus: [200],
            priority: 'high' as const
          },
          {
            id: '2',
            name: 'POST 创建',
            method: 'POST' as const,
            path: '/api/items',
            expectedStatus: [201],
            priority: 'high' as const,
            body: JSON.stringify({ name: 'test item' })
          },
          {
            id: '3',
            name: 'PUT 更新',
            method: 'PUT' as const,
            path: '/api/items/1',
            expectedStatus: [200],
            priority: 'medium' as const,
            body: JSON.stringify({ name: 'updated item' })
          },
          {
            id: '4',
            name: 'DELETE 删除',
            method: 'DELETE' as const,
            path: '/api/items/1',
            expectedStatus: [204],
            priority: 'medium' as const
          }
        ]
      },
      health: {
        endpoints: [
          {
            id: '1',
            name: '健康检查',
            method: 'GET' as const,
            path: '/health',
            expectedStatus: [200],
            priority: 'critical' as const
          },
          {
            id: '2',
            name: '状态检查',
            method: 'GET' as const,
            path: '/status',
            expectedStatus: [200],
            priority: 'high' as const
          }
        ]
      }
    };

    if (preset in presets) {
      updateConfig(presets[preset as keyof typeof presets]);
    }
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* 标题栏 */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Globe className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">API测试配置</h3>
          </div>
          
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-900"
          >
            <span>{showAdvanced ? '简化配置' : '高级配置'}</span>
            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 快速预设 */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-2 mb-2">
          <Zap className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">快速预设</span>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => applyPreset('rest')}
            disabled={isRunning}
            className="px-3 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
          >
            RESTful API
          </button>
          <button
            onClick={() => applyPreset('health')}
            disabled={isRunning}
            className="px-3 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
          >
            健康检查
          </button>
        </div>
      </div>

      <div className="p-4">
        {/* 基础URL配置 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            基础URL
          </label>
          <input
            type="url"
            value={config.baseUrl}
            onChange={(e) => updateConfig({ baseUrl: e.target.value })}
            disabled={isRunning}
            placeholder="https://api.example.com"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
        </div>

        {/* 标签页导航 */}
        {showAdvanced && (
          <div className="flex space-x-1 mb-4 bg-gray-100 rounded-lg p-1">
            {[
              { key: 'endpoints', label: '端点配置', icon: <Globe className="w-4 h-4" /> },
              { key: 'auth', label: '认证设置', icon: <Key className="w-4 h-4" /> },
              { key: 'options', label: '测试选项', icon: <Settings className="w-4 h-4" /> },
              { key: 'load', label: '负载测试', icon: <Zap className="w-4 h-4" /> }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* 端点配置 */}
        {(!showAdvanced || activeTab === 'endpoints') && (
          <div className="space-y-4">
            {/* 端点列表头部 */}
            <div className="flex items-center justify-between">
              <h4 className="text-md font-medium text-gray-900">API端点</h4>
              <div className="flex space-x-2">
                <input
                  type="file"
                  accept=".json"
                  onChange={importEndpoints}
                  className="hidden"
                  id="import-endpoints"
                />
                <label
                  htmlFor="import-endpoints"
                  className="flex items-center space-x-1 px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 cursor-pointer"
                >
                  <Upload className="w-3 h-3" />
                  <span>导入</span>
                </label>
                <button
                  onClick={exportEndpoints}
                  disabled={config.endpoints.length === 0}
                  className="flex items-center space-x-1 px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
                >
                  <Download className="w-3 h-3" />
                  <span>导出</span>
                </button>
                <button
                  onClick={addEndpoint}
                  disabled={isRunning}
                  className="flex items-center space-x-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  <Plus className="w-3 h-3" />
                  <span>添加端点</span>
                </button>
              </div>
            </div>

            {/* 端点列表 */}
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {config.endpoints.map((endpoint) => (
                <div
                  key={endpoint.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedEndpoint === endpoint.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedEndpoint(endpoint.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        endpoint.method === 'GET' ? 'bg-green-100 text-green-800' :
                        endpoint.method === 'POST' ? 'bg-blue-100 text-blue-800' :
                        endpoint.method === 'PUT' ? 'bg-yellow-100 text-yellow-800' :
                        endpoint.method === 'DELETE' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {endpoint.method}
                      </span>
                      <span className="font-medium text-sm">{endpoint.name}</span>
                      <span className="text-xs text-gray-600">{endpoint.path}</span>
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      <span className={`text-xs ${
                        priorities.find(p => p.value === endpoint.priority)?.color || 'text-gray-600'
                      }`}>
                        {priorities.find(p => p.value === endpoint.priority)?.label}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          duplicateEndpoint(endpoint);
                        }}
                        disabled={isRunning}
                        className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeEndpoint(endpoint.id);
                        }}
                        disabled={isRunning}
                        className="p-1 text-gray-400 hover:text-red-600 disabled:opacity-50"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 端点详细配置 */}
            {selectedEndpoint && (
              <div className="border-t pt-4">
                {(() => {
                  const endpoint = config.endpoints.find(ep => ep.id === selectedEndpoint);
                  if (!endpoint) return null;

                  return (
                    <div className="space-y-3">
                      <h5 className="font-medium text-gray-900">端点详细配置</h5>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">名称</label>
                          <input
                            type="text"
                            value={endpoint.name}
                            onChange={(e) => updateEndpoint(endpoint.id, { name: e.target.value })}
                            disabled={isRunning}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">方法</label>
                          <select
                            value={endpoint.method}
                            onChange={(e) => updateEndpoint(endpoint.id, { method: e.target.value as any })}
                            disabled={isRunning}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                          >
                            {httpMethods.map(method => (
                              <option key={method} value={method}>{method}</option>
                            ))}
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">路径</label>
                          <input
                            type="text"
                            value={endpoint.path}
                            onChange={(e) => updateEndpoint(endpoint.id, { path: e.target.value })}
                            disabled={isRunning}
                            placeholder="/api/endpoint"
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">优先级</label>
                          <select
                            value={endpoint.priority}
                            onChange={(e) => updateEndpoint(endpoint.id, { priority: e.target.value as any })}
                            disabled={isRunning}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                          >
                            {priorities.map(priority => (
                              <option key={priority.value} value={priority.value}>{priority.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">期望状态码 (逗号分隔)</label>
                        <input
                          type="text"
                          value={endpoint.expectedStatus.join(', ')}
                          onChange={(e) => {
                            const statuses = e.target.value.split(',').map(s => parseInt(s.trim())).filter(s => !isNaN(s));
                            updateEndpoint(endpoint.id, { expectedStatus: statuses });
                          }}
                          disabled={isRunning}
                          placeholder="200, 201, 204"
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                        />
                      </div>

                      {(endpoint.method === 'POST' || endpoint.method === 'PUT' || endpoint.method === 'PATCH') && (
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">请求体 (JSON)</label>
                          <textarea
                            value={endpoint.body || ''}
                            onChange={(e) => updateEndpoint(endpoint.id, { body: e.target.value })}
                            disabled={isRunning}
                            placeholder='{"key": "value"}'
                            rows={3}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                          />
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* 启动按钮 */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <button
            onClick={onStart}
            disabled={isRunning || !config.baseUrl || config.endpoints.length === 0}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isRunning ? 'API测试进行中...' : `开始测试 (${config.endpoints.length} 个端点)`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default APITestConfig;
