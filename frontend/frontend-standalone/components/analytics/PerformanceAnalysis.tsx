/**
 * PerformanceAnalysis.tsx - React组件
 * 
 * 文件路径: frontend\components\analytics\PerformanceAnalysis.tsx
 * 创建时间: 2025-09-25
 */

import { useState, useEffect } from 'react';
import { Clock, TrendingUp, TrendingDown, Activity, Zap, AlertCircle, BarChart3 } from 'lucide-react';

interface PerformanceMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  trendValue: number;
  threshold: {
    good: number;
    warning: number;
    critical: number;
  };
  category: 'response_time' | 'throughput' | 'error_rate' | 'resource_usage';
  timestamp: string;
}

interface PerformanceData {
  metrics: PerformanceMetric[];
  summary: {
    overallScore: number;
    totalRequests: number;
    avgResponseTime: number;
    errorRate: number;
    uptime: number;
  };
  trends: Array<{
    timestamp: string;
    responseTime: number;
    throughput: number;
    errorRate: number;
  }>;
}

const PerformanceAnalysis = () => {
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'response_time' | 'throughput' | 'error_rate' | 'resource_usage'>('all');
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const mockMetrics: PerformanceMetric[] = [
          {
            id: '1',
            name: 'Average Response Time',
            value: 245,
            unit: 'ms',
            trend: 'down',
            trendValue: -12.5,
            threshold: { good: 200, warning: 500, critical: 1000 },
            category: 'response_time',
            timestamp: '2024-01-15T10:30:00Z'
          },
          {
            id: '2',
            name: 'Requests per Second',
            value: 1250,
            unit: 'req/s',
            trend: 'up',
            trendValue: 8.3,
            threshold: { good: 1000, warning: 500, critical: 100 },
            category: 'throughput',
            timestamp: '2024-01-15T10:30:00Z'
          },
          {
            id: '3',
            name: 'Error Rate',
            value: 2.1,
            unit: '%',
            trend: 'stable',
            trendValue: 0.1,
            threshold: { good: 1, warning: 5, critical: 10 },
            category: 'error_rate',
            timestamp: '2024-01-15T10:30:00Z'
          },
          {
            id: '4',
            name: 'CPU Usage',
            value: 68.5,
            unit: '%',
            trend: 'up',
            trendValue: 5.2,
            threshold: { good: 70, warning: 85, critical: 95 },
            category: 'resource_usage',
            timestamp: '2024-01-15T10:30:00Z'
          },
          {
            id: '5',
            name: 'Memory Usage',
            value: 72.3,
            unit: '%',
            trend: 'down',
            trendValue: -3.1,
            threshold: { good: 75, warning: 85, critical: 95 },
            category: 'resource_usage',
            timestamp: '2024-01-15T10:30:00Z'
          }
        ];

        const mockData: PerformanceData = {
          metrics: mockMetrics,
          summary: {
            overallScore: 82.5,
            totalRequests: 45678,
            avgResponseTime: 245,
            errorRate: 2.1,
            uptime: 99.8
          },
          trends: [
            { timestamp: '2024-01-15T06:00:00Z', responseTime: 280, throughput: 1100, errorRate: 2.5 },
            { timestamp: '2024-01-15T07:00:00Z', responseTime: 265, throughput: 1180, errorRate: 2.3 },
            { timestamp: '2024-01-15T08:00:00Z', responseTime: 250, throughput: 1220, errorRate: 2.1 },
            { timestamp: '2024-01-15T09:00:00Z', responseTime: 245, throughput: 1250, errorRate: 2.0 },
            { timestamp: '2024-01-15T10:00:00Z', responseTime: 240, throughput: 1280, errorRate: 1.9 }
          ]
        };
        
        setData(mockData);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch performance data:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, [timeRange]);

  const filteredMetrics = data?.metrics.filter(metric => 
    selectedCategory === 'all' || metric.category === selectedCategory
  ) || [];

  const getMetricStatus = (metric: PerformanceMetric): 'good' | 'warning' | 'critical' => {
    
    /**
    
     * if功能函数
    
     * @param {Object} params - 参数对象
    
     * @returns {Promise<Object>} 返回结果
    
     */
    const { value, threshold, category } = metric;
    
    if (category === 'error_rate') {
      if (value <= threshold.good) return 'good';
      if (value <= threshold.warning) return 'warning';
      return 'critical';
    } else if (category === 'throughput') {
      if (value >= threshold.good) return 'good';
      if (value >= threshold.warning) return 'warning';
      return 'critical';
    } else {
      if (value <= threshold.good) return 'good';
      if (value <= threshold.warning) return 'warning';
      return 'critical';
    }
  };

    /**
     * switch功能函数
     * @param {Object} params - 参数对象
     * @returns {Promise<Object>} 返回结果
     */
  const getStatusColor = (status: 'good' | 'warning' | 'critical'): string => {
    switch (status) {
      case 'good': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

    /**
     * switch功能函数
     * @param {Object} params - 参数对象
     * @returns {Promise<Object>} 返回结果
     */
  const getStatusBgColor = (status: 'good' | 'warning' | 'critical'): string => {
    switch (status) {
      case 'good': return 'bg-green-100';
      case 'warning': return 'bg-yellow-100';
      case 'critical': return 'bg-red-100';
      default: return 'bg-gray-100';
    }
  };

    /**
     * switch功能函数
     * @param {Object} params - 参数对象
     * @returns {Promise<Object>} 返回结果
     */
  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return TrendingUp;
      case 'down': return TrendingDown;
      case 'stable': return Activity;
      default: return Activity;
    }
  };

  const getTrendColor = (trend: 'up' | 'down' | 'stable', category: string): string => {
    
    /**
    
     * if功能函数
    
     * @param {Object} params - 参数对象
    
     * @returns {Promise<Object>} 返回结果
    
     */
    if (trend === 'stable') return 'text-gray-500';
    
    if (category === 'error_rate' || category === 'response_time' || category === 'resource_usage') {
      return trend === 'down' ? 'text-green-500' : 'text-red-500';
    } else {
      return trend === 'up' ? 'text-green-500' : 'text-red-500';
    }
  };

    /**
     * switch功能函数
     * @param {Object} params - 参数对象
     * @returns {Promise<Object>} 返回结果
     */
  const getCategoryLabel = (category: string): string => {
    switch (category) {
      case 'response_time': return 'Response Time';
      case 'throughput': return 'Throughput';
      case 'error_rate': return 'Error Rate';
      case 'resource_usage': return 'Resource Usage';
      default: return category;
    }
  };

  const getOverallScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Failed to load performance data</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Performance Analysis</h2>
        <div className="flex items-center space-x-4">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as typeof timeRange)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Overall Score</p>
              <p className={`text-2xl font-bold ${getOverallScoreColor(data.summary.overallScore)}`}>
                {data.summary.overallScore.toFixed(1)}
              </p>
            </div>
            <Zap className="w-8 h-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Requests</p>
              <p className="text-2xl font-bold text-gray-900">{data.summary.totalRequests.toLocaleString()}</p>
            </div>
            <Activity className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Response Time</p>
              <p className="text-2xl font-bold text-yellow-600">{data.summary.avgResponseTime}ms</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Error Rate</p>
              <p className="text-2xl font-bold text-red-600">{data.summary.errorRate}%</p>
            </div>
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Uptime</p>
              <p className="text-2xl font-bold text-green-600">{data.summary.uptime}%</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-500" />
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-4">
          <label htmlFor="category-filter" className="text-sm font-medium text-gray-700">
            Filter by Category:
          </label>
          <select
            id="category-filter"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as typeof selectedCategory)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Categories</option>
            <option value="response_time">Response Time</option>
            <option value="throughput">Throughput</option>
            <option value="error_rate">Error Rate</option>
            <option value="resource_usage">Resource Usage</option>
          </select>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMetrics.map((metric) => {
          const status = getMetricStatus(metric);
          const TrendIcon = getTrendIcon(metric.trend);
          
          return (
            <div key={metric.id} className={`bg-white rounded-lg shadow p-6 border-l-4 ${
              status === 'good' ? 'border-green-500' :
              status === 'warning' ? 'border-yellow-500' : 'border-red-500'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">{metric.name}</h3>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBgColor(status)} ${getStatusColor(status)}`}>
                  {status.toUpperCase()}
                </span>
              </div>
              
              <div className="flex items-center justify-between mb-2">
                <span className={`text-3xl font-bold ${getStatusColor(status)}`}>
                  {metric.value.toLocaleString()}{metric.unit}
                </span>
                <div className="flex items-center space-x-1">
                  <TrendIcon className={`w-4 h-4 ${getTrendColor(metric.trend, metric.category)}`} />
                  <span className={`text-sm font-medium ${getTrendColor(metric.trend, metric.category)}`}>
                    {metric.trendValue > 0 ? '+' : ''}{metric.trendValue.toFixed(1)}%
                  </span>
                </div>
              </div>
              
              <div className="text-sm text-gray-500">
                <span className="font-medium">{getCategoryLabel(metric.category)}</span>
                <span className="mx-2">•</span>
                <span>Updated {new Date(metric.timestamp).toLocaleTimeString()}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Trends Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Trends</h3>
        <div className="h-64 flex items-end justify-between space-x-2">
          {data.trends.map((trend, index) => {
            const maxResponseTime = Math.max(...data.trends.map(t => t.responseTime));
            const height = (trend.responseTime / maxResponseTime) * 200;
            
            return (
              <div key={index} className="flex flex-col items-center flex-1">
                <div
                  className="w-full bg-blue-500 rounded-t"
                  style={{ height: `${height}px` }}
                  title={`${new Date(trend.timestamp).toLocaleTimeString()}: ${trend.responseTime}ms`}
                ></div>
                <span className="text-xs text-gray-500 mt-2">
                  {new Date(trend.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PerformanceAnalysis;
