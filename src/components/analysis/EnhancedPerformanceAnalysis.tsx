import React from 'react';
import { AlertTriangle, BarChart3, CheckCircle, TrendingDown, TrendingUp } from 'lucide-react';

// CSS样式已迁移到组件库，不再需要外部CSS文件

interface PerformanceAnalysis {
  scalabilityScore: number;
  bottlenecks: string[];
  recommendations: string[];
  performanceGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  trends: {
    responseTime: 'improving' | 'stable' | 'degrading';
    throughput: 'improving' | 'stable' | 'degrading';
    errorRate: 'improving' | 'stable' | 'degrading';
  };
}

interface TestMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  maxResponseTime: number;
  minResponseTime: number;
  p95ResponseTime: number;
  errorRate: number;
  throughput: number;
  concurrentUsers: number;
}

interface TestResult {
  metrics: TestMetrics;
  performanceAnalysis: PerformanceAnalysis;
  timestamp: number;
  duration: number;
}

interface EnhancedPerformanceAnalysisProps {
  result: TestResult;
}

export const EnhancedPerformanceAnalysis: React.FC<EnhancedPerformanceAnalysisProps> = ({ result }) => {
  const { metrics, performanceAnalysis } = result;

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'text-green-600 bg-green-50';
      case 'B': return 'text-blue-600 bg-blue-50';
      case 'C': return 'text-yellow-600 bg-yellow-50';
      case 'D': return 'text-orange-600 bg-orange-50';
      case 'F': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'degrading': return <TrendingDown className="w-4 h-4 text-red-500" />;
      case 'stable': return <BarChart3 className="w-4 h-4 text-blue-500" />;
      default: return null;
    }
  };

  const getTrendText = (trend: string) => {
    switch (trend) {
      case 'improving': return '改善中';
      case 'degrading': return '恶化中';
      case 'stable': return '稳定';
      default: return '未知';
    }
  };

  return (
    <div className="space-y-6">
      {/* 性能评级 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="text-center">
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full text-2xl font-bold ${getGradeColor(performanceAnalysis.performanceGrade)}`}>
            {performanceAnalysis.performanceGrade}
          </div>
          <div className="mt-2 text-sm font-medium text-gray-900">性能评级</div>
        </div>

        <div className="text-center">
          <div className="text-3xl font-bold text-blue-600">{performanceAnalysis.scalabilityScore}</div>
          <div className="text-sm text-gray-600">可扩展性评分</div>
          <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full progress-fill progress-fill-blue" style={{ width: `performanceAnalysis.scalabilityScore%` }}
            />
          </div>
        </div>

        <div className="text-center">
          <div className="text-3xl font-bold text-green-600">
            {((metrics.successfulRequests / metrics.totalRequests) * 100).toFixed(1)}%
          </div>
          <div className="text-sm text-gray-600">成功率</div>
        </div>
      </div>

      {/* 详细指标 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-gray-900">{metrics.totalRequests}</div>
          <div className="text-sm text-gray-600">总请求数</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-gray-900">{metrics.averageResponseTime}ms</div>
          <div className="text-sm text-gray-600">平均响应时间</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-gray-900">{metrics.p95ResponseTime}ms</div>
          <div className="text-sm text-gray-600">P95响应时间</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-gray-900">{metrics.throughput.toFixed(1)}</div>
          <div className="text-sm text-gray-600">吞吐量 (req/s)</div>
        </div>
      </div>

      {/* 性能趋势 */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">性能趋势</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm font-medium text-gray-700">响应时间</span>
            <div className="flex items-center space-x-2">
              {getTrendIcon(performanceAnalysis.trends.responseTime)}
              <span className="text-sm text-gray-600">{getTrendText(performanceAnalysis.trends.responseTime)}</span>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm font-medium text-gray-700">吞吐量</span>
            <div className="flex items-center space-x-2">
              {getTrendIcon(performanceAnalysis.trends.throughput)}
              <span className="text-sm text-gray-600">{getTrendText(performanceAnalysis.trends.throughput)}</span>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm font-medium text-gray-700">错误率</span>
            <div className="flex items-center space-x-2">
              {getTrendIcon(performanceAnalysis.trends.errorRate)}
              <span className="text-sm text-gray-600">{getTrendText(performanceAnalysis.trends.errorRate)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 瓶颈分析 */}
      {performanceAnalysis.bottlenecks.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">性能瓶颈</h4>
          <div className="space-y-3">
            {performanceAnalysis.bottlenecks.map((bottleneck, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-red-800">{bottleneck}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 优化建议 */}
      {performanceAnalysis.recommendations.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">优化建议</h4>
          <div className="space-y-3">
            {performanceAnalysis.recommendations.map((recommendation, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <CheckCircle className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-blue-800">{recommendation}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
