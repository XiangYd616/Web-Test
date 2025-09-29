/**
 * Browser Market Analyzer
 * Market-based browser prioritization and business impact assessment for compatibility testing
 */

import React, { useState, useMemo, useCallback } from 'react';
import {Globe, Target, Smartphone, Monitor, Tablet, CheckCircle, XCircle} from 'lucide-react';

export interface BrowserMarketData {
  name: string;
  version: string;
  marketShare: number; // Percentage
  userCount: number; // Estimated users
  revenue: number; // Revenue associated with this browser
  conversionRate: number; // Conversion rate for users on this browser
  supportCost: number; // Cost to support this browser
  region: 'global' | 'north-america' | 'europe' | 'asia' | 'other';
  device: 'desktop' | 'mobile' | 'tablet';
  releaseDate: string;
  endOfLife?: string;
  businessPriority: 'critical' | 'high' | 'medium' | 'low';
}

export interface CompatibilityIssue {
  browserId: string;
  feature: string;
  severity: 'critical' | 'major' | 'minor';
  impact: {
    affectedUsers: number;
    revenueAtRisk: number;
    conversionImpact: number;
  };
  fixComplexity: 'low' | 'medium' | 'high';
  estimatedFixTime: number; // hours
  fixCost: number; // USD
  workaround?: string;
}

export interface BusinessImpactAnalysis {
  totalUsersAffected: number;
  totalRevenueAtRisk: number;
  averageConversionImpact: number;
  totalFixCost: number;
  estimatedFixTime: number;
  roi: number; // Return on investment for fixing issues
  prioritizedIssues: CompatibilityIssue[];
  recommendations: {
    priority: 'immediate' | 'short-term' | 'long-term';
    action: string;
    impact: string;
    cost: number;
    benefit: number;
  }[];
}

interface BrowserMarketAnalyzerProps {
  marketData: BrowserMarketData[];
  compatibilityIssues: CompatibilityIssue[];
  targetRegions?: string[];
  businessMetrics?: {
    totalRevenue: number;
    averageOrderValue: number;
    monthlyActiveUsers: number;
  };
  onPriorityChange?: (browserId: string, priority: string) => void;
}

export const BrowserMarketAnalyzer: React.FC<BrowserMarketAnalyzerProps> = ({
  marketData,
  compatibilityIssues,
  targetRegions = ['global'],
  businessMetrics,
  onPriorityChange
}) => {
  const [selectedRegion, setSelectedRegion] = useState<string>('global');
  const [sortBy, setSortBy] = useState<'marketShare' | 'revenue' | 'users' | 'roi'>('marketShare');
  const [viewMode, setViewMode] = useState<'table' | 'chart' | 'impact'>('table');
  const [deviceFilter, setDeviceFilter] = useState<'all' | 'desktop' | 'mobile' | 'tablet'>('all');

  // Filter market data by region and device
  const filteredMarketData = useMemo(() => {
    return marketData.filter(browser => {
      const regionMatch = selectedRegion === 'global' || browser.region === selectedRegion;
      const deviceMatch = deviceFilter === 'all' || browser.device === deviceFilter;
      return regionMatch && deviceMatch;
    });
  }, [marketData, selectedRegion, deviceFilter]);

  // Calculate business impact analysis
  const businessImpact = useMemo((): BusinessImpactAnalysis => {
    let totalUsersAffected = 0;
    let totalRevenueAtRisk = 0;
    let totalConversionImpact = 0;
    let totalFixCost = 0;
    let totalFixTime = 0;

    const issuesByBrowser = new Map<string, CompatibilityIssue[]>();
    
    compatibilityIssues.forEach(issue => {
      if (!issuesByBrowser.has(issue.browserId)) {
        issuesByBrowser.set(issue.browserId, []);
      }
      issuesByBrowser.get(issue.browserId)!.push(issue);
      
      totalUsersAffected += issue.impact.affectedUsers;
      totalRevenueAtRisk += issue.impact.revenueAtRisk;
      totalConversionImpact += issue.impact.conversionImpact;
      totalFixCost += issue.fixCost;
      totalFixTime += issue.estimatedFixTime;
    });

    const averageConversionImpact = compatibilityIssues.length > 0 
      ? totalConversionImpact / compatibilityIssues.length 
      : 0;

    // Calculate ROI
    const potentialRevenueSaved = totalRevenueAtRisk * 0.8; // Assuming 80% recovery
    const roi = totalFixCost > 0 ? (potentialRevenueSaved - totalFixCost) / totalFixCost : 0;

    // Prioritize issues by business impact
    const prioritizedIssues = [...compatibilityIssues].sort((a, b) => {
      const aScore = (a.impact.revenueAtRisk * 0.4) + (a.impact.affectedUsers * 0.3) + 
                    (a.impact.conversionImpact * 0.3) - (a.fixCost * 0.1);
      const bScore = (b.impact.revenueAtRisk * 0.4) + (b.impact.affectedUsers * 0.3) + 
                    (b.impact.conversionImpact * 0.3) - (b.fixCost * 0.1);
      return bScore - aScore;
    });

    // Generate recommendations
    const recommendations = generateRecommendations(filteredMarketData, prioritizedIssues);

    return {
      totalUsersAffected,
      totalRevenueAtRisk,
      averageConversionImpact,
      totalFixCost,
      estimatedFixTime,
      roi,
      prioritizedIssues,
      recommendations
    };
  }, [compatibilityIssues, filteredMarketData]);

  // Generate business recommendations
  const generateRecommendations = (browsers: BrowserMarketData[], issues: CompatibilityIssue[]) => {
    const recommendations = [];

    // Critical browser support
    const criticalBrowsers = browsers.filter(b => 
      b.businessPriority === 'critical' && b.marketShare > 10
    );
    
    if (criticalBrowsers.length > 0) {
      recommendations.push({
        priority: 'immediate' as const,
        action: `Ensure full compatibility with ${criticalBrowsers.map(b => b.name).join(', ')}`,
        impact: `Covers ${criticalBrowsers.reduce((sum, b) => sum + b.marketShare, 0).toFixed(1)}% market share`,
        cost: criticalBrowsers.reduce((sum, b) => sum + b.supportCost, 0),
        benefit: criticalBrowsers.reduce((sum, b) => sum + b.revenue, 0)
      });
    }

    // High-impact issues
    const highImpactIssues = issues.filter(i => i.impact.revenueAtRisk > 10000);
    if (highImpactIssues.length > 0) {
      recommendations.push({
        priority: 'short-term' as const,
        action: `Fix ${highImpactIssues.length} high-impact compatibility issues`,
        impact: `Potential revenue recovery: $${highImpactIssues.reduce((sum, i) => sum + i.impact.revenueAtRisk, 0).toLocaleString()}`,
        cost: highImpactIssues.reduce((sum, i) => sum + i.fixCost, 0),
        benefit: highImpactIssues.reduce((sum, i) => sum + i.impact.revenueAtRisk, 0) * 0.8
      });
    }

    // Mobile optimization
    const mobileBrowsers = browsers.filter(b => b.device === 'mobile');
    const mobileMarketShare = mobileBrowsers.reduce((sum, b) => sum + b.marketShare, 0);
    
    if (mobileMarketShare > 40) {
      recommendations.push({
        priority: 'short-term' as const,
        action: 'Prioritize mobile browser compatibility',
        impact: `Mobile traffic represents ${mobileMarketShare.toFixed(1)}% of users`,
        cost: 15000,
        benefit: mobileBrowsers.reduce((sum, b) => sum + b.revenue, 0) * 0.1
      });
    }

    return recommendations;
  };

  // Sort browsers by selected criteria
  const sortedBrowsers = useMemo(() => {
    return [...filteredMarketData].sort((a, b) => {
      switch (sortBy) {
        case 'marketShare':
          return b.marketShare - a.marketShare;
        case 'revenue':
          return b.revenue - a.revenue;
        case 'users':
          return b.userCount - a.userCount;
        case 'roi':
          const aROI = a.revenue > 0 ? (a.revenue - a.supportCost) / a.supportCost : 0;
          const bROI = b.revenue > 0 ? (b.revenue - b.supportCost) / b.supportCost : 0;
          return bROI - aROI;
        default:
          return b.marketShare - a.marketShare;
      }
    });
  }, [filteredMarketData, sortBy]);


    /**

     * switch功能函数

     * @param {Object} params - 参数对象

     * @returns {Promise<Object>} 返回结果

     */
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-500 bg-red-900/20 border-red-500/30';
      case 'high': return 'text-orange-500 bg-orange-900/20 border-orange-500/30';
      case 'medium': return 'text-yellow-500 bg-yellow-900/20 border-yellow-500/30';
      case 'low': return 'text-green-500 bg-green-900/20 border-green-500/30';
      default: return 'text-gray-500 bg-gray-900/20 border-gray-500/30';
    }
  };

  const getDeviceIcon = (device: string) => {
    switch (device) {
      case 'desktop': return <Monitor size={16} className="text-blue-400" />;
      case 'mobile': return <Smartphone size={16} className="text-green-400" />;
      case 'tablet': return <Tablet size={16} className="text-purple-400" />;
      default: return <Globe size={16} className="text-gray-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">浏览器市场分析</h2>
        <div className="flex items-center space-x-4">
          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e?.target.value)}
            className="bg-gray-700 text-white px-3 py-2 rounded border border-gray-600"
          >
            <option value="global">全球</option>
            <option value="north-america">北美</option>
            <option value="europe">欧洲</option>
            <option value="asia">亚洲</option>
          </select>
          
          <select
            value={deviceFilter}
            onChange={(e) => setDeviceFilter(e?.target.value as any)}
            className="bg-gray-700 text-white px-3 py-2 rounded border border-gray-600"
          >
            <option value="all">所有设备</option>
            <option value="desktop">桌面</option>
            <option value="mobile">移动</option>
            <option value="tablet">平板</option>
          </select>

          <div className="flex bg-gray-700 rounded border border-gray-600">
            {(['table', 'impact'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-2 text-sm ${
                  viewMode === mode 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                {mode === 'table' ? '列表' : '业务影响'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Business Impact Summary */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <h3 className="text-lg font-medium text-white mb-4">业务影响概览</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-gray-700 rounded">
            <div className="text-xl font-bold text-red-400">
              {businessImpact.totalUsersAffected.toLocaleString()}
            </div>
            <div className="text-sm text-gray-400">受影响用户</div>
          </div>
          <div className="text-center p-3 bg-gray-700 rounded">
            <div className="text-xl font-bold text-orange-400">
              ${businessImpact.totalRevenueAtRisk.toLocaleString()}
            </div>
            <div className="text-sm text-gray-400">风险收入</div>
          </div>
          <div className="text-center p-3 bg-gray-700 rounded">
            <div className="text-xl font-bold text-yellow-400">
              ${businessImpact.totalFixCost.toLocaleString()}
            </div>
            <div className="text-sm text-gray-400">修复成本</div>
          </div>
          <div className="text-center p-3 bg-gray-700 rounded">
            <div className="text-xl font-bold text-green-400">
              {businessImpact.roi.toFixed(1)}x
            </div>
            <div className="text-sm text-gray-400">投资回报率</div>
          </div>
        </div>
      </div>

      {/* View Content */}
      {viewMode === 'table' && (
        <div className="bg-gray-800 rounded-lg border border-gray-700">
          <div className="p-4 border-b border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-white">浏览器市场数据</h3>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e?.target.value as any)}
                className="bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 text-sm"
              >
                <option value="marketShare">市场份额</option>
                <option value="revenue">收入</option>
                <option value="users">用户数</option>
                <option value="roi">投资回报</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-white">浏览器</th>
                  <th className="px-4 py-3 text-left text-white">设备</th>
                  <th className="px-4 py-3 text-left text-white">市场份额</th>
                  <th className="px-4 py-3 text-left text-white">用户数</th>
                  <th className="px-4 py-3 text-left text-white">收入</th>
                  <th className="px-4 py-3 text-left text-white">转化率</th>
                  <th className="px-4 py-3 text-left text-white">支持成本</th>
                  <th className="px-4 py-3 text-left text-white">业务优先级</th>
                  <th className="px-4 py-3 text-left text-white">兼容性状态</th>
                </tr>
              </thead>
              <tbody>
                {sortedBrowsers.map((browser, index) => {
                  const browserIssues = compatibilityIssues.filter(issue => 
                    issue.browserId === `${browser.name}-${browser.version}`
                  );
                  const hasIssues = browserIssues.length > 0;
                  const criticalIssues = browserIssues.filter(issue => issue.severity === 'critical').length;

                  return (
                    <tr key={index} className="border-b border-gray-700 hover:bg-gray-700/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-2">
                          <span className="text-white font-medium">{browser.name}</span>
                          <span className="text-gray-400 text-sm">{browser.version}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-1">
                          {getDeviceIcon(browser.device)}
                          <span className="text-gray-300 text-sm capitalize">{browser.device}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-2">
                          <div className="w-16 bg-gray-600 rounded-full h-2">
                            <div 
                              className="h-2 bg-blue-500 rounded-full"
                              style={{ width: `${Math.min(browser.marketShare * 2, 100)}%` }}
                            />
                          </div>
                          <span className="text-white text-sm">{browser.marketShare.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-300">
                        {browser.userCount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-green-400">
                        ${browser.revenue.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-blue-400">
                        {browser.conversionRate.toFixed(1)}%
                      </td>
                      <td className="px-4 py-3 text-orange-400">
                        ${browser.supportCost.toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs ${getPriorityColor(browser.businessPriority)}`}>
                          {browser.businessPriority}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-2">
                          {hasIssues ? (
                            <>
                              <XCircle size={16} className="text-red-400" />
                              <span className="text-red-400 text-sm">
                                {browserIssues.length} 问题
                                {criticalIssues > 0 && ` (${criticalIssues} 严重)`}
                              </span>
                            </>
                          ) : (
                            <>
                              <CheckCircle size={16} className="text-green-400" />
                              <span className="text-green-400 text-sm">兼容</span>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {viewMode === 'impact' && (
        <div className="space-y-6">
          {/* Recommendations */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <h3 className="text-lg font-medium text-white mb-4">业务建议</h3>
            <div className="space-y-4">
              {businessImpact.recommendations.map((rec, index) => (
                <div key={index} className="p-4 bg-gray-700 rounded border-l-4 border-blue-500">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        rec.priority === 'immediate' ? 'bg-red-600 text-white' :
                        rec.priority === 'short-term' ? 'bg-orange-600 text-white' :
                        'bg-yellow-600 text-black'
                      }`}>
                        {rec.priority === 'immediate' ? '立即' : 
                         rec.priority === 'short-term' ? '短期' : '长期'}
                      </span>
                      <Target size={16} className="text-blue-400" />
                    </div>
                    <div className="text-right">
                      <div className="text-green-400 font-medium">
                        ROI: {((rec.benefit - rec.cost) / rec.cost * 100).toFixed(0)}%
                      </div>
                    </div>
                  </div>
                  <h4 className="text-white font-medium mb-1">{rec.action}</h4>
                  <p className="text-gray-300 text-sm mb-2">{rec.impact}</p>
                  <div className="flex items-center space-x-4 text-xs text-gray-400">
                    <span>成本: ${rec.cost.toLocaleString()}</span>
                    <span>收益: ${rec.benefit.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Prioritized Issues */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <h3 className="text-lg font-medium text-white mb-4">优先修复问题</h3>
            <div className="space-y-3">
              {businessImpact.prioritizedIssues.slice(0, 10).map((issue, index) => (
                <div key={index} className="p-3 bg-gray-700 rounded">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-white font-medium">{issue.feature}</span>
                      <span className={`px-2 py-1 rounded text-xs ${
                        issue.severity === 'critical' ? 'bg-red-600 text-white' :
                        issue.severity === 'major' ? 'bg-orange-600 text-white' :
                        'bg-yellow-600 text-black'
                      }`}>
                        {issue.severity}
                      </span>
                    </div>
                    <div className="text-red-400 font-medium">
                      ${issue.impact.revenueAtRisk.toLocaleString()}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-xs text-gray-400">
                    <span>用户: {issue.impact.affectedUsers.toLocaleString()}</span>
                    <span>修复时间: {issue.estimatedFixTime}h</span>
                    <span>成本: ${issue.fixCost.toLocaleString()}</span>
                  </div>
                  {issue.workaround && (
                    <p className="text-blue-400 text-xs mt-1">
                      临时方案: {issue.workaround}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
