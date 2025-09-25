/**
 * APIAnalysis.tsx - React组件
 * 
 * 文件路径: frontend\components\analysis\APIAnalysis.tsx
 * 创建时间: 2025-09-25
 */

import React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { 
  Globe, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Zap, 
  Database,
  RefreshCw,
  BarChart3,
  Target,
  Server
} from 'lucide-react';

interface APIEndpoint {
  id: string;
  name: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  status: 'healthy' | 'warning' | 'error';
  responseTime: number;
  successRate: number;
  errorRate: number;
  lastChecked: string;
  requestCount: number;
}

interface APIMetrics {
  totalEndpoints: number;
  healthyEndpoints: number;
  averageResponseTime: number;
  totalRequests: number;
  successRate: number;
  errorRate: number;
}

const APIAnalysis: React.FC = () => {
  const [endpoints, setEndpoints] = useState<APIEndpoint[]>([]);
  const [metrics, setMetrics] = useState<APIMetrics>({
    totalEndpoints: 0,
    healthyEndpoints: 0,
    averageResponseTime: 0,
    totalRequests: 0,
    successRate: 0,
    errorRate: 0
  });
  const [loading, setLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const loadAPIData = useCallback(async () => {
    setLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const mockEndpoints: APIEndpoint[] = [
      {
        id: '1',
        name: 'User Authentication',
        url: '/api/auth/login',
        method: 'POST',
        status: 'healthy',
        responseTime: 120,
        successRate: 99.5,
        errorRate: 0.5,
        lastChecked: new Date().toISOString(),
        requestCount: 15420
      },
      {
        id: '2',
        name: 'Get User Profile',
        url: '/api/users/profile',
        method: 'GET',
        status: 'healthy',
        responseTime: 85,
        successRate: 98.8,
        errorRate: 1.2,
        lastChecked: new Date().toISOString(),
        requestCount: 8930
      },
      {
        id: '3',
        name: 'Create Test',
        url: '/api/tests',
        method: 'POST',
        status: 'warning',
        responseTime: 350,
        successRate: 95.2,
        errorRate: 4.8,
        lastChecked: new Date().toISOString(),
        requestCount: 2340
      },
      {
        id: '4',
        name: 'Get Test Results',
        url: '/api/tests/results',
        method: 'GET',
        status: 'error',
        responseTime: 1200,
        successRate: 87.3,
        errorRate: 12.7,
        lastChecked: new Date().toISOString(),
        requestCount: 5670
      },
      {
        id: '5',
        name: 'Update Settings',
        url: '/api/settings',
        method: 'PUT',
        status: 'healthy',
        responseTime: 95,
        successRate: 99.1,
        errorRate: 0.9,
        lastChecked: new Date().toISOString(),
        requestCount: 1230
      }
    ];

    setEndpoints(mockEndpoints);
    
    // Calculate metrics
    const totalEndpoints = mockEndpoints.length;
    const healthyEndpoints = mockEndpoints.filter(ep => ep.status === 'healthy').length;
    const averageResponseTime = mockEndpoints.reduce((sum, ep) => sum + ep.responseTime, 0) / totalEndpoints;
    const totalRequests = mockEndpoints.reduce((sum, ep) => sum + ep.requestCount, 0);
    const weightedSuccessRate = mockEndpoints.reduce((sum, ep) => sum + (ep.successRate * ep.requestCount), 0) / totalRequests;
    const weightedErrorRate = mockEndpoints.reduce((sum, ep) => sum + (ep.errorRate * ep.requestCount), 0) / totalRequests;

    setMetrics({
      totalEndpoints,
      healthyEndpoints,
      averageResponseTime,
      totalRequests,
      successRate: weightedSuccessRate,
      errorRate: weightedErrorRate
    });

    setLoading(false);
  }, []);

  useEffect(() => {
    loadAPIData();
  }, [loadAPIData]);

  const runAnalysis = useCallback(async () => {
    setIsAnalyzing(true);
    
    // Simulate analysis
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Update endpoints with new data
    setEndpoints(prev => prev.map(endpoint => ({
      ...endpoint,
      responseTime: Math.floor(Math.random() * 500) + 50,
      successRate: Math.random() * 10 + 90,
      errorRate: Math.random() * 10,
      lastChecked: new Date().toISOString(),
      status: Math.random() > 0.8 ? 'warning' : Math.random() > 0.9 ? 'error' : 'healthy'
    })));
    
    setIsAnalyzing(false);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-100 border-green-200';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'error':
        return 'text-red-600 bg-red-100 border-red-200';
      default:
        return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET':
        return 'text-blue-600 bg-blue-100';
      case 'POST':
        return 'text-green-600 bg-green-100';
      case 'PUT':
        return 'text-yellow-600 bg-yellow-100';
      case 'DELETE':
        return 'text-red-600 bg-red-100';
      case 'PATCH':
        return 'text-purple-600 bg-purple-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  const formatPercentage = (num: number) => {
    return `${num.toFixed(1)}%`;
  };

  const formatTime = (ms: number) => {
    return `${ms}ms`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Globe className="w-6 h-6 text-blue-600" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900">API Analysis</h2>
            <p className="text-sm text-gray-600">Monitor API endpoint performance and health</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => loadAPIData()}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
          <button
            onClick={runAnalysis}
            disabled={isAnalyzing}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400"
          >
            <Target className="w-4 h-4" />
            <span>{isAnalyzing ? 'Analyzing...' : 'Run Analysis'}</span>
          </button>
        </div>
      </div>

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Server className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-gray-600">Total Endpoints</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{metrics.totalEndpoints}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center space-x-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-gray-600">Healthy</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{metrics.healthyEndpoints}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Clock className="w-5 h-5 text-purple-600" />
            <span className="text-sm font-medium text-gray-600">Avg Response</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatTime(Math.round(metrics.averageResponseTime))}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Activity className="w-5 h-5 text-orange-600" />
            <span className="text-sm font-medium text-gray-600">Total Requests</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatNumber(metrics.totalRequests)}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center space-x-2 mb-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-gray-600">Success Rate</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatPercentage(metrics.successRate)}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center space-x-2 mb-2">
            <TrendingDown className="w-5 h-5 text-red-600" />
            <span className="text-sm font-medium text-gray-600">Error Rate</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatPercentage(metrics.errorRate)}</p>
        </div>
      </div>

      {/* Endpoints List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">API Endpoints</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {endpoints.map((endpoint) => (
            <div key={endpoint.id} className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <span className={`px-2 py-1 text-xs font-medium rounded ${getMethodColor(endpoint.method)}`}>
                    {endpoint.method}
                  </span>
                  <div>
                    <h4 className="font-medium text-gray-900">{endpoint.name}</h4>
                    <p className="text-sm text-gray-600">{endpoint.url}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-3 py-1 rounded-full border ${getStatusColor(endpoint.status)}`}>
                    <div className="flex items-center space-x-1">
                      {getStatusIcon(endpoint.status)}
                      <span className="text-sm font-medium capitalize">{endpoint.status}</span>
                    </div>
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div>
                  <span className="text-sm text-gray-600">Response Time:</span>
                  <div className="font-medium text-gray-900">{formatTime(endpoint.responseTime)}</div>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Success Rate:</span>
                  <div className="font-medium text-green-600">{formatPercentage(endpoint.successRate)}</div>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Error Rate:</span>
                  <div className="font-medium text-red-600">{formatPercentage(endpoint.errorRate)}</div>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Requests:</span>
                  <div className="font-medium text-gray-900">{formatNumber(endpoint.requestCount)}</div>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Last Checked:</span>
                  <div className="font-medium text-gray-900">
                    {new Date(endpoint.lastChecked).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Performance Chart Placeholder */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-2 mb-6">
          <BarChart3 className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-medium text-gray-900">API Performance Trends</h3>
        </div>
        
        <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
          <div className="text-center">
            <Activity className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500">API performance chart would be rendered here</p>
            <p className="text-sm text-gray-400">Showing response times and success rates over time</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default APIAnalysis;
