/**
 * API测试结果分析组件
 * 提供详细的API测试结果分析和可视化
 */

import React, { useState, useMemo } from 'react';
import {
  Globe,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  AlertTriangle,
  Shield,
  FileText,
  BarChart3,
  TrendingUp,
  Activity,
  Download,
  Eye,
  Code
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface APITestEndpointResult {
  id: string;
  name: string;
  method: string;
  path: string;
  url: string;
  success: boolean;
  statusCode: number;
  responseTime: number;
  responseSize: number;
  error?: string;
  response?: any;
  headers?: Record<string, string>;
  
  // 性能指标
  performance: {
    dns: number;
    connect: number;
    firstByte: number;
    download: number;
    total: number;
  };
  
  // 安全检查
  security: {
    https: boolean;
    headers: {
      contentType: boolean;
      cacheControl: boolean;
      xFrameOptions: boolean;
      xContentTypeOptions: boolean;
      strictTransportSecurity: boolean;
    };
  };
  
  // 验证结果
  validations: {
    statusCode: boolean;
    responseTime: boolean;
    contentType: boolean;
    schema: boolean;
  };
}

interface APITestResult {
  testId: string;
  baseUrl: string;
  startTime: string;
  endTime: string;
  duration: number;
  
  // 总体统计
  summary: {
    totalEndpoints: number;
    successfulEndpoints: number;
    failedEndpoints: number;
    averageResponseTime: number;
    totalResponseTime: number;
    successRate: number;
  };
  
  // 端点结果
  endpoints: APITestEndpointResult[];
  
  // 性能分析
  performance: {
    fastest: APITestEndpointResult;
    slowest: APITestEndpointResult;
    averageResponseTime: number;
    totalDataTransferred: number;
  };
  
  // 安全分析
  security: {
    httpsUsage: number;
    securityHeaders: number;
    vulnerabilities: string[];
  };
  
  // 可靠性分析
  reliability: {
    uptime: number;
    errorRate: number;
    timeouts: number;
  };
}

interface APITestResultAnalysisProps {
  result: APITestResult;
  onExport?: (format: 'pdf' | 'csv' | 'json') => void;
  onViewResponse?: (endpoint: APITestEndpointResult) => void;
  className?: string;
}

const APITestResultAnalysis: React.FC<APITestResultAnalysisProps> = ({
  result,
  onExport,
  onViewResponse,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'endpoints' | 'performance' | 'security'>('overview');
  const [selectedEndpoint, setSelectedEndpoint] = useState<string | null>(null);

  // 准备图表数据
  const responseTimeData = useMemo(() => {
    return result.endpoints.map((endpoint, index) => ({
      name: endpoint.name,
      responseTime: endpoint.responseTime,
      success: endpoint.success,
      method: endpoint.method
    }));
  }, [result.endpoints]);

  // 状态码分布
  const statusCodeDistribution = useMemo(() => {
    const distribution: Record<string, number> = {};
    result.endpoints.forEach(endpoint => {
      const statusRange = `${Math.floor(endpoint.statusCode / 100)}xx`;
      distribution[statusRange] = (distribution[statusRange] || 0) + 1;
    });
    
    return Object.entries(distribution).map(([range, count]) => ({
      name: range,
      value: count,
      color: range === '2xx' ? '#10b981' : range === '3xx' ? '#3b82f6' : 
             range === '4xx' ? '#f59e0b' : range === '5xx' ? '#ef4444' : '#6b7280'
    }));
  }, [result.endpoints]);

  // 方法分布
  const methodDistribution = useMemo(() => {
    const distribution: Record<string, number> = {};
    result.endpoints.forEach(endpoint => {
      distribution[endpoint.method] = (distribution[endpoint.method] || 0) + 1;
    });
    
    return Object.entries(distribution).map(([method, count]) => ({
      name: method,
      value: count,
      color: method === 'GET' ? '#10b981' : method === 'POST' ? '#3b82f6' :
             method === 'PUT' ? '#f59e0b' : method === 'DELETE' ? '#ef4444' : '#6b7280'
    }));
  }, [result.endpoints]);

  // 获取状态颜色
  const getStatusColor = (success: boolean) => {
    return success ? 'text-green-600' : 'text-red-600';
  };

  // 获取响应时间颜色
  const getResponseTimeColor = (responseTime: number) => {
    if (responseTime < 200) return 'text-green-600';
    if (responseTime < 1000) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* 标题栏 */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">API测试结果</h3>
            <p className="text-sm text-gray-600 mt-1">
              {result.baseUrl} - {new Date(result.startTime).toLocaleString()}
            </p>
          </div>
          
          {/* 总体状态 */}
          <div className="flex items-center space-x-4">
            <div className="text-center">
              <div className={`text-2xl font-bold ${getStatusColor(result.summary.successRate > 0.9)}`}>
                {(result.summary.successRate * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-gray-600">成功率</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {result.summary.averageResponseTime.toFixed(0)}ms
              </div>
              <div className="text-xs text-gray-600">平均响应时间</div>
            </div>
          </div>
        </div>
      </div>

      {/* 标签页导航 */}
      <div className="flex border-b border-gray-200">
        {[
          { key: 'overview', label: '概览', icon: <BarChart3 className="w-4 h-4" /> },
          { key: 'endpoints', label: '端点详情', icon: <Globe className="w-4 h-4" /> },
          { key: 'performance', label: '性能分析', icon: <TrendingUp className="w-4 h-4" /> },
          { key: 'security', label: '安全检查', icon: <Shield className="w-4 h-4" /> }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex items-center space-x-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="p-6">
        {/* 概览标签页 */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* 统计卡片 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Globe className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">总端点数</span>
                </div>
                <div className="text-2xl font-bold text-blue-900 mt-1">
                  {result.summary.totalEndpoints}
                </div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-green-900">成功</span>
                </div>
                <div className="text-2xl font-bold text-green-900 mt-1">
                  {result.summary.successfulEndpoints}
                </div>
              </div>

              <div className="bg-red-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2">
                  <XCircle className="w-5 h-5 text-red-600" />
                  <span className="text-sm font-medium text-red-900">失败</span>
                </div>
                <div className="text-2xl font-bold text-red-900 mt-1">
                  {result.summary.failedEndpoints}
                </div>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-purple-600" />
                  <span className="text-sm font-medium text-purple-900">总耗时</span>
                </div>
                <div className="text-2xl font-bold text-purple-900 mt-1">
                  {(result.duration / 1000).toFixed(1)}s
                </div>
              </div>
            </div>

            {/* 响应时间图表 */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">端点响应时间</h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={responseTimeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar 
                    dataKey="responseTime" 
                    fill="#3b82f6"
                    name="响应时间 (ms)"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* 状态码和方法分布 */}
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">状态码分布</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={statusCodeDistribution}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {statusCodeDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">HTTP方法分布</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={methodDistribution}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {methodDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* 端点详情标签页 */}
        {activeTab === 'endpoints' && (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      端点
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      状态
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      响应时间
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      状态码
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {result.endpoints.map((endpoint) => (
                    <tr key={endpoint.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className={`px-2 py-1 text-xs font-medium rounded mr-2 ${
                            endpoint.method === 'GET' ? 'bg-green-100 text-green-800' :
                            endpoint.method === 'POST' ? 'bg-blue-100 text-blue-800' :
                            endpoint.method === 'PUT' ? 'bg-yellow-100 text-yellow-800' :
                            endpoint.method === 'DELETE' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {endpoint.method}
                          </span>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{endpoint.name}</div>
                            <div className="text-sm text-gray-500">{endpoint.path}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {endpoint.success ? (
                            <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-500 mr-2" />
                          )}
                          <span className={`text-sm ${getStatusColor(endpoint.success)}`}>
                            {endpoint.success ? '成功' : '失败'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm font-medium ${getResponseTimeColor(endpoint.responseTime)}`}>
                          {endpoint.responseTime.toFixed(0)}ms
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded ${
                          endpoint.statusCode >= 200 && endpoint.statusCode < 300 ? 'bg-green-100 text-green-800' :
                          endpoint.statusCode >= 300 && endpoint.statusCode < 400 ? 'bg-blue-100 text-blue-800' :
                          endpoint.statusCode >= 400 && endpoint.statusCode < 500 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {endpoint.statusCode}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setSelectedEndpoint(endpoint.id)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {onViewResponse && (
                            <button
                              onClick={() => onViewResponse(endpoint)}
                              className="text-green-600 hover:text-green-900"
                            >
                              <Code className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 端点详细信息 */}
            {selectedEndpoint && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                {(() => {
                  const endpoint = result.endpoints.find(ep => ep.id === selectedEndpoint);
                  if (!endpoint) return null;

                  return (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h5 className="text-lg font-medium text-gray-900">端点详情</h5>
                        <button
                          onClick={() => setSelectedEndpoint(null)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          ×
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <h6 className="text-sm font-medium text-gray-700 mb-2">基本信息</h6>
                          <div className="space-y-1 text-sm">
                            <div><span className="font-medium">名称:</span> {endpoint.name}</div>
                            <div><span className="font-medium">URL:</span> {endpoint.url}</div>
                            <div><span className="font-medium">方法:</span> {endpoint.method}</div>
                            <div><span className="font-medium">状态码:</span> {endpoint.statusCode}</div>
                          </div>
                        </div>

                        <div>
                          <h6 className="text-sm font-medium text-gray-700 mb-2">性能指标</h6>
                          <div className="space-y-1 text-sm">
                            <div><span className="font-medium">DNS解析:</span> {endpoint.performance.dns}ms</div>
                            <div><span className="font-medium">连接时间:</span> {endpoint.performance.connect}ms</div>
                            <div><span className="font-medium">首字节时间:</span> {endpoint.performance.firstByte}ms</div>
                            <div><span className="font-medium">下载时间:</span> {endpoint.performance.download}ms</div>
                            <div><span className="font-medium">总时间:</span> {endpoint.performance.total}ms</div>
                          </div>
                        </div>
                      </div>

                      {endpoint.error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded">
                          <h6 className="text-sm font-medium text-red-800 mb-1">错误信息</h6>
                          <p className="text-sm text-red-700">{endpoint.error}</p>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* 性能分析标签页 */}
        {activeTab === 'performance' && (
          <div className="space-y-6">
            {/* 性能统计 */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Zap className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-green-900">最快端点</span>
                </div>
                <div className="text-lg font-bold text-green-900 mt-1">
                  {result.performance.fastest.name}
                </div>
                <div className="text-sm text-green-700">
                  {result.performance.fastest.responseTime.toFixed(0)}ms
                </div>
              </div>

              <div className="bg-red-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-red-600" />
                  <span className="text-sm font-medium text-red-900">最慢端点</span>
                </div>
                <div className="text-lg font-bold text-red-900 mt-1">
                  {result.performance.slowest.name}
                </div>
                <div className="text-sm text-red-700">
                  {result.performance.slowest.responseTime.toFixed(0)}ms
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Activity className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">数据传输</span>
                </div>
                <div className="text-lg font-bold text-blue-900 mt-1">
                  {(result.performance.totalDataTransferred / 1024).toFixed(1)}KB
                </div>
                <div className="text-sm text-blue-700">总计</div>
              </div>
            </div>

            {/* 性能分布图 */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">响应时间分布</h4>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={responseTimeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="responseTime" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    name="响应时间 (ms)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* 安全检查标签页 */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            {/* 安全统计 */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Shield className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-green-900">HTTPS使用率</span>
                </div>
                <div className="text-2xl font-bold text-green-900 mt-1">
                  {(result.security.httpsUsage * 100).toFixed(1)}%
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">安全头</span>
                </div>
                <div className="text-2xl font-bold text-blue-900 mt-1">
                  {(result.security.securityHeaders * 100).toFixed(1)}%
                </div>
              </div>

              <div className="bg-red-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <span className="text-sm font-medium text-red-900">漏洞</span>
                </div>
                <div className="text-2xl font-bold text-red-900 mt-1">
                  {result.security.vulnerabilities.length}
                </div>
              </div>
            </div>

            {/* 安全问题列表 */}
            {result.security.vulnerabilities.length > 0 && (
              <div className="bg-red-50 p-4 rounded-lg">
                <h4 className="text-lg font-semibold text-red-900 mb-3">发现的安全问题</h4>
                <ul className="space-y-2">
                  {result.security.vulnerabilities.map((vulnerability, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                      <span className="text-red-800">{vulnerability}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 导出按钮 */}
      {onExport && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">导出测试报告</span>
            <div className="flex space-x-2">
              <button
                onClick={() => onExport('pdf')}
                className="flex items-center space-x-1 px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
              >
                <Download className="w-4 h-4" />
                <span>PDF</span>
              </button>
              <button
                onClick={() => onExport('csv')}
                className="flex items-center space-x-1 px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
              >
                <Download className="w-4 h-4" />
                <span>CSV</span>
              </button>
              <button
                onClick={() => onExport('json')}
                className="flex items-center space-x-1 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                <Download className="w-4 h-4" />
                <span>JSON</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default APITestResultAnalysis;
