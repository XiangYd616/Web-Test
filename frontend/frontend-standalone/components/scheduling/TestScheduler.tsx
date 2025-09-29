/**
 * 自动化测试调度组件
 * 提供定时任务管理、批量测试调度和执行监控功能
 */

import React, { useState, useEffect, useCallback } from 'react';
import {Calendar, Play, Pause, Plus, Edit, Trash2, Copy, RefreshCw, CheckCircle, XCircle, Activity, Target, Search, FileText, Database, Globe, Shield, Zap} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format, formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

// 调度任务类型定义
interface ScheduledTask {
  id: string;
  name: string;
  description: string;
  testType: 'performance' | 'security' | 'seo' | 'api' | 'stress' | 'compatibility';
  schedule: {
    type: 'once' | 'recurring';
    cronExpression?: string;
    timezone: string;
    nextRun?: Date;
    lastRun?: Date;
  };
  config: {
    targets: string[];
    parameters: Record<string, any>;
    timeout: number;
    retryAttempts: number;
    notifications: {
      onSuccess: boolean;
      onFailure: boolean;
      recipients: string[];
    };
  };
  status: 'active' | 'paused' | 'disabled' | 'completed';
  stats: {
    totalRuns: number;
    successRate: number;
    avgDuration: number;
    lastResult?: 'success' | 'failure' | 'timeout';
  };
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// 执行历史记录
interface ExecutionHistory {
  id: string;
  taskId: string;
  startTime: Date;
  endTime?: Date;
  status: 'running' | 'completed' | 'failed' | 'cancelled' | 'timeout';
  duration?: number;
  result?: unknown;
  error?: string;
  logs?: string[];
}

// 批量操作类型
type BatchAction = 'start' | 'pause' | 'delete' | 'duplicate' | 'export';

const TestScheduler: React.FC = () => {
  // 状态管理
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [executions, setExecutions] = useState<ExecutionHistory[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTask, setEditingTask] = useState<ScheduledTask | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'nextRun' | 'lastRun' | 'successRate'>('nextRun');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [isLoading, setIsLoading] = useState(false);

  // 生成模拟数据
  const generateMockTasks = (): ScheduledTask[] => {
    const testTypes: ScheduledTask['testType'][] = ['performance', 'security', 'seo', 'api', 'stress', 'compatibility'];
    const statuses: ScheduledTask['status'][] = ['active', 'paused', 'disabled'];
    
    return Array.from({ length: 15 }, (_, i) => {
      const testType = testTypes[Math.floor(Math.random() * testTypes.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const nextRun = new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000);
      const lastRun = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
      
      return {
        id: `task_${i + 1}`,
        name: `${getTestTypeName(testType)}定时任务_${i + 1}`,
        description: `自动化${getTestTypeName(testType)}测试，每天执行一次`,
        testType,
        schedule: {
          type: 'recurring',
          cronExpression: '0 2 * * *',
          timezone: 'Asia/Shanghai',
          nextRun,
          lastRun: status !== 'disabled' ? lastRun : undefined
        },
        config: {
          targets: [`https://example${i + 1}.com`],
          parameters: {},
          timeout: process.env.REQUEST_TIMEOUT || 300000,
          retryAttempts: 3,
          notifications: {
            onSuccess: false,
            onFailure: true,
            recipients: ['admin@example.com']
          }
        },
        status,
        stats: {
          totalRuns: Math.floor(Math.random() * 100) + 10,
          successRate: Math.floor(Math.random() * 30) + 70,
          avgDuration: Math.floor(Math.random() * 180) + 30,
          lastResult: Math.random() > 0.2 ? 'success' : 'failure'
        },
        createdBy: '管理员',
        createdAt: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
      };
    });
  };

  // 获取测试类型显示名称
  const getTestTypeName = (type: string) => {
    const names = {
      performance: '性能',
      security: '安全',
      seo: 'SEO',
      api: 'API',
      stress: '压力',
      compatibility: '兼容性'
    };
    return names[type as keyof typeof names] || type;
  };

  // 获取测试类型图标
  const getTestTypeIcon = (type: string) => {
    const icons = {
      performance: Zap,
      security: Shield,
      seo: Globe,
      api: Database,
      stress: Activity,
      compatibility: Target
    };
    return icons[type as keyof typeof icons] || FileText;
  };

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    const colors = {
      active: 'text-green-600 bg-green-100',
      paused: 'text-yellow-600 bg-yellow-100',
      disabled: 'text-gray-600 bg-gray-100',
      completed: 'text-blue-600 bg-blue-100'
    };
    return colors[status as keyof typeof colors] || 'text-gray-600 bg-gray-100';
  };

  // 获取执行结果颜色
  const getResultColor = (result?: string) => {
    const colors = {
      success: 'text-green-600',
      failure: 'text-red-600',
      timeout: 'text-orange-600'
    };
    return colors[result as keyof typeof colors] || 'text-gray-600';
  };

  // 初始化数据
  useEffect(() => {
    setTasks(generateMockTasks());
  }, []);

  // 过滤和排序任务
  const filteredTasks = React.useMemo(() => {
    let result = tasks.filter(task => {
      // 状态过滤
      if (filterStatus !== 'all' && task.status !== filterStatus) {
        return false;
      }
      
      // 搜索过滤
      if (searchTerm) {
        return task.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
               task.description.toLowerCase().includes(searchTerm.toLowerCase());
      }
      
      return true;
    });

    // 排序
    result?.sort((a, b) => {
      let aValue: unknown, bValue: unknown;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'nextRun':
          aValue = a.schedule.nextRun || new Date(0);
          bValue = b.schedule.nextRun || new Date(0);
          break;
        case 'lastRun':
          aValue = a.schedule.lastRun || new Date(0);
          bValue = b.schedule.lastRun || new Date(0);
          break;
        case 'successRate':
          aValue = a.stats.successRate;
          bValue = b.stats.successRate;
          break;
        default:
          return 0;
      }
      
      if (aValue === bValue) return 0;
      const comparison = aValue > bValue ? 1 : -1;
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [tasks, filterStatus, searchTerm, sortBy, sortOrder]);

  // 任务操作
  const handleTaskAction = async (action: string, taskId: string) => {
    setIsLoading(true);
    
    try {
      switch (action) {
        case 'start':
          toast.success('任务已启动');
          break;
        case 'pause':
          toast.success('任务已暂停');
          break;
        case 'stop':
          toast.success('任务已停止');
          break;
        case 'run_now':
          toast.success('任务立即执行中...');
          break;
        case 'duplicate':
          toast.success('任务已复制');
          break;
        case 'delete':
          if (confirm('确定要删除这个任务吗？')) {
            setTasks(prev => prev.filter(t => t?.id !== taskId));
            toast.success('任务已删除');
          }
          break;
      }
    } catch (error) {
      toast.error('操作失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 批量操作
  const handleBatchAction = async (action: BatchAction) => {
    if (selectedTasks.size === 0) {
      toast('请选择要操作的任务');
      return;
    }

    setIsLoading(true);
    
    try {
      switch (action) {
        case 'start':
          toast.success(`已启动 ${selectedTasks.size} 个任务`);
          break;
        case 'pause':
          toast.success(`已暂停 ${selectedTasks.size} 个任务`);
          break;
        case 'delete':
          if (confirm(`确定要删除 ${selectedTasks.size} 个任务吗？`)) {
            setTasks(prev => prev.filter(t => !selectedTasks.has(t?.id)));
            setSelectedTasks(new Set());
            toast.success(`已删除 ${selectedTasks.size} 个任务`);
          }
          break;
        case 'duplicate':
          toast.success(`已复制 ${selectedTasks.size} 个任务`);
          break;
        case 'export':
          toast.success('任务数据已导出');
          break;
      }
    } catch (error) {
      toast.error('批量操作失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 选择任务
  const handleSelectTask = (taskId: string, selected: boolean) => {
    const newSelected = new Set(selectedTasks);
    if (selected) {
      newSelected.add(taskId);
    } else {
      newSelected.delete(taskId);
    }
    setSelectedTasks(newSelected);
  };

  // 全选/取消全选
  const handleSelectAll = () => {
    if (selectedTasks.size === filteredTasks.length) {
      setSelectedTasks(new Set());
    } else {
      setSelectedTasks(new Set(filteredTasks.map(t => t?.id)));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 页面标题和操作栏 */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Calendar className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">测试调度器</h1>
                <p className="text-sm text-gray-600">管理自动化测试任务和调度</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setViewMode(viewMode === 'list' ? 'calendar' : 'list')}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                {viewMode === 'list' ? '日历视图' : '列表视图'}
              </button>
              
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                新建任务
              </button>
            </div>
          </div>
        </div>

        {/* 过滤器和搜索 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2">
              <Search className="h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="搜索任务名称或描述..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e?.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e?.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">所有状态</option>
              <option value="active">运行中</option>
              <option value="paused">已暂停</option>
              <option value="disabled">已禁用</option>
            </select>
            
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e?.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="nextRun">下次执行</option>
              <option value="name">任务名称</option>
              <option value="lastRun">上次执行</option>
              <option value="successRate">成功率</option>
            </select>
            
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              {sortOrder === 'asc' ? '升序' : '降序'}
            </button>
            
            {selectedTasks.size > 0 && (
              <div className="flex items-center space-x-2 ml-auto">
                <span className="text-sm text-gray-600">已选择 {selectedTasks.size} 个任务</span>
                <button
                  onClick={() => handleBatchAction('start')}
                  className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                >
                  启动
                </button>
                <button
                  onClick={() => handleBatchAction('pause')}
                  className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 transition-colors"
                >
                  暂停
                </button>
                <button
                  onClick={() => handleBatchAction('delete')}
                  className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                >
                  删除
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 任务列表 */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                调度任务列表 ({filteredTasks.length})
              </h2>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedTasks.size === filteredTasks.length && filteredTasks.length > 0}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label className="text-sm text-gray-600">全选</label>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    选择
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    任务信息
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    类型
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    状态
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    调度
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    执行统计
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTasks.map((task) => {
                  const Icon = getTestTypeIcon(task.testType);
                  
                  return (
                    <tr key={task.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedTasks.has(task.id)}
                          onChange={(e) => handleSelectTask(task.id, e?.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{task.name}</div>
                          <div className="text-sm text-gray-500">{task.description}</div>
                          <div className="text-xs text-gray-400 mt-1">
                            创建于 {format(task.createdAt, 'yyyy-MM-dd HH:mm', { locale: zhCN })}
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Icon className="h-5 w-5 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-900">
                            {getTestTypeName(task.testType)}
                          </span>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                          {task.status === 'active' && <CheckCircle className="h-3 w-3 mr-1" />}
                          {task.status === 'paused' && <Pause className="h-3 w-3 mr-1" />}
                          {task.status === 'disabled' && <XCircle className="h-3 w-3 mr-1" />}
                          {task.status === 'active' ? '运行中' :
                           task.status === 'paused' ? '已暂停' :
                           task.status === 'disabled' ? '已禁用' : '未知'}
                        </span>
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {task.schedule.nextRun ? (
                            <>
                              <div>下次: {format(task.schedule.nextRun, 'MM-dd HH:mm')}</div>
                              <div className="text-xs text-gray-500">
                                {formatDistanceToNow(task.schedule.nextRun, { locale: zhCN, addSuffix: true })}
                              </div>
                            </>
                          ) : (
                            <span className="text-gray-400">未设置</span>
                          )}
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="text-gray-900">
                            成功率: <span className={getResultColor(task.stats.lastResult)}>
                              {task.stats.successRate}%
                            </span>
                          </div>
                          <div className="text-gray-500">
                            总执行: {task.stats.totalRuns} 次
                          </div>
                          <div className="text-gray-500">
                            平均耗时: {Math.floor(task.stats.avgDuration / 60)}分{task.stats.avgDuration % 60}秒
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          {task.status === 'active' ? (
                            <button
                              onClick={() => handleTaskAction('pause', task.id)}
                              className="text-yellow-600 hover:text-yellow-900"
                              title="暂停"
                            >
                              <Pause className="h-4 w-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleTaskAction('start', task.id)}
                              className="text-green-600 hover:text-green-900"
                              title="启动"
                            >
                              <Play className="h-4 w-4" />
                            </button>
                          )}
                          
                          <button
                            onClick={() => handleTaskAction('run_now', task.id)}
                            className="text-blue-600 hover:text-blue-900"
                            title="立即执行"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </button>
                          
                          <button
                            onClick={() => setEditingTask(task)}
                            className="text-gray-600 hover:text-gray-900"
                            title="编辑"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          
                          <button
                            onClick={() => handleTaskAction('duplicate', task.id)}
                            className="text-purple-600 hover:text-purple-900"
                            title="复制"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                          
                          <button
                            onClick={() => handleTaskAction('delete', task.id)}
                            className="text-red-600 hover:text-red-900"
                            title="删除"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {filteredTasks.length === 0 && (
            <div className="text-center py-12">
              <Calendar className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">暂无调度任务</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || filterStatus !== 'all' ? '没有符合条件的任务' : '开始创建你的第一个调度任务吧'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 加载状态覆盖层 */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex items-center space-x-3">
            <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />
            <span>操作处理中...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestScheduler;
