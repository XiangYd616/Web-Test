/**
 * UnifiedPerformanceAnalysis.tsx - Unified Performance Analysis Component
 * 
 * This component combines features from both analytics/PerformanceAnalysis.tsx and 
 * analysis/PerformanceAnalysis.tsx to provide comprehensive performance monitoring.
 * 
 * Features:
 * - Real-time performance metrics with status indicators
 * - Summary dashboard with key statistics  
 * - Recent test results with detailed information
 * - Performance trends visualization
 * - Interactive analysis controls
 * - Category-based filtering
 * - Refresh and run analysis capabilities
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock, TrendingUp, TrendingDown, Activity, Zap, AlertCircle,
  AlertTriangle, CheckCircle, BarChart3, RefreshCw, Target, 
  Cpu, HardDrive, Users, Database
} from 'lucide-react';

interface PerformanceMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  threshold: {
    good: number;
    warning: number;
    critical: number;
  };
  status: 'good' | 'warning' | 'critical';
  trend: 'up' | 'down' | 'stable';
  trendValue: number; // percentage change
  category: 'response_time' | 'throughput' | 'error_rate' | 'resource_usage';
  timestamp: string;
}

interface TestResult {
  id: string;
  name: string;
  timestamp: string;
  duration: number;
  responseTime: number;
  throughput: number;
  errorRate: number;
  status: 'passed' | 'failed' | 'warning';
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
  testResults: TestResult[];
}

interface UnifiedPerformanceAnalysisProps {
  className?: string;
  showTestResults?: boolean;
  showTrends?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

const UnifiedPerformanceAnalysis: React.FC<UnifiedPerformanceAnalysisProps> = ({
  className = '',
  showTestResults = true,
  showTrends = true,
  autoRefresh = false,
  refreshInterval = 30000
}) => {
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'response_time' | 'throughput' | 'error_rate' | 'resource_usage'>('all');
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');

  const loadPerformanceData = useCallback(async () => {
    setLoading(true);
    
    try {
      // Simulate API call - replace with actual API endpoint
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockMetrics: PerformanceMetric[] = [
        {
          id: 'response-time',
          name: 'Average Response Time',
          value: 245,
          unit: 'ms',
          threshold: { good: 200, warning: 500, critical: 1000 },
          status: 'warning',
          trend: 'down',
          trendValue: -12.5,
          category: 'response_time',
          timestamp: new Date().toISOString()
        },
        {
          id: 'throughput',
          name: 'Requests per Second',
          value: 1250,
          unit: 'req/s',
          threshold: { good: 1000, warning: 500, critical: 100 },
          status: 'good',
          trend: 'up',
          trendValue: 8.3,
          category: 'throughput',
          timestamp: new Date().toISOString()
        },
        {
          id: 'error-rate',
          name: 'Error Rate',
          value: 2.1,
          unit: '%',
          threshold: { good: 1, warning: 5, critical: 10 },
          status: 'warning',
          trend: 'stable',
          trendValue: 0.1,
          category: 'error_rate',
          timestamp: new Date().toISOString()
        },
        {
          id: 'cpu-usage',
          name: 'CPU Usage',
          value: 68.5,
          unit: '%',
          threshold: { good: 70, warning: 85, critical: 95 },
          status: 'good',
          trend: 'up',
          trendValue: 5.2,
          category: 'resource_usage',
          timestamp: new Date().toISOString()
        },
        {
          id: 'memory-usage',
          name: 'Memory Usage',
          value: 72.3,
          unit: '%',
          threshold: { good: 75, warning: 85, critical: 95 },
          status: 'good',
          trend: 'down',
          trendValue: -3.1,
          category: 'resource_usage',
          timestamp: new Date().toISOString()
        },
        {
          id: 'active-connections',
          name: 'Active Connections',
          value: 1847,
          unit: 'conn',
          threshold: { good: 2000, warning: 1500, critical: 1000 },
          status: 'good',
          trend: 'up',
          trendValue: 5.7,
          category: 'resource_usage',
          timestamp: new Date().toISOString()
        }
      ];

      const mockTestResults: TestResult[] = [
        {
          id: '1',
          name: 'Load Test - API Endpoints',
          timestamp: '2024-01-20T14:30:00Z',
          duration: 1800,
          responseTime: 235,
          throughput: 1280,
          errorRate: 1.8,
          status: 'passed'
        },
        {
          id: '2',
          name: 'Stress Test - Database',
          timestamp: '2024-01-20T12:15:00Z',
          duration: 3600,
          responseTime: 450,
          throughput: 890,
          errorRate: 4.2,
          status: 'warning'
        },
        {
          id: '3',
          name: 'Performance Test - Frontend',
          timestamp: '2024-01-20T10:00:00Z',
          duration: 2400,
          responseTime: 180,
          throughput: 1450,
          errorRate: 0.9,
          status: 'passed'
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
        ],
        testResults: mockTestResults
      };
      
      setData(mockData);
    } catch (error) {
      console.error('Failed to fetch performance data:', error);
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  const runAnalysis = useCallback(async () => {
    setIsAnalyzing(true);
    
    try {
      // Simulate analysis
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Update metrics with new data
      if (data) {
        const updatedMetrics = data.metrics.map(metric => ({
          ...metric,
          value: metric.value + (Math.random() - 0.5) * metric.value * 0.1,
          trendValue: (Math.random() - 0.5) * 20,
          trend: Math.random() > 0.5 ? 'up' : Math.random() > 0.5 ? 'down' : 'stable' as any,
          status: Math.random() > 0.8 ? 'warning' : Math.random() > 0.9 ? 'critical' : 'good' as any,
          timestamp: new Date().toISOString()
        }));
        
        setData(prev => prev ? { ...prev, metrics: updatedMetrics } : null);
      }
    } finally {
      setIsAnalyzing(false);
    }
  }, [data]);

  useEffect(() => {
    loadPerformanceData();
  }, [loadPerformanceData]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(loadPerformanceData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, loadPerformanceData]);

  const filteredMetrics = data?.metrics.filter(metric => 
    selectedCategory === 'all' || metric.category === selectedCategory
  ) || [];

  const getStatusColor = (status: 'good' | 'warning' | 'critical' | 'passed' | 'failed'): string => {
    switch (status) {
      case 'good':
      case 'passed':
        return 'text-green-600 bg-green-100 border-green-200';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'critical':
      case 'failed':
        return 'text-red-600 bg-red-100 border-red-200';
      default:
        return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'good':
      case 'passed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'critical':
      case 'failed':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return TrendingUp;
      case 'down':
        return TrendingDown;
      case 'stable':
      default:
        return Activity;
    }
  };

  const getTrendColor = (trend: 'up' | 'down' | 'stable', category: string): string => {
    if (trend === 'stable') return 'text-gray-500';
    
    if (category === 'error_rate' || category === 'response_time') {
      return trend === 'down' ? 'text-green-500' : 'text-red-500';
    } else {
      return trend === 'up' ? 'text-green-500' : 'text-red-500';
    }
  };

  const getMetricIcon = (id: string) => {
    switch (id) {
      case 'response-time':
        return <Clock className="w-5 h-5 text-blue-600" />;
      case 'throughput':
        return <Zap className="w-5 h-5 text-green-600" />;
      case 'error-rate':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'cpu-usage':
        return <Cpu className="w-5 h-5 text-purple-600" />;
      case 'memory-usage':
        return <HardDrive className="w-5 h-5 text-orange-600" />;
      case 'active-connections':
        return <Users className="w-5 h-5 text-indigo-600" />;
      default:
        return <Activity className="w-5 h-5 text-gray-600" />;
    }
  };

  const formatValue = (value: number, unit: string) => {
    if (unit === '%') {
      return `${value.toFixed(1)}${unit}`;
    }
    if (unit === 'ms') {
      return `${Math.round(value)}${unit}`;
    }
    if (unit === 'req/s' || unit === 'conn') {
      return `${Math.round(value)} ${unit}`;
    }
    return `${value.toFixed(1)} ${unit}`;
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
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
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Activity className="w-6 h-6 text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Performance Analysis</h2>
            <p className="text-sm text-gray-600">Monitor system performance and test results</p>
          </div>
        </div>
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
          <button
            onClick={loadPerformanceData}
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

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMetrics.map((metric) => {
          const TrendIcon = getTrendIcon(metric.trend);
          
          return (
            <div key={metric.id} className={`bg-white rounded-lg shadow p-6 border-l-4 ${
              metric.status === 'good' ? 'border-green-500' :
              metric.status === 'warning' ? 'border-yellow-500' : 'border-red-500'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  {getMetricIcon(metric.id)}
                  <h3 className="text-lg font-medium text-gray-900">{metric.name}</h3>
                </div>
                <div className="flex items-center space-x-1">
                  {getStatusIcon(metric.status)}
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(metric.status)}`}>
                    {metric.status.toUpperCase()}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between mb-2">
                <span className={`text-3xl font-bold ${getStatusColor(metric.status).split(' ')[0]}`}>
                  {formatValue(metric.value, metric.unit)}
                </span>
                <div className="flex items-center space-x-1">
                  <TrendIcon className={`w-4 h-4 ${getTrendColor(metric.trend, metric.category)}`} />
                  <span className={`text-sm font-medium ${getTrendColor(metric.trend, metric.category)}`}>
                    {metric.trendValue > 0 ? '+' : ''}{metric.trendValue.toFixed(1)}%
                  </span>
                </div>
              </div>
              
              <div className="text-sm text-gray-500">
                <span className="font-medium">Threshold: {formatValue(metric.threshold.good, metric.unit)}</span>
                <span className="mx-2">•</span>
                <span>Updated {new Date(metric.timestamp).toLocaleTimeString()}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Test Results */}
      {showTestResults && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Recent Test Results</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {data.testResults.map((result) => (
              <div key={result.id} className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-medium text-gray-900">{result.name}</h4>
                    <p className="text-sm text-gray-600">{new Date(result.timestamp).toLocaleString()}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full border ${getStatusColor(result.status)}`}>
                    <div className="flex items-center space-x-1">
                      {getStatusIcon(result.status)}
                      <span className="text-sm font-medium capitalize">{result.status}</span>
                    </div>
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <span className="text-sm text-gray-600">Duration:</span>
                    <div className="font-medium text-gray-900">{formatDuration(result.duration)}</div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Response Time:</span>
                    <div className="font-medium text-gray-900">{result.responseTime}ms</div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Throughput:</span>
                    <div className="font-medium text-gray-900">{result.throughput} req/s</div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Error Rate:</span>
                    <div className="font-medium text-gray-900">{result.errorRate}%</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trends Chart */}
      {showTrends && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center space-x-2 mb-6">
            <BarChart3 className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-medium text-gray-900">Performance Trends</h3>
          </div>
          
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
      )}
    </div>
  );
};

export default UnifiedPerformanceAnalysis;
