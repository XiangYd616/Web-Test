
import React, { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, LineChart, Pie, PieChart, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { TestResult } from '../../services/advancedTestEngine';

// CSS样式已迁移到组件库，不再需要外部CSS文件

interface AdvancedTestChartsProps {
  results: TestResult | TestResult[];
  testType: string;
  theme?: 'dark' | 'light';
  height?: number;
  interactive?: boolean;
  showComparison?: boolean;
}

export const AdvancedTestCharts: React.FC<AdvancedTestChartsProps> = ({
  results,
  testType,
  theme = 'dark',
  height = 400,
  interactive = true,
  showComparison = false
}) => {
  const [selectedChart, setSelectedChart] = useState<'overview' | 'metrics' | 'trends' | 'findings'>('overview');

  const resultsArray = Array.isArray(results) ? results : [results];
  const latestResult = resultsArray[0];

  const colors = {
    dark: {
      primary: '#3B82F6',
      success: '#10B981',
      warning: '#F59E0B',
      danger: '#EF4444',
      info: '#06B6D4',
      purple: '#8B5CF6',
      pink: '#EC4899',
      indigo: '#6366F1'
    },
    light: {
      primary: '#2563EB',
      success: '#059669',
      warning: '#D97706',
      danger: '#DC2626',
      info: '#0891B2',
      purple: '#7C3AED',
      pink: '#DB2777',
      indigo: '#4F46E5'
    }
  };

  const currentColors = colors[theme];
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

  // 生成总览数据
  const overviewData = useMemo(() => {
    if (!latestResult) return [];

    const data = [];

    // 获取总体评分，支持多种数据结构
    const overallScore = latestResult.overallScore ||
      (latestResult as any).securityScore ||
      (latestResult.scores && latestResult.scores.overall) ||
      0;

    // 基础分数
    data.push({
      name: '总体评分',
      score: overallScore,
      target: 90,
      color: currentColors.primary
    });

    // 处理测试结果中的各种测试类型
    const tests = latestResult.tests || {};

    // 添加各个测试类型的分数
    if (tests.performance) {
      const perfScore = tests.performance.score || tests.performance.metrics?.score || 0;
      data.push({
        name: '性能测试',
        score: perfScore,
        target: 90,
        color: currentColors.success
      });
    }

    // 特殊处理SEO测试 - 支持直接SEO结果和嵌套结构
    if (tests.seo || (testType === 'seo' && latestResult.scores)) {
      const seoScore = tests.seo?.score || latestResult.overallScore || 0;
      data.push({
        name: 'SEO分析',
        score: seoScore,
        target: 85,
        color: currentColors.warning
      });

      // 如果是SEO测试类型，添加详细的SEO分数
      if (testType === 'seo' && latestResult.scores) {
        const scores = latestResult.scores;
        data.push(
          { name: '技术SEO', score: Math.round(scores.technical || 0), target: 90, color: currentColors.primary },
          { name: '内容质量', score: Math.round(scores.content || 0), target: 90, color: currentColors.info },
          { name: '页面SEO', score: Math.round(scores.onPage || 0), target: 90, color: currentColors.purple },
          { name: '性能因素', score: Math.round(scores.performance || 0), target: 90, color: currentColors.success },
          { name: '移动端', score: Math.round(scores.mobile || 0), target: 90, color: currentColors.pink }
        );
      }
    }

    if (tests.security) {
      const secScore = tests.security.score || 0;
      data.push({
        name: '安全检测',
        score: secScore,
        target: 95,
        color: currentColors.danger
      });
    }

    if (tests.accessibility) {
      const accScore = tests.accessibility.score || 0;
      data.push({
        name: '可访问性',
        score: accScore,
        target: 95,
        color: currentColors.info
      });
    }

    if (tests.compatibility) {
      const compScore = tests.compatibility.score || 0;
      data.push({
        name: '兼容性',
        score: compScore,
        target: 85,
        color: currentColors.purple
      });
    }

    if (tests.api) {
      const apiScore = tests.api.score || 0;
      data.push({
        name: 'API测试',
        score: apiScore,
        target: 80,
        color: currentColors.pink
      });
    }

    if (tests.connectivity) {
      const connScore = tests.connectivity.score || 0;
      data.push({
        name: '连接测试',
        score: connScore,
        target: 95,
        color: currentColors.indigo
      });
    }

    // 如果没有找到任何测试数据，创建默认数据
    if (data.length === 1) {
      data.push({
        name: '暂无数据',
        score: 0,
        target: 100,
        color: currentColors.info
      });
    }

    return data;
  }, [latestResult, testType, currentColors]);

  // 生成Core Web Vitals数据（性能测试专用）
  const coreWebVitalsData = useMemo(() => {
    if (testType !== 'performance' || !latestResult?.metrics) return [];

    const metrics = latestResult.metrics;
    return [
      {
        metric: 'LCP',
        value: metrics.lcp || 0,
        threshold: 2.5,
        unit: 's',
        score: metrics.lcp <= 2.5 ? 100 : metrics.lcp <= 4.0 ? 70 : 30
      },
      {
        metric: 'FID',
        value: metrics.fid || 0,
        threshold: 100,
        unit: 'ms',
        score: metrics.fid <= 100 ? 100 : metrics.fid <= 300 ? 70 : 30
      },
      {
        metric: 'CLS',
        value: metrics.cls || 0,
        threshold: 0.1,
        unit: '',
        score: metrics.cls <= 0.1 ? 100 : metrics.cls <= 0.25 ? 70 : 30
      },
      {
        metric: 'FCP',
        value: metrics.fcp || 0,
        threshold: 1.8,
        unit: 's',
        score: metrics.fcp <= 1.8 ? 100 : metrics.fcp <= 3.0 ? 70 : 30
      }
    ];
  }, [latestResult, testType]);

  // 生成发现问题的分布数据
  const findingsData = useMemo(() => {
    // 支持多种问题数据结构
    const findings = latestResult?.findings || (latestResult as any)?.vulnerabilities || latestResult?.issues || [];
    if (!findings || findings.length === 0) return [];

    const severityCount = findings.reduce((acc: Record<string, number>, finding: any) => {
      const severity = finding.severity || finding.level || 'low';
      acc[severity] = (acc[severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return [
      { name: '严重', value: severityCount.critical || 0, color: currentColors.danger },
      { name: '高危', value: severityCount.high || severityCount['高'] || 0, color: '#F97316' },
      { name: '中危', value: severityCount.medium || severityCount['中'] || 0, color: currentColors.warning },
      { name: '低危', value: severityCount.low || severityCount['低'] || 0, color: currentColors.success }
    ].filter(item => item.value > 0);
  }, [latestResult, currentColors]);

  // 生成趋势数据（多个结果时）
  const trendsData = useMemo(() => {
    if (resultsArray.length < 2) return [];

    return resultsArray.slice(0, 10).reverse().map((result, index) => ({
      test: `测试 ${index + 1}`,
      timestamp: new Date(result.timestamp).toLocaleDateString(),
      overallScore: result.overallScore || 0,
      duration: result.duration || 0,
      findings: (result.findings || result.issues || []).length
    }));
  }, [resultsArray]);

  const renderChart = () => {
    switch (selectedChart) {
      case 'metrics':
        if (testType === 'performance' && coreWebVitalsData.length > 0) {
          return (
            <ComposedChart data={coreWebVitalsData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="metric" stroke={textColor} fontSize={12} />
              <YAxis yAxisId="left" stroke={textColor} fontSize={12} />
              <YAxis yAxisId="right" orientation="right" stroke={textColor} fontSize={12} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <Bar yAxisId="left" dataKey="score" fill={currentColors.primary} name="评分" />
              <Line yAxisId="right" type="monotone" dataKey="value" stroke={currentColors.danger} strokeWidth={2} name="实际值" />
            </ComposedChart>
          );
        }
        return (
          <BarChart data={overviewData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis dataKey="name" stroke={textColor} fontSize={12} />
            <YAxis domain={[0, 100]} stroke={textColor} fontSize={12} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend />
            <Bar dataKey="score" fill={currentColors.primary} name="当前评分" />
            <Bar dataKey="target" fill={gridColor} name="目标评分" opacity={0.3} />
          </BarChart>
        );

      case 'trends':
        if (trendsData.length === 0) {
          return (
            <div className="flex items-center justify-center h-full">
              <p className={`text-${theme === 'dark' ? 'gray-400' : 'gray-600'}`}>
                需要多次测试结果才能显示趋势图
              </p>
            </div>
          );
        }
        return (
          <LineChart data={trendsData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis dataKey="test" stroke={textColor} fontSize={12} />
            <YAxis stroke={textColor} fontSize={12} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend />
            <Line type="monotone" dataKey="overallScore" stroke={currentColors.primary} strokeWidth={2} name="总体评分" />
            <Line type="monotone" dataKey="findings" stroke={currentColors.danger} strokeWidth={2} name="问题数量" />
          </LineChart>
        );

      case 'findings':
        if (findingsData.length === 0) {
          return (
            <div className="flex items-center justify-center h-full">
              <p className={`text-${theme === 'dark' ? 'gray-400' : 'gray-600'}`}>
                未发现安全问题
              </p>
            </div>
          );
        }
        return (
          <PieChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <Pie
              data={findingsData}
              cx="50%"
              cy="50%"
              outerRadius={100}
              dataKey="value"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            >
              {findingsData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
            <Legend />
          </PieChart>
        );

      default: // overview
        if (overviewData.length === 0) {
          return (
            <div className="flex items-center justify-center h-full">
              <p className={`text-${theme === 'dark' ? 'gray-400' : 'gray-600'}`}>
                暂无测试数据
              </p>
            </div>
          );
        }
        return (
          <RadarChart data={overviewData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <PolarGrid stroke={gridColor} />
            <PolarAngleAxis dataKey="name" tick={{ fill: textColor, fontSize: 12 }} />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={{ fill: textColor, fontSize: 10 }}
              tickCount={6}
            />
            <Radar
              name="当前评分"
              dataKey="score"
              stroke={currentColors.primary}
              fill={currentColors.primary}
              fillOpacity={0.3}
              strokeWidth={2}
            />
            <Radar
              name="目标评分"
              dataKey="target"
              stroke={gridColor}
              fill="none"
              strokeWidth={1}
              strokeDasharray="5 5"
            />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend />
          </RadarChart>
        );
    }
  };

  if (!latestResult) {
    return (
      <div className={`p-6 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-white border'}`}>
        <p className={`text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
          暂无测试结果
        </p>
      </div>
    );
  }

  return (
    <div className={`p-6 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-white border'}`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          测试结果分析
        </h3>

        {interactive && (
          <div className="flex gap-2">
            {['overview', 'metrics', 'trends', 'findings'].map((chart) => (
              <button
                key={chart}
                type="button"
                onClick={() => setSelectedChart(chart as any)}
                className={`px-3 py-1 rounded text-sm transition-colors ${selectedChart === chart
                  ? 'bg-blue-600 text-white'
                  : theme === 'dark'
                    ? 'bg-gray-700 text-white hover:bg-gray-600'
                    : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  }`}
              >
                {chart === 'overview' && '总览'}
                {chart === 'metrics' && '指标'}
                {chart === 'trends' && '趋势'}
                {chart === 'findings' && '问题'}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="chart-container" style={{ height: `${height}px` }}>
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>

      {/* 测试摘要 */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={`p-3 rounded ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
          <div className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>总体评分</div>
          <div className={`text-xl font-bold ${(latestResult.overallScore || (latestResult as any).securityScore || 0) >= 90 ? 'text-green-500' :
            (latestResult.overallScore || (latestResult as any).securityScore || 0) >= 70 ? 'text-yellow-500' : 'text-red-500'
            }`}>
            {Math.round(latestResult.overallScore || (latestResult as any).securityScore || 0)}
          </div>
        </div>

        <div className={`p-3 rounded ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
          <div className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>测试时长</div>
          <div className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {latestResult.duration ? latestResult.duration.toFixed(1) : '0.0'}s
          </div>
        </div>

        <div className={`p-3 rounded ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
          <div className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>发现问题</div>
          <div className={`text-xl font-bold ${(latestResult.findings || (latestResult as any).vulnerabilities || []).length === 0 ? 'text-green-500' :
            (latestResult.findings || (latestResult as any).vulnerabilities || []).length <= 3 ? 'text-yellow-500' : 'text-red-500'
            }`}>
            {(latestResult.findings || (latestResult as any).vulnerabilities || []).length}
          </div>
        </div>

        <div className={`p-3 rounded ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
          <div className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>测试引擎</div>
          <div className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {latestResult.engine}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedTestCharts;
