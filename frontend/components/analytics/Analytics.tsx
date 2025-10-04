/**
 * 高级数据分析组件
 * 提供数据挖掘、智能分析、机器学习预测和可视化功能
 */

// Type helper
const asAny = (x: any) => x;


import React, { useState, useEffect } from 'react';
import {BarChart3, TrendingUp, Brain, Download, RefreshCw, AlertCircle, CheckCircle, Target, Activity, FileText, PieChart, Layers, Eye, Share2, Lightbulb} from 'lucide-react';
import {Line, Doughnut} from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { toast } from 'react-hot-toast';
import {format, subDays} from 'date-fns';

// 注册Chart.js组件
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
);


interface AnalysisResult {
  id: string;
  name: string;
  type: 'trend' | 'correlation' | 'anomaly' | 'prediction' | 'segmentation';
  data: any;
  insights: Insight[];
  confidence: number;
  generatedAt: Date;
}

interface Insight {
  id: string;
  type: 'info' | 'warning' | 'success' | 'error';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  recommendation?: string;
  value?: number | string;
  trend?: 'up' | 'down' | 'stable';
}

interface AnalysisConfig {
  dataSource: string;
  timeRange: {
    start: Date;
    end: Date;
  };
  metrics: string[];
  dimensions: string[];
  filters: Record<string, any>;
  analysisTypes: string[];
}

const AdvancedAnalytics: React.FC = () => {
  // 状态管理
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);
  const [selectedAnalysis, setSelectedAnalysis] = useState<AnalysisResult | null>(null);
  const [config] = useState<AnalysisConfig>({
    dataSource: 'test_results',
    timeRange: {
      start: subDays(new Date(), 30),
      end: new Date()
    },
    metrics: ['performance_score', 'response_time', 'error_rate'],
    dimensions: ['test_type', 'browser', 'region'],
    filters: {},
    analysisTypes: ['trend', 'correlation', 'anomaly', 'prediction']
  });
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'detailed' | 'comparison'>('grid');
  
  // 生成模拟分析结果
  const generateMockAnalysisResults = (): AnalysisResult[] => {
    const results: AnalysisResult[] = [];
    
    // 趋势分析
    results.push({
      id: 'trend_performance',
      name: '性能趋势分析',
      type: 'trend',
      data: {
        chartData: {
          labels: Array.from({ length: 30 }, (_, i) => 
            format(subDays(new Date(), 29 - i), 'MM-dd')
          ),
          datasets: [{
            label: '平均性能分数',
            data: Array.from({ length: 30 }, () => Math.random() * 20 + 75),
            borderColor: '#3B82F6',
            backgroundColor: '#3B82F640',
            tension: 0.4,
            fill: true
          }]
        },
        trend: 'up',
        changePercent: 12.5
      },
      insights: [
        {
          id: 'insight_1',
          type: 'success',
          title: '性能持续改善',
          description: '过去30天内性能分数平均提升了12.5%',
          impact: 'high',
          recommendation: '继续优化图片压缩和缓存策略',
          trend: 'up'
        },
        {
          id: 'insight_2',
          type: 'info',
          title: '周末性能更好',
          description: '周末的性能分数比工作日高出8%',
          impact: 'medium'
        }
      ],
      confidence: 0.92,
      generatedAt: new Date()
    });

    // 异常检测
    results.push({
      id: 'anomaly_errors',
      name: '错误率异常检测',
      type: 'anomaly',
      data: {
        anomalies: [
          {
            timestamp: subDays(new Date(), 7),
            value: 15.2,
            threshold: 5.0,
            severity: 'high'
          },
          {
            timestamp: subDays(new Date(), 3),
            value: 8.7,
            threshold: 5.0,
            severity: 'medium'
          }
        ],
        chartData: {
          labels: Array.from({ length: 30 }, (_, i) => 
            format(subDays(new Date(), 29 - i), 'MM-dd')
          ),
          datasets: [
            {
              label: '错误率',
              data: Array.from({ length: 30 }, (_, i) => {
                let base = Math.random() * 3 + 1;
                if (i === 22) base = 15.2; // 7天前异常
                if (i === 26) base = 8.7;  // 3天前异常
                return base;
              }),
              borderColor: '#EF4444',
              backgroundColor: '#EF444440',
              tension: 0.3
            },
            {
              label: '阈值',
              data: Array(30).fill(5.0),
              borderColor: '#F59E0B',
              borderDash: [5, 5],
              fill: false
            }
          ]
        }
      },
      insights: [
        {
          id: 'anomaly_1',
          type: 'error',
          title: '检测到错误率异常峰值',
          description: '7天前错误率达到15.2%，远超正常阈值5%',
          impact: 'high',
          recommendation: '检查服务器日志，排查系统故障原因'
        },
        {
          id: 'anomaly_2',
          type: 'warning',
          title: '错误率波动较大',
          description: '过去30天内错误率变异系数为2.3，建议监控系统稳定性',
          impact: 'medium'
        }
      ],
      confidence: 0.87,
      generatedAt: new Date()
    });

    // 相关性分析
    results.push({
      id: 'correlation_metrics',
      name: '指标相关性分析',
      type: 'correlation',
      data: {
        correlationMatrix: {
          metrics: ['性能分数', '响应时间', '错误率', '用户满意度'],
          values: [
            [1.00, -0.85, -0.72, 0.89],
            [-0.85, 1.00, 0.68, -0.74],
            [-0.72, 0.68, 1.00, -0.69],
            [0.89, -0.74, -0.69, 1.00]
          ]
        },
        strongCorrelations: [
          { metric1: '性能分数', metric2: '用户满意度', correlation: 0.89 },
          { metric1: '性能分数', metric2: '响应时间', correlation: -0.85 }
        ]
      },
      insights: [
        {
          id: 'corr_1',
          type: 'success',
          title: '性能与满意度强相关',
          description: '性能分数与用户满意度相关系数达0.89',
          impact: 'high',
          recommendation: '继续关注性能优化，直接影响用户体验'
        }
      ],
      confidence: 0.95,
      generatedAt: new Date()
    });

    // 预测分析
    results.push({
      id: 'prediction_traffic',
      name: '流量预测分析',
      type: 'prediction',
      data: {
        chartData: {
          labels: Array.from({ length: 14 }, (_, i) => 
            format(new Date(Date.now() + i * 24 * 60 * 60 * 1000), 'MM-dd')
          ),
          datasets: [
            {
              label: '历史数据',
              data: Array.from({ length: 7 }, () => Math.random() * 1000 + 2000),
              borderColor: '#6B7280',
              backgroundColor: '#6B728040',
              tension: 0.4
            },
            {
              label: '预测数据',
              data: [
                null, null, null, null, null, null, null,
                ...Array.from({ length: 7 }, () => Math.random() * 1200 + 2200)
              ],
              borderColor: '#8B5CF6',
              backgroundColor: '#8B5CF640',
              borderDash: [5, 5],
              tension: 0.4
            }
          ]
        },
        confidence: [0.8, 0.75, 0.7, 0.68, 0.65, 0.62, 0.6]
      },
      insights: [
        {
          id: 'pred_1',
          type: 'info',
          title: '流量将持续增长',
          description: '预计下周平均日访问量将增长15%',
          impact: 'medium',
          recommendation: '提前准备服务器扩容方案',
          trend: 'up'
        }
      ],
      confidence: 0.78,
      generatedAt: new Date()
    });

    // 用户细分
    results.push({
      id: 'segmentation_users',
      name: '用户群体细分',
      type: 'segmentation',
      data: {
        segments: [
          { name: '高价值用户', count: 1250, percentage: 25, avgValue: 850 },
          { name: '活跃用户', count: 2500, percentage: 50, avgValue: 420 },
          { name: '潜在流失用户', count: 750, percentage: 15, avgValue: 180 },
          { name: '新用户', count: 500, percentage: 10, avgValue: 120 }
        ],
        chartData: {
          labels: ['高价值用户', '活跃用户', '潜在流失用户', '新用户'],
          datasets: [{
            data: [25, 50, 15, 10],
            backgroundColor: ['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6'],
            borderWidth: 0
          }]
        }
      },
      insights: [
        {
          id: 'seg_1',
          type: 'warning',
          title: '15%用户有流失风险',
          description: '潜在流失用户群体需要重点关注',
          impact: 'high',
          recommendation: '制定用户挽留策略，如个性化推荐、优惠活动等'
        }
      ],
      confidence: 0.83,
      generatedAt: new Date()
    });

    return results;
  };

  // 初始化数据
  useEffect(() => {
    setAnalysisResults(generateMockAnalysisResults());
  }, []);

  // 执行分析
  const runAnalysis = async () => {
    setIsLoading(true);
    
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const newResults = generateMockAnalysisResults();
      setAnalysisResults(newResults);
      
      toast.success('分析完成！发现了多项有价值的洞察');
    } catch (error) {
      toast.error('分析失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  // 导出分析报告
  const exportReport = () => {
    const reportData = {
      generatedAt: new Date().toISOString(),
      config,
      results: analysisResults,
      summary: {
        totalAnalyses: analysisResults.length,
        totalInsights: analysisResults.reduce((acc, result) => acc + result.insights.length, 0),
        avgConfidence: analysisResults.reduce((acc, result) => acc + result.confidence, 0) / analysisResults.length
      }
    };
    
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-report-${format(new Date(), 'yyyy-MM-dd')}.json`;
    a?.click();
    URL.revokeObjectURL(url);
    
    toast.success('报告已导出');
  };

  // 获取洞察类型图标
  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'success': return CheckCircle;
      case 'warning': return AlertCircle;
      case 'error': return AlertCircle;
      case 'info': default: return Lightbulb;
    }
  };

  // 获取洞察类型样式
  const getInsightStyle = (type: string) => {
    switch (type) {
      case 'success': return 'bg-green-50 border-green-200 text-green-800';
      case 'warning': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'error': return 'bg-red-50 border-red-200 text-red-800';
      case 'info': default: return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  // 渲染分析卡片
  const renderAnalysisCard = (analysis: AnalysisResult) => {
    const getTypeIcon = (type: string) => {
      switch (type) {
        case 'trend': return TrendingUp;
        case 'correlation': return Activity;
        case 'anomaly': return AlertCircle;
        case 'prediction': return Brain;
        case 'segmentation': return PieChart;
        default: return BarChart3;
      }
    };

    const getTypeColor = (type: string) => {
      switch (type) {
        case 'trend': return 'text-green-600';
        case 'correlation': return 'text-purple-600';
        case 'anomaly': return 'text-red-600';
        case 'prediction': return 'text-blue-600';
        case 'segmentation': return 'text-orange-600';
        default: return 'text-gray-600';
      }
    };

    const TypeIcon = getTypeIcon(analysis.type);
    
    return (
      <div 
        key={analysis.id}
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => setSelectedAnalysis(analysis)}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg bg-gray-100 ${getTypeColor(analysis.type)}`}>
              <TypeIcon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{analysis.name}</h3>
              <p className="text-sm text-gray-500">
                置信度: {Math.round(analysis.confidence * 100)}%
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={(e) => {
                e?.stopPropagation();
                toast.success('分析已分享');
              }}
              className="p-1 text-gray-400 hover:text-gray-600"
              title="分享"
            >
              <Share2 className="h-4 w-4" />
            </button>
            <button
              onClick={(e) => {
                e?.stopPropagation();
                setSelectedAnalysis(analysis);
              }}
              className="p-1 text-gray-400 hover:text-gray-600"
              title="查看详情"
            >
              <Eye className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* 简化图表预览 */}
        {analysis.data.chartData && (
          <div className="h-32 mb-4">
            {analysis.type === 'segmentation' ? (
              <Doughnut 
                data={analysis.data.chartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false }
                  }
                }}
              />
            ) : (
              <Line 
                data={analysis.data.chartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false }
                  },
                  scales: {
                    x: { display: false },
                    y: { display: false }
                  },
                  elements: {
                    point: { radius: 0 }
                  }
                }}
              />
            )}
          </div>
        )}

        {/* 关键洞察预览 */}
        <div className="space-y-2">
          {analysis.insights.slice(0, 2).map(insight => {
            const InsightIcon = getInsightIcon(insight.type);
            
            return (
              <div 
                key={insight.id}
                className={`p-3 rounded-lg border ${getInsightStyle(insight.type)}`}
              >
                <div className="flex items-start space-x-2">
                  <InsightIcon className="h-4 w-4 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium">{insight.title}</h4>
                    <p className="text-xs opacity-80 mt-1">
                      {insight.description.length > 60 
                        ? insight.description.substring(0, 60) + '...'
                        : insight.description
                      }
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
          
          {analysis.insights.length > 2 && (
            <p className="text-xs text-gray-500 text-center">
              还有 {analysis.insights.length - 2} 项洞察...
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Brain className="h-8 w-8 text-purple-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">智能数据分析</h1>
                <p className="text-sm text-gray-600">深度挖掘数据洞察，驱动业务决策</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={exportReport}
                className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                <Download className="h-4 w-4 mr-2" />
                导出报告
              </button>
              
              <button
                onClick={runAnalysis}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                {isLoading ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Brain className="h-4 w-4 mr-2" />
                )}
                {isLoading ? '分析中...' : '运行分析'}
              </button>
            </div>
          </div>
        </div>

        {/* 分析配置面板 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">分析配置</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">数据源</label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                <option value="test_results">测试结果</option>
                <option value="user_behavior">用户行为</option>
                <option value="system_metrics">系统指标</option>
                <option value="business_data">业务数据</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">时间范围</label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                <option value="7d">过去7天</option>
                <option value="30d">过去30天</option>
                <option value="90d">过去90天</option>
                <option value="custom">自定义</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">分析类型</label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                <option value="comprehensive">综合分析</option>
                <option value="trend">趋势分析</option>
                <option value="anomaly">异常检测</option>
                <option value="prediction">预测分析</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">视图模式</label>
              <select 
                value={viewMode}
                onChange={(e) => setViewMode(e?.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="grid">网格视图</option>
                <option value="detailed">详细视图</option>
                <option value="comparison">对比视图</option>
              </select>
            </div>
          </div>
        </div>

        {/* 分析结果总览 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-lg">
                <BarChart3 className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">分析模型</p>
                <p className="text-2xl font-bold text-gray-900">{analysisResults.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Lightbulb className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">发现洞察</p>
                <p className="text-2xl font-bold text-gray-900">
                  {analysisResults.reduce((acc, result) => acc + result.insights.length, 0)}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <Target className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">平均置信度</p>
                <p className="text-2xl font-bold text-gray-900">
                  {analysisResults.length > 0 
                    ? Math.round(analysisResults.reduce((acc, result) => acc + result.confidence, 0) / analysisResults.length * 100)
                    : 0
                  }%
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <AlertCircle className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">异常事件</p>
                <p className="text-2xl font-bold text-gray-900">
                  {analysisResults
                    .filter(result => result.type === 'anomaly')
                    .reduce((acc, result) => acc + (result.data.anomalies?.length || 0), 0)
                  }
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 分析结果展示 */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">分析结果</h2>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-purple-100 text-purple-600' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <Layers className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('detailed')}
                  className={`p-2 rounded-lg ${viewMode === 'detailed' ? 'bg-purple-100 text-purple-600' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <FileText className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="p-6">
            {viewMode === 'grid' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {analysisResults.map(analysis => renderAnalysisCard(analysis))}
              </div>
            )}

            {viewMode === 'detailed' && selectedAnalysis && (
              <div className="space-y-6">
                {/* 详细分析视图 */}
                <div className="border border-gray-200 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">
                    {selectedAnalysis.name}
                  </h3>
                  
                  {/* 图表展示 */}
                  {selectedAnalysis.data.chartData && (
                    <div className="h-80 mb-6">
                      {selectedAnalysis.type === 'segmentation' ? (
                        <Doughnut 
                          data={selectedAnalysis.data.chartData}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              legend: { 
                                position: 'bottom',
                                labels: { padding: 20 }
                              }
                            }
                          }}
                        />
                      ) : selectedAnalysis.type === 'correlation' ? (
                        <div className="bg-gray-50 rounded-lg p-4">
                          <h4 className="text-sm font-medium text-gray-700 mb-3">指标相关性矩阵</h4>
                          <div className="grid grid-cols-4 gap-2 text-sm">
                            {selectedAnalysis.data.correlationMatrix.metrics.map((metric: string, i: number) => (
                              <div key={i} className="text-center font-medium text-gray-600">{metric}</div>
                            ))}
                            {selectedAnalysis.data.correlationMatrix.values.map((row: number[], i: number) => 
                              row.map((value: number, j: number) => (
                                <div 
                                  key={`${i}-${j}`}
                                  className={`text-center p-2 rounded ${
                                    Math.abs(value) > 0.7 ? 'bg-red-100 text-red-800' :
                                    Math.abs(value) > 0.5 ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-green-100 text-green-800'
                                  }`}
                                >
                                  {value?.toFixed(2)}
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      ) : (
                        <Line 
                          data={selectedAnalysis.data.chartData}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              legend: { 
                                position: 'bottom',
                                labels: { padding: 20 }
                              },
                              tooltip: {
                                mode: 'index',
                                intersect: false
                              }
                            },
                            scales: {
                              x: {
                                display: true,
                                title: { display: true, text: '时间' }
                              },
                              y: {
                                display: true,
                                title: { display: true, text: '数值' }
                              }
                            }
                          }}
                        />
                      )}
                    </div>
                  )}
                  
                  {/* 洞察列表 */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-gray-900">关键洞察</h4>
                    {selectedAnalysis.insights.map(insight => {
                      const InsightIcon = getInsightIcon(insight.type);
                      
                      return (
                        <div 
                          key={insight.id}
                          className={`p-4 rounded-lg border ${getInsightStyle(insight.type)}`}
                        >
                          <div className="flex items-start space-x-3">
                            <InsightIcon className="h-5 w-5 mt-1" />
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <h5 className="font-medium">{insight.title}</h5>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  insight.impact === 'high' ? 'bg-red-100 text-red-700' :
                                  insight.impact === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {insight.impact === 'high' ? '高影响' :
                                   insight.impact === 'medium' ? '中影响' : '低影响'}
                                </span>
                              </div>
                              <p className="text-sm opacity-90 mt-1">{insight.description}</p>
                              {insight.recommendation && (
                                <div className="mt-2 p-2 bg-white bg-opacity-50 rounded border-l-4 border-current">
                                  <p className="text-sm font-medium">💡 建议</p>
                                  <p className="text-sm">{insight.recommendation}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {analysisResults.length === 0 && (
              <div className="text-center py-12">
                <Brain className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">暂无分析结果</h3>
                <p className="mt-1 text-sm text-gray-500">
                  点击"运行分析"开始数据挖掘和洞察发现
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedAnalytics;
