import React, { useState, useEffect } from 'react';
import { useState, useEffect } from 'react';
import { useAsyncErrorHandler } from '../hooks/useAsyncErrorHandler';
import { BarChart3, TrendingUp, Users, Globe, Clock, AlertCircle } from 'lucide-react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, // ArcElement,  } from 'chart.js'; // 已修复
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface AnalyticsData {
  totalTests: number;
  successRate: number;
  avgResponseTime: number;
  activeUsers: number;
  testTrends: number[];
  performanceData: number[];
  testTypes: { [key: string]: number };
}

const Analytics: React.FC = () => {
  
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  
  const showFeedback = (type, message, duration = 3000) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback({ type: '', message: '' });
    }, duration);
  };
  
  useEffect(() => {
    if (state.error) {
      showFeedback('error', state.error.message);
    }
  }, [state.error]);
  
  
  const createData = async (newData) => {
    const result = await executeAsync(
      () => fetch('/api/data/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newData)
      }).then(res => res.json()),
      { context: 'DataManagement.createData' }
    );
    
    if (result && result.success) {
      // 刷新数据列表
      fetchData();
    }
  };
  
  const updateData = async (id, updateData) => {
    const result = await executeAsync(
      () => fetch(`/api/data/update/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      }).then(res => res.json()),
      { context: 'DataManagement.updateData' }
    );
    
    if (result && result.success) {
      fetchData();
    }
  };
  
  const deleteData = async (id) => {
    const result = await executeAsync(
      () => fetch(`/api/data/delete/${id}`, {
        method: 'DELETE'
      }).then(res => res.json()),
      { context: 'DataManagement.deleteData' }
    );
    
    if (result && result.success) {
      fetchData();
    }
  };
  
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const result = await executeAsync(
        () => fetch('/api/data/list').then(res => res.json()),
        { context: 'DataFetching' }
      );
      
      if (result && result.success) {
        setData(result.data);
      }
      setLoading(false);
    };
    
    fetchData();
  }, []);
  const { executeAsync, state } = useAsyncErrorHandler();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange]);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockData: AnalyticsData = {
        totalTests: 1247,
        successRate: 94.2,
        avgResponseTime: 1.8,
        activeUsers: 156,
        testTrends: [120, 135, 148, 162, 155, 171, 189],
        performanceData: [2.1, 1.9, 1.7, 1.8, 1.6, 1.8, 1.5],
        testTypes: {
          '性能测试': 35,
          '安全测试': 28,
          'SEO测试': 22,
          '兼容性测试': 15
        }
      };
      
      setAnalyticsData(mockData);
    } catch (error) {
      console.error('Failed to fetch analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const lineChartData = {
    labels: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
    datasets: [
      {
        label: '测试数量',
        data: analyticsData?.testTrends || [],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
      },
    ],
  };

  const barChartData = {
    labels: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
    datasets: [
      {
        label: '平均响应时间 (秒)',
        data: analyticsData?.performanceData || [],
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderColor: 'rgb(34, 197, 94)',
        borderWidth: 1,
      },
    ],
  };

  const doughnutData = {
    labels: Object.keys(analyticsData?.testTypes || {}),
    datasets: [
      {
        data: Object.values(analyticsData?.testTypes || {}),
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(34, 197, 94, 0.8)',
          'rgba(251, 191, 36, 0.8)',
          'rgba(239, 68, 68, 0.8)',
        ],
        borderColor: [
          'rgb(59, 130, 246)',
          'rgb(34, 197, 94)',
          'rgb(251, 191, 36)',
          'rgb(239, 68, 68)',
        ],
        borderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  if (loading) {
    
        
  if (state.isLoading || loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-600">加载中...</span>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              操作失败
            </h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{state.error.message}</p>
            </div>
            <div className="mt-4">
              <button
                onClick={() => window.location.reload()}
                className="bg-red-100 px-2 py-1 text-sm text-red-800 rounded hover:bg-red-200"
              >
                重试
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">加载分析数据中...</p>
        </div>
      </div>
    );
      }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            数据分析
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            查看测试数据的详细分析和趋势
          </p>
        </div>

        {/* 时间范围选择 */}
        <div className="mb-6">
          <div className="flex gap-2">
            {[
              { value: '24h', label: '24小时' },
              { value: '7d', label: '7天' },
              { value: '30d', label: '30天' },
              { value: '90d', label: '90天' }
            ].map((range) => (
              <button
                key={range.value}
                onClick={() => setTimeRange(range.value)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  timeRange === range.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg mr-4">
                <BarChart3 className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">总测试数</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {analyticsData?.totalTests.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg mr-4">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">成功率</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {analyticsData?.successRate}%
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-lg mr-4">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">平均响应时间</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {analyticsData?.avgResponseTime}s
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg mr-4">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">活跃用户</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {analyticsData?.activeUsers}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 图表区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* 测试趋势图 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              测试趋势
            </h3>
            <Line data={lineChartData} options={chartOptions} />
          </div>

          {/* 性能数据图 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              性能趋势
            </h3>
            <Bar data={barChartData} options={chartOptions} />
          </div>
        </div>

        {/* 测试类型分布 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            测试类型分布
          </h3>
          <div className="max-w-md mx-auto">
            <Doughnut data={doughnutData} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
