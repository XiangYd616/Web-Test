import { AlertCircle, CheckCircle, Code, FileText, Loader, Play, Shield, Zap } from 'lucide-react';
import React, { useState } from 'react';
import { useAuthCheck } from '../components/auth/withAuthCheck';
import { URLInput } from '../components/testing';
import BaseTestPage from '../components/testing/BaseTestPage';
import { apiService } from '../services/api/apiService';

interface APIEndpoint {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  description: string;
  headers?: Record<string, string>;
  body?: string;
  expectedStatus?: number;
  timeout?: number;
}

interface APITestConfig {
  baseUrl: string;
  endpoints: APIEndpoint[];
  globalHeaders: Record<string, string>;
  timeout: number;
  retryCount: number;
  checkSecurity: boolean;
  checkPerformance: boolean;
  checkReliability: boolean;
  checkDocumentation: boolean;
}

interface APITestResult {
  overallScore: number;
  grade: string;
  summary: {
    totalEndpoints: number;
    passedEndpoints: number;
    failedEndpoints: number;
    averageResponseTime: number;
  };
  endpointResults: Array<{
    endpoint: APIEndpoint;
    status: 'passed' | 'failed' | 'warning';
    responseTime: number;
    statusCode: number;
    error?: string;
    securityIssues?: string[];
    performanceIssues?: string[];
  }>;
  recommendations: string[];
  securityAnalysis?: any;
  performanceAnalysis?: any;
}

type TestStatus = 'idle' | 'running' | 'completed' | 'failed';

const APIAnalysis: React.FC = () => {
  useAuthCheck();

  const [testConfig, setTestConfig] = useState<APITestConfig>({
    baseUrl: '',
    endpoints: [
      {
        id: '1',
        method: 'GET',
        path: '/api/health',
        description: '健康检查',
        expectedStatus: 200
      }
    ],
    globalHeaders: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    timeout: 10000,
    retryCount: 3,
    checkSecurity: true,
    checkPerformance: true,
    checkReliability: true,
    checkDocumentation: false
  });

  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [testResults, setTestResults] = useState<APITestResult | null>(null);
  const [error, setError] = useState<string>('');

  // 运行API测试
  const runAPITest = async () => {
    if (!testConfig.baseUrl) {
      setError('请输入API基础URL');
      return;
    }

    if (testConfig.endpoints.length === 0) {
      setError('请至少添加一个API端点');
      return;
    }

    try {
      setTestStatus('running');
      setError('');
      setTestResults(null);

      // 调用后端API测试
      const response = await apiService.post('/api/test/real/api', {
        baseUrl: testConfig.baseUrl,
        endpoints: testConfig.endpoints,
        options: {
          globalHeaders: testConfig.globalHeaders,
          timeout: testConfig.timeout,
          retryCount: testConfig.retryCount,
          checkSecurity: testConfig.checkSecurity,
          checkPerformance: testConfig.checkPerformance,
          checkReliability: testConfig.checkReliability,
          checkDocumentation: testConfig.checkDocumentation
        }
      });

      if (response.success) {
        setTestResults(response.data);
        setTestStatus('completed');
      } else {
        throw new Error(response.message || 'API测试失败');
      }
    } catch (err: any) {
      setTestStatus('failed');
      setError(err.message || '测试过程中发生错误');
    }
  };

  // 添加新的API端点
  const addEndpoint = () => {
    const newEndpoint: APIEndpoint = {
      id: Date.now().toString(),
      method: 'GET',
      path: '/api/',
      description: '新端点',
      expectedStatus: 200
    };
    setTestConfig(prev => ({
      ...prev,
      endpoints: [...prev.endpoints, newEndpoint]
    }));
  };

  // 更新端点
  const updateEndpoint = (id: string, updates: Partial<APIEndpoint>) => {
    setTestConfig(prev => ({
      ...prev,
      endpoints: prev.endpoints.map(ep =>
        ep.id === id ? { ...ep, ...updates } : ep
      )
    }));
  };

  // 删除端点
  const removeEndpoint = (id: string) => {
    setTestConfig(prev => ({
      ...prev,
      endpoints: prev.endpoints.filter(ep => ep.id !== id)
    }));
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-500';
    if (score >= 70) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getStatusColor = (status: string) => {
    if (status === 'passed') return 'text-green-500';
    if (status === 'warning') return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <BaseTestPage
      testType="api"
      title="API分析"
      description="全面测试API接口的功能、性能和安全性"
      icon={Code}
    >
      <div className="space-y-6">
        {/* 基础配置 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            API测试配置
          </h2>

          <div className="space-y-4">
            {/* 基础URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                API基础URL
              </label>
              <URLInput
                value={testConfig.baseUrl}
                onChange={(url) => setTestConfig(prev => ({ ...prev, baseUrl: url }))}
                placeholder="输入API基础URL，如：https://api.example.com"
                disabled={testStatus === 'running'}
              />
            </div>

            {/* 全局配置 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  超时时间 (毫秒)
                </label>
                <input
                  type="number"
                  value={testConfig.timeout}
                  onChange={(e) => setTestConfig(prev => ({ ...prev, timeout: parseInt(e.target.value) }))}
                  disabled={testStatus === 'running'}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  重试次数
                </label>
                <input
                  type="number"
                  value={testConfig.retryCount}
                  onChange={(e) => setTestConfig(prev => ({ ...prev, retryCount: parseInt(e.target.value) }))}
                  disabled={testStatus === 'running'}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            {/* 测试选项 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                测试项目
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { key: 'checkSecurity', label: '安全检查', icon: Shield },
                  { key: 'checkPerformance', label: '性能测试', icon: Zap },
                  { key: 'checkReliability', label: '可靠性测试', icon: CheckCircle },
                  { key: 'checkDocumentation', label: '文档检查', icon: FileText }
                ].map((option) => {
                  const IconComponent = option.icon;
                  return (
                    <label key={option.key} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={testConfig[option.key as keyof APITestConfig] as boolean}
                        onChange={(e) => setTestConfig(prev => ({ ...prev, [option.key]: e.target.checked }))}
                        disabled={testStatus === 'running'}
                        className="rounded"
                      />
                      <IconComponent className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {option.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* API端点配置 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              API端点配置
            </h2>
            <button
              onClick={addEndpoint}
              disabled={testStatus === 'running'}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              添加端点
            </button>
          </div>

          <div className="space-y-4">
            {testConfig.endpoints.map((endpoint) => (
              <div key={endpoint.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      方法
                    </label>
                    <select
                      value={endpoint.method}
                      onChange={(e) => updateEndpoint(endpoint.id, { method: e.target.value as any })}
                      disabled={testStatus === 'running'}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                      <option value="PUT">PUT</option>
                      <option value="DELETE">DELETE</option>
                      <option value="PATCH">PATCH</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      路径
                    </label>
                    <input
                      type="text"
                      value={endpoint.path}
                      onChange={(e) => updateEndpoint(endpoint.id, { path: e.target.value })}
                      disabled={testStatus === 'running'}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      描述
                    </label>
                    <input
                      type="text"
                      value={endpoint.description}
                      onChange={(e) => updateEndpoint(endpoint.id, { description: e.target.value })}
                      disabled={testStatus === 'running'}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={() => removeEndpoint(endpoint.id)}
                      disabled={testStatus === 'running' || testConfig.endpoints.length <= 1}
                      className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      删除
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 开始测试按钮 */}
        <button
          onClick={runAPITest}
          disabled={!testConfig.baseUrl || testConfig.endpoints.length === 0 || testStatus === 'running'}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
        >
          {testStatus === 'running' ? (
            <>
              <Loader className="w-4 h-4 animate-spin" />
              <span>API测试进行中...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              <span>开始API测试</span>
            </>
          )}
        </button>

        {/* 错误信息 */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* 测试结果 */}
        {testResults && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              API测试结果
            </h2>

            {/* 总体评分 */}
            <div className="flex items-center justify-between mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  API质量评分
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  通过: {testResults.summary.passedEndpoints}/{testResults.summary.totalEndpoints} 端点
                </div>
              </div>
              <div className="text-right">
                <div className={`text-4xl font-bold ${getScoreColor(testResults.overallScore)}`}>
                  {testResults.overallScore}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  平均响应: {testResults.summary.averageResponseTime}ms
                </div>
              </div>
            </div>

            {/* 优化建议 */}
            {testResults.recommendations.length > 0 && (
              <div className="mt-6">
                <h3 className="text-md font-semibold text-gray-900 dark:text-white mb-3">
                  优化建议
                </h3>
                <ul className="space-y-2">
                  {testResults.recommendations.map((recommendation, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {recommendation}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </BaseTestPage>
  );
};

export default APIAnalysis;
