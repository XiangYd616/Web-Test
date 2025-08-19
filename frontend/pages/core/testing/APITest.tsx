import React, { useState } from 'react';
import { Globe, Send, Clock, CheckCircle, XCircle, Play, Square } from 'lucide-react';

interface APITestConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers: { [key: string]: string };
  body: string;
  timeout: number;
  followRedirects: boolean;
  validateSSL: boolean;
}

interface APITestResult {
  status: number;
  statusText: string;
  responseTime: number;
  responseSize: number;
  headers: { [key: string]: string };
  body: string;
  success: boolean;
  error?: string;
}

const APITest: React.FC = () => {
  const [config, setConfig] = useState<APITestConfig>({
    url: '',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Test-Web API Tester'
    },
    body: '',
    timeout: 30000,
    followRedirects: true,
    validateSSL: true,
  });

  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<APITestResult | null>(null);
  const [activeTab, setActiveTab] = useState<'headers' | 'body' | 'auth'>('headers');

  const handleStartTest = () => {
    if (!config.url) return;
    
    setIsRunning(true);
    // 模拟API测试
    setTimeout(() => {
      const mockResult: APITestResult = {
        status: 200,
        statusText: 'OK',
        responseTime: 245,
        responseSize: 1024,
        headers: {
          'content-type': 'application/json',
          'server': 'nginx/1.18.0',
          'cache-control': 'no-cache',
          'x-ratelimit-remaining': '99'
        },
        body: JSON.stringify({
          message: 'API测试成功',
          timestamp: new Date().toISOString(),
          data: {
            users: 150,
            active: 45,
            version: '1.0.0'
          }
        }, null, 2),
        success: true
      };
      setResults(mockResult);
      setIsRunning(false);
    }, 2000);
  };

  const handleStopTest = () => {
    setIsRunning(false);
  };

  const updateHeader = (key: string, value: string) => {
    setConfig({
      ...config,
      headers: { ...config.headers, [key]: value }
    });
  };

  const addHeader = () => {
    setConfig({
      ...config,
      headers: { ...config.headers, '': '' }
    });
  };

  const removeHeader = (key: string) => {
    const newHeaders = { ...config.headers };
    delete newHeaders[key];
    setConfig({ ...config, headers: newHeaders });
  };

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return 'text-green-400';
    if (status >= 300 && status < 400) return 'text-yellow-400';
    if (status >= 400 && status < 500) return 'text-orange-400';
    if (status >= 500) return 'text-red-400';
    return 'text-gray-400';
  };

  return (
    <div className="api-test-container">
      <div className="page-header mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Globe className="w-6 h-6 text-cyan-400" />
          API测试
        </h2>
        <p className="text-gray-400 mt-2">
          测试API接口的可用性、性能和响应数据
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 请求配置 */}
        <div>
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">请求配置</h3>
            
            <div className="space-y-4">
              {/* URL和方法 */}
              <div className="flex gap-2">
                <select
                  value={config.method}
                  onChange={(e) => setConfig({ ...config, method: e.target.value as any })}
                  className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                  <option value="PATCH">PATCH</option>
                </select>
                <input
                  type="url"
                  value={config.url}
                  onChange={(e) => setConfig({ ...config, url: e.target.value })}
                  placeholder="https://api.example.com/endpoint"
                  className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              {/* 标签页 */}
              <div className="border-b border-gray-600">
                <nav className="flex space-x-8">
                  {[
                    { key: 'headers', label: '请求头' },
                    { key: 'body', label: '请求体' },
                    { key: 'auth', label: '认证' },
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setActiveTab(key as any)}
                      className={`py-2 px-1 border-b-2 font-medium text-sm ${
                        activeTab === key
                          ? 'border-cyan-500 text-cyan-400'
                          : 'border-transparent text-gray-400 hover:text-gray-300'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </nav>
              </div>

              {/* 标签页内容 */}
              <div className="min-h-[200px]">
                {activeTab === 'headers' && (
                  <div className="space-y-2">
                    {Object.entries(config.headers).map(([key, value]) => (
                      <div key={key} className="flex gap-2">
                        <input
                          type="text"
                          value={key}
                          onChange={(e) => {
                            const newHeaders = { ...config.headers };
                            delete newHeaders[key];
                            newHeaders[e.target.value] = value;
                            setConfig({ ...config, headers: newHeaders });
                          }}
                          placeholder="Header名称"
                          className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        />
                        <input
                          type="text"
                          value={value}
                          onChange={(e) => updateHeader(key, e.target.value)}
                          placeholder="Header值"
                          className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        />
                        <button
                          onClick={() => removeHeader(key)}
                          className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={addHeader}
                      className="w-full px-3 py-2 border-2 border-dashed border-gray-600 rounded-md text-gray-400 hover:border-gray-500 hover:text-gray-300"
                    >
                      + 添加Header
                    </button>
                  </div>
                )}

                {activeTab === 'body' && (
                  <div>
                    <textarea
                      value={config.body}
                      onChange={(e) => setConfig({ ...config, body: e.target.value })}
                      placeholder="请求体内容 (JSON, XML, 文本等)"
                      rows={8}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono text-sm"
                    />
                  </div>
                )}

                {activeTab === 'auth' && (
                  <div className="space-y-4">
                    <div className="text-sm text-gray-400">
                      认证信息可以通过请求头配置，例如：
                    </div>
                    <div className="bg-gray-700 rounded p-3 text-sm font-mono">
                      <div className="text-gray-300">Authorization: Bearer your-token</div>
                      <div className="text-gray-300">X-API-Key: your-api-key</div>
                    </div>
                  </div>
                )}
              </div>

              {/* 高级选项 */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-300">高级选项</h4>
                
                <div>
                  <label className="block text-sm text-gray-300 mb-1">
                    超时时间 (毫秒)
                  </label>
                  <input
                    type="number"
                    value={config.timeout}
                    onChange={(e) => setConfig({ ...config, timeout: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.followRedirects}
                    onChange={(e) => setConfig({ ...config, followRedirects: e.target.checked })}
                    className="mr-2 rounded border-gray-600 bg-gray-700 text-cyan-500 focus:ring-cyan-500"
                  />
                  <span className="text-sm text-gray-300">跟随重定向</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.validateSSL}
                    onChange={(e) => setConfig({ ...config, validateSSL: e.target.checked })}
                    className="mr-2 rounded border-gray-600 bg-gray-700 text-cyan-500 focus:ring-cyan-500"
                  />
                  <span className="text-sm text-gray-300">验证SSL证书</span>
                </label>
              </div>

              {/* 操作按钮 */}
              <div className="flex gap-2 pt-4">
                <button
                  onClick={handleStartTest}
                  disabled={!config.url || isRunning}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                  发送请求
                </button>
                <button
                  onClick={handleStopTest}
                  disabled={!isRunning}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Square className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 响应结果 */}
        <div>
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">响应结果</h3>
            
            {isRunning ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Clock className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-4" />
                  <p className="text-gray-400">正在发送请求...</p>
                </div>
              </div>
            ) : results ? (
              <div className="space-y-4">
                {/* 状态信息 */}
                <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                  <div className="flex items-center gap-2">
                    {results.success ? 
                      <CheckCircle className="w-5 h-5 text-green-400" /> :
                      <XCircle className="w-5 h-5 text-red-400" />
                    }
                    <span className={`font-medium ${getStatusColor(results.status)}`}>
                      {results.status} {results.statusText}
                    </span>
                  </div>
                  <div className="text-sm text-gray-400">
                    {results.responseTime}ms • {(results.responseSize / 1024).toFixed(1)}KB
                  </div>
                </div>

                {/* 响应头 */}
                <div>
                  <h4 className="font-medium text-white mb-2">响应头</h4>
                  <div className="bg-gray-700 rounded-lg p-3 max-h-32 overflow-y-auto">
                    {Object.entries(results.headers).map(([key, value]) => (
                      <div key={key} className="text-sm font-mono">
                        <span className="text-cyan-400">{key}:</span>{' '}
                        <span className="text-gray-300">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 响应体 */}
                <div>
                  <h4 className="font-medium text-white mb-2">响应体</h4>
                  <div className="bg-gray-700 rounded-lg p-3">
                    <pre className="text-sm font-mono text-gray-300 whitespace-pre-wrap max-h-64 overflow-y-auto">
                      {results.body}
                    </pre>
                  </div>
                </div>

                {/* 错误信息 */}
                {results.error && (
                  <div className="p-3 bg-red-900/20 border border-red-500/20 rounded-lg">
                    <h4 className="font-medium text-red-400 mb-2">错误信息</h4>
                    <p className="text-sm text-red-300">{results.error}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <Globe className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>配置请求参数并发送API请求</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default APITest;
