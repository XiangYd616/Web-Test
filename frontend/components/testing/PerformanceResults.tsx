import { AlertTriangle, CheckCircle, Info, Lightbulb, TrendingUp, XCircle, Zap } from 'lucide-react';
import React from 'react';
import { PerformanceResult } from '../../services/testing/seoTestService';

interface PerformanceResultsProps {
  results: PerformanceResult;
}

const PerformanceResults: React.FC<PerformanceResultsProps> = ({ results }) => {
  const getVitalStatusIcon = (status: string) => {
    switch (status) {
      case 'good':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'needs-improvement':
        return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      case 'poor':
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Info className="w-4 h-4 text-gray-400" />;
    }
  };

  const getVitalStatusColor = (status: string) => {
    switch (status) {
      case 'good':
        return 'text-green-400 bg-green-500/10 border-green-500/20';
      case 'needs-improvement':
        return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
      case 'poor':
        return 'text-red-400 bg-red-500/10 border-red-500/20';
      default:
        return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
    }
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  return (
    <div className="space-y-6">
      {/* 性能评分概览 */}
      <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700/50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-blue-400" />
            性能评分
          </h3>
          <div className="text-right">
            <div className="text-2xl font-bold text-white">{results.score}/100</div>
            {results.pageSpeedData && (
              <div className="text-xs text-gray-400">Google PageSpeed</div>
            )}
          </div>
        </div>

        {/* Core Web Vitals */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`p-4 rounded-lg border ${getVitalStatusColor(results.webVitalsAssessment.lcp)}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">LCP</span>
              {getVitalStatusIcon(results.webVitalsAssessment.lcp)}
            </div>
            <div className="text-lg font-bold">{formatTime(results.largestContentfulPaint)}</div>
            <div className="text-xs opacity-75">Largest Contentful Paint</div>
          </div>

          <div className={`p-4 rounded-lg border ${getVitalStatusColor(results.webVitalsAssessment.fid)}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">FID</span>
              {getVitalStatusIcon(results.webVitalsAssessment.fid)}
            </div>
            <div className="text-lg font-bold">{formatTime(results.firstInputDelay)}</div>
            <div className="text-xs opacity-75">First Input Delay</div>
          </div>

          <div className={`p-4 rounded-lg border ${getVitalStatusColor(results.webVitalsAssessment.cls)}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">CLS</span>
              {getVitalStatusIcon(results.webVitalsAssessment.cls)}
            </div>
            <div className="text-lg font-bold">{results.cumulativeLayoutShift.toFixed(3)}</div>
            <div className="text-xs opacity-75">Cumulative Layout Shift</div>
          </div>
        </div>
      </div>

      {/* 基础性能指标 */}
      <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700/50">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <Zap className="w-5 h-5 mr-2 text-yellow-400" />
          基础指标
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{formatTime(results.loadTime)}</div>
            <div className="text-sm text-gray-400">加载时间</div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-white">{formatTime(results.firstContentfulPaint)}</div>
            <div className="text-sm text-gray-400">FCP</div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-white">{formatSize(results.pageSize)}</div>
            <div className="text-sm text-gray-400">页面大小</div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-white">{results.requests}</div>
            <div className="text-sm text-gray-400">请求数</div>
          </div>
        </div>
      </div>

      {/* 优化建议 */}
      {results.opportunities && results.opportunities.length > 0 && (
        <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700/50">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <Lightbulb className="w-5 h-5 mr-2 text-green-400" />
            优化建议
          </h3>

          <div className="space-y-3">
            {results.opportunities.slice(0, 5).map((opportunity, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 bg-gray-700/30 rounded-lg">
                <div className={`w-2 h-2 rounded-full mt-2 ${opportunity.impact === 'high' ? 'bg-red-400' :
                  opportunity.impact === 'medium' ? 'bg-yellow-400' : 'bg-green-400'
                  }`} />
                <div className="flex-1">
                  <div className="font-medium text-white">{opportunity.title}</div>
                  <div className="text-sm text-gray-400 mt-1">{opportunity.description}</div>
                  {opportunity.savings && (
                    <div className="text-xs text-blue-400 mt-1">
                      预计节省: {formatTime(opportunity.savings)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 问题列表 */}
      {results.issues && results.issues.length > 0 && (
        <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700/50">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2 text-red-400" />
            发现的问题
          </h3>

          <div className="space-y-2">
            {results.issues.map((issue, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <XCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-gray-300">{issue}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 数据源说明 */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-300">
            {results.pageSpeedData ? (
              <span>
                <strong>数据来源：</strong>Google PageSpeed Insights API -
                提供真实的Core Web Vitals数据和专业优化建议
              </span>
            ) : (
              <span>
                <strong>数据来源：</strong>基础性能分析 -
                基于页面加载时间和资源分析的估算数据
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceResults;
