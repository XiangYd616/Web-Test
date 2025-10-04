/**
 * Test Trend Analyzer
 * Advanced analytics for test results with predictive insights and anomaly detection
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {TrendingUp, TrendingDown, BarChart3, Target, Filter, Eye} from 'lucide-react';

export interface TestMetric {
  testType: string;
  timestamp: string;
  score: number;
  duration: number;
  success: boolean;
  issues: number;
  metadata: {
    environment: string;
    version: string;
    branch: string;
    [key: string]: any;
  };
}

export interface TrendAnalysis {
  testType: string;
  period: '7d' | '30d' | '90d' | '1y';
  trend: 'improving' | 'declining' | 'stable';
  changeRate: number; // percentage change
  confidenceScore: number; // 0-1
  predictions: {
    nextWeek: {
      expectedScore: number;
      confidence: number;
      trend: 'up' | 'down' | 'stable';
    };
    nextMonth: {
      expectedScore: number;
      confidence: number;
      trend: 'up' | 'down' | 'stable';
    };
  };
  anomalies: {
    timestamp: string;
    score: number;
    expectedRange: [number, number];
    severity: 'low' | 'medium' | 'high';
    possibleCauses: string[];
  }[];
  insights: {
    type: 'improvement' | 'regression' | 'pattern' | 'recommendation';
    message: string;
    confidence: number;
    actionItems: string[];
  }[];
}

export interface BusinessImpactMetrics {
  qualityScore: number;
  riskScore: number;
  productivityImpact: number;
  costSavings: number;
  timeToMarket: number;
  customerSatisfaction: number;
  recommendations: {
    priority: 'critical' | 'high' | 'medium' | 'low';
    impact: string;
    effort: string;
    roi: number;
    description: string;
  }[];
}

interface TestTrendAnalyzerProps {
  metrics: TestMetric[];
  timeRange: '7d' | '30d' | '90d' | '1y';
  testTypes: string[];
  onInsightAction?: (insight: any) => void;
}

export const TestTrendAnalyzer: React.FC<TestTrendAnalyzerProps> = ({
  metrics,
  timeRange = '30d',
  testTypes = [],
  onInsightAction
}) => {
  const [selectedTestType, setSelectedTestType] = useState<string>('all');
  const [analysisMode, setAnalysisMode] = useState<'trend' | 'anomaly' | 'prediction' | 'business'>('trend');
  const [filteredMetrics, setFilteredMetrics] = useState<TestMetric[]>([]);

  // Filter metrics based on selection
  useEffect(() => {
    let filtered = metrics;

    // Filter by test type
    if (selectedTestType !== 'all') {
      filtered = filtered.filter(m => m.testType === selectedTestType);
    }

    // Filter by time range
    const now = new Date();
    const timeRangeMs = {
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000,
      '1y': 365 * 24 * 60 * 60 * 1000
    };

    filtered = filtered.filter(m => {
      const metricTime = new Date(m.timestamp);
      return (now.getTime() - metricTime.getTime()) <= timeRangeMs[timeRange];
    });

    setFilteredMetrics(filtered);
  }, [metrics, selectedTestType, timeRange]);

  // Calculate trend analysis
  const trendAnalysis = useMemo((): TrendAnalysis[] => {
    const testTypes = selectedTestType === 'all' 
      ? [...new Set(filteredMetrics.map(m => m.testType))]
      : [selectedTestType];

    return testTypes.map(testType => {
      const typeMetrics = filteredMetrics.filter(m => m.testType === testType);
      
      if (typeMetrics.length < 2) {
        return {
          testType,
          period: timeRange,
          trend: 'stable' as const,
          changeRate: 0,
          confidenceScore: 0,
          predictions: {
            nextWeek: { expectedScore: 0, confidence: 0, trend: 'stable' as const },
            nextMonth: { expectedScore: 0, confidence: 0, trend: 'stable' as const }
          },
          anomalies: [],
          insights: []
        };
      }

      // Sort by timestamp
      const sortedMetrics = typeMetrics.sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      // Calculate trend
      const firstHalf = sortedMetrics.slice(0, Math.floor(sortedMetrics.length / 2));
      const secondHalf = sortedMetrics.slice(Math.floor(sortedMetrics.length / 2));
      
      const firstHalfAvg = firstHalf.reduce((sum, m) => sum + m.score, 0) / firstHalf.length;
      const secondHalfAvg = secondHalf.reduce((sum, m) => sum + m.score, 0) / secondHalf.length;
      
      const changeRate = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;
      const trend = Math.abs(changeRate) < 2 ? 'stable' : 
                   changeRate > 0 ? 'improving' : 'declining';

      // Detect anomalies
      const scores = sortedMetrics.map(m => m.score);
      const mean = scores.reduce((sum, s) => sum + s, 0) / scores.length;
      const stdDev = Math.sqrt(scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length);

      const anomalies = sortedMetrics
        .map(m => ({
          timestamp: m.timestamp,
          score: m.score,
          expectedRange: [mean - 2 * stdDev, mean + 2 * stdDev] as [number, number],
          severity: Math.abs(m.score - mean) > 3 * stdDev ? 'high' as const :
                   Math.abs(m.score - mean) > 2 * stdDev ? 'medium' as const : 'low' as const,
          possibleCauses: generatePossibleCauses(m, mean)
        }))
        .filter(a => a.severity !== 'low');

      // Generate predictions using linear regression
      const predictions = generatePredictions(sortedMetrics);

      // Generate insights
      const insights = generateInsights(sortedMetrics, trend, changeRate, anomalies);

      return {
        testType,
        period: timeRange,
        trend,
        changeRate,
        confidenceScore: Math.min(sortedMetrics.length / 10, 1), // More data = higher confidence
        predictions,
        anomalies,
        insights
      };
    });
  }, [filteredMetrics, selectedTestType, timeRange]);

  // Calculate business impact metrics
  const businessImpact = useMemo((): BusinessImpactMetrics => {
    const recentMetrics = filteredMetrics.slice(-30); // Last 30 tests
    const successRate = recentMetrics.filter(m => m.success).length / Math.max(recentMetrics.length, 1);
    const avgScore = recentMetrics.reduce((sum, m) => sum + m.score, 0) / Math.max(recentMetrics.length, 1);
    const avgDuration = recentMetrics.reduce((sum, m) => sum + m.duration, 0) / Math.max(recentMetrics.length, 1);
    const totalIssues = recentMetrics.reduce((sum, m) => sum + m.issues, 0);

    // Calculate business metrics (simplified model)
    const qualityScore = (avgScore * 0.7 + successRate * 100 * 0.3);
    const riskScore = Math.max(0, 100 - qualityScore);
    const productivityImpact = Math.min(100, (successRate * 100 - 80) * 5); // Productivity boost when > 80% success
    const costSavings = Math.max(0, (qualityScore - 70) * 1000); // $1000 per quality point above 70
    const timeToMarket = Math.max(0, 100 - avgDuration / 1000); // Faster tests = faster time to market
    const customerSatisfaction = Math.min(100, qualityScore * 1.1); // Quality correlates with satisfaction

    const recommendations = generateBusinessRecommendations({
      qualityScore,
      riskScore,
      successRate,
      avgDuration,
      totalIssues
    });

    return {
      qualityScore,
      riskScore,
      productivityImpact,
      costSavings,
      timeToMarket,
      customerSatisfaction,
      recommendations
    };
  }, [filteredMetrics]);

  // Helper functions
  const generatePossibleCauses = (metric: TestMetric, mean: number): string[] => {
    const causes = [];
    if (metric.score < mean * 0.8) {
      causes.push('Performance regression');
      causes.push('Code quality issues');
      causes.push('Infrastructure problems');
    }
    if (metric.duration > 60000) { // > 1 minute
      causes.push('Resource constraints');
      causes.push('Database performance');
    }
    if (!metric.success) {
      causes.push('Test failures');
      causes.push('Environment issues');
    }
    return causes.length > 0 ? causes : ['Normal variation'];
  };


    /**

     * if功能函数

     * @param {Object} params - 参数对象

     * @returns {Promise<Object>} 返回结果

     */
  const generatePredictions = (metrics: TestMetric[]) => {
    if (metrics.length < 3) {
      return {
        nextWeek: { expectedScore: 0, confidence: 0, trend: 'stable' as const },
        nextMonth: { expectedScore: 0, confidence: 0, trend: 'stable' as const }
      };
    }

    // Simple linear regression
    const n = metrics.length;
    const sumX = metrics.reduce((sum, _, i) => sum + i, 0);
    const sumY = metrics.reduce((sum, m) => sum + m.score, 0);
    const sumXY = metrics.reduce((sum, m, i) => sum + i * m.score, 0);
    const sumXX = metrics.reduce((sum, _, i) => sum + i * i, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const nextWeekScore = slope * (n + 7) + intercept;
    const nextMonthScore = slope * (n + 30) + intercept;

    const confidence = Math.min(0.9, n / 20); // Higher confidence with more data points

    return {
      nextWeek: { 
        expectedScore: Math.max(0, Math.min(100, nextWeekScore)), 
        confidence,
        trend: slope > 1 ? 'up' as const : slope < -1 ? 'down' as const : 'stable' as const
      },
      nextMonth: { 
        expectedScore: Math.max(0, Math.min(100, nextMonthScore)), 
        confidence: confidence * 0.8, // Lower confidence for longer predictions
        trend: slope > 0.5 ? 'up' as const : slope < -0.5 ? 'down' as const : 'stable' as const
      }
    };
  };

  const generateInsights = (metrics: TestMetric[], trend: string, changeRate: number, anomalies: unknown[]) => {
    const insights = [];

    if (Math.abs(changeRate) > 10) {
      insights.push({
        type: trend === 'improving' ? 'improvement' as const : 'regression' as const,
        message: `${trend === 'improving' ? 'Significant improvement' : 'Performance regression'} detected: ${Math.abs(changeRate).toFixed(1)}% change`,
        confidence: 0.8,
        actionItems: trend === 'improving' 
          ? ['Document successful practices', 'Share improvements with team']
          : ['Investigate root cause', 'Review recent changes', 'Consider rollback if critical']
      });
    }

    if (anomalies.length > 0) {
      insights.push({
        type: 'pattern' as const,
        message: `${anomalies.length} anomalies detected in recent testing`,
        confidence: 0.7,
        actionItems: ['Review anomaly timestamps', 'Check for environmental factors', 'Validate test data']
      });
    }

    const recentSuccessRate = metrics.slice(-10).filter(m => m.success).length / Math.min(metrics.length, 10);
    if (recentSuccessRate < 0.8) {
      insights.push({
        type: 'recommendation' as const,
        message: `Test success rate is ${(recentSuccessRate * 100).toFixed(1)}%, below recommended 80%`,
        confidence: 0.9,
        actionItems: ['Review failing tests', 'Improve test stability', 'Check test environment']
      });
    }

    return insights;
  };

  const generateBusinessRecommendations = (metrics: any) => {
    const recommendations = [];

    if (metrics.qualityScore < 70) {
      recommendations.push({
        priority: 'critical' as const,
        impact: 'High risk to product quality',
        effort: 'High',
        roi: 8.5,
        description: 'Implement comprehensive quality assurance process and increase test coverage'
      });
    }

    if (metrics.avgDuration > 300000) { // > 5 minutes
      recommendations.push({
        priority: 'high' as const,
        impact: 'Slow feedback loops affecting productivity',
        effort: 'Medium',
        roi: 6.2,
        description: 'Optimize test performance and implement parallel execution'
      });
    }

    if (metrics.successRate < 0.85) {
      recommendations.push({
        priority: 'high' as const,
        impact: 'Test instability affecting reliability',
        effort: 'Medium',
        roi: 7.3,
        description: 'Stabilize flaky tests and improve test reliability'
      });
    }

    return recommendations;
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'improvement': return <TrendingUp size={16} className="text-green-400" />;
      case 'regression': return <TrendingDown size={16} className="text-red-400" />;
      case 'pattern': return <BarChart3 size={16} className="text-blue-400" />;
      case 'recommendation': return <Target size={16} className="text-yellow-400" />;
      default: return <Eye size={16} className="text-gray-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">测试趋势分析</h2>
        <div className="flex items-center space-x-4">
          <select
            value={selectedTestType}
            onChange={(e) => setSelectedTestType(e.target.value)}
            className="bg-gray-700 text-white px-3 py-2 rounded border border-gray-600"
          >
            <option value="all">所有测试类型</option>
            {testTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          
          <div className="flex bg-gray-700 rounded border border-gray-600">
            {(['trend', 'anomaly', 'prediction', 'business'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setAnalysisMode(mode)}
                className={`px-3 py-2 text-sm ${
                  analysisMode === mode 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                {mode === 'trend' && '趋势'}
                {mode === 'anomaly' && '异常'}
                {mode === 'prediction' && '预测'}
                {mode === 'business' && '业务影响'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Analysis Content */}
      {analysisMode === 'trend' && (
        <div className="space-y-6">
          {trendAnalysis.map(analysis => (
            <div key={analysis.testType} className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-white">{analysis.testType} 测试趋势</h3>
                <div className="flex items-center space-x-2">
                  {analysis.trend === 'improving' ? (
                    <TrendingUp className="text-green-400" />
                  ) : analysis.trend === 'declining' ? (
                    <TrendingDown className="text-red-400" />
                  ) : (
                    <BarChart3 className="text-blue-400" />
                  )}
                  <span className={`font-medium ${
                    analysis.trend === 'improving' ? 'text-green-400' :
                    analysis.trend === 'declining' ? 'text-red-400' : 'text-blue-400'
                  }`}>
                    {analysis.changeRate > 0 ? '+' : ''}{analysis.changeRate.toFixed(1)}%
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-3 bg-gray-700 rounded">
                  <div className="text-lg font-bold text-white">
                    {(analysis.confidenceScore * 100).toFixed(0)}%
                  </div>
                  <div className="text-sm text-gray-400">置信度</div>
                </div>
                <div className="text-center p-3 bg-gray-700 rounded">
                  <div className="text-lg font-bold text-white">
                    {analysis.anomalies.length}
                  </div>
                  <div className="text-sm text-gray-400">异常检测</div>
                </div>
                <div className="text-center p-3 bg-gray-700 rounded">
                  <div className="text-lg font-bold text-white">
                    {analysis.insights.length}
                  </div>
                  <div className="text-sm text-gray-400">洞察建议</div>
                </div>
              </div>

              {/* Insights */}
              {analysis.insights.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-md font-medium text-white mb-2">智能洞察</h4>
                  <div className="space-y-2">
                    {analysis.insights.map((insight, index) => (
                      <div key={index} className="flex items-start space-x-3 p-3 bg-gray-700 rounded">
                        {getInsightIcon(insight.type)}
                        <div className="flex-1">
                          <p className="text-white text-sm">{insight.message}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="text-xs text-gray-400">
                              置信度: {(insight.confidence * 100).toFixed(0)}%
                            </span>
                            {insight.actionItems.length > 0 && (
                              <button
                                onClick={() => onInsightAction?.(insight)}
                                className="text-xs text-blue-400 hover:text-blue-300"
                              >
                                查看建议 ({insight.actionItems.length})
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {analysisMode === 'business' && (
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h3 className="text-lg font-medium text-white mb-4">业务影响分析</h3>
          
          {/* Business Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-gray-700 rounded">
              <div className="text-2xl font-bold text-green-400">
                {businessImpact.qualityScore.toFixed(1)}
              </div>
              <div className="text-sm text-gray-400">质量评分</div>
            </div>
            <div className="text-center p-4 bg-gray-700 rounded">
              <div className="text-2xl font-bold text-blue-400">
                ${businessImpact.costSavings.toFixed(0)}
              </div>
              <div className="text-sm text-gray-400">成本节约</div>
            </div>
            <div className="text-center p-4 bg-gray-700 rounded">
              <div className="text-2xl font-bold text-purple-400">
                {businessImpact.productivityImpact.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-400">生产力提升</div>
            </div>
          </div>

          {/* Recommendations */}
          <div>
            <h4 className="text-md font-medium text-white mb-3">业务建议</h4>
            <div className="space-y-3">
              {businessImpact.recommendations.map((rec, index) => (
                <div key={index} className="flex items-start justify-between p-4 bg-gray-700 rounded">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        rec.priority === 'critical' ? 'bg-red-600 text-white' :
                        rec.priority === 'high' ? 'bg-orange-600 text-white' :
                        rec.priority === 'medium' ? 'bg-yellow-600 text-black' :
                        'bg-green-600 text-white'
                      }`}>
                        {rec.priority}
                      </span>
                      <span className="text-white font-medium">ROI: {rec.roi}x</span>
                    </div>
                    <p className="text-white text-sm mb-1">{rec.description}</p>
                    <div className="flex items-center space-x-4 text-xs text-gray-400">
                      <span>影响: {rec.impact}</span>
                      <span>工作量: {rec.effort}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
