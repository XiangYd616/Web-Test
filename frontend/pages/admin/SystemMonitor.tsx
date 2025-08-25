
import React from 'react';
import type { FC } from 'react';
import { Activity, Server, TrendingUp, Users } from 'lucide-react';
import SystemResourceMonitor from '../../components/system/SystemResourceMonitor';
import { useStressTestRecord } from '../../hooks/useStressTestRecord';

const SystemMonitor: React.FC = () => {
  const { queueStats } = useStressTestRecord({ autoLoad: false });

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 页面标题 */}
        <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-lg border border-gray-700 p-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Server className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">系统监控</h1>
              <p className="text-gray-400 mt-1">实时监控系统资源和测试队列状态</p>
            </div>
          </div>
        </div>

        {/* 队列统计概览 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">排队中</p>
                <p className="text-2xl font-bold text-blue-400">{queueStats.queueLength}</p>
              </div>
              <Users className="w-8 h-8 text-blue-400/50" />
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">运行中</p>
                <p className="text-2xl font-bold text-green-400">{queueStats.totalRunning}</p>
              </div>
              <Activity className="w-8 h-8 text-green-400/50" />
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">已完成</p>
                <p className="text-2xl font-bold text-gray-400">{queueStats.totalCompleted}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-gray-400/50" />
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">失败</p>
                <p className="text-2xl font-bold text-red-400">{queueStats.totalFailed}</p>
              </div>
              <Activity className="w-8 h-8 text-red-400/50" />
            </div>
          </div>
        </div>

        {/* 系统资源监控 */}
        <SystemResourceMonitor showDetails={true} />

        {/* 队列详细信息 */}
        {queueStats.queueLength > 0 && (
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Users className="w-5 h-5 mr-2 text-blue-400" />
              队列详情
            </h3>

            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">平均等待时间</span>
                <span className="text-white">
                  {queueStats.averageWaitTime > 0
                    ? `${Math.round(queueStats.averageWaitTime / 60)} 分钟`
                    : '暂无数据'
                  }
                </span>
              </div>

              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">平均执行时间</span>
                <span className="text-white">
                  {queueStats.averageExecutionTime > 0
                    ? `${Math.round(queueStats.averageExecutionTime / 60)} 分钟`
                    : '暂无数据'
                  }
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 运行中的测试 */}
        {queueStats.runningTests && queueStats.runningTests.length > 0 && (
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Activity className="w-5 h-5 mr-2 text-green-400" />
              运行中的测试
            </h3>

            <div className="space-y-3">
              {queueStats.runningTests.map((test) => (
                <div key={test.id} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-white text-sm">
                      {test.testName}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      开始时间: {test.startTime ? new Date(test.startTime).toLocaleString() : '未开始'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-green-400">
                      {(test.progress || 0).toFixed(1)}%
                    </div>
                    <div className="w-20 h-2 bg-gray-600 rounded-full mt-1">
                      <div
                        className="h-full bg-green-500 rounded-full transition-all duration-300"
                        style={{ width: `${test.progress || 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 系统状态说明 */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">系统状态说明</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-green-400 font-medium">健康</span>
              </div>
              <p className="text-gray-400">系统资源充足，可以正常处理新的测试请求</p>
            </div>

            <div>
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-yellow-400 font-medium">警告</span>
              </div>
              <p className="text-gray-400">系统资源使用率较高，新测试可能需要排队</p>
            </div>

            <div>
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-red-400 font-medium">临界</span>
              </div>
              <p className="text-gray-400">系统资源紧张，所有新测试将自动排队</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemMonitor;
