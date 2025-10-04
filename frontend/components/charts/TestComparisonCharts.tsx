/**
 * TestComparisonCharts.tsx - React组件
 * 
 * 文件路径: frontend\components\charts\TestComparisonCharts.tsx
 * 创建时间: 2025-09-25
 */


import React from 'react';
import { BarChart3, Download, GitCompare, Target, TrendingUp } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, LineChart, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface TestResult {
  id: string;
  name: string;
  date: string;
  url: string;
  config: {
    users: number;
    duration: number;
    testType: string;
  };
  metrics: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    p50ResponseTime: number;
    p75ResponseTime: number;
    p90ResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    throughput: number;
    errorRate: number;
    peakTPS: number;
  };
  timeSeriesData?: Array<{
    timestamp: number;
    responseTime: number;
    throughput: number;
    errorRate: number;
    activeUsers: number;
  }>;
}

// 基线数据接口
interface BaselineData {
  name: string;
  metrics: TestResult['metrics'];
  thresholds: {
    responseTime: { warning: number; critical: number };
    throughput: { warning: number; critical: number };
    errorRate: { warning: number; critical: number };
  };
}

interface TestComparisonChartsProps {
  testResults: TestResult[];
  baseline?: BaselineData;
  currentTest?: TestResult;
  height?: number;
  showTimeSeriesComparison?: boolean;
}

export const TestComparisonCharts: React.FC<TestComparisonChartsProps> = ({
  testResults = [],
  baseline,
  currentTest,
  height = 400,
  showTimeSeriesComparison = true
}) => {
  const [comparisonType, setComparisonType] = useState<'metrics' | 'trends' | 'radar' | 'timeseries'>('metrics');
  const [selectedMetric, setSelectedMetric] = useState<string>('averageResponseTime');
  const [showBaseline, setShowBaseline] = useState(!!baseline);

  // 处理对比数据
  const comparisonData = useMemo(() => {
    const allTests = currentTest ? [...testResults, currentTest] : testResults;

    return allTests.map((test, index) => ({
      name: test.name || `测试 ${index + 1}`,
      date: new Date(test.date).toLocaleDateString(),
      ...test.metrics,
      isBaseline: false,
      isCurrent: test.id === currentTest?.id
    }));
  }, [testResults, currentTest]);

  // 趋势数据
  const trendData = useMemo(() => {
    return testResults
      .sort((a, b) => new Date(a?.date).getTime() - new Date(b.date).getTime())
      .map((test, index) => ({
        testNumber: index + 1,
        date: new Date(test.date).toLocaleDateString(),
        averageResponseTime: test.metrics.averageResponseTime,
        throughput: test.metrics.throughput,
        errorRate: test.metrics.errorRate,
        p95ResponseTime: test.metrics.p95ResponseTime,
        successRate: (test.metrics.successfulRequests / test.metrics.totalRequests) * 100
      }));
  }, [testResults]);

  // 雷达图数据
  const radarData = useMemo(() => {
    if (!currentTest || !baseline) return [];

    const normalizeValue = (value: number, baseline: number, isInverse = false) => {
      if (baseline === 0) return 0;
      const ratio = value / baseline;
      // 对于响应时间和错误率，值越小越好（isInverse = true）
      return isInverse ? Math.max(0, 200 - ratio * 100) : Math.min(200, ratio * 100);
    };

    return [
      {
        metric: '响应时间',
        current: normalizeValue(currentTest?.metrics.averageResponseTime, baseline?.metrics.averageResponseTime, true),
        baseline: 100,
        threshold: normalizeValue(baseline?.thresholds.responseTime.warning, baseline?.metrics.averageResponseTime, true)
      },
      {
        metric: '吞吐量',
        current: normalizeValue(currentTest?.metrics.throughput, baseline?.metrics.throughput),
        baseline: 100,
        threshold: normalizeValue(baseline?.thresholds.throughput.warning, baseline?.metrics.throughput)
      },
      {
        metric: '错误率',
        current: normalizeValue(currentTest?.metrics.errorRate, Math.max(baseline?.metrics.errorRate, 1), true),
        baseline: 100,
        threshold: normalizeValue(baseline?.thresholds.errorRate.warning, Math.max(baseline?.metrics.errorRate, 1), true)
      },
      {
        metric: 'P95响应时间',
        current: normalizeValue(currentTest?.metrics.p95ResponseTime, baseline?.metrics.p95ResponseTime, true),
        baseline: 100,
        threshold: 100
      },
      {
        metric: '成功率',
        current: normalizeValue(
          (currentTest?.metrics.successfulRequests / currentTest?.metrics.totalRequests) * 100,
          (baseline?.metrics.successfulRequests / baseline?.metrics.totalRequests) * 100
        ),
        baseline: 100,
        threshold: 95
      }
    ];
  }, [currentTest, baseline]);

  // 时间序列对比数据
  const timeSeriesComparisonData = useMemo(() => {
    if (!showTimeSeriesComparison || testResults.length === 0) return [];

    const maxLength = Math.max(...testResults.map(test => test.timeSeriesData?.length || 0));

    return Array.from({ length: maxLength }, (_, index) => {
      const dataPoint: any = { time: index };

      testResults.forEach((test, testIndex) => {
        /**
         * if功能函数
         * @param {Object} params - 参数对象
         * @returns {Promise<Object>} 返回结果
         */
        const point = test.timeSeriesData?.[index];
        if (point) {
          dataPoint[`test${testIndex}_responseTime`] = point.responseTime;
          dataPoint[`test${testIndex}_throughput`] = point.throughput;
          dataPoint[`test${testIndex}_errorRate`] = point.errorRate;
        }
      });

      return dataPoint;
    });
  }, [testResults, showTimeSeriesComparison]);

  // 渲染指标对比图表
  const renderMetricsComparison = () => (
    <BarChart data={comparisonData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
      <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} />
      <YAxis stroke="#9CA3AF" fontSize={12} />
      <Tooltip
        contentStyle={{
          backgroundColor: '#1F2937',
          border: '1px solid #374151',
          borderRadius: '8px',
          color: '#F9FAFB'
        }}
      />
      <Legend />

      <Bar
        dataKey={selectedMetric}
        fill="#3B82F6"
        name={getMetricLabel(selectedMetric)}
      />

      {showBaseline && baseline && (
        <Line
          type="monotone"
          dataKey={selectedMetric}
          stroke="#10B981"
          strokeWidth={2}
          strokeDasharray="5 5"
          name="基线"
        />
      )}
    </BarChart>
  );

  // 渲染趋势图表
  const renderTrendsChart = () => (
    <ComposedChart data={trendData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
      <XAxis dataKey="testNumber" stroke="#9CA3AF" fontSize={12} />
      <YAxis yAxisId="left" stroke="#9CA3AF" fontSize={12} />
      <YAxis yAxisId="right" orientation="right" stroke="#9CA3AF" fontSize={12} />
      <Tooltip
        contentStyle={{
          backgroundColor: '#1F2937',
          border: '1px solid #374151',
          borderRadius: '8px',
          color: '#F9FAFB'
        }}
      />
      <Legend />

      <Line
        yAxisId="left"
        type="monotone"
        dataKey="averageResponseTime"
        stroke="#EF4444"
        strokeWidth={2}
        name="平均响应时间"
      />

      <Line
        yAxisId="right"
        type="monotone"
        dataKey="throughput"
        stroke="#10B981"
        strokeWidth={2}
        name="吞吐量"
      />

      <Bar
        yAxisId="right"
        dataKey="errorRate"
        fill="#F59E0B"
        opacity={0.7}
        name="错误率 (%)"
      />
    </ComposedChart>
  );

  // 渲染雷达图
  const renderRadarChart = () => (
    <RadarChart data={radarData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
      <PolarGrid stroke="#374151" />
      <PolarAngleAxis dataKey="metric" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
      <PolarRadiusAxis
        angle={90}
        domain={[0, 200]}
        tick={{ fill: '#9CA3AF', fontSize: 10 }}
      />
      <Radar
        name="当前测试"
        dataKey="current"
        stroke="#3B82F6"
        fill="#3B82F6"
        fillOpacity={0.3}
        strokeWidth={2}
      />
      <Radar
        name="基线"
        dataKey="baseline"
        stroke="#10B981"
        fill="#10B981"
        fillOpacity={0.1}
        strokeWidth={2}
        strokeDasharray="5 5"
      />
      <Legend />
      <Tooltip />
    </RadarChart>
  );

  // 渲染时间序列对比
  const renderTimeSeriesComparison = () => (
    <LineChart data={timeSeriesComparisonData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
      <XAxis dataKey="time" stroke="#9CA3AF" fontSize={12} />
      <YAxis stroke="#9CA3AF" fontSize={12} />
      <Tooltip
        contentStyle={{
          backgroundColor: '#1F2937',
          border: '1px solid #374151',
          borderRadius: '8px',
          color: '#F9FAFB'
        }}
      />
      <Legend />

      {testResults.map((test, index) => (
        <Line
          key={test.id}
          type="monotone"
          dataKey={`test${index}_${selectedMetric.replace('average', '').toLowerCase()}`}
          stroke={getTestColor(index)}
          strokeWidth={2}
          name={test.name || `测试 ${index + 1}`}
        />
      ))}
    </LineChart>
  );

  // 获取指标标签
  const getMetricLabel = (metric: string) => {
    const labels: Record<string, string> = {
      averageResponseTime: '平均响应时间 (ms)',
      throughput: '吞吐量 (req/s)',
      errorRate: '错误率 (%)',
      p95ResponseTime: 'P95响应时间 (ms)',
      totalRequests: '总请求数'
    };
    return labels[metric] || metric;
  };

  // 获取测试颜色
  const getTestColor = (index: number) => {
    const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#06B6D4'];
    return colors[index % colors.length];
  };

  return (
    <div className="space-y-4">
      {/* 控制面板 */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-gray-800/50 rounded-lg">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-300">对比类型:</span>
            <div className="flex gap-1">
              {[
                { key: 'metrics', label: '指标对比', icon: BarChart3 },
                { key: 'trends', label: '趋势分析', icon: TrendingUp },
                { key: 'radar', label: '雷达图', icon: Target },
                { key: 'timeseries', label: '时序对比', icon: GitCompare }
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setComparisonType(key as any)}
                  className={`px-3 py-1 rounded text-sm flex items-center gap-1 transition-colors ${comparisonType === key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {(comparisonType === 'metrics' || comparisonType === 'timeseries') && (
            <div className="flex items-center gap-2">
              <label htmlFor="metric-select" className="text-sm text-gray-300">指标:</label>
              <select
                id="metric-select"
                value={selectedMetric}
                onChange={(e) => setSelectedMetric(e?.target.value)}
                className="px-3 py-1 bg-gray-700 text-gray-300 rounded text-sm"
                aria-label="选择对比指标"
              >
                <option value="averageResponseTime">平均响应时间</option>
                <option value="throughput">吞吐量</option>
                <option value="errorRate">错误率</option>
                <option value="p95ResponseTime">P95响应时间</option>
                <option value="totalRequests">总请求数</option>
              </select>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {baseline && (
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={showBaseline}
                onChange={(e) => setShowBaseline(e?.target.checked)}
                className="rounded"
              />
              显示基线
            </label>
          )}

          <button
            type="button"
            className="px-3 py-1 bg-gray-700 text-gray-300 rounded text-sm hover:bg-gray-600 flex items-center gap-1"
          >
            <Download className="w-4 h-4" />
            导出
          </button>
        </div>
      </div>

      {/* 图表区域 */}
      <div className="bg-gray-800/50 rounded-lg p-4" style={{ height: `${height}px` }}>
        <ResponsiveContainer width="100%" height="100%">
          {(() => {
            switch (comparisonType) {
              case 'metrics':
                return renderMetricsComparison();
              case 'trends':
                return renderTrendsChart();
              case 'radar':
                return renderRadarChart();
              case 'timeseries':
                return renderTimeSeriesComparison();
              default:
                return renderMetricsComparison();
            }
          })()}
        </ResponsiveContainer>
      </div>

      {/* 对比统计 */}
      {comparisonData.length > 1 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-800/50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-300 mb-2">最佳性能</h4>
            <div className="text-lg font-bold text-green-400">
              {comparisonData.reduce((best, current) =>
                current.averageResponseTime < best.averageResponseTime ? current : best
              ).name}
            </div>
            <div className="text-sm text-gray-400">
              响应时间: {Math.min(...comparisonData.map(d => d.averageResponseTime))}ms
            </div>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-300 mb-2">最高吞吐量</h4>
            <div className="text-lg font-bold text-blue-400">
              {comparisonData.reduce((best, current) =>
                current.throughput > best.throughput ? current : best
              ).name}
            </div>
            <div className="text-sm text-gray-400">
              吞吐量: {Math.max(...comparisonData.map(d => d.throughput))} req/s
            </div>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-300 mb-2">最低错误率</h4>
            <div className="text-lg font-bold text-purple-400">
              {comparisonData.reduce((best, current) =>
                current.errorRate < best.errorRate ? current : best
              ).name}
            </div>
            <div className="text-sm text-gray-400">
              错误率: {Math.min(...comparisonData.map(d => d.errorRate))}%
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestComparisonCharts;
