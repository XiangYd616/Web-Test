/**
 * 压力测试结果分析组件
 * 提供详细的测试结果分析和可视化
 */

import { Activity, AlertTriangle, BarChart3, CheckCircle, Clock, Download, Target, TrendingUp, Users, XCircle, // Zap   } from 'lucide-react';// 已修复'
import React, { useMemo, useState    } from 'react';import { Area, AreaChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, // YAxis   } from 'recharts';// 已修复'
interface StressTestResult   {
  testId: string;
  url: string;
  config: any;
  startTime: string;
  endTime: string;
  duration: number;

  // 核心指标
  metrics: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    minResponseTime: number;
    maxResponseTime: number;
    throughput: number;
    errorRate: number;

    // 百分位数
    percentiles: {
      p50: number;
      p90: number;
      p95: number;
      p99: number;
    };
  };

  // 时间序列数据
  timeSeriesData: Array<{
    timestamp: number;
    responseTime: number;
    throughput: number;
    activeUsers: number;
    errors: number;
  }>;

  // 错误分析
  errors: Array<{
    type: string;
    message: string;
    count: number;
    percentage: number;
  }>;

  // 性能分析
  performance: {
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    score: number;
    bottlenecks: string[];
    recommendations: string[];
  };
}

interface StressTestResultAnalysisProps   {
  result: StressTestResult;
  onExport?: (format: 'pdf' | 'csv' | 'json') => void;'
  className?: string;
}

const StressTestResultAnalysis: React.FC<StressTestResultAnalysisProps>  = ({
  result,
  onExport,
  className = '';
}) => {
  
  // 页面级功能
  const [pageTitle, setPageTitle] = useState('');'
  // 设置页面标题
  useEffect(() => {
    if (pageTitle) {
      document.title = `${pageTitle} - Test Web`;`
    }
  }, [pageTitle]);

  // 页面可见性检测
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible') {'`
        // 页面变为可见时刷新数据
        fetchData?.();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);'
    return () => {
      document.removeEventListener("visibilitychange', handleVisibilityChange);'
    };
  }, [fetchData]);
  
  const componentId = useId();
  const errorId = `${componentId}-error`;`
  const descriptionId = `${componentId}-description`;`
  
  const ariaProps = {
    id: componentId,
    "aria-label': ariaLabel,'`
    'aria-labelledby': ariaLabelledBy,'
    'aria-describedby': ['']
      error ? errorId : null,
      description ? descriptionId : null,
      ariaDescribedBy
    ].filter(Boolean).join(' ') || undefined,'
    'aria-invalid': !!error,'
    'aria-disabled': disabled,'
    'aria-busy': loading,'
    'aria-expanded': expanded,'
    'aria-selected': selected,'
    role: role,
    tabIndex: disabled ? -1 : (tabIndex ?? 0)
  };
  const [activeTab, setActiveTab] = useState<'overview' | 'performance' | 'errors' | 'timeline'>("overview');'
  // 计算性能等级颜色
  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'text-green-600 bg-green-100';
      case 'B': return 'text-blue-600 bg-blue-100';
      case 'C': return 'text-yellow-600 bg-yellow-100';
      case 'D': return 'text-orange-600 bg-orange-100';
      case 'F': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // 准备图表数据
  const chartData = useMemo(() => {
    return result.timeSeriesData.map(point => ({
      time: new Date(point.timestamp).toLocaleTimeString(),
      responseTime: point.responseTime,
      throughput: point.throughput,
      activeUsers: point.activeUsers,
      errors: point.errors
    }));
  }, [result.timeSeriesData]);

  // 错误分布数据
  const errorDistribution = result.errors.map((error, index) => ({
    name: error.type,
    value: error.count,
    percentage: error.percentage,
    color: ['var(--color-danger)', '#f97316', '#eab308', '#84cc16', '#06b6d4'][index % 5]'
  }));

  // 响应时间分布数据
  const responseTimeDistribution = [
    { name: '< 100ms', value: 0, color: 'var(--color-success)' },'
    { name: '100-500ms', value: 0, color: 'var(--color-primary)' },'
    { name: '500ms-1s', value: 0, color: 'var(--color-warning)' },'
    { name: '1-2s', value: 0, color: 'var(--color-danger)' },'
    { name: '> 2s', value: 0, color: '#7c3aed' }'
  ];

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>`
      {/* 标题栏 */}
      <div className= "p-6 border-b border-gray-200'>`
        <div className= 'flex items-center justify-between'>
          <div>
            <h3 className= 'text-xl font-semibold text-gray-900'>测试结果分析</h3>
            <p className= 'text-sm text-gray-600 mt-1'>
              测试时间: {new Date(result.startTime).toLocaleString()} - {new Date(result.endTime).toLocaleString()}
            </p>
          </div>

          {/* 性能等级 */}
          <div className= 'flex items-center space-x-4'>
            <div className={`px-4 py-2 rounded-lg ${getGradeColor(result.performance.grade)}`}>`
              <div className= "text-center'>`
                <div className= 'text-2xl font-bold'>{result.performance.grade}</div>
                <div className= 'text-xs'>性能等级</div>
              </div>
            </div>

            <div className= 'text-right'>
              <div className= 'text-2xl font-bold text-gray-900'>{result.performance.score}</div>
              <div className= 'text-xs text-gray-600'>综合评分</div>
            </div>
          </div>
        </div>
      </div>

      {/* 标签页导航 */}
      <div className= 'flex border-b border-gray-200'>
        {[
          { key: 'overview', label: '概览', icon: <BarChart3 className= 'w-4 h-4'    /> },'
          { key: 'performance', label: '性能分析', icon: <TrendingUp className= 'w-4 h-4'    /> },'
          { key: 'errors', label: '错误分析', icon: <AlertTriangle className= 'w-4 h-4'    /> },'
          { key: 'timeline', label: '时间线', icon: <Activity className= 'w-4 h-4'    /> }'
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex items-center space-x-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.key`}
                ? "border-blue-500 text-blue-600';'`
                : 'border-transparent text-gray-600 hover:text-gray-900';
              }`}`
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className= "p-6'>`
        {/* 概览标签页 */}
        {activeTab === 'overview' && ('')
          <div className= 'space-y-6'>
            {/* 核心指标卡片 */}
            <div className= 'grid grid-cols-2 md:grid-cols-4 gap-4'>
              <div className= 'bg-blue-50 p-4 rounded-lg'>
                <div className= 'flex items-center space-x-2'>
                  <Users className= 'w-5 h-5 text-blue-600'    />
                  <span className= 'text-sm font-medium text-blue-900'>总请求数</span>
                </div>
                <div className= 'text-2xl font-bold text-blue-900 mt-1'>
                  {result.metrics.totalRequests.toLocaleString()}
                </div>
              </div>

              <div className= 'bg-green-50 p-4 rounded-lg'>
                <div className= 'flex items-center space-x-2'>
                  <CheckCircle className= 'w-5 h-5 text-green-600'    />
                  <span className= 'text-sm font-medium text-green-900'>成功率</span>
                </div>
                <div className= 'text-2xl font-bold text-green-900 mt-1'>
                  {((result.metrics.successfulRequests / result.metrics.totalRequests) * 100).toFixed(1)}%
                </div>
              </div>

              <div className= 'bg-yellow-50 p-4 rounded-lg'>
                <div className= 'flex items-center space-x-2'>
                  <Clock className= 'w-5 h-5 text-yellow-600'    />
                  <span className= 'text-sm font-medium text-yellow-900'>平均响应时间</span>
                </div>
                <div className= 'text-2xl font-bold text-yellow-900 mt-1'>
                  {result.metrics.averageResponseTime.toFixed(0)}ms
                </div>
              </div>

              <div className= 'bg-purple-50 p-4 rounded-lg'>
                <div className= 'flex items-center space-x-2'>
                  <Zap className= 'w-5 h-5 text-purple-600'    />
                  <span className= 'text-sm font-medium text-purple-900'>吞吐量</span>
                </div>
                <div className= 'text-2xl font-bold text-purple-900 mt-1'>
                  {result.metrics.throughput.toFixed(1)} req/s
                </div>
              </div>
            </div>

            {/* 响应时间图表 */}
            <div className= 'bg-gray-50 p-4 rounded-lg'>
              <h4 className= 'text-lg font-semibold text-gray-900 mb-4'>响应时间趋势</h4>
              <ResponsiveContainer width= '100%' height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray= '3 3'    />
                  <XAxis dataKey= 'time'    />
                  <YAxis  />
                  <Tooltip  />
                  <Legend  />
                  <Line type= 'monotone';
                    dataKey= 'responseTime';
                    stroke= 'var(--color-primary)';
                    strokeWidth={2}
                    name= '响应时间 (ms)';
                     />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* 百分位数统计 */}
            <div className= 'bg-gray-50 p-4 rounded-lg'>
              <h4 className= 'text-lg font-semibold text-gray-900 mb-4'>响应时间百分位数</h4>
              <div className= 'grid grid-cols-4 gap-4'>
                <div className= 'text-center'>
                  <div className= 'text-2xl font-bold text-gray-900'>{result.metrics.percentiles.p50}ms</div>
                  <div className= 'text-sm text-gray-600'>P50 (中位数)</div>
                </div>
                <div className= 'text-center'>
                  <div className= 'text-2xl font-bold text-gray-900'>{result.metrics.percentiles.p90}ms</div>
                  <div className= 'text-sm text-gray-600'>P90</div>
                </div>
                <div className= 'text-center'>
                  <div className= 'text-2xl font-bold text-gray-900'>{result.metrics.percentiles.p95}ms</div>
                  <div className= 'text-sm text-gray-600'>P95</div>
                </div>
                <div className= 'text-center'>
                  <div className= 'text-2xl font-bold text-gray-900'>{result.metrics.percentiles.p99}ms</div>
                  <div className= 'text-sm text-gray-600'>P99</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 性能分析标签页 */}
        {activeTab === 'performance' && (<div className= 'space-y-6'>
            {/* 性能瓶颈 */}
            <div className= 'bg-red-50 p-4 rounded-lg'>
              <h4 className= 'text-lg font-semibold text-red-900 mb-3'>识别的瓶颈</h4>
              <ul className= 'space-y-2'>
                {result.performance.bottlenecks.map((bottleneck, index) => (
                  <li key={index} className= 'flex items-start space-x-2'>
                    <AlertTriangle className= 'w-4 h-4 text-red-600 mt-0.5 flex-shrink-0'    />
                    <span className= 'text-red-800'>{bottleneck}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 优化建议 */}
            <div className= 'bg-green-50 p-4 rounded-lg'>
              <h4 className= 'text-lg font-semibold text-green-900 mb-3'>优化建议</h4>
              <ul className= 'space-y-2'>
                {result.performance.recommendations.map((recommendation, index) => (
                  <li key={index} className= 'flex items-start space-x-2'>
                    <Target className= 'w-4 h-4 text-green-600 mt-0.5 flex-shrink-0'    />
                    <span className= 'text-green-800'>{recommendation}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 吞吐量图表 */}
            <div className= 'bg-gray-50 p-4 rounded-lg'>
              <h4 className= 'text-lg font-semibold text-gray-900 mb-4'>吞吐量变化</h4>
              <ResponsiveContainer width= '100%' height={300}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray= '3 3'    />
                  <XAxis dataKey= 'time'    />
                  <YAxis  />
                  <Tooltip  />
                  <Legend  />
                  <Area type= 'monotone';
                    dataKey= 'throughput';
                    stroke= 'var(--color-success)';
                    fill= 'var(--color-success)';
                    fillOpacity={0.3}
                    name= '吞吐量 (req/s)';
                     />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* 错误分析标签页 */}
        {activeTab === 'errors' && ('')
          <div className= 'space-y-6'>
            {/* 错误统计 */}
            <div className= 'grid grid-cols-3 gap-4'>
              <div className= 'bg-red-50 p-4 rounded-lg'>
                <div className= 'flex items-center space-x-2'>
                  <XCircle className= 'w-5 h-5 text-red-600'    />
                  <span className= 'text-sm font-medium text-red-900'>错误总数</span>
                </div>
                <div className= 'text-2xl font-bold text-red-900 mt-1'>
                  {result.metrics.failedRequests.toLocaleString()}
                </div>
              </div>

              <div className= 'bg-orange-50 p-4 rounded-lg'>
                <div className= 'flex items-center space-x-2'>
                  <AlertTriangle className= 'w-5 h-5 text-orange-600'    />
                  <span className= 'text-sm font-medium text-orange-900'>错误率</span>
                </div>
                <div className= 'text-2xl font-bold text-orange-900 mt-1'>
                  {(result.metrics.errorRate * 100).toFixed(2)}%
                </div>
              </div>

              <div className= 'bg-yellow-50 p-4 rounded-lg'>
                <div className= 'flex items-center space-x-2'>
                  <Activity className= 'w-5 h-5 text-yellow-600'    />
                  <span className= 'text-sm font-medium text-yellow-900'>错误类型</span>
                </div>
                <div className= 'text-2xl font-bold text-yellow-900 mt-1'>
                  {result.errors.length}
                </div>
              </div>
            </div>

            {/* 错误分布图 */}
            {errorDistribution.length > 0 && (<div className= 'bg-gray-50 p-4 rounded-lg'>
                <h4 className= 'text-lg font-semibold text-gray-900 mb-4'>错误类型分布</h4>
                <ResponsiveContainer width= '100%' height={300}>
                  <PieChart>
                    <Pie
                      data={errorDistribution}
                      cx= '50%';
                      cy= '50%';
                      outerRadius={100}
                      fill= '#8884d8';
                      dataKey= 'value';
                      label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}`
                    >
                      {errorDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color}    />`
                      ))}
                    </Pie>
                    <Tooltip  />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* 错误详情列表 */}
            <div className= "bg-gray-50 p-4 rounded-lg'>`
              <h4 className= 'text-lg font-semibold text-gray-900 mb-4'>错误详情</h4>
              <div className= 'space-y-3'>
                {result.errors.map((error, index) => (
                  <div key={index} className= 'bg-white p-3 rounded border'>
                    <div className= 'flex items-center justify-between'>
                      <span className= 'font-medium text-gray-900'>{error.type}</span>
                      <span className= 'text-sm text-gray-600'>{error.count} 次 ({error.percentage.toFixed(1)}%)</span>
                    </div>
                    <p className= 'text-sm text-gray-700 mt-1'>{error.message}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 时间线标签页 */}
        {activeTab === 'timeline' && ('')
          <div className= 'space-y-6'>
            {/* 活跃用户数图表 */}
            <div className= 'bg-gray-50 p-4 rounded-lg'>
              <h4 className= 'text-lg font-semibold text-gray-900 mb-4'>活跃用户数变化</h4>
              <ResponsiveContainer width= '100%' height={300}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray= '3 3'    />
                  <XAxis dataKey= 'time'    />
                  <YAxis  />
                  <Tooltip  />
                  <Legend  />
                  <Area type= 'monotone';
                    dataKey= 'activeUsers';
                    stroke= '#6366f1';
                    fill= '#6366f1';
                    fillOpacity={0.3}
                    name= '活跃用户数';
                     />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* 综合指标图表 */}
            <div className= 'bg-gray-50 p-4 rounded-lg'>
              <h4 className= 'text-lg font-semibold text-gray-900 mb-4'>综合指标时间线</h4>
              <ResponsiveContainer width= '100%' height={400}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray= '3 3'    />
                  <XAxis dataKey= 'time'    />
                  <YAxis yAxisId= 'left'    />
                  <YAxis yAxisId= 'right' orientation= 'right'    />
                  <Tooltip  />
                  <Legend  />
                  <Line yAxisId= 'left';
                    type= 'monotone';
                    dataKey= 'responseTime';
                    stroke= 'var(--color-primary)';
                    strokeWidth={2}
                    name= '响应时间 (ms)';
                     />
                  <Line yAxisId= 'right';
                    type= 'monotone';
                    dataKey= 'throughput';
                    stroke= 'var(--color-success)';
                    strokeWidth={2}
                    name= '吞吐量 (req/s)';
                     />
                  <Line yAxisId= 'right';
                    type= 'monotone';
                    dataKey= 'errors';
                    stroke= 'var(--color-danger)';
                    strokeWidth={2}
                    name= '错误数';
                     />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* 导出按钮 */}
      {onExport && (<div className= 'p-4 border-t border-gray-200 bg-gray-50'>
          <div className= 'flex items-center justify-between'>
            <span className= 'text-sm text-gray-600'>导出测试报告</span>
            <div className= 'flex space-x-2'>
              <button
                onClick={() => onExport('pdf')}'
                className= 'flex items-center space-x-1 px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700';
              >
                <Download className= 'w-4 h-4'    />
                <span>PDF</span>
              </button>
              <button
                onClick={() => onExport('csv')}'
                className= 'flex items-center space-x-1 px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700';
              >
                <Download className= 'w-4 h-4'    />
                <span>CSV</span>
              </button>
              <button
                onClick={() => onExport('json')}'
                className= 'flex items-center space-x-1 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700';
              >
                <Download className= 'w-4 h-4'    />
                <span>JSON</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StressTestResultAnalysis;
