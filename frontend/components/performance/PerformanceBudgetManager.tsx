/**
 * Performance Budget Manager
 * Manages performance budgets and business KPI integration for web performance testing
 */

import React, { useState, useCallback, useMemo } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Clock, Users, AlertTriangle, CheckCircle, Target } from 'lucide-react';

export interface PerformanceBudget {
  id: string;
  name: string;
  category: 'loading' | 'interactivity' | 'visual-stability' | 'business-metrics';
  metric: string;
  threshold: {
    good: number;
    needs_improvement: number;
    poor: number;
  };
  unit: 'ms' | 'seconds' | '%' | 'score' | 'bytes' | 'mb';
  businessImpact: {
    conversionRate: number; // % impact on conversion rate
    revenue: number; // $ impact per 100ms delay
    bounceRate: number; // % impact on bounce rate
  };
  priority: 'critical' | 'high' | 'medium' | 'low';
  description: string;
}

export interface PerformanceResult {
  metric: string;
  value: number;
  unit: string;
  budgetStatus: 'good' | 'needs_improvement' | 'poor';
  businessImpact: {
    estimatedRevenueLoss: number;
    estimatedConversionImpact: number;
    estimatedBounceRateIncrease: number;
  };
}

interface PerformanceBudgetManagerProps {
  budgets: PerformanceBudget[];
  results: PerformanceResult[];
  onBudgetsChange?: (budgets: PerformanceBudget[]) => void;
  showBusinessImpact?: boolean;
}

export const PerformanceBudgetManager: React.FC<PerformanceBudgetManagerProps> = ({
  budgets,
  results,
  onBudgetsChange,
  showBusinessImpact = true
}) => {
  const [activeCategory, setActiveCategory] = useState<'all' | 'loading' | 'interactivity' | 'visual-stability' | 'business-metrics'>('all');
  const [expandedBudgets, setExpandedBudgets] = useState<Set<string>>(new Set());

  // Default performance budgets based on industry best practices
  const defaultBudgets: PerformanceBudget[] = [
    {
      id: 'lcp',
      name: 'Largest Contentful Paint',
      category: 'loading',
      metric: 'lcp',
      threshold: { good: 2500, needs_improvement: 4000, poor: 4000 },
      unit: 'ms',
      businessImpact: {
        conversionRate: -7, // 7% decrease per second delay
        revenue: -20, // $20 revenue loss per 100ms delay per 1000 users
        bounceRate: 11 // 11% increase in bounce rate per second delay
      },
      priority: 'critical',
      description: 'Time when the largest content element becomes visible'
    },
    {
      id: 'fid',
      name: 'First Input Delay',
      category: 'interactivity',
      metric: 'fid',
      threshold: { good: 100, needs_improvement: 300, poor: 300 },
      unit: 'ms',
      businessImpact: {
        conversionRate: -2.5,
        revenue: -15,
        bounceRate: 8
      },
      priority: 'critical',
      description: 'Time from user interaction to browser response'
    },
    {
      id: 'cls',
      name: 'Cumulative Layout Shift',
      category: 'visual-stability',
      metric: 'cls',
      threshold: { good: 0.1, needs_improvement: 0.25, poor: 0.25 },
      unit: 'score',
      businessImpact: {
        conversionRate: -3,
        revenue: -10,
        bounceRate: 5
      },
      priority: 'high',
      description: 'Measure of visual stability during page load'
    },
    {
      id: 'fcp',
      name: 'First Contentful Paint',
      category: 'loading',
      metric: 'fcp',
      threshold: { good: 1800, needs_improvement: 3000, poor: 3000 },
      unit: 'ms',
      businessImpact: {
        conversionRate: -5,
        revenue: -12,
        bounceRate: 9
      },
      priority: 'high',
      description: 'Time when first content becomes visible'
    },
    {
      id: 'tti',
      name: 'Time to Interactive',
      category: 'interactivity',
      metric: 'tti',
      threshold: { good: 3800, needs_improvement: 7300, poor: 7300 },
      unit: 'ms',
      businessImpact: {
        conversionRate: -4,
        revenue: -8,
        bounceRate: 6
      },
      priority: 'medium',
      description: 'Time until page becomes fully interactive'
    }
  ];

  // Merge default budgets with custom budgets
  const allBudgets = useMemo(() => {
    const customIds = budgets.map(b => b.id);
    const missingDefaults = defaultBudgets.filter(b => !customIds.includes(b.id));
    return [...budgets, ...missingDefaults];
  }, [budgets]);

  // Filter budgets by category
  const filteredBudgets = useMemo(() => {
    if (activeCategory === 'all') return allBudgets;
    return allBudgets.filter(budget => budget.category === activeCategory);
  }, [allBudgets, activeCategory]);

  // Calculate budget compliance
  const budgetCompliance = useMemo(() => {
    const compliance = {
      total: allBudgets.length,
      good: 0,
      needs_improvement: 0,
      poor: 0
    };

    allBudgets.forEach(budget => {
      const result = results.find(r => r.metric === budget.metric);
      if (result) {
        compliance[result.budgetStatus]++;
      }
    });

    return compliance;
  }, [allBudgets, results]);

  // Calculate total business impact
  const totalBusinessImpact = useMemo(() => {
    let totalRevenueLoss = 0;
    let totalConversionImpact = 0;
    let totalBounceRateIncrease = 0;

    results.forEach(result => {
      if (result.budgetStatus !== 'good') {
        totalRevenueLoss += result.businessImpact.estimatedRevenueLoss;
        totalConversionImpact += result.businessImpact.estimatedConversionImpact;
        totalBounceRateIncrease += result.businessImpact.estimatedBounceRateIncrease;
      }
    });

    return {
      revenue: totalRevenueLoss,
      conversion: totalConversionImpact,
      bounceRate: totalBounceRateIncrease
    };
  }, [results]);


    /**

     * switch功能函数

     * @param {Object} params - 参数对象

     * @returns {Promise<Object>} 返回结果

     */
  const getBudgetStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'text-green-400 bg-green-100';
      case 'needs_improvement': return 'text-yellow-400 bg-yellow-100';
      case 'poor': return 'text-red-400 bg-red-100';
      default: return 'text-gray-400 bg-gray-100';
    }
  };


    /**

     * switch功能函数

     * @param {Object} params - 参数对象

     * @returns {Promise<Object>} 返回结果

     */
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-500 bg-red-100';
      case 'high': return 'text-orange-500 bg-orange-100';
      case 'medium': return 'text-yellow-500 bg-yellow-100';
      case 'low': return 'text-gray-500 bg-gray-100';
      default: return 'text-gray-500 bg-gray-100';
    }
  };

  const toggleBudgetExpansion = (budgetId: string) => {
    const newExpanded = new Set(expandedBudgets);
    if (newExpanded.has(budgetId)) {
      newExpanded.delete(budgetId);
    } else {
      newExpanded.add(budgetId);
    }
    setExpandedBudgets(newExpanded);
  };

  const categoryIcons = {
    loading: <Clock size={16} />,
    interactivity: <Users size={16} />,
    'visual-stability': <Target size={16} />,
    'business-metrics': <DollarSign size={16} />
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">性能预算管理</h3>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-400">
            {budgetCompliance.good}/{budgetCompliance.total} 达标
          </span>
        </div>
      </div>

      {/* Business Impact Summary */}
      {showBusinessImpact && (
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <h4 className="text-md font-medium text-white mb-3">商业影响评估</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-3 bg-gray-700 rounded">
              <div className="flex items-center justify-center space-x-1 mb-2">
                <DollarSign size={16} className="text-red-400" />
                <span className="text-lg font-bold text-red-400">
                  ${totalBusinessImpact.revenue.toFixed(0)}
                </span>
              </div>
              <div className="text-sm text-gray-400">预估收入损失/1000用户</div>
            </div>
            <div className="text-center p-3 bg-gray-700 rounded">
              <div className="flex items-center justify-center space-x-1 mb-2">
                <TrendingDown size={16} className="text-yellow-400" />
                <span className="text-lg font-bold text-yellow-400">
                  {totalBusinessImpact.conversion.toFixed(1)}%
                </span>
              </div>
              <div className="text-sm text-gray-400">转化率影响</div>
            </div>
            <div className="text-center p-3 bg-gray-700 rounded">
              <div className="flex items-center justify-center space-x-1 mb-2">
                <TrendingUp size={16} className="text-orange-400" />
                <span className="text-lg font-bold text-orange-400">
                  {totalBusinessImpact.bounceRate.toFixed(1)}%
                </span>
              </div>
              <div className="text-sm text-gray-400">跳出率增加</div>
            </div>
          </div>
        </div>
      )}

      {/* Budget Compliance Overview */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <h4 className="text-md font-medium text-white mb-3">预算达标情况</h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-gray-700 rounded">
            <div className="text-2xl font-bold text-white">{budgetCompliance.total}</div>
            <div className="text-sm text-gray-400">总预算项</div>
          </div>
          <div className="text-center p-3 bg-gray-700 rounded">
            <div className="text-2xl font-bold text-green-400">{budgetCompliance.good}</div>
            <div className="text-sm text-gray-400">达标</div>
          </div>
          <div className="text-center p-3 bg-gray-700 rounded">
            <div className="text-2xl font-bold text-yellow-400">{budgetCompliance.needs_improvement}</div>
            <div className="text-sm text-gray-400">需改进</div>
          </div>
          <div className="text-center p-3 bg-gray-700 rounded">
            <div className="text-2xl font-bold text-red-400">{budgetCompliance.poor}</div>
            <div className="text-sm text-gray-400">不达标</div>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {(['all', 'loading', 'interactivity', 'visual-stability', 'business-metrics'] as const).map(category => (
          <button
            key={category}
            onClick={() => setActiveCategory(category)}
            className={`flex items-center space-x-2 px-3 py-2 rounded text-sm transition-colors ${
              activeCategory === category
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {category !== 'all' && categoryIcons[category]}
            <span>
              {category === 'all' && '全部'}
              {category === 'loading' && '加载'}
              {category === 'interactivity' && '交互'}
              {category === 'visual-stability' && '视觉稳定'}
              {category === 'business-metrics' && '商业指标'}
            </span>
          </button>
        ))}
      </div>

      {/* Budget Items */}
      <div className="space-y-4">
        {filteredBudgets.map(budget => {
          const result = results.find(r => r.metric === budget.metric);
          const isExpanded = expandedBudgets.has(budget.id);
          
          return (
            <div key={budget.id} className="bg-gray-800 rounded-lg border border-gray-700">
              <button
                onClick={() => toggleBudgetExpansion(budget.id)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-700 rounded-t-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    {categoryIcons[budget.category]}
                    <span className="text-white font-medium">{budget.name}</span>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs ${getPriorityColor(budget.priority)}`}>
                    {budget.priority}
                  </span>
                  {result && (
                    <span className={`px-2 py-1 rounded text-xs ${getBudgetStatusColor(result.budgetStatus)}`}>
                      {result.budgetStatus === 'good' && '达标'}
                      {result.budgetStatus === 'needs_improvement' && '需改进'}
                      {result.budgetStatus === 'poor' && '不达标'}
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  {result && (
                    <span className="text-white font-mono">
                      {result.value}{result.unit}
                    </span>
                  )}
                  <span className="text-gray-400">
                    {isExpanded ? '收起' : '展开'}
                  </span>
                </div>
              </button>

              {isExpanded && (
                <div className="p-4 border-t border-gray-700 space-y-4">
                  {/* Description */}
                  <p className="text-sm text-gray-300">{budget.description}</p>

                  {/* Thresholds */}
                  <div>
                    <h5 className="text-sm font-medium text-white mb-2">阈值配置</h5>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-2 bg-green-100 bg-opacity-20 rounded">
                        <div className="text-xs text-green-400 mb-1">良好</div>
                        <div className="font-mono text-sm text-white">
                          ≤ {budget.threshold.good}{budget.unit}
                        </div>
                      </div>
                      <div className="text-center p-2 bg-yellow-100 bg-opacity-20 rounded">
                        <div className="text-xs text-yellow-400 mb-1">需改进</div>
                        <div className="font-mono text-sm text-white">
                          ≤ {budget.threshold.needs_improvement}{budget.unit}
                        </div>
                      </div>
                      <div className="text-center p-2 bg-red-100 bg-opacity-20 rounded">
                        <div className="text-xs text-red-400 mb-1">差</div>
                        <div className="font-mono text-sm text-white">
                          &gt; {budget.threshold.poor}{budget.unit}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Business Impact */}
                  {showBusinessImpact && (
                    <div>
                      <h5 className="text-sm font-medium text-white mb-2">商业影响指标</h5>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-2 bg-gray-700 rounded">
                          <div className="text-xs text-gray-400 mb-1">转化率影响</div>
                          <div className="text-sm text-yellow-400">
                            {budget.businessImpact.conversionRate}%
                          </div>
                        </div>
                        <div className="text-center p-2 bg-gray-700 rounded">
                          <div className="text-xs text-gray-400 mb-1">收入影响</div>
                          <div className="text-sm text-red-400">
                            ${budget.businessImpact.revenue}
                          </div>
                        </div>
                        <div className="text-center p-2 bg-gray-700 rounded">
                          <div className="text-xs text-gray-400 mb-1">跳出率影响</div>
                          <div className="text-sm text-orange-400">
                            +{budget.businessImpact.bounceRate}%
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Current Result */}
                  {result && (
                    <div>
                      <h5 className="text-sm font-medium text-white mb-2">当前测试结果</h5>
                      <div className="bg-gray-700 p-3 rounded">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white font-mono text-lg">
                            {result.value}{result.unit}
                          </span>
                          <div className="flex items-center space-x-2">
                            {result.budgetStatus === 'good' ? (
                              <CheckCircle size={20} className="text-green-400" />
                            ) : (
                              <AlertTriangle size={20} className="text-yellow-400" />
                            )}
                          </div>
                        </div>
                        {result.budgetStatus !== 'good' && showBusinessImpact && (
                          <div className="text-xs text-gray-400 space-y-1">
                            <div>预估收入损失: ${result.businessImpact.estimatedRevenueLoss}</div>
                            <div>转化率影响: {result.businessImpact.estimatedConversionImpact.toFixed(1)}%</div>
                            <div>跳出率增加: {result.businessImpact.estimatedBounceRateIncrease.toFixed(1)}%</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PerformanceBudgetManager;
