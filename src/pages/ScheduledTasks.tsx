import React, { useState, useEffect } from 'react';
import {
  Clock,
  Play,
  Pause,
  Trash2,
  Plus,
  CheckCircle,
  XCircle,
  RefreshCw,
  Settings,
  Timer,
  Target,
  BarChart3,
  Activity
} from 'lucide-react';

interface ScheduledTask {
  id: string;
  name: string;
  description: string;
  type: 'backup' | 'cleanup' | 'report' | 'monitor' | 'test';
  schedule: string;
  status: 'active' | 'paused' | 'error';
  lastRun: string;
  nextRun: string;
  runCount: number;
  successRate: number;
  enabled: boolean;
}

const ScheduledTasks: React.FC = () => {
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      setTasks([
        {
          id: '1',
          name: '数据库备份',
          description: '每日凌晨2点自动备份数据库',
          type: 'backup',
          schedule: '0 2 * * *',
          status: 'active',
          lastRun: '2025-06-19 02:00:00',
          nextRun: '2025-06-20 02:00:00',
          runCount: 156,
          successRate: 99.4,
          enabled: true
        },
        {
          id: '2',
          name: '清理过期测试数据',
          description: '每周清理90天前的测试数据',
          type: 'cleanup',
          schedule: '0 3 * * 0',
          status: 'active',
          lastRun: '2025-06-16 03:00:00',
          nextRun: '2025-06-23 03:00:00',
          runCount: 24,
          successRate: 100,
          enabled: true
        },
        {
          id: '3',
          name: '系统健康检查',
          description: '每小时检查系统健康状态',
          type: 'monitor',
          schedule: '0 * * * *',
          status: 'error',
          lastRun: '2025-06-19 14:00:00',
          nextRun: '2025-06-19 15:00:00',
          runCount: 3456,
          successRate: 98.2,
          enabled: true
        }
      ]);
    } catch (error) {
      console.error('加载定时任务失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTaskTypeIcon = (type: string) => {
    switch (type) {
      case 'backup': return <Target className="w-4 h-4" />;
      case 'cleanup': return <Trash2 className="w-4 h-4" />;
      case 'report': return <BarChart3 className="w-4 h-4" />;
      case 'monitor': return <Activity className="w-4 h-4" />;
      case 'test': return <Timer className="w-4 h-4" />;
      default: return <Settings className="w-4 h-4" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'paused': return <Pause className="w-4 h-4 text-yellow-400" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-400" />;
      default: return <XCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">加载定时任务...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6 dark-page-scrollbar">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 页面标题区域 */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-xl border border-gray-700/50 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/20 rounded-xl border border-blue-500/30">
                <Clock className="w-8 h-8 text-blue-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">定时任务管理</h1>
                <p className="text-gray-300 mt-1">管理和监控系统定时任务</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-blue-500/25"
              >
                <Plus className="w-4 h-4" />
                创建任务
              </button>
              <button
                type="button"
                onClick={loadTasks}
                className="flex items-center gap-2 px-4 py-2.5 bg-gray-700/50 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-600/50 hover:text-white transition-all duration-200 shadow-lg"
              >
                <RefreshCw className="w-4 h-4" />
                刷新
              </button>
            </div>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-xl border border-gray-700/50 p-6 hover:shadow-2xl hover:border-blue-500/30 transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400 mb-1">总任务数</p>
                <p className="text-2xl font-bold text-white">{tasks.length}</p>
              </div>
              <div className="p-3 bg-blue-500/20 rounded-xl border border-blue-500/30">
                <Clock className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-xl border border-gray-700/50 p-6 hover:shadow-2xl hover:border-green-500/30 transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400 mb-1">活跃任务</p>
                <p className="text-2xl font-bold text-green-400">
                  {tasks.filter(t => t.status === 'active').length}
                </p>
              </div>
              <div className="p-3 bg-green-500/20 rounded-xl border border-green-500/30">
                <CheckCircle className="w-6 h-6 text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-xl border border-gray-700/50 p-6 hover:shadow-2xl hover:border-yellow-500/30 transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400 mb-1">暂停任务</p>
                <p className="text-2xl font-bold text-yellow-400">
                  {tasks.filter(t => t.status === 'paused').length}
                </p>
              </div>
              <div className="p-3 bg-yellow-500/20 rounded-xl border border-yellow-500/30">
                <Pause className="w-6 h-6 text-yellow-400" />
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-xl border border-gray-700/50 p-6 hover:shadow-2xl hover:border-red-500/30 transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400 mb-1">错误任务</p>
                <p className="text-2xl font-bold text-red-400">
                  {tasks.filter(t => t.status === 'error').length}
                </p>
              </div>
              <div className="p-3 bg-red-500/20 rounded-xl border border-red-500/30">
                <XCircle className="w-6 h-6 text-red-400" />
              </div>
            </div>
          </div>
        </div>

        {/* 任务列表 */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-xl border border-gray-700/50">
          <div className="p-6 border-b border-gray-700/50">
            <h2 className="text-xl font-semibold text-white">定时任务列表</h2>
          </div>

          <div className="overflow-x-auto dark-table-scrollbar">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-700/50 to-gray-600/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    任务信息
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    类型
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    状态
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    调度
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    下次运行
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-gray-800/30 divide-y divide-gray-700/50">
                {tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-gray-700/30 transition-colors duration-150">
                    <td className="px-6 py-5">
                      <div>
                        <div className="text-sm font-semibold text-white">{task.name}</div>
                        <div className="text-sm text-gray-400 mt-1">{task.description}</div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-gray-700/50 rounded-lg border border-gray-600/50">
                          {getTaskTypeIcon(task.type)}
                        </div>
                        <span className="text-sm text-gray-300 capitalize font-medium">{task.type}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(task.status)}
                        <span className={`text-sm font-semibold px-2.5 py-1 rounded-full text-xs ${
                          task.status === 'active' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                          task.status === 'paused' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                          'bg-red-500/20 text-red-400 border border-red-500/30'
                        }`}>
                          {task.status === 'active' ? '活跃' :
                           task.status === 'paused' ? '暂停' : '错误'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="text-sm text-gray-300 font-mono bg-gray-700/50 px-2 py-1 rounded border border-gray-600/50">{task.schedule}</div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="text-sm text-gray-300 font-medium">
                        {task.nextRun === '-' ? '已暂停' : task.nextRun}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="p-2 rounded-lg hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 transition-colors duration-150 border border-transparent hover:border-blue-500/30"
                          title="立即运行"
                        >
                          <Play className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          className="p-2 rounded-lg hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors duration-150 border border-transparent hover:border-red-500/30"
                          title="删除任务"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScheduledTasks;
