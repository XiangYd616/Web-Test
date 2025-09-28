/**
 * Business Metrics Dashboard
 * Aggregates all test results into business-meaningful metrics, ROI calculations, and executive reporting
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Target, 
  AlertTriangle, 
  CheckCircle, 
  Users, 
  Clock,
  BarChart3,
  PieChart,
  Activity,
  Shield,
  Globe,
  Zap,
  Eye,
  Database
} from 'lucide-react';

export interface TestResultSummary {
  testType: 'api' | 'performance' | 'security' | 'compatibility' | 'seo' | 'accessibility' | 'ux' | 'database' | 'network';
  score: number;
  status: 'excellent' | 'good' | 'needs_improvement' | 'poor';
  timestamp: string;
  businessImpact: {
    revenue: number;
    conversionRate: number;
    userExperience: number;
    brandTrust: number;
  };
  criticalIssues: number;
  recommendations: string[];
}

export interface BusinessKPI {
  id: string;
  name: string;
  category: 'revenue' | 'conversion' | 'performance' | 'security' | 'compliance' | 'user_satisfaction';
  currentValue: number;
  targetValue: number;
  unit: '%' | '$' | 'ms' | 'score' | 'count';
  trend: 'up' | 'down' | 'stable';
  impactLevel: 'critical' | 'high' | 'medium' | 'low';
  description: string;
}

export interface QualityGate {
  id: string;
  name: string;
  condition: 'and' | 'or';
  rules: {
    testType: string;
    metric: string;
    operator: '>' | '<' | '>=' | '<=' | '=';
    value: number;
    weight: number;
  }[];
  status: 'passed' | 'failed' | 'warning';
  blockDeployment: boolean;
}

interface BusinessMetricsDashboardProps {
  testResults: TestResultSummary[];
  kpis: BusinessKPI[];
  qualityGates: QualityGate[];
  onKPIUpdate?: (kpis: BusinessKPI[]) => void;
  onQualityGateUpdate?: (gates: QualityGate[]) => void;
  showExecutiveView?: boolean;
}

export const BusinessMetricsDashboard: React.FC<BusinessMetricsDashboardProps> = ({
  testResults,
  kpis,
  qualityGates,
  onKPIUpdate,
  onQualityGateUpdate,
  showExecutiveView = false
}) => {
  const [activeView, setActiveView] = useState<'overview' | 'kpis' | 'quality-gates' | 'roi'>('overview');
  const [selectedTimeRange, setSelectedTimeRange] = useState<'1d' | '7d' | '30d' | '90d'>('7d');

  // Calculate overall business health score
  const businessHealthScore = useMemo(() => {
    if (testResults.length === 0) return 0;

    const weights = {
      performance: 0.25,
      security: 0.20,
      api: 0.15,
      accessibility: 0.10,
      compatibility: 0.10,
      seo: 0.10,
      ux: 0.10
    };

    let totalScore = 0;
    let totalWeight = 0;

    testResults.forEach(result => {
      const weight = weights[result.testType] || 0.05;
      totalScore += result.score * weight;
      totalWeight += weight;
    });

    return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
  }, [testResults]);

  // Calculate ROI metrics
  const roiMetrics = useMemo(() => {
    const metrics = {
      totalRevenueLoss: 0,
      potentialRevenueSavings: 0,
      conversionRateImpact: 0,
      userExperienceScore: 0,
      brandTrustScore: 0,
      testingROI: 0
    };

    testResults.forEach(result => {
      metrics.totalRevenueLoss += Math.abs(result.businessImpact.revenue);
      metrics.conversionRateImpact += Math.abs(result.businessImpact.conversionRate);
      metrics.userExperienceScore += result.businessImpact.userExperience;
      metrics.brandTrustScore += result.businessImpact.brandTrust;
    });

    // Calculate potential savings (assuming 70% of issues can be fixed)
    metrics.potentialRevenueSavings = metrics.totalRevenueLoss * 0.7;
    
    // Calculate testing ROI (assuming testing cost vs. revenue saved)
    const estimatedTestingCost = 5000; // Monthly testing cost
    metrics.testingROI = (metrics.potentialRevenueSavings / estimatedTestingCost) * 100;

    return metrics;
  }, [testResults]);

  // Calculate test coverage metrics
  const testCoverage = useMemo(() => {
    const coverageMetrics = {
      totalTests: testResults.length,
      criticalIssues: testResults.reduce((sum, result) => sum + result.criticalIssues, 0),
      testTypes: [...new Set(testResults.map(r => r.testType))].length,
      averageScore: testResults.length > 0 ? 
        Math.round(testResults.reduce((sum, r) => sum + r.score, 0) / testResults.length) : 0
    };

    return coverageMetrics;
  }, [testResults]);

  // Quality gate status
  const qualityGateStatus = useMemo(() => {
    const status = {
      total: qualityGates.length,
      passed: qualityGates.filter(gate => gate.status === 'passed').length,
      failed: qualityGates.filter(gate => gate.status === 'failed').length,
      warning: qualityGates.filter(gate => gate.status === 'warning').length,
      blocking: qualityGates.filter(gate => gate.status === 'failed' && gate.blockDeployment).length
    };

    return status;
  }, [qualityGates]);

  const getTestTypeIcon = (testType: string) => {
    const iconMap = {
      api: <Database size={16} />,
      performance: <Zap size={16} />,
      security: <Shield size={16} />,
      compatibility: <Globe size={16} />,
      seo: <Target size={16} />,
      accessibility: <Eye size={16} />,
      ux: <Users size={16} />,
      database: <Database size={16} />,
      network: <Activity size={16} />
    };
    return iconMap[testType] || <BarChart3 size={16} />;
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-400';
    if (score >= 75) return 'text-blue-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'excellent':
      case 'passed':
        return <CheckCircle size={16} className="text-green-400" />;
      case 'good':
        return <CheckCircle size={16} className="text-blue-400" />;
      case 'needs_improvement':
      case 'warning':
        return <AlertTriangle size={16} className="text-yellow-400" />;
      case 'poor':
      case 'failed':
        return <AlertTriangle size={16} className="text-red-400" />;
      default:
        return <BarChart3 size={16} className="text-gray-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">业务指标仪表板</h2>
        <div className="flex items-center space-x-4">
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value as any)}
            className="bg-gray-700 text-white px-3 py-2 rounded border border-gray-600"
          >
            <option value="1d">过去1天</option>
            <option value="7d">过去7天</option>
            <option value="30d">过去30天</option>
            <option value="90d">过去90天</option>
          </select>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-4 border-b border-gray-700">
        {[
          { id: 'overview', name: '总览', icon: <BarChart3 size={16} /> },
          { id: 'kpis', name: '关键指标', icon: <Target size={16} /> },
          { id: 'quality-gates', name: '质量门禁', icon: <Shield size={16} /> },
          { id: 'roi', name: 'ROI分析', icon: <DollarSign size={16} /> }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveView(tab.id as any)}
            className={`flex items-center space-x-2 px-4 py-2 font-medium transition-colors ${
              activeView === tab.id
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab.icon}
            <span>{tab.name}</span>
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeView === 'overview' && (
        <div className="space-y-6">
          {/* Business Health Score */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">业务健康度评分</h3>
              <div className={`text-3xl font-bold ${getHealthScoreColor(businessHealthScore)}`}>
                {businessHealthScore}/100
              </div>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-3 mb-4">
              <div 
                className={`h-3 rounded-full transition-all duration-300 ${
                  businessHealthScore >= 90 ? 'bg-green-500' :
                  businessHealthScore >= 75 ? 'bg-blue-500' :
                  businessHealthScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${businessHealthScore}%` }}
              />
            </div>
            <p className="text-gray-400 text-sm">
              基于{testCoverage.totalTests}项测试的综合评估，发现{testCoverage.criticalIssues}个关键问题
            </p>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center space-x-2 mb-2">
                <DollarSign size={20} className="text-red-400" />
                <span className="text-white font-medium">收入影响</span>
              </div>
              <div className="text-2xl font-bold text-red-400">
                ${roiMetrics.totalRevenueLoss.toLocaleString()}
              </div>
              <div className="text-sm text-gray-400">潜在损失/月</div>
            </div>

            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center space-x-2 mb-2">
                <TrendingDown size={20} className="text-yellow-400" />
                <span className="text-white font-medium">转化率影响</span>
              </div>
              <div className="text-2xl font-bold text-yellow-400">
                -{roiMetrics.conversionRateImpact.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-400">预估下降</div>
            </div>

            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center space-x-2 mb-2">
                <AlertTriangle size={20} className="text-orange-400" />
                <span className="text-white font-medium">关键问题</span>
              </div>
              <div className="text-2xl font-bold text-orange-400">
                {testCoverage.criticalIssues}
              </div>
              <div className="text-sm text-gray-400">需要立即解决</div>
            </div>

            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center space-x-2 mb-2">
                <TrendingUp size={20} className="text-green-400" />
                <span className="text-white font-medium">测试ROI</span>
              </div>
              <div className="text-2xl font-bold text-green-400">
                {roiMetrics.testingROI.toFixed(0)}%
              </div>
              <div className="text-sm text-gray-400">投资回报率</div>
            </div>
          </div>

          {/* Test Results Summary */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">测试结果概览</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-3">
                {testResults.map((result, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-700 rounded">
                    <div className="flex items-center space-x-3">
                      {getTestTypeIcon(result.testType)}
                      <div>
                        <div className="text-white font-medium capitalize">
                          {result.testType} 测试
                        </div>
                        <div className="text-sm text-gray-400">
                          {result.criticalIssues} 关键问题
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`font-bold ${getHealthScoreColor(result.score)}`}>
                        {result.score}
                      </span>
                      {getStatusIcon(result.status)}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="space-y-4">
                <div className="bg-gray-700 p-4 rounded">
                  <h4 className="text-white font-medium mb-2">质量门禁状态</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-xl font-bold text-green-400">
                        {qualityGateStatus.passed}
                      </div>
                      <div className="text-xs text-gray-400">通过</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-red-400">
                        {qualityGateStatus.failed}
                      </div>
                      <div className="text-xs text-gray-400">失败</div>
                    </div>
                  </div>
                  {qualityGateStatus.blocking > 0 && (
                    <div className="mt-2 text-xs text-red-400">
                      {qualityGateStatus.blocking} 项门禁阻止部署
                    </div>
                  )}
                </div>

                <div className="bg-gray-700 p-4 rounded">
                  <h4 className="text-white font-medium mb-2">测试覆盖率</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">测试类型</span>
                      <span className="text-white">{testCoverage.testTypes}/9</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">平均得分</span>
                      <span className={`font-medium ${getHealthScoreColor(testCoverage.averageScore)}`}>
                        {testCoverage.averageScore}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KPIs Tab */}
      {activeView === 'kpis' && (
        <div className="space-y-6">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">关键绩效指标</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {kpis.map((kpi, index) => (
                <div key={index} className="p-4 bg-gray-700 rounded">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium">{kpi.name}</span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      kpi.impactLevel === 'critical' ? 'bg-red-100 text-red-600' :
                      kpi.impactLevel === 'high' ? 'bg-orange-100 text-orange-600' :
                      kpi.impactLevel === 'medium' ? 'bg-yellow-100 text-yellow-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {kpi.impactLevel}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-2xl font-bold text-white">
                      {kpi.currentValue}{kpi.unit}
                    </div>
                    <div className="flex items-center space-x-1">
                      {kpi.trend === 'up' ? (
                        <TrendingUp size={16} className="text-green-400" />
                      ) : kpi.trend === 'down' ? (
                        <TrendingDown size={16} className="text-red-400" />
                      ) : (
                        <div className="w-4 h-0.5 bg-gray-400 rounded" />
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-gray-400 mb-2">
                    目标: {kpi.targetValue}{kpi.unit}
                  </div>
                  <div className="w-full bg-gray-600 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        kpi.currentValue >= kpi.targetValue ? 'bg-green-500' : 'bg-yellow-500'
                      }`}
                      style={{ width: `${Math.min((kpi.currentValue / kpi.targetValue) * 100, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-2">{kpi.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Quality Gates Tab */}
      {activeView === 'quality-gates' && (
        <div className="space-y-6">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">质量门禁</h3>
            <div className="space-y-4">
              {qualityGates.map((gate, index) => (
                <div key={index} className="p-4 bg-gray-700 rounded border-l-4 border-gray-600">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(gate.status)}
                      <span className="text-white font-medium">{gate.name}</span>
                      {gate.blockDeployment && (
                        <span className="px-2 py-1 bg-red-600 text-white text-xs rounded">
                          阻止部署
                        </span>
                      )}
                    </div>
                    <span className={`px-3 py-1 rounded text-sm ${
                      gate.status === 'passed' ? 'bg-green-600 text-white' :
                      gate.status === 'warning' ? 'bg-yellow-600 text-white' :
                      'bg-red-600 text-white'
                    }`}>
                      {gate.status === 'passed' && '通过'}
                      {gate.status === 'warning' && '警告'}
                      {gate.status === 'failed' && '失败'}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {gate.rules.map((rule, ruleIndex) => (
                      <div key={ruleIndex} className="text-sm text-gray-300 bg-gray-600 p-2 rounded">
                        {rule.testType}.{rule.metric} {rule.operator} {rule.value} (权重: {rule.weight})
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ROI Tab */}
      {activeView === 'roi' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">投资回报分析</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">测试投入成本</span>
                  <span className="text-white font-medium">$5,000/月</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">潜在收入损失</span>
                  <span className="text-red-400 font-medium">
                    ${roiMetrics.totalRevenueLoss.toLocaleString()}/月
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">预期节省收入</span>
                  <span className="text-green-400 font-medium">
                    ${roiMetrics.potentialRevenueSavings.toLocaleString()}/月
                  </span>
                </div>
                <hr className="border-gray-600" />
                <div className="flex justify-between items-center">
                  <span className="text-white font-medium">投资回报率</span>
                  <span className="text-green-400 font-bold text-xl">
                    {roiMetrics.testingROI.toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">业务影响指标</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-400">用户体验得分</span>
                    <span className="text-blue-400 font-medium">
                      {(roiMetrics.userExperienceScore / testResults.length).toFixed(1)}/10
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className="h-2 bg-blue-500 rounded-full"
                      style={{ width: `${(roiMetrics.userExperienceScore / testResults.length) * 10}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-400">品牌信任度</span>
                    <span className="text-purple-400 font-medium">
                      {(roiMetrics.brandTrustScore / testResults.length).toFixed(1)}/10
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className="h-2 bg-purple-500 rounded-full"
                      style={{ width: `${(roiMetrics.brandTrustScore / testResults.length) * 10}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-400">转化率保护</span>
                    <span className="text-yellow-400 font-medium">
                      +{(roiMetrics.conversionRateImpact * 0.7).toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-xs text-gray-400">
                    通过修复发现的问题预计可提升的转化率
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
