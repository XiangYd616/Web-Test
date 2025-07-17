import React, { useState, useEffect } from 'react';
import { Activity, Clock, Zap, TrendingUp, AlertTriangle } from 'lucide-react';

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  status: 'good' | 'warning' | 'critical';
}

const Performance: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 模拟加载性能数据
    const loadMetrics = async () => {
      setLoading(true);
      
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setMetrics([
        {
          name: '页面加载时间',
          value: 2.3,
          unit: 's',
          trend: 'down',
          status: 'good'
        },
        {
          name: 'First Contentful Paint',
          value: 1.2,
          unit: 's',
          trend: 'stable',
          status: 'good'
        },
        {
          name: 'Largest Contentful Paint',
          value: 2.8,
          unit: 's',
          trend: 'up',
          status: 'warning'
        },
        {
          name: 'Cumulative Layout Shift',
          value: 0.15,
          unit: '',
          trend: 'down',
          status: 'good'
        }
      ]);
      
      setLoading(false);
    };

    loadMetrics();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'text-green-500';
      case 'warning': return 'text-yellow-500';
      case 'critical': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-red-500" />;
      case 'down': return <TrendingUp className="w-4 h-4 text-green-500 rotate-180" />;
      default: return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg p-6 shadow">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">性能监控</h1>
        <p className="text-gray-600">实时监控网站性能指标</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => (
          <div key={index} className="bg-white rounded-lg p-6 shadow hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Clock className="w-5 h-5 text-blue-500 mr-2" />
                <h3 className="text-sm font-medium text-gray-900">{metric.name}</h3>
              </div>
              {getTrendIcon(metric.trend)}
            </div>
            
            <div className="mb-2">
              <span className={`text-2xl font-bold ${getStatusColor(metric.status)}`}>
                {metric.value}{metric.unit}
              </span>
            </div>
            
            <div className="flex items-center">
              <span className={`text-xs px-2 py-1 rounded-full ${
                metric.status === 'good' ? 'bg-green-100 text-green-800' :
                metric.status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {metric.status === 'good' ? '良好' : 
                 metric.status === 'warning' ? '警告' : '严重'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Performance;
