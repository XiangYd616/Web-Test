import React from 'react';
import { CheckCircle, XCircle, AlertTriangle, Clock, Zap, Shield } from 'lucide-react';

interface APITestResult {
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  responseSize: number;
  success: boolean;
  headers: Record<string, string>;
  body?: any;
  error?: string;
  timestamp: number;
}

interface APIAnalysis {
  overallScore: number;
  performanceScore: number;
  reliabilityScore: number;
  securityScore: number;
  issues: Array<{
    type: 'error' | 'warning' | 'info';
    category: 'performance' | 'security' | 'reliability' | 'format';
    message: string;
    severity: 'high' | 'medium' | 'low';
  }>;
  recommendations: Array<{
    category: 'performance' | 'security' | 'reliability' | 'format';
    message: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  metrics: {
    averageResponseTime: number;
    successRate: number;
    errorRate: number;
    totalRequests: number;
    dataTransferred: number;
  };
}

interface EnhancedAPIAnalysisProps {
  results: APITestResult[];
  analysis: APIAnalysis;
}

export const EnhancedAPIAnalysis: React.FC<EnhancedAPIAnalysisProps> = ({ results, analysis }) => {
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-50';
    if (score >= 70) return 'text-yellow-600 bg-yellow-50';
    if (score >= 50) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  const getStatusColor = (statusCode: number) => {
    if (statusCode >= 200 && statusCode < 300) return 'text-green-600 bg-green-50';
    if (statusCode >= 300 && statusCode < 400) return 'text-blue-600 bg-blue-50';
    if (statusCode >= 400 && statusCode < 500) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  const getIssueIcon = (type: string) => {
    switch (type) {
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'info': return <CheckCircle className="w-4 h-4 text-blue-500" />;
      default: return <CheckCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* 总体评分 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="text-center">
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full text-2xl font-bold ${getScoreColor(analysis.overallScore)}`}>
            {analysis.overallScore}
          </div>
          <div className="mt-2 text-sm font-medium text-gray-900">总体评分</div>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            <Zap className="w-5 h-5 text-blue-500 mr-1" />
            <span className="text-2xl font-bold text-gray-900">{analysis.performanceScore}</span>
          </div>
          <div className="text-sm text-gray-600">性能表现</div>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            <Shield className="w-5 h-5 text-green-500 mr-1" />
            <span className="text-2xl font-bold text-gray-900">{analysis.reliabilityScore}</span>
          </div>
          <div className="text-sm text-gray-600">可靠性</div>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            <Shield className="w-5 h-5 text-purple-500 mr-1" />
            <span className="text-2xl font-bold text-gray-900">{analysis.securityScore}</span>
          </div>
          <div className="text-sm text-gray-600">安全性</div>
        </div>
      </div>

      {/* 关键指标 */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">关键指标</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-lg font-bold text-gray-900">{analysis.metrics.averageResponseTime}ms</div>
            <div className="text-xs text-gray-600">平均响应时间</div>
          </div>

          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-lg font-bold text-gray-900">{analysis.metrics.successRate.toFixed(1)}%</div>
            <div className="text-xs text-gray-600">成功率</div>
          </div>

          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-lg font-bold text-gray-900">{analysis.metrics.totalRequests}</div>
            <div className="text-xs text-gray-600">总请求数</div>
          </div>

          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-lg font-bold text-gray-900">{formatBytes(analysis.metrics.dataTransferred)}</div>
            <div className="text-xs text-gray-600">数据传输</div>
          </div>

          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-lg font-bold text-gray-900">{analysis.metrics.errorRate.toFixed(1)}%</div>
            <div className="text-xs text-gray-600">错误率</div>
          </div>
        </div>
      </div>

      {/* 请求详情 */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">请求详情</h4>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">端点</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">方法</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态码</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">响应时间</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">大小</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {results.map((result, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {result.endpoint}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      {result.method}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(result.statusCode)}`}>
                      {result.statusCode}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 text-gray-400 mr-1" />
                      {result.responseTime}ms
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatBytes(result.responseSize)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {result.success ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 问题列表 */}
      {analysis.issues.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">发现的问题</h4>
          <div className="space-y-3">
            {analysis.issues.map((issue, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                {getIssueIcon(issue.type)}
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-900">{issue.message}</span>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                      issue.severity === 'high' ? 'bg-red-100 text-red-800' :
                      issue.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {issue.severity === 'high' ? '高' : issue.severity === 'medium' ? '中' : '低'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    分类: {issue.category}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 优化建议 */}
      {analysis.recommendations.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">优化建议</h4>
          <div className="space-y-3">
            {analysis.recommendations.map((recommendation, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <CheckCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-blue-900">{recommendation.message}</span>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                      recommendation.priority === 'high' ? 'bg-red-100 text-red-800' :
                      recommendation.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {recommendation.priority === 'high' ? '高优先级' :
                       recommendation.priority === 'medium' ? '中优先级' : '低优先级'}
                    </span>
                  </div>
                  <div className="text-xs text-blue-700 mt-1">
                    分类: {recommendation.category}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
