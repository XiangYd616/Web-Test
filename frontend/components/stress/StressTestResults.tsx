/**
 * StressTestResults.tsx - React组件
 * 
 * 文件路径: frontend\components\stress\StressTestResults.tsx
 * 创建时间: 2025-09-25
 */

import { Activity, AlertTriangle, BarChart3, Clock, TrendingUp } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import useStressTestWebSocket from '../../hooks/useStressTestWebSocket';

interface TestResult {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  maxResponseTime: number;
  minResponseTime: number;
  requestsPerSecond: number;
  errorRate: number;
  timestamp: string;
}

interface StressTestResultsProps {
  result: TestResult | null;
  isRunning: boolean;
  testId?: string | null;
  currentMetrics?: {
    activeUsers: number;
    requestsSent: number;
    responsesReceived: number;
    currentRPS: number;
    averageResponseTime: number;
  };
}

const StressTestResults: React.FC<StressTestResultsProps> = ({
  result,
  isRunning,
  testId,
  currentMetrics
}) => {
  const [realTimeData, setRealTimeData] = useState<any[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');

  // WebSocket集成
  const {
    isConnected,
    latestProgress
  } = useStressTestWebSocket({
    testId,
    autoConnect: isRunning,
    onProgress: (progress) => {
      setRealTimeData(prev => [...prev.slice(-50), {
        timestamp: Date.now(),
        responseTime: progress.responseTime,
        throughput: progress.throughput,
        activeUsers: progress.activeUsers,
        errorRate: progress.errorRate
      }]);
    }
  });

  useEffect(() => {
    setConnectionStatus(isConnected ? 'connected' : 'disconnected');
  }, [isConnected]);

  // 清空数据当测试开始时
  useEffect(() => {
    if (isRunning && testId) {
      setRealTimeData([]);
    }
  }, [isRunning, testId]);
  if (!result && !isRunning) {
    return (
      <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-8 text-center">
        <BarChart3 className="w-12 h-12 text-gray-500 mx-auto mb-4" />
        <p className="text-gray-400">开始测试后，结果将在这里显示</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 实时图表 */}
      {(isRunning || result) && (
        <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Activity className="w-5 h-5 text-blue-400" />
              <h3 className="text-lg font-semibold text-white">实时性能监控</h3>
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${connectionStatus === 'connected' ? 'bg-green-500/20 text-green-400' :
                connectionStatus === 'connecting' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                {connectionStatus === 'connected' ? '已连接' :
                  connectionStatus === 'connecting' ? '连接中' : '未连接'}
              </div>
            </div>

            {/* 当前指标 */}
            {latestProgress && (
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-4 h-4 text-blue-400" />
                  <span className="text-gray-400">响应时间:</span>
                  <span className="text-white font-medium">{latestProgress.responseTime.toFixed(0)}ms</span>
                </div>
                <div className="flex items-center gap-1">
                  <BarChart3 className="w-4 h-4 text-green-400" />
                  <span className="text-gray-400">吞吐量:</span>
                  <span className="text-white font-medium">{latestProgress.throughput.toFixed(1)} req/s</span>
                </div>
                <div className="flex items-center gap-1">
                  <Activity className="w-4 h-4 text-purple-400" />
                  <span className="text-gray-400">活跃用户:</span>
                  <span className="text-white font-medium">{latestProgress.activeUsers}</span>
                </div>
                {latestProgress.errorRate > 0 && (
                  <div className="flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    <span className="text-gray-400">错误率:</span>
                    <span className="text-red-400 font-medium">{latestProgress.errorRate.toFixed(1)}%</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="h-64 flex items-center justify-center text-gray-400">
            {realTimeData.length === 0 ? (
              <div className="text-center">
                <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-lg mb-2">等待实时数据</p>
                <p className="text-sm">
                  {!isRunning ? '开始测试后将显示实时图表' :
                    connectionStatus === 'connecting' ? '正在连接WebSocket...' :
                      '等待数据传输...'}
                </p>
              </div>
            ) : (
              <div className="w-full h-full bg-gray-900/50 rounded-lg p-4">
                <div className="text-center text-gray-300">
                  <p className="text-sm mb-2">实时数据图表</p>
                  <p className="text-xs text-gray-500">已收集 {realTimeData.length} 个数据点</p>
                  {latestProgress && (
                    <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                      <div className="bg-blue-500/10 rounded p-2">
                        <div className="text-blue-400 font-medium">{latestProgress.responseTime.toFixed(0)}ms</div>
                        <div className="text-gray-400 text-xs">响应时间</div>
                      </div>
                      <div className="bg-green-500/10 rounded p-2">
                        <div className="text-green-400 font-medium">{latestProgress.throughput.toFixed(1)}</div>
                        <div className="text-gray-400 text-xs">请求/秒</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 实时指标 */}
      {isRunning && currentMetrics && (
        <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-400" />
            实时指标
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="bg-gray-700/50 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-400">{currentMetrics.activeUsers}</div>
              <div className="text-sm text-gray-400">活跃用户</div>
            </div>

            <div className="bg-gray-700/50 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-400">{currentMetrics.requestsSent}</div>
              <div className="text-sm text-gray-400">已发送请求</div>
            </div>

            <div className="bg-gray-700/50 rounded-lg p-4">
              <div className="text-2xl font-bold text-purple-400">{currentMetrics.responsesReceived}</div>
              <div className="text-sm text-gray-400">已接收响应</div>
            </div>

            <div className="bg-gray-700/50 rounded-lg p-4">
              <div className="text-2xl font-bold text-yellow-400">{currentMetrics.currentRPS.toFixed(1)}</div>
              <div className="text-sm text-gray-400">RPS</div>
            </div>

            <div className="bg-gray-700/50 rounded-lg p-4">
              <div className="text-2xl font-bold text-cyan-400">{currentMetrics.averageResponseTime.toFixed(0)}ms</div>
              <div className="text-sm text-gray-400">平均响应时间</div>
            </div>
          </div>
        </div>
      )}

      {/* 测试结果 */}
      {result && (
        <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-400" />
            测试结果
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* 请求统计 */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-300">请求统计</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">总请求数</span>
                  <span className="text-white font-medium">{result.totalRequests.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">成功请求</span>
                  <span className="text-green-400 font-medium">{result.successfulRequests.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">失败请求</span>
                  <span className="text-red-400 font-medium">{result.failedRequests.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* 响应时间 */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-300 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                响应时间
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">平均</span>
                  <span className="text-white font-medium">{result.averageResponseTime.toFixed(0)}ms</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">最大</span>
                  <span className="text-yellow-400 font-medium">{result.maxResponseTime.toFixed(0)}ms</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">最小</span>
                  <span className="text-green-400 font-medium">{result.minResponseTime.toFixed(0)}ms</span>
                </div>
              </div>
            </div>

            {/* 性能指标 */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-300">性能指标</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">RPS</span>
                  <span className="text-blue-400 font-medium">{result.requestsPerSecond.toFixed(1)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">错误率</span>
                  <span className={`font-medium ${result.errorRate > 5 ? 'text-red-400' : 'text-green-400'}`}>
                    {result.errorRate.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>

            {/* 测试信息 */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-300">测试信息</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">完成时间</span>
                  <span className="text-white font-medium text-sm">
                    {new Date(result.timestamp).toLocaleString()}
                  </span>
                </div>
                {result.errorRate > 10 && (
                  <div className="flex items-center gap-2 text-red-400">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-sm">高错误率警告</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StressTestResults;
