import {format} from 'date-fns';
import React, { useMemo, useState } from 'react';

import {Area, AreaChart, Bar, BarChart, Brush, CartesianGrid, Cell, ComposedChart, Funnel, FunnelChart, LabelList, Legend, Line, LineChart, Pie, PieChart, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';

// 高级压力测试图表
interface StressTestChartProps {
  data?: Array<{
    time: string | number;
    timestamp?: number;
    responseTime: number;
    throughput: number;
    errors: number;
    users?: number;
    p95ResponseTime?: number;
    p99ResponseTime?: number;
    errorRate?: number;
    bytesReceived?: number;
    bytesSent?: number;
    connectionsActive?: number;
    phase?: string;
    region?: string;
  }>;
  showAdvancedMetrics?: boolean;
  height?: number;
  theme?: 'dark' | 'light';
  interactive?: boolean;
  realTime?: boolean;
}

export const StressTestChart: React.FC<StressTestChartProps> = ({
  data = [],
  showAdvancedMetrics = false,
  height = 400,
  theme = 'dark',
  interactive = true,
  realTime = false
}) => {
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['responseTime', 'throughput', 'errorRate']);
  const [chartType, setChartType] = useState<'line' | 'area' | 'composed'>('line');
  const [timeRange, setTimeRange] = useState<'all' | '1m' | '5m' | '15m'>('all');

  // 处理数据
  const processedData = useMemo(() => {
    if (!data || data.length === 0) {
      
        // 返回空数组，不生成模拟数据
      return [];
      }

    // 过滤时间范围
    let filteredData = data;
    if (timeRange !== 'all' && data.length > 0) {
      const now = Date.now();
      const ranges = {
        '1m': 60 * 1000,
        '5m': 5 * 60 * 1000,
        '15m': 15 * 60 * 1000
      };
      const cutoff = now - ranges[timeRange];
      filteredData = data.filter(item => {
        const timestamp = item.timestamp || new Date(item.time).getTime();
        return timestamp >= cutoff;
      });
    }

    // 🔧 修复：使用相对时间显示，基于过滤后数据的实际时间范围
    if (filteredData.length === 0) {
      
        return [];
      }

    // 使用过滤后数据的第一个时间点作为相对时间的起点
    const startTime = filteredData[0].timestamp || new Date(filteredData[0].time).getTime();

    // 如果数据被时间范围过滤了，需要计算实际的测试开始时间偏移
    let testStartOffset = 0;
    if (timeRange !== 'all' && data && data.length > 0) {
      // 原始数据的第一个时间点
      const originalStartTime = data[0].timestamp || new Date(data[0].time).getTime();
      // 过滤后数据相对于原始数据的时间偏移
      testStartOffset = (startTime - originalStartTime) / 1000;
    }

    return filteredData.map(item => {
      const currentTime = item.timestamp || new Date(item.time).getTime();
      const elapsedSeconds = (currentTime - startTime) / 1000 + testStartOffset;

      const minutes = Math.floor(elapsedSeconds / 60);
      const seconds = Math.floor(elapsedSeconds % 60);
      const ms = Math.floor((elapsedSeconds % 1) * 100);

      const relativeTime = minutes > 0 ?
        `${minutes}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}` :
        `${seconds}.${ms.toString().padStart(2, '0')}`;

      return {
        ...item,
        time: relativeTime
      };
    });
  }, [data, timeRange]);

  const colors = {
    dark: {
      responseTime: '#3B82F6',
      throughput: '#10B981',
      errors: '#EF4444',
      users: '#F59E0B',
      p95ResponseTime: '#8B5CF6',
      p99ResponseTime: '#EC4899',
      errorRate: '#F97316',
      bytesReceived: '#06B6D4',
      bytesSent: '#84CC16',
      connectionsActive: '#6366F1'
    },
    light: {
      responseTime: '#2563EB',
      throughput: '#059669',
      errors: '#DC2626',
      users: '#D97706',
      p95ResponseTime: '#7C3AED',
      p99ResponseTime: '#DB2777',
      errorRate: '#EA580C',
      bytesReceived: '#0891B2',
      bytesSent: '#65A30D',
      connectionsActive: '#4F46E5'
    }
  };

  const currentColors = colors[theme];
  const bgColor = theme === 'dark' ? '#1F2937' : '#FFFFFF';
  const textColor = theme === 'dark' ? '#F9FAFB' : '#111827';
  const gridColor = theme === 'dark' ? '#374151' : '#E5E7EB';

  const renderChart = () => {
    const commonProps = {
      data: processedData,
      margin: { top: 20, right: 30, left: 20, bottom: 20 }
    };

    const tooltipStyle = {
      backgroundColor: bgColor,
      border: `1px solid ${gridColor}`,
      borderRadius: '8px',
      color: textColor,
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
    };

    switch (chartType) {
      case 'area':
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis dataKey="time" stroke={textColor} fontSize={12} />
            <YAxis stroke={textColor} fontSize={12} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend />
            {interactive && <Brush dataKey="time" height={30} stroke={currentColors.responseTime} />}
            {selectedMetrics.includes('responseTime') && (
              <Area
                type="monotone"
                dataKey="responseTime"
                stackId="1"
                stroke={currentColors.responseTime}
                fill={currentColors.responseTime}
                fillOpacity={0.6}
                name="响应时间 (ms)"
              />
            )}
            {selectedMetrics.includes('throughput') && (
              <Area
                type="monotone"
                dataKey="throughput"
                stackId="2"
                stroke={currentColors.throughput}
                fill={currentColors.throughput}
                fillOpacity={0.6}
                name="吞吐量 (req/s)"
              />
            )}
            {selectedMetrics.includes('errorRate') && (
              <Area
                type="monotone"
                dataKey="errorRate"
                stackId="3"
                stroke={currentColors.errors}
                fill={currentColors.errors}
                fillOpacity={0.4}
                name="错误率 (%)"
              />
            )}
          </AreaChart>
        );

      case 'composed':
        return (
          <ComposedChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis dataKey="time" stroke={textColor} fontSize={12} />
            <YAxis yAxisId="left" stroke={textColor} fontSize={12} />
            <YAxis yAxisId="right" orientation="right" stroke={textColor} fontSize={12} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend />
            {interactive && <Brush dataKey="time" height={30} stroke={currentColors.responseTime} />}

            {selectedMetrics.includes('responseTime') && (
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="responseTime"
                stroke={currentColors.responseTime}
                strokeWidth={2}
                name="响应时间 (ms)"
                dot={false}
              />
            )}
            {selectedMetrics.includes('throughput') && (
              <Bar
                yAxisId="right"
                dataKey="throughput"
                fill={currentColors.throughput}
                name="吞吐量 (req/s)"
                opacity={0.8}
              />
            )}
            {selectedMetrics.includes('errorRate') && (
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="errorRate"
                stroke={currentColors.errors}
                strokeWidth={2}
                name="错误率 (%)"
                dot={false}
                strokeDasharray="4 2"
              />
            )}
          </ComposedChart>
        );

      default:
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis dataKey="time" stroke={textColor} fontSize={12} />
            <YAxis stroke={textColor} fontSize={12} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend />
            {interactive && <Brush dataKey="time" height={30} stroke={currentColors.responseTime} />}

            {selectedMetrics.includes('responseTime') && (
              <Line
                type="monotone"
                dataKey="responseTime"
                stroke={currentColors.responseTime}
                strokeWidth={2}
                name="响应时间 (ms)"
                dot={false}
              />
            )}
            {selectedMetrics.includes('throughput') && (
              <Line
                type="monotone"
                dataKey="throughput"
                stroke={currentColors.throughput}
                strokeWidth={2}
                name="吞吐量 (req/s)"
                dot={false}
              />
            )}
            {selectedMetrics.includes('errorRate') && (
              <Line
                type="monotone"
                dataKey="errorRate"
                stroke={currentColors.errors}
                strokeWidth={2}
                name="错误率 (%)"
                dot={false}
                strokeDasharray="4 2"
              />
            )}
            {showAdvancedMetrics && selectedMetrics.includes('p95ResponseTime') && (
              <Line
                type="monotone"
                dataKey="p95ResponseTime"
                stroke={currentColors.p95ResponseTime}
                strokeWidth={1}
                strokeDasharray="5 5"
                name="P95响应时间 (ms)"
                dot={false}
              />
            )}
            {showAdvancedMetrics && selectedMetrics.includes('p99ResponseTime') && (
              <Line
                type="monotone"
                dataKey="p99ResponseTime"
                stroke={currentColors.p99ResponseTime}
                strokeWidth={1}
                strokeDasharray="5 5"
                name="P99响应时间 (ms)"
                dot={false}
              />
            )}
          </LineChart>
        );
    }
  };

  return (
    <div className={`p-6 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-white border'}`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          压力测试实时数据 {realTime && <span className="text-green-500 text-sm">● 实时</span>}
        </h3>

        {interactive && (
          <div className="flex gap-2">
            <select
              id="chart-type-select"
              value={chartType}
              onChange={(e) => setChartType(e.target.value as any)}
              className={`px-3 py-1 rounded text-sm ${theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'}`}
              aria-label="选择图表类型"
              title="选择图表类型"
            >
              <option value="line">线图</option>
              <option value="area">面积图</option>
              <option value="composed">组合图</option>
            </select>

            <select
              id="time-range-select"
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className={`px-3 py-1 rounded text-sm ${theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'}`}
              aria-label="选择时间范围"
              title="选择时间范围"
            >
              <option value="all">全部</option>
              <option value="1m">1分钟</option>
              <option value="5m">5分钟</option>
              <option value="15m">15分钟</option>
            </select>
          </div>
        )}
      </div>

      <div style={{ height: height }}>
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// 高级性能分数图表
interface PerformanceChartProps {
  scores?: {
    performance: number;
    seo: number;
    accessibility: number;
    bestPractices: number;
    pwa?: number;
    security?: number;
    coreWebVitals?: {
      lcp: number;
      fid: number;
      cls: number;
      fcp: number;
      ttfb: number;
    };
    detailedMetrics?: {
      firstContentfulPaint: number;
      largestContentfulPaint: number;
      firstInputDelay: number;
      cumulativeLayoutShift: number;
      timeToInteractive: number;
      speedIndex: number;
      totalBlockingTime: number;
    };
  };
  theme?: 'dark' | 'light';
  showDetails?: boolean;
  interactive?: boolean;
  height?: number;
}

export const PerformanceChart: React.FC<PerformanceChartProps> = ({
  scores,
  theme = 'dark',
  showDetails = false,
  interactive = true,
  height = 300
}) => {
  const [viewType, setViewType] = useState<'overview' | 'detailed' | 'radar'>('overview');

  const defaultScores = {
    performance: 85,
    seo: 78,
    accessibility: 92,
    bestPractices: 88,
    pwa: 75,
    security: 90,
    coreWebVitals: {
      lcp: 2.1,
      fid: 85,
      cls: 0.08,
      fcp: 1.8,
      ttfb: 0.6
    },
    detailedMetrics: {
      firstContentfulPaint: 1800,
      largestContentfulPaint: 2100,
      firstInputDelay: 85,
      cumulativeLayoutShift: 0.08,
      timeToInteractive: 3200,
      speedIndex: 2800,
      totalBlockingTime: 150
    }
  };

  const data = { ...defaultScores, ...scores };

  const getScoreColor = (score: number) => {
    if (score >= 90) return theme === 'dark' ? '#10B981' : '#059669';
    if (score >= 70) return theme === 'dark' ? '#F59E0B' : '#D97706';
    return theme === 'dark' ? '#EF4444' : '#DC2626';
  };

  const overviewData = [
    { name: '性能', score: data.performance, color: getScoreColor(data.performance), target: 90 },
    { name: 'SEO', score: data.seo, color: getScoreColor(data.seo), target: 85 },
    { name: '可访问性', score: data.accessibility, color: getScoreColor(data.accessibility), target: 95 },
    { name: '最佳实践', score: data.bestPractices, color: getScoreColor(data.bestPractices), target: 90 },
    { name: 'PWA', score: data.pwa || 0, color: getScoreColor(data.pwa || 0), target: 80 },
    { name: '安全性', score: data.security || 0, color: getScoreColor(data.security || 0), target: 95 },
  ];

  const coreWebVitalsData = [
    {
      name: 'LCP',
      value: data.coreWebVitals?.lcp || 0,
      score: data.coreWebVitals?.lcp <= 2.5 ? 100 : data.coreWebVitals?.lcp <= 4.0 ? 70 : 30,
      unit: 's',
      threshold: 2.5
    },
    {
      name: 'FID',
      value: data.coreWebVitals?.fid || 0,
      score: data.coreWebVitals?.fid <= 100 ? 100 : data.coreWebVitals?.fid <= 300 ? 70 : 30,
      unit: 'ms',
      threshold: 100
    },
    {
      name: 'CLS',
      value: data.coreWebVitals?.cls || 0,
      score: data.coreWebVitals?.cls <= 0.1 ? 100 : data.coreWebVitals?.cls <= 0.25 ? 70 : 30,
      unit: '',
      threshold: 0.1
    },
    {
      name: 'FCP',
      value: data.coreWebVitals?.fcp || 0,
      score: data.coreWebVitals?.fcp <= 1.8 ? 100 : data.coreWebVitals?.fcp <= 3.0 ? 70 : 30,
      unit: 's',
      threshold: 1.8
    },
    {
      name: 'TTFB',
      value: data.coreWebVitals?.ttfb || 0,
      score: data.coreWebVitals?.ttfb <= 0.8 ? 100 : data.coreWebVitals?.ttfb <= 1.8 ? 70 : 30,
      unit: 's',
      threshold: 0.8
    }
  ];

  const radarData = [
    { metric: '性能', score: data.performance, fullMark: 100 },
    { metric: 'SEO', score: data.seo, fullMark: 100 },
    { metric: '可访问性', score: data.accessibility, fullMark: 100 },
    { metric: '最佳实践', score: data.bestPractices, fullMark: 100 },
    { metric: 'PWA', score: data.pwa || 0, fullMark: 100 },
    { metric: '安全性', score: data.security || 0, fullMark: 100 }
  ];

  const bgColor = theme === 'dark' ? '#1F2937' : '#FFFFFF';
  const textColor = theme === 'dark' ? '#F9FAFB' : '#111827';
  const gridColor = theme === 'dark' ? '#374151' : '#E5E7EB';

  const tooltipStyle = {
    backgroundColor: bgColor,
    border: `1px solid ${gridColor}`,
    borderRadius: '8px',
    color: textColor,
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
  };

  const renderChart = () => {
    switch (viewType) {
      case 'detailed':
        return (
          <ComposedChart data={coreWebVitalsData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis dataKey="name" stroke={textColor} fontSize={12} />
            <YAxis yAxisId="left" stroke={textColor} fontSize={12} />
            <YAxis yAxisId="right" orientation="right" stroke={textColor} fontSize={12} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend />
            <Bar yAxisId="left" dataKey="score" fill="#3B82F6" name="评分" />
            <Line yAxisId="right" type="monotone" dataKey="value" stroke="#EF4444" strokeWidth={2} name="实际值" />
            <ReferenceLine yAxisId="right" y={2.5} stroke="#10B981" strokeDasharray="5 5" label="良好阈值" />
          </ComposedChart>
        );

      case 'radar':
        return (
          <RadarChart data={radarData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <PolarGrid stroke={gridColor} />
            <PolarAngleAxis dataKey="metric" tick={{ fill: textColor, fontSize: 12 }} />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={{ fill: textColor, fontSize: 10 }}
              tickCount={6}
            />
            <Radar
              name="性能评分"
              dataKey="score"
              stroke="#3B82F6"
              fill="#3B82F6"
              fillOpacity={0.3}
              strokeWidth={2}
            />
            <Tooltip contentStyle={tooltipStyle} />
          </RadarChart>
        );

      default:
        return (
          <BarChart data={overviewData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis dataKey="name" stroke={textColor} fontSize={12} />
            <YAxis domain={[0, 100]} stroke={textColor} fontSize={12} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend />
            <Bar dataKey="score" fill="#3B82F6" radius={[4, 4, 0, 0]} name="当前评分" />
            <Bar dataKey="target" fill={gridColor} radius={[4, 4, 0, 0]} name="目标评分" opacity={0.3} />
            <ReferenceLine y={90} stroke="#10B981" strokeDasharray="5 5" label="优秀" />
            <ReferenceLine y={70} stroke="#F59E0B" strokeDasharray="5 5" label="良好" />
          </BarChart>
        );
    }
  };

  return (
    <div className={`p-6 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-white border'}`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          性能评分分析
        </h3>

        {interactive && (
          <select
            value={viewType}
            onChange={(e) => setViewType(e.target.value as any)}
            className={`px-3 py-1 rounded text-sm ${theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'}`}
            title="选择图表类型"
          >
            <option value="overview">总览</option>
            <option value="detailed">Core Web Vitals</option>
            <option value="radar">雷达图</option>
          </select>
        )}
      </div>

      <div className="chart-container" style={{ height: height }}>
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>

      {showDetails && (
        <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
          {overviewData.map((item) => (
            <div key={item.name} className={`p-3 rounded ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <div className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{item.name}</div>
              <div className={`text-xl font-bold ${item.score >= 90 ? 'text-green-500' : item.score >= 70 ? 'text-yellow-500' : 'text-red-500'}`}>
                {item.score}
              </div>
              <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                目标: {item.target}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// 高级安全检查图表
interface SecurityChartProps {
  data?: Array<{
    category: string;
    passed: number;
    failed: number;
    warnings?: number;
    severity?: 'low' | 'medium' | 'high' | 'critical';
    details?: Array<{
      name: string;
      status: 'pass' | 'fail' | 'warning';
      description?: string;
      recommendation?: string;
    }>;
  }>;
  theme?: 'dark' | 'light';
  showDetails?: boolean;
  interactive?: boolean;
  height?: number;
}

export const SecurityChart: React.FC<SecurityChartProps> = ({
  data,
  theme = 'dark',
  showDetails = false,
  interactive = true,
  height = 350
}) => {
  const [viewType, setViewType] = useState<'overview' | 'detailed' | 'severity'>('overview');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const defaultData = [
    {
      category: 'HTTPS/TLS',
      passed: 8,
      failed: 1,
      warnings: 1,
      severity: 'medium' as const,
      details: [
        { name: 'HTTPS重定向', status: 'pass' as const, description: '所有HTTP请求正确重定向到HTTPS' },
        { name: 'TLS版本', status: 'pass' as const, description: '使用TLS 1.2+' },
        { name: 'SSL证书', status: 'pass' as const, description: '证书有效且未过期' },
        { name: '证书链', status: 'warning' as const, description: '中间证书缺失', recommendation: '安装完整证书链' },
        { name: 'HSTS', status: 'fail' as const, description: '未启用HTTP严格传输安全', recommendation: '添加HSTS头部' }
      ]
    },
    {
      category: '安全头部',
      passed: 5,
      failed: 3,
      warnings: 2,
      severity: 'high' as const,
      details: [
        { name: 'Content-Security-Policy', status: 'pass' as const },
        { name: 'X-Frame-Options', status: 'pass' as const },
        { name: 'X-Content-Type-Options', status: 'pass' as const },
        { name: 'Referrer-Policy', status: 'warning' as const },
        { name: 'Permissions-Policy', status: 'fail' as const }
      ]
    },
    {
      category: '身份验证',
      passed: 6,
      failed: 2,
      warnings: 1,
      severity: 'critical' as const,
      details: [
        { name: '密码策略', status: 'pass' as const },
        { name: '会话管理', status: 'pass' as const },
        { name: '多因素认证', status: 'fail' as const },
        { name: '账户锁定', status: 'warning' as const }
      ]
    },
    {
      category: '漏洞扫描',
      passed: 15,
      failed: 3,
      warnings: 2,
      severity: 'medium' as const,
      details: [
        { name: 'SQL注入', status: 'pass' as const },
        { name: 'XSS防护', status: 'pass' as const },
        { name: 'CSRF防护', status: 'fail' as const },
        { name: '文件上传安全', status: 'warning' as const }
      ]
    },
    {
      category: '数据保护',
      passed: 7,
      failed: 1,
      warnings: 0,
      severity: 'low' as const,
      details: [
        { name: '数据加密', status: 'pass' as const },
        { name: '敏感信息泄露', status: 'pass' as const },
        { name: '备份安全', status: 'fail' as const }
      ]
    }
  ];

  const chartData = data || defaultData;

  const getSeverityColor = (severity: string) => {
    const colors = {
      dark: {
        low: '#10B981',
        medium: '#F59E0B',
        high: '#F97316',
        critical: '#EF4444'
      },
      light: {
        low: '#059669',
        medium: '#D97706',
        high: '#EA580C',
        critical: '#DC2626'
      }
    };
    return colors[theme][severity as keyof typeof colors.dark] || colors[theme].medium;
  };

  const bgColor = theme === 'dark' ? '#1F2937' : '#FFFFFF';
  const textColor = theme === 'dark' ? '#F9FAFB' : '#111827';
  const gridColor = theme === 'dark' ? '#374151' : '#E5E7EB';

  const tooltipStyle = {
    backgroundColor: bgColor,
    border: `1px solid ${gridColor}`,
    borderRadius: '8px',
    color: textColor,
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
  };

  // 计算总体安全评分
  const totalPassed = chartData.reduce((sum, item) => sum + item.passed, 0);
  const totalFailed = chartData.reduce((sum, item) => sum + item.failed, 0);
  const totalWarnings = chartData.reduce((sum, item) => sum + (item.warnings || 0), 0);
  const totalChecks = totalPassed + totalFailed + totalWarnings;
  const securityScore = totalChecks > 0 ? Math.round((totalPassed / totalChecks) * 100) : 0;

  const severityData = chartData.map(item => ({
    category: item.category,
    score: item.passed / (item.passed + item.failed + (item.warnings || 0)) * 100,
    severity: item.severity,
    color: getSeverityColor(item.severity || 'medium')
  }));

  const overallData = [
    { name: '通过', value: totalPassed, color: '#10B981' },
    { name: '警告', value: totalWarnings, color: '#F59E0B' },
    { name: '失败', value: totalFailed, color: '#EF4444' }
  ];

  const renderChart = () => {
    switch (viewType) {
      case 'detailed':
        return (
          <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis dataKey="category" stroke={textColor} fontSize={12} />
            <YAxis stroke={textColor} fontSize={12} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend />
            <Bar dataKey="passed" stackId="a" fill="#10B981" name="通过" />
            <Bar dataKey="warnings" stackId="a" fill="#F59E0B" name="警告" />
            <Bar dataKey="failed" stackId="a" fill="#EF4444" name="失败" />
            <Line
              type="monotone"
              dataKey={(data: any) => (data.passed / (data.passed + data.failed + (data.warnings || 0))) * 100}
              stroke="#3B82F6"
              strokeWidth={2}
              name="通过率 (%)"
            />
          </ComposedChart>
        );

      case 'severity':
        return (
          <BarChart data={severityData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis dataKey="category" stroke={textColor} fontSize={12} />
            <YAxis domain={[0, 100]} stroke={textColor} fontSize={12} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar
              dataKey="score"
              fill="#8884d8"
              radius={[4, 4, 0, 0]}
              name="安全评分 (%)"
            >
              {severityData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
            <ReferenceLine y={90} stroke="#10B981" strokeDasharray="5 5" label="优秀" />
            <ReferenceLine y={70} stroke="#F59E0B" strokeDasharray="5 5" label="良好" />
            <ReferenceLine y={50} stroke="#EF4444" strokeDasharray="5 5" label="需改进" />
          </BarChart>
        );

      default:
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
            <div>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={overallData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {overallData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis dataKey="category" stroke={textColor} fontSize={10} />
                  <YAxis stroke={textColor} fontSize={10} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="passed" stackId="a" fill="#10B981" name="通过" />
                  <Bar dataKey="warnings" stackId="a" fill="#F59E0B" name="警告" />
                  <Bar dataKey="failed" stackId="a" fill="#EF4444" name="失败" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
    }
  };

  return (
    <div className={`p-6 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-white border'}`}>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            安全检查结果
          </h3>
          <div className="flex items-center gap-4 mt-2">
            <div className={`text-2xl font-bold ${securityScore >= 90 ? 'text-green-500' : securityScore >= 70 ? 'text-yellow-500' : 'text-red-500'}`}>
              {securityScore}%
            </div>
            <div className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
              总体安全评分
            </div>
          </div>
        </div>

        {interactive && (
          <select
            value={viewType}
            onChange={(e) => setViewType(e.target.value as any)}
            className={`px-3 py-1 rounded text-sm ${theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'}`}
            title="选择视图类型"
          >
            <option value="overview">总览</option>
            <option value="detailed">详细分析</option>
            <option value="severity">严重程度</option>
          </select>
        )}
      </div>

      <div className="chart-container" style={{ height: height }}>
        {renderChart()}
      </div>

      {showDetails && selectedCategory && (
        <div className="mt-4">
          <h4 className={`text-md font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {selectedCategory} 详细信息
          </h4>
          <div className="space-y-2">
            {chartData.find(item => item.category === selectedCategory)?.details?.map((detail, index) => (
              <div key={index} className={`p-3 rounded flex items-center justify-between ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${detail.status === 'pass' ? 'bg-green-500' :
                    detail.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                    }`} />
                  <div>
                    <div className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {detail.name}
                    </div>
                    {(detail as any).description && (
                      <div className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                        {(detail as any).description}
                      </div>
                    )}
                  </div>
                </div>
                {(detail as any).recommendation && (
                  <div className={`text-xs ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>
                    {(detail as any).recommendation}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// 高级饼图组件
interface PieChartProps {
  data?: Array<{
    name: string;
    value: number;
    color?: string;
    description?: string;
    trend?: number;
  }>;
  title?: string;
  theme?: 'dark' | 'light';
  showLegend?: boolean;
  showPercentage?: boolean;
  interactive?: boolean;
  height?: number;
  chartType?: 'pie' | 'donut' | 'funnel';
}

export const PieChart: React.FC<PieChartProps> = ({
  data,
  title = "数据分布",
  theme = 'dark',
  showLegend = true,
  showPercentage = true,
  interactive = true,
  height = 300,
  chartType = 'pie'
}) => {
  const [currentChartType, setCurrentChartType] = useState(chartType);
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null);

  const defaultColors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

  const defaultData = [
    { name: '成功', value: 85, color: '#10B981', description: '测试通过', trend: 5 },
    { name: '警告', value: 10, color: '#F59E0B', description: '需要注意', trend: -2 },
    { name: '错误', value: 5, color: '#EF4444', description: '测试失败', trend: -1 },
  ];

  const chartData = (data || defaultData).map((item, index) => ({
    ...item,
    color: item.color || defaultColors[index % defaultColors.length]
  }));

  const bgColor = theme === 'dark' ? '#1F2937' : '#FFFFFF';
  const textColor = theme === 'dark' ? '#F9FAFB' : '#111827';
  const gridColor = theme === 'dark' ? '#374151' : '#E5E7EB';

  const tooltipStyle = {
    backgroundColor: bgColor,
    border: `1px solid ${gridColor}`,
    borderRadius: '8px',
    color: textColor,
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
  };

  const renderChart = () => {
    switch (currentChartType) {
      case 'donut':
        return (
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              dataKey="value"
              label={showPercentage ? ({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%` : undefined}
              onClick={interactive ? (data: any) => setSelectedSegment(data.name) : undefined}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color}
                  stroke={selectedSegment === entry.name ? '#FFFFFF' : 'none'}
                  strokeWidth={selectedSegment === entry.name ? 2 : 0}
                />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
            {showLegend && <Legend />}
          </PieChart>
        );

      case 'funnel':
        return (
          <FunnelChart>
            <Funnel
              dataKey="value"
              data={chartData}
              isAnimationActive
            >
              <LabelList position="center" fill="#fff" stroke="none" />
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Funnel>
            <Tooltip contentStyle={tooltipStyle} />
          </FunnelChart>
        );

      default:
        return (
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              outerRadius={100}
              dataKey="value"
              label={showPercentage ? ({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%` : undefined}
              onClick={interactive ? (data: any) => setSelectedSegment(data.name) : undefined}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color}
                  stroke={selectedSegment === entry.name ? '#FFFFFF' : 'none'}
                  strokeWidth={selectedSegment === entry.name ? 2 : 0}
                />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
            {showLegend && <Legend />}
          </PieChart>
        );
    }
  };

  return (
    <div className={`p-6 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-white border'}`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          {title}
        </h3>

        {interactive && (
          <select
            value={currentChartType}
            onChange={(e) => setCurrentChartType(e.target.value as any)}
            className={`px-3 py-1 rounded text-sm ${theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'}`}
            title="选择图表类型"
          >
            <option value="pie">饼图</option>
            <option value="donut">环形图</option>
            <option value="funnel">漏斗图</option>
          </select>
        )}
      </div>

      <div className="chart-container" style={{ height: height }}>
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>

      {selectedSegment && (
        <div className="mt-4">
          {chartData.filter(item => item.name === selectedSegment).map((item, index) => (
            <div key={index} className={`p-3 rounded ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <div>
                    <div className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {item.name}: {item.value}
                    </div>
                    {item.description && (
                      <div className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                        {item.description}
                      </div>
                    )}
                  </div>
                </div>
                {item.trend !== undefined && (
                  <div className={`text-sm font-medium ${item.trend > 0 ? 'text-green-500' : item.trend < 0 ? 'text-red-500' : 'text-gray-500'}`}>
                    {item.trend > 0 ? '+' : ''}{item.trend}%
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// 高级趋势图表
interface TrendChartProps {
  data?: Array<{
    date: string;
    value: number;
    target?: number;
    prediction?: number;
    confidence?: number;
    category?: string;
  }>;
  title?: string;
  color?: string;
  theme?: 'dark' | 'light';
  showPrediction?: boolean;
  showTarget?: boolean;
  interactive?: boolean;
  height?: number;
  timeRange?: 'day' | 'week' | 'month' | 'year';
}

export const TrendChart: React.FC<TrendChartProps> = ({
  data,
  title = "趋势分析",
  color = "#3B82F6",
  theme = 'dark',
  showPrediction = false,
  showTarget = false,
  interactive = true,
  height = 300,
  timeRange = 'month'
}) => {
  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange);
  const [showConfidenceInterval, setShowConfidenceInterval] = useState(false);

  const generateDefaultData = () => {
    const ranges = {
      day: { count: 24, format: (i: number) => `${i}:00` },
      week: { count: 7, format: (i: number) => ['周一', '周二', '周三', '周四', '周五', '周六', '周日'][i] },
      month: { count: 12, format: (i: number) => `${i + 1}月` },
      year: { count: 5, format: (i: number) => `${2020 + i}年` }
    };

    const range = ranges[selectedTimeRange];
    const baseValue = 65;

    return Array.from({ length: range.count }, (_, i) => {
      const trend = Math.sin(i / range.count * Math.PI * 2) * 10;
      const noise = (Math.random() - 0.5) * 8;
      const value = baseValue + trend + noise + (i / range.count) * 20;

      return {
        date: range.format(i),
        value: Math.max(0, Math.round(value)),
        target: baseValue + 15,
        prediction: i > range.count * 0.7 ? value + Math.random() * 10 : undefined,
        confidence: i > range.count * 0.7 ? 0.8 + Math.random() * 0.2 : undefined
      };
    });
  };

  const chartData = data || generateDefaultData();

  const bgColor = theme === 'dark' ? '#1F2937' : '#FFFFFF';
  const textColor = theme === 'dark' ? '#F9FAFB' : '#111827';
  const gridColor = theme === 'dark' ? '#374151' : '#E5E7EB';

  const tooltipStyle = {
    backgroundColor: bgColor,
    border: `1px solid ${gridColor}`,
    borderRadius: '8px',
    color: textColor,
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
  };

  // 计算趋势统计
  const values = chartData.map(d => d.value);
  const avgValue = values.reduce((a, b) => a + b, 0) / values.length;
  const trend = values.length > 1 ? ((values[values.length - 1] - values[0]) / values[0]) * 100 : 0;
  const volatility = Math.sqrt(values.reduce((sum, val) => sum + Math.pow(val - avgValue, 2), 0) / values.length);

  return (
    <div className={`p-6 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-white border'}`}>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {title}
          </h3>
          <div className="flex items-center gap-4 mt-2">
            <div className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
              平均值: <span className="font-medium">{avgValue.toFixed(1)}</span>
            </div>
            <div className={`text-sm ${trend > 0 ? 'text-green-500' : trend < 0 ? 'text-red-500' : 'text-gray-500'}`}>
              趋势: <span className="font-medium">{trend > 0 ? '+' : ''}{trend.toFixed(1)}%</span>
            </div>
            <div className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
              波动性: <span className="font-medium">{volatility.toFixed(1)}</span>
            </div>
          </div>
        </div>

        {interactive && (
          <div className="flex gap-2">
            <select
              value={selectedTimeRange}
              onChange={(e) => setSelectedTimeRange(e.target.value as any)}
              className={`px-3 py-1 rounded text-sm ${theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'}`}
              title="选择时间范围"
            >
              <option value="day">日</option>
              <option value="week">周</option>
              <option value="month">月</option>
              <option value="year">年</option>
            </select>

            {showPrediction && (
              <button
                onClick={() => setShowConfidenceInterval(!showConfidenceInterval)}
                className={`px-3 py-1 rounded text-sm ${showConfidenceInterval
                  ? 'bg-blue-600 text-white'
                  : theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
                  }`}
                title="显示置信区间"
              >
                置信区间
              </button>
            )}
          </div>
        )}
      </div>

      <div className="chart-container" style={{ height: height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis dataKey="date" stroke={textColor} fontSize={12} />
            <YAxis stroke={textColor} fontSize={12} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend />

            {/* 主要数据线 */}
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={3}
              dot={{ fill: color, strokeWidth: 2, r: 4 }}
              name="实际值"
            />

            {/* 目标线 */}
            {showTarget && (
              <Line
                type="monotone"
                dataKey="target"
                stroke="#10B981"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                name="目标值"
              />
            )}

            {/* 预测线 */}
            {showPrediction && (
              <Line
                type="monotone"
                dataKey="prediction"
                stroke="#F59E0B"
                strokeWidth={2}
                strokeDasharray="3 3"
                dot={{ fill: '#F59E0B', strokeWidth: 2, r: 3 }}
                name="预测值"
              />
            )}

            {/* 置信区间 */}
            {showPrediction && showConfidenceInterval && (
              <Area
                type="monotone"
                dataKey="confidence"
                stroke="none"
                fill="#F59E0B"
                fillOpacity={0.2}
                name="置信区间"
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// 增强的实时压力测试图表组件
interface RealTimeStressTestChartProps {
  realTimeData?: Array<{
    timestamp: number;
    responseTime: number;
    status: number;
    success: boolean;
    activeUsers: number;
    userId?: string;
    error?: string;
    phase?: string;
    throughput?: number;
    errorType?: string;
    connectionTime?: number;
    dnsTime?: number;
  }>;
  metrics?: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    minResponseTime: number;
    maxResponseTime: number;
    p50ResponseTime?: number;
    p75ResponseTime?: number;
    p90ResponseTime?: number;
    p95ResponseTime?: number;
    p99ResponseTime?: number;
    p999ResponseTime?: number;
    errorRate: number;
    activeUsers: number;
    currentTPS: number;
    peakTPS: number;
    errorBreakdown?: Record<string, number>;
  };
  isRunning?: boolean;
  height?: number;
  showAdvancedMetrics?: boolean;
  enableZoom?: boolean;
  dataPointDensity?: 'low' | 'medium' | 'high';
  testPhases?: Array<{
    name: string;
    startTime: number;
    endTime?: number;
    color: string;
  }>;
}

export const RealTimeStressTestChart: React.FC<RealTimeStressTestChartProps> = ({
  realTimeData = [],
  metrics,
  isRunning = false,
  height = 400,
  showAdvancedMetrics = true,
  enableZoom = true,
  dataPointDensity = 'medium',
  testPhases = []
}) => {
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['responseTime', 'throughput', 'activeUsers', 'errorRate']);
  const [zoomDomain, setZoomDomain] = useState<{ startIndex?: number, endIndex?: number }>({});
  const [showErrorBreakdown, setShowErrorBreakdown] = useState(false);

  // 根据数据点密度控制显示的数据量
  const getDataPointStep = () => {
    switch (dataPointDensity) {
      case 'low': return 5;
      case 'medium': return 2;
      case 'high': return 1;
      default: return 2;
    }
  };

  // 处理实时数据为图表格式
  const chartData = useMemo(() => {
    if (!realTimeData || realTimeData.length === 0) {
      
        return [];
      }

    // 按时间分组数据（每秒一个数据点）
    const groupedData = new Map();

    realTimeData.forEach(point => {
      const timeKey = Math.floor(point.timestamp / 1000) * 1000;
      if (!groupedData.has(timeKey)) {
        groupedData.set(timeKey, {
          timestamp: timeKey,
          responseTimes: [],
          successes: 0,
          failures: 0,
          activeUsers: point.activeUsers,
          phase: point.phase
        });
      }

      const group = groupedData.get(timeKey);
      group.responseTimes.push(point.responseTime);
      if (point.success) {
        group.successes++;
      } else {
        group.failures++;
      }
      group.activeUsers = Math.max(group.activeUsers, point.activeUsers);
    });

    // 优化：转换为图表数据，减少重复计算
    const sortedGroups = Array.from(groupedData.values()).sort((a, b) => a.timestamp - b.timestamp);
    const chartData = [];

    for (const group of sortedGroups) {
      const hasResponseTimes = group.responseTimes.length > 0;
      const totalRequests = group.successes + group.failures;

      // 预计算统计值，避免重复计算
      let avgResponseTime = 0;
      let maxResponseTime = 0;
      let minResponseTime = 0;

      if (hasResponseTimes) {
        const sum = group.responseTimes.reduce((acc, time) => acc + time, 0);
        avgResponseTime = Math.round(sum / group.responseTimes.length);
        maxResponseTime = Math.max(...group.responseTimes);
        minResponseTime = Math.min(...group.responseTimes);
      }

      chartData.push({
        time: format(new Date(group.timestamp), 'HH:mm:ss'),
        timestamp: group.timestamp,
        responseTime: avgResponseTime,
        maxResponseTime,
        minResponseTime,
        throughput: totalRequests,
        successRate: totalRequests > 0 ? Math.round((group.successes / totalRequests) * 100) : 100,
        errorRate: totalRequests > 0 ? Math.round((group.failures / totalRequests) * 100) : 0,
        activeUsers: group.activeUsers,
        phase: group.phase
      });
    }

    // 根据密度控制数据点数量
    const step = getDataPointStep();
    const maxPoints = dataPointDensity === 'low' ? 100 : dataPointDensity === 'medium' ? 250 : 500;
    const filteredData = chartData.filter((_, index) => index % step === 0);
    return filteredData.slice(-maxPoints);
  }, [realTimeData]);

  return (
    <div className="space-y-4">
      {/* 实时指标卡片 */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-gray-800 p-3 rounded-lg">
            <div className="text-sm text-gray-400">总请求数</div>
            <div className="text-xl font-bold text-white">{metrics.totalRequests}</div>
          </div>
          <div className="bg-gray-800 p-3 rounded-lg">
            <div className="text-sm text-gray-400">平均响应时间</div>
            <div className="text-xl font-bold text-blue-400">{metrics.averageResponseTime}ms</div>
          </div>
          <div className="bg-gray-800 p-3 rounded-lg">
            <div className="text-sm text-gray-400">错误率</div>
            <div className="text-xl font-bold text-red-400">{metrics.errorRate}%</div>
          </div>
          <div className="bg-gray-800 p-3 rounded-lg">
            <div className="text-sm text-gray-400">活跃用户</div>
            <div className="text-xl font-bold text-green-400">{metrics.activeUsers}</div>
          </div>
        </div>
      )}

      {/* 实时图表 */}
      <div className="bg-gray-800 p-4 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">实时性能监控</h3>
          {isRunning && (
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm text-green-400">实时监控中</span>
            </div>
          )}
        </div>

        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="time"
              stroke="#9CA3AF"
              fontSize={12}
            />
            <YAxis
              yAxisId="left"
              stroke="#9CA3AF"
              fontSize={12}
              label={{ value: '响应时间 (ms)', angle: -90, position: 'insideLeft' }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#9CA3AF"
              fontSize={12}
              label={{ value: '用户数/吞吐量', angle: 90, position: 'insideRight' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1F2937',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#F9FAFB'
              }}
              formatter={(value, name) => {
                const formatters: Record<string, (v: any) => string[]> = {
                  responseTime: (v: any) => [`${v}ms`, '平均响应时间'],
                  maxResponseTime: (v: any) => [`${v}ms`, '最大响应时间'],
                  throughput: (v: any) => [`${v} req/s`, '吞吐量'],
                  successRate: (v: any) => [`${v}%`, '成功率'],
                  errorRate: (v: any) => [`${v}%`, '错误率'],
                  activeUsers: (v: any) => [`${v}`, '活跃用户']
                };
                return formatters[name as string] ? formatters[name as string](value) : [value, name];
              }}
            />
            <Legend />

            {/* 响应时间线 */}
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="responseTime"
              stroke="#3B82F6"
              strokeWidth={2}
              dot={false}
              name="平均响应时间"
            />

            {/* 最大响应时间区域 */}
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="maxResponseTime"
              stroke="#8B5CF6"
              fill="#8B5CF6"
              fillOpacity={0.1}
              name="最大响应时间"
            />

            {/* 活跃用户柱状图 */}
            <Bar
              yAxisId="right"
              dataKey="activeUsers"
              fill="#10B981"
              fillOpacity={0.6}
              name="活跃用户"
            />

            {/* 吞吐量线 */}
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="throughput"
              stroke="#F59E0B"
              strokeWidth={2}
              dot={false}
              name="吞吐量"
            />

            {/* 错误率线 */}
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="errorRate"
              stroke="#DC2626"
              strokeWidth={2}
              dot={false}
              name="错误率"
              strokeDasharray="4 2"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// 向后兼容的导出
export const SimpleStressTestChart = StressTestChart;
export const SimplePerformanceChart = PerformanceChart;
export const SimpleSecurityChart = SecurityChart;
export const SimplePieChart = PieChart;
export const SimpleTrendChart = TrendChart;
