import React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { 
  Activity, 
  Clock, 
  Zap, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  BarChart3, 
  RefreshCw,
  Target,
  Cpu,
  HardDrive,
  Network,
  Users,
  Database
} from 'lucide-react';

interface PerformanceMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  threshold: number;
  status: 'good' | 'warning' | 'critical';
  trend: 'up' | 'down' | 'stable';
  change: number; // percentage change
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

const PerformanceAnalysis: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');

  const loadPerformanceData = useCallback(async () => {
    setLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const mockMetrics: PerformanceMetric[] = [
      {
        id: 'response-time',
        name: 'Average Response Time',
        value: 245,
        unit: 'ms',
        threshold: 300,
        status: 'good',
        trend: 'down',
        change: -12.5
      },
      {
        id: 'throughput',
        name: 'Throughput',
        value: 1250,
        unit: 'req/s',
        threshold: 1000,
        status: 'good',
        trend: 'up',
        change: 8.3
      },
      {
        id: 'error-rate',
        name: 'Error Rate',
        value: 2.1,
        unit: '%',
        threshold: 5,
        status: 'good',
        trend: 'stable',
        change: 0.2
      },
      {
        id: 'cpu-usage',
        name: 'CPU Usage',
        value: 68.5,
        unit: '%',
        threshold: 80,
        status: 'warning',
        trend: 'up',
        change: 15.2
      },
      {
        id: 'memory-usage',
        name: 'Memory Usage',
        value: 72.3,
        unit: '%',
        threshold: 85,
        status: 'good',
        trend: 'stable',
        change: 2.1
      },
      {
        id: 'active-connections',
        name: 'Active Connections',
        value: 1847,
        unit: 'conn',
        threshold: 2000,
        status: 'good',
        trend: 'up',
        change: 5.7
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
      },
      {
        id: '4',
        name: 'Endurance Test - Full System',
        timestamp: '2024-01-20T08:45:00Z',
        duration: 7200,
        responseTime: 520,
        throughput: 750,
        errorRate: 8.5,
        status: 'failed'
      }
    ];

    setMetrics(mockMetrics);
    setTestResults(mockTestResults);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadPerformanceData();
  }, [loadPerformanceData]);

  const runAnalysis = useCallback(async () => {
    setIsAnalyzing(true);
    
    // Simulate analysis
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Update metrics with new data
    setMetrics(prev => prev.map(metric => ({
      ...metric,
      value: metric.value + (Math.random() - 0.5) * metric.value * 0.1,
      change: (Math.random() - 0.5) * 20,
      trend: Math.random() > 0.5 ? 'up' : Math.random() > 0.5 ? 'down' : 'stable',
      status: Math.random() > 0.8 ? 'warning' : Math.random() > 0.9 ? 'critical' : 'good'
    })));
    
    setIsAnalyzing(false);
  }, []);

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

  const getStatusColor = (status: string) => {
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

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
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

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
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
          <Activity className="w-6 h-6 text-blue-600" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Performance Analysis</h2>
            <p className="text-sm text-gray-600">Monitor system performance and test results</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
          <button
            onClick={() => loadPerformanceData()}
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

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {metrics.map((metric) => (
          <div key={metric.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                {getMetricIcon(metric.id)}
                <span className="font-medium text-gray-900">{metric.name}</span>
              </div>
              <div className="flex items-center space-x-1">
                {getStatusIcon(metric.status)}
                {getTrendIcon(metric.trend)}
              </div>
            </div>
            
            <div className="mb-2">
              <span className="text-2xl font-bold text-gray-900">
                {formatValue(metric.value, metric.unit)}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(metric.status)}`}>
                {metric.status.toUpperCase()}
              </span>
              <div className="flex items-center space-x-1">
                <span className={`text-sm ${metric.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {metric.change >= 0 ? '+' : ''}{metric.change.toFixed(1)}%
                </span>
              </div>
            </div>
            
            <div className="mt-2 text-xs text-gray-500">
              Threshold: {formatValue(metric.threshold, metric.unit)}
            </div>
          </div>
        ))}
      </div>

      {/* Recent Test Results */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Test Results</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {testResults.map((result) => (
            <div key={result.id} className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="font-medium text-gray-900">{result.name}</h4>
                  <p className="text-sm text-gray-600">{formatTimestamp(result.timestamp)}</p>
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

      {/* Performance Chart Placeholder */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-2 mb-6">
          <BarChart3 className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-medium text-gray-900">Performance Trends</h3>
        </div>
        
        <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
          <div className="text-center">
            <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500">Performance trends chart would be rendered here</p>
            <p className="text-sm text-gray-400">Showing metrics over the selected time range</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceAnalysis;
