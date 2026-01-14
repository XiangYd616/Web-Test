/**
 * 统一压力测试页面
 * 提供完整的压力测试功能，包括实时监控、结果分析和报告导出
 */

import { AlertCircle, AlertTriangle, Download, Info, Zap } from 'lucide-react';
import React, { useCallback, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useAuthCheck } from '../components/auth/WithAuthCheck';
import { UniversalTestPage } from '../components/testing/UniversalTestPage';
import { stressTestConfig } from '../config/testTypes';

/**
 * 自定义结果展示组件
 */
const StressTestResultDisplay: React.FC<{ result: any }> = ({ result }) => {
  if (!result || !result.summary) return null;

  const getPerformanceRating = () => {
    const { avgResponseTime, errorRate } = result.summary;
    if (avgResponseTime < 200 && errorRate < 1) {
      return { level: '优秀', color: 'text-green-500', icon: '🎯' };
    } else if (avgResponseTime < 500 && errorRate < 5) {
      return { level: '良好', color: 'text-blue-500', icon: '✅' };
    } else if (avgResponseTime < 1000 && errorRate < 10) {
      return { level: '一般', color: 'text-yellow-500', icon: '⚠️' };
    } else {
      return { level: '较差', color: 'text-red-500', icon: '❌' };
    }
  };

  const rating = getPerformanceRating();

  return (
    <div className="space-y-6">
      {/* 性能评级 */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-3">性能评级</h3>
        <div className="flex items-center space-x-3">
          <span className="text-2xl">{rating.icon}</span>
          <span className={`text-xl font-bold ${rating.color}`}>{rating.level}</span>
        </div>
      </div>

      {/* 关键指标 */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <p className="text-sm text-gray-400">总请求数</p>
          <p className="text-2xl font-bold text-white">
            {result.summary.totalRequests?.toLocaleString() || 0}
          </p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <p className="text-sm text-gray-400">成功率</p>
          <p className="text-2xl font-bold text-green-500">
            {((result.summary.successfulRequests / result.summary.totalRequests) * 100).toFixed(1)}%
          </p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <p className="text-sm text-gray-400">平均响应时间</p>
          <p className="text-2xl font-bold text-yellow-500">
            {result.summary.avgResponseTime?.toFixed(0) || 0} ms
          </p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <p className="text-sm text-gray-400">吞吐量</p>
          <p className="text-2xl font-bold text-blue-500">
            {result.summary.throughput?.toFixed(1) || 0} req/s
          </p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <p className="text-sm text-gray-400">95百分位</p>
          <p className="text-2xl font-bold text-orange-500">
            {result.summary.percentile95?.toFixed(0) || 0} ms
          </p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <p className="text-sm text-gray-400">错误率</p>
          <p className="text-2xl font-bold text-red-500">
            {result.summary.errorRate?.toFixed(2) || 0}%
          </p>
        </div>
      </div>

      {/* 详细数据 */}
      {result.errors && result.errors.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-4 border border-red-700">
          <h3 className="text-lg font-semibold text-red-400 mb-3">错误日志</h3>
          <div className="max-h-40 overflow-y-auto space-y-2">
            {result.errors.slice(0, 10).map((error: any, index: number) => (
              <div key={index} className="text-sm text-red-300">
                [{new Date(error?.timestamp).toLocaleTimeString()}] {error?.message}
                {error?.statusCode && ` (状态码: ${error.statusCode})`}
              </div>
            ))}
            {result.errors.length > 10 && (
              <p className="text-sm text-gray-500 mt-2">
                还有 {result.errors.length - 10} 条错误...
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * 统一压力测试页面组件
 */
const UnifiedStressTest: React.FC = () => {
  const authCheck = useAuthCheck();
  const [testHistory, setTestHistory] = useState<any[]>([]);
  const [showHelp, setShowHelp] = useState(false);

  // 如果未认证，显示登录提示
  if (!authCheck.isAuthenticated) {
    return authCheck.LoginPromptComponent;
  }

  // 测试完成回调
  const handleTestComplete = useCallback((result: any) => {
    // 添加到历史记录
    setTestHistory(prev => [result, ...prev.slice(0, 4)]);

    // 显示通知
    if (result.summary) {
      const { avgResponseTime, errorRate } = result.summary;
      if (errorRate > 10) {
        toast.error(`测试完成，但错误率较高: ${errorRate?.toFixed(1)}%`);
      } else if (avgResponseTime > 1000) {
        toast(`测试完成，响应时间较慢: ${avgResponseTime?.toFixed(0)}ms`);
      } else {
        toast.success('测试完成，性能表现良好');
      }
    }
  }, []);

  // 配置变更回调
  const handleConfigChange = useCallback((config: any) => {}, []);

  // 导出测试结果
  const exportTestResult = (result: any) => {
    if (!result) {
      toast.error('没有可导出的测试结果');
      return;
    }

    const report = {
      testId: result.testId || `stress_${Date.now()}`,
      timestamp: new Date().toISOString(),
      configuration: result.config,
      summary: result.summary,
      metrics: result.metrics,
      errors: result.errors,
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stress-test-${report.testId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('测试报告已导出');
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <div className="flex items-center space-x-3">
            <Zap className="h-8 w-8 text-red-500" />
            <h1 className="text-3xl font-bold text-white">压力测试</h1>
          </div>
          <p className="mt-2 text-gray-400">模拟高并发负载，测试系统性能极限和稳定性</p>
        </div>

        {/* 主测试界面 */}
        <UniversalTestPage
          testType={stressTestConfig as any}
          onTestComplete={handleTestComplete}
          onConfigChange={handleConfigChange}
          customActions={
            <div className="space-y-4">
              {/* 测试类型说明 */}
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="flex items-start space-x-2 mb-3">
                  <Info className="h-5 w-5 text-blue-500 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-white mb-2">测试类型说明</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-400">
                      <div>
                        <span className="text-blue-400">负载测试：</span>
                        <span className="ml-1">测试系统在预期负载下的表现</span>
                      </div>
                      <div>
                        <span className="text-red-400">压力测试：</span>
                        <span className="ml-1">测试系统的极限承载能力</span>
                      </div>
                      <div>
                        <span className="text-yellow-400">峰值测试：</span>
                        <span className="ml-1">测试系统应对突发流量的能力</span>
                      </div>
                      <div>
                        <span className="text-purple-400">容量测试：</span>
                        <span className="ml-1">测试系统的最大处理能力</span>
                      </div>
                      <div>
                        <span className="text-green-400">耐久测试：</span>
                        <span className="ml-1">长时间运行，检测内存泄漏等问题</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 注意事项 */}
              <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-yellow-400 mb-1">重要提示</h4>
                    <ul className="text-sm text-yellow-300 space-y-1">
                      <li>• 请勿对生产环境直接进行压力测试</li>
                      <li>• 确保目标服务器有足够的资源处理测试负载</li>
                      <li>• 建议先从小负载开始，逐步增加并发数</li>
                      <li>• 测试完成后及时分析结果，优化系统性能</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* 快速帮助 */}
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <button
                  onClick={() => setShowHelp(!showHelp)}
                  className="flex items-center space-x-2 text-white hover:text-blue-400 transition-colors"
                >
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-medium">快速帮助</span>
                  <span className="text-gray-500 ml-2">{showHelp ? '▼' : '▶'}</span>
                </button>

                {showHelp && (
                  <div className="mt-3 space-y-2 text-sm text-gray-400">
                    <p>
                      <strong className="text-white">并发用户数：</strong>{' '}
                      同时发送请求的虚拟用户数量
                    </p>
                    <p>
                      <strong className="text-white">目标RPS：</strong> 每秒期望发送的请求数量
                    </p>
                    <p>
                      <strong className="text-white">爬升时间：</strong>{' '}
                      从0逐步增加到目标并发数的时间
                    </p>
                    <p>
                      <strong className="text-white">95/99百分位：</strong>{' '}
                      95%/99%的请求响应时间不超过此值
                    </p>
                  </div>
                )}
              </div>
            </div>
          }
        />

        {/* 测试历史 */}
        {testHistory.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold text-white mb-4">最近测试历史</h2>
            <div className="space-y-4">
              {testHistory.map((test, index) => (
                <div key={index} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="text-white font-medium">测试 #{index + 1}</span>
                      <span className="text-gray-400 text-sm ml-2">
                        {new Date(test.timestamp || Date.now()).toLocaleString()}
                      </span>
                    </div>
                    <button
                      onClick={() => exportTestResult(test)}
                      className="flex items-center space-x-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm transition-colors"
                    >
                      <Download className="h-4 w-4" />
                      <span>导出</span>
                    </button>
                  </div>
                  <StressTestResultDisplay result={test} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UnifiedStressTest;
