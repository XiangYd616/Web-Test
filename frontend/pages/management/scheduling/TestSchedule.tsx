import { AlertCircle, BarChart3, Calendar, CheckCircle, Clock, Pause, Play, Plus, RefreshCw, Trash2, XCircle } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { ScheduledTest, TestExecution, testScheduler } from '../../../services/testing/testScheduler.ts';

const TestSchedule: React.FC = () => {
  const [schedules, setSchedules] = useState<ScheduledTest[]>([]);
  const [executions, setExecutions] = useState<TestExecution[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // 获取调度列表
  const fetchSchedules = () => {
    const allSchedules = testScheduler.getAllSchedules();
    setSchedules(allSchedules);

    if (selectedSchedule) {
      const history = testScheduler.getExecutionHistory(selectedSchedule, 20);
      setExecutions(history);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchSchedules();
    const interval = setInterval(fetchSchedules, 30000); // 每30秒刷新
    return () => clearInterval(interval);
  }, [selectedSchedule]);

  // 暂停/恢复调度
  const handleToggleSchedule = (id: string, currentStatus: string) => {
    if (currentStatus === 'active') {
      testScheduler.pauseSchedule(id);
    } else if (currentStatus === 'paused') {
      testScheduler.resumeSchedule(id);
    }
    fetchSchedules();
  };

  // 删除调度
  const handleDeleteSchedule = (id: string) => {
    if (confirm('确定要删除这个调度吗？')) {
      testScheduler.deleteSchedule(id);
      if (selectedSchedule === id) {
        setSelectedSchedule(null);
      }
      fetchSchedules();
    }
  };

  // 手动执行测试
  const handleManualExecution = async (id: string) => {
    try {
      await testScheduler.executeTest(id);
      fetchSchedules();
    } catch (error) {
      console.error('Manual execution failed:', error);
    }
  };

  // 获取状态图标
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'paused':
        return <Pause className="w-4 h-4 text-yellow-400" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-blue-400" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  // 格式化时间
  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleString();
  };

  // 格式化持续时间
  const formatDuration = (duration?: number) => {
    if (!duration) return '-';
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 页面标题 */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">测试调度</h2>
              <p className="text-gray-300 mt-1">管理定时测试和批量测试任务</p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center space-x-2 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>创建调度</span>
              </button>
              <button
                type="button"
                onClick={fetchSchedules}
                className="px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700/50 transition-colors flex items-center space-x-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>刷新</span>
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 调度列表 */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">调度列表</h3>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin text-blue-400" />
                  <span className="ml-2 text-gray-400">加载中...</span>
                </div>
              ) : schedules.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400">暂无调度任务</p>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(true)}
                    className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    创建第一个调度
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {schedules.map((schedule) => (
                    <div
                      key={schedule.id}
                      className={`p-4 rounded-lg border cursor-pointer transition-all ${selectedSchedule === schedule.id
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-gray-600 bg-gray-700/30 hover:bg-gray-700/50'
                        }`}
                      onClick={() => setSelectedSchedule(schedule.id)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          {getStatusIcon(schedule.status)}
                          <h4 className="font-medium text-white">{schedule.name}</h4>
                          <span className="px-2 py-1 bg-gray-600 text-gray-300 rounded text-xs">
                            {schedule.testType}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleManualExecution(schedule.id);
                            }}
                            className="p-1 text-blue-400 hover:text-blue-300 transition-colors"
                            title="手动执行"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleSchedule(schedule.id, schedule.status);
                            }}
                            className="p-1 text-yellow-400 hover:text-yellow-300 transition-colors"
                            title={schedule.status === 'active' ? '暂停' : '恢复'}
                          >
                            {schedule.status === 'active' ? (
                              <Pause className="w-4 h-4" />
                            ) : (
                              <Play className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSchedule(schedule.id);
                            }}
                            className="p-1 text-red-400 hover:text-red-300 transition-colors"
                            title="删除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="text-sm text-gray-400 space-y-1">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>下次运行: {schedule.nextRun ? formatTime(schedule.nextRun) : '未安排'}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <BarChart3 className="w-3 h-3" />
                            <span>已运行: {schedule.runCount} 次</span>
                          </div>
                        </div>
                        {schedule.description && (
                          <p className="text-gray-500">{schedule.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 详情面板 */}
          <div className="space-y-4">
            {selectedSchedule ? (
              <>
                {/* 调度详情 */}
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">调度详情</h3>
                  {(() => {
                    const schedule = schedules.find(s => s.id === selectedSchedule);
                    if (!schedule) return null;

                    return (
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm text-gray-400">名称</label>
                          <p className="text-white">{schedule.name}</p>
                        </div>
                        <div>
                          <label className="text-sm text-gray-400">类型</label>
                          <p className="text-white">{schedule.testType}</p>
                        </div>
                        <div>
                          <label className="text-sm text-gray-400">状态</label>
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(schedule.status)}
                            <span className="text-white capitalize">{schedule.status}</span>
                          </div>
                        </div>
                        <div>
                          <label className="text-sm text-gray-400">调度类型</label>
                          <p className="text-white">
                            {schedule.schedule.type === 'once' ? '单次执行' : '重复执行'}
                            {schedule.schedule.interval && ` (${schedule.schedule.interval})`}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm text-gray-400">下次运行</label>
                          <p className="text-white">
                            {schedule.nextRun ? formatTime(schedule.nextRun) : '未安排'}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm text-gray-400">运行统计</label>
                          <p className="text-white">
                            已运行 {schedule.runCount} 次
                            {schedule.maxRuns && ` / ${schedule.maxRuns}`}
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* 执行历史 */}
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">执行历史</h3>

                  {executions.length === 0 ? (
                    <p className="text-gray-400 text-center py-4">暂无执行记录</p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {executions.map((execution) => (
                        <div key={execution.id} className="p-3 bg-gray-700/30 rounded-lg">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center space-x-2">
                              {getStatusIcon(execution.status)}
                              <span className="text-sm text-white">
                                {execution.triggeredBy === 'manual' ? '手动执行' : '自动执行'}
                              </span>
                            </div>
                            <span className="text-xs text-gray-400">
                              {formatTime(execution.startTime)}
                            </span>
                          </div>
                          <div className="text-xs text-gray-400">
                            持续时间: {formatDuration(execution.duration)}
                            {execution.retryCount > 0 && (
                              <span className="ml-2">重试: {execution.retryCount} 次</span>
                            )}
                          </div>
                          {execution.error && (
                            <p className="text-xs text-red-400 mt-1">{execution.error}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400">选择一个调度查看详情</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 创建调度模态框 */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 w-full max-w-2xl mx-4">
              <h3 className="text-lg font-semibold text-white mb-4">创建测试调度</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">调度名称</label>
                  <input
                    type="text"
                    placeholder="输入调度名称"
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="test-type-select" className="block text-sm font-medium text-gray-300 mb-2">测试类型</label>
                  <select
                    id="test-type-select"
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="选择测试类型"
                  >
                    <option value="performance">性能测试</option>
                    <option value="security">安全检测</option>
                    <option value="seo">SEO分析</option>
                    <option value="compatibility">兼容性测试</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="schedule-type-select" className="block text-sm font-medium text-gray-300 mb-2">调度类型</label>
                    <select
                      id="schedule-type-select"
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      aria-label="选择调度类型"
                    >
                      <option value="once">单次执行</option>
                      <option value="recurring">重复执行</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="interval-select" className="block text-sm font-medium text-gray-300 mb-2">执行间隔</label>
                    <select
                      id="interval-select"
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      aria-label="选择执行间隔"
                    >
                      <option value="hourly">每小时</option>
                      <option value="daily">每天</option>
                      <option value="weekly">每周</option>
                      <option value="monthly">每月</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="start-time-input" className="block text-sm font-medium text-gray-300 mb-2">开始时间</label>
                  <input
                    id="start-time-input"
                    type="datetime-local"
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="选择开始时间"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  取消
                </button>
                <button
                  type="button"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  创建调度
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TestSchedule;
