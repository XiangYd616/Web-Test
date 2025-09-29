/**
 * 定时任务管理组件
 * 支持定期自动化测试调度，测试结果通知和历史管理
 */

import React, { useState, useEffect, useCallback } from 'react';
import {Clock, Plus, Edit, Trash2, Play, Pause, Settings, RefreshCw, CheckCircle, Eye, Copy, Search, BarChart3, Target, Mail, Webhook, Timer} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface ScheduledTask {
  id: string;
  name: string;
  description: string;
  testType: string;
  urls: string[];
  schedule: {
    type: 'once' | 'daily' | 'weekly' | 'monthly' | 'custom';
    time: string;
    date?: string;
    daysOfWeek?: number[];
    dayOfMonth?: number;
    cronExpression?: string;
  };
  enabled: boolean;
  notifications: {
    email: boolean;
    webhook: boolean;
    emailAddresses: string[];
    webhookUrl?: string;
  };
  lastRun?: Date;
  nextRun?: Date;
  runCount: number;
  successCount: number;
  failureCount: number;
  createdAt: Date;
  updatedAt: Date;
}

interface TaskExecution {
  id: string;
  taskId: string;
  taskName: string;
  startTime: Date;
  endTime?: Date;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  results?: unknown;
  error?: string;
  duration?: number;
}

interface ScheduledTaskManagerProps {
  onTaskCreate?: (task: ScheduledTask) => void;
  onTaskUpdate?: (task: ScheduledTask) => void;
  onTaskDelete?: (taskId: string) => void;
}

const ScheduledTaskManager: React.FC<ScheduledTaskManagerProps> = ({
  onTaskCreate,
  onTaskUpdate,
  onTaskDelete
}) => {
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [executions, setExecutions] = useState<TaskExecution[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTask, setEditingTask] = useState<ScheduledTask | null>(null);
  const [selectedTask, setSelectedTask] = useState<ScheduledTask | null>(null);
  const [currentTab, setCurrentTab] = useState<'tasks' | 'executions' | 'analytics'>('tasks');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'enabled' | 'disabled'>('all');

  // 新建任务的表单状态
  const [taskForm, setTaskForm] = useState({
    name: '',
    description: '',
    testType: 'performance',
    urls: [''],
    schedule: {
      type: 'daily' as const,
      time: '09:00',
      date: '',
      daysOfWeek: [1, 2, 3, 4, 5], // 工作日
      dayOfMonth: 1,
      cronExpression: ''
    },
    notifications: {
      email: true,
      webhook: false,
      emailAddresses: [''],
      webhookUrl: ''
    }
  });

  // 测试类型选项
  const testTypes = [
    { value: 'performance', label: '性能测试', icon: BarChart3 },
    { value: 'security', label: '安全测试', icon: Target },
    { value: 'seo', label: 'SEO测试', icon: Search },
    { value: 'api', label: 'API测试', icon: Settings },
    { value: 'batch', label: '批量测试', icon: RefreshCw }
  ];

  // 调度类型选项
  const scheduleTypes = [
    { value: 'once', label: '执行一次' },
    { value: 'daily', label: '每天' },
    { value: 'weekly', label: '每周' },
    { value: 'monthly', label: '每月' },
    { value: 'custom', label: '自定义' }
  ];

  // 初始化数据
  useEffect(() => {
    loadTasks();
    loadExecutions();
  }, []);

  // 加载任务列表
  const loadTasks = useCallback(() => {
    // 模拟加载数据
    const mockTasks: ScheduledTask[] = [
      {
        id: 'task_1',
        name: '每日网站性能检查',
        description: '检查主要页面的性能指标',
        testType: 'performance',
        urls: ['https://example.com', 'https://example.com/about'],
        schedule: {
          type: 'daily',
          time: '09:00'
        },
        enabled: true,
        notifications: {
          email: true,
          webhook: false,
          emailAddresses: ['admin@example.com']
        },
        lastRun: new Date(Date.now() - 86400000), // 1天前
        nextRun: new Date(Date.now() + 3600000), // 1小时后
        runCount: 30,
        successCount: 28,
        failureCount: 2,
        createdAt: new Date(Date.now() - 2592000000), // 30天前
        updatedAt: new Date(Date.now() - 86400000)
      },
      {
        id: 'task_2',
        name: '周末安全扫描',
        description: '完整的安全漏洞扫描',
        testType: 'security',
        urls: ['https://example.com'],
        schedule: {
          type: 'weekly',
          time: '02:00',
          daysOfWeek: [0] // 周日
        },
        enabled: true,
        notifications: {
          email: true,
          webhook: true,
          emailAddresses: ['security@example.com'],
          webhookUrl: 'https://hooks.example.com/security'
        },
        lastRun: new Date(Date.now() - 604800000), // 1周前
        nextRun: new Date(Date.now() + 259200000), // 3天后
        runCount: 4,
        successCount: 4,
        failureCount: 0,
        createdAt: new Date(Date.now() - 2592000000),
        updatedAt: new Date(Date.now() - 604800000)
      }
    ];
    setTasks(mockTasks);
  }, []);

  // 加载执行历史
  const loadExecutions = useCallback(() => {
    // 模拟加载执行历史
    const mockExecutions: TaskExecution[] = [
      {
        id: 'exec_1',
        taskId: 'task_1',
        taskName: '每日网站性能检查',
        startTime: new Date(Date.now() - 3600000),
        endTime: new Date(Date.now() - 3300000),
        status: 'completed',
        duration: 300000, // 5分钟
        results: { avgScore: 85, testedUrls: 2, issues: 1 }
      },
      {
        id: 'exec_2',
        taskId: 'task_2',
        taskName: '周末安全扫描',
        startTime: new Date(Date.now() - 7200000),
        endTime: new Date(Date.now() - 5400000),
        status: 'completed',
        duration: 1800000, // 30分钟
        results: { vulnerabilities: 0, score: 95 }
      }
    ];
    setExecutions(mockExecutions);
  }, []);

  // 创建新任务
  const createTask = useCallback(() => {
    if (!taskForm.name.trim()) {
      toast.error('请输入任务名称');
      return;
    }

    if (taskForm.urls.filter(url => url.trim()).length === 0) {
      toast.error('请至少添加一个URL');
      return;
    }

    const newTask: ScheduledTask = {
      id: `task_${Date.now()}`,
      name: taskForm.name,
      description: taskForm.description,
      testType: taskForm.testType,
      urls: taskForm.urls.filter(url => url.trim()),
      schedule: { ...taskForm.schedule },
      enabled: true,
      notifications: {
        ...taskForm.notifications,
        emailAddresses: taskForm.notifications.emailAddresses.filter(email => email.trim())
      },
      nextRun: calculateNextRun(taskForm.schedule),
      runCount: 0,
      successCount: 0,
      failureCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    setTasks(prev => [...prev, newTask]);
    setShowCreateModal(false);
    resetTaskForm();
    onTaskCreate?.(newTask);
    toast.success('定时任务创建成功');
  }, [taskForm, onTaskCreate]);

  // 计算下次运行时间
  const calculateNextRun = (schedule: unknown): Date => {
    const now = new Date();
    const next = new Date();
    
    const [hours, minutes] = schedule.time.split(':').map(Number);
    next.setHours(hours, minutes, 0, 0);

    switch (schedule.type) {
      case 'once':
        if (schedule.date) {
          return new Date(`${schedule.date} ${schedule.time}`);
        }
        return next;
        
      case 'daily':
        if (next <= now) {
          next.setDate(next.getDate() + 1);
        }
        return next;
        
      case 'weekly':
        const targetDay = schedule.daysOfWeek?.[0] || 0;
        const currentDay = next.getDay();
        let daysUntilTarget = targetDay - currentDay;
        if (daysUntilTarget <= 0 || (daysUntilTarget === 0 && next <= now)) {
          daysUntilTarget += 7;
        }
        next.setDate(next.getDate() + daysUntilTarget);
        return next;
        
      case 'monthly':
        next.setDate(schedule.dayOfMonth || 1);
        if (next <= now) {
          next.setMonth(next.getMonth() + 1);
        }
        return next;
        
      default:
        return next;
    }
  };

  // 重置表单
  const resetTaskForm = () => {
    setTaskForm({
      name: '',
      description: '',
      testType: 'performance',
      urls: [''],
      schedule: {
        type: 'daily',
        time: '09:00',
        date: '',
        daysOfWeek: [1, 2, 3, 4, 5],
        dayOfMonth: 1,
        cronExpression: ''
      },
      notifications: {
        email: true,
        webhook: false,
        emailAddresses: [''],
        webhookUrl: ''
      }
    });
  };

  // 切换任务状态
  const toggleTaskStatus = useCallback((taskId: string) => {
    setTasks(prev => prev.map(task => {
      if (task.id === taskId) {
        const updatedTask = {
          ...task,
          enabled: !task.enabled,
          updatedAt: new Date()
        };
        onTaskUpdate?.(updatedTask);
        return updatedTask;
      }
      return task;
    }));
    
    toast.success('任务状态已更新');
  }, [onTaskUpdate]);

  // 手动执行任务
  const executeTaskNow = useCallback(async (task: ScheduledTask) => {
    const execution: TaskExecution = {
      id: `exec_${Date.now()}`,
      taskId: task.id,
      taskName: task.name,
      startTime: new Date(),
      status: 'running'
    };

    setExecutions(prev => [execution, ...prev]);
    toast.info(`开始执行任务: ${task.name}`);

    // 模拟执行过程
    setTimeout(() => {
      const completedExecution: TaskExecution = {
        ...execution,
        endTime: new Date(),
        status: 'completed',
        duration: 300000 + Math.random() * 600000, // 5-15分钟
        results: {
          avgScore: Math.round(70 + Math.random() * 30),
          testedUrls: task.urls.length,
          issues: Math.floor(Math.random() * 5)
        }
      };

      setExecutions(prev => prev.map(exec => 
        exec.id === execution.id ? completedExecution : exec
      ));

      // 更新任务统计
      setTasks(prev => prev.map(t => {
        if (t.id === task.id) {
          return {
            ...t,
            lastRun: new Date(),
            runCount: t.runCount + 1,
            successCount: t.successCount + 1,
            updatedAt: new Date()
          };
        }
        return t;
      }));

      toast.success(`任务执行完成: ${task.name}`);
    }, 3000 + Math.random() * 5000);
  }, []);

  // 删除任务
  const deleteTask = useCallback((taskId: string) => {
    if (confirm('确定要删除这个定时任务吗？')) {
      setTasks(prev => prev.filter(task => task.id !== taskId));
      setExecutions(prev => prev.filter(exec => exec.taskId !== taskId));
      onTaskDelete?.(taskId);
      toast.success('任务已删除');
    }
  }, [onTaskDelete]);

  // 复制任务
  const duplicateTask = useCallback((task: ScheduledTask) => {
    const newTask: ScheduledTask = {
      ...task,
      id: `task_${Date.now()}`,
      name: `${task.name} (副本)`,
      runCount: 0,
      successCount: 0,
      failureCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastRun: undefined,
      nextRun: calculateNextRun(task.schedule)
    };

    setTasks(prev => [...prev, newTask]);
    toast.success('任务已复制');
  }, []);

  // 过滤任务
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || 
                         (filterStatus === 'enabled' && task.enabled) ||
                         (filterStatus === 'disabled' && !task.enabled);
    return matchesSearch && matchesFilter;
  });

  // 统计信息
  const stats = {
    total: tasks.length,
    enabled: tasks.filter(t => t.enabled).length,
    disabled: tasks.filter(t => !t.enabled).length,
    totalRuns: tasks.reduce((sum, t) => sum + t.runCount, 0),
    successRate: tasks.length > 0 ? 
      Math.round((tasks.reduce((sum, t) => sum + t.successCount, 0) / 
                 Math.max(1, tasks.reduce((sum, t) => sum + t.runCount, 0))) * 100) : 0
  };

  return (
    <div className="space-y-6">
      {/* 头部统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-gray-600">总任务</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center space-x-2">
            <Play className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-gray-600">已启用</span>
          </div>
          <div className="text-2xl font-bold text-green-600 mt-1">{stats.enabled}</div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center space-x-2">
            <Pause className="w-5 h-5 text-gray-600" />
            <span className="text-sm font-medium text-gray-600">已禁用</span>
          </div>
          <div className="text-2xl font-bold text-gray-600 mt-1">{stats.disabled}</div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center space-x-2">
            <RefreshCw className="w-5 h-5 text-purple-600" />
            <span className="text-sm font-medium text-gray-600">总执行</span>
          </div>
          <div className="text-2xl font-bold text-purple-600 mt-1">{stats.totalRuns}</div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-gray-600">成功率</span>
          </div>
          <div className="text-2xl font-bold text-green-600 mt-1">{stats.successRate}%</div>
        </div>
      </div>

      {/* 主要控制区域 */}
      <div className="bg-white rounded-lg shadow-sm border">
        {/* 工具栏 */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>创建任务</span>
            </button>

            <div className="h-6 border-l border-gray-300" />

            {/* 搜索 */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e?.target.value)}
                placeholder="搜索任务..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* 过滤器 */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e?.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">全部状态</option>
              <option value="enabled">已启用</option>
              <option value="disabled">已禁用</option>
            </select>
          </div>

          {/* Tab 导航 */}
          <div className="flex rounded-lg border border-gray-300 overflow-hidden">
            {[
              { key: 'tasks', label: '任务列表', icon: Clock },
              { key: 'executions', label: '执行历史', icon: Timer },
              { key: 'analytics', label: '数据分析', icon: BarChart3 }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setCurrentTab(tab.key as any)}
                className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium transition-colors ${
                  currentTab === tab.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab 内容 */}
        <div className="p-6">
          {currentTab === 'tasks' && (
            <div className="space-y-4">
              {filteredTasks.map((task) => (
                <div
                  key={task.id}
                  className="border border-gray-200 rounded-lg p-6 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{task.name}</h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          task.enabled 
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {task.enabled ? '已启用' : '已禁用'}
                        </span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {testTypes.find(t => t.value === task.testType)?.label || task.testType}
                        </span>
                      </div>

                      {task.description && (
                        <p className="text-gray-600 mb-3">{task.description}</p>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">调度:</span> {
                            task.schedule.type === 'daily' ? '每天' :
                            task.schedule.type === 'weekly' ? '每周' :
                            task.schedule.type === 'monthly' ? '每月' :
                            task.schedule.type === 'once' ? '执行一次' : '自定义'
                          } {task.schedule.time}
                        </div>
                        <div>
                          <span className="font-medium">测试URL:</span> {task.urls.length} 个
                        </div>
                        <div>
                          <span className="font-medium">上次运行:</span> {
                            task.lastRun ? task.lastRun.toLocaleString('zh-CN') : '从未运行'
                          }
                        </div>
                        <div>
                          <span className="font-medium">下次运行:</span> {
                            task.enabled && task.nextRun 
                              ? task.nextRun.toLocaleString('zh-CN') 
                              : '未安排'
                          }
                        </div>
                      </div>

                      <div className="mt-4 flex items-center space-x-6 text-sm">
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-500">执行次数:</span>
                          <span className="font-medium">{task.runCount}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-500">成功:</span>
                          <span className="font-medium text-green-600">{task.successCount}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-500">失败:</span>
                          <span className="font-medium text-red-600">{task.failureCount}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-500">成功率:</span>
                          <span className="font-medium">
                            {task.runCount > 0 ? Math.round((task.successCount / task.runCount) * 100) : 0}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => executeTaskNow(task)}
                        className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                        title="立即执行"
                      >
                        <Play className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => toggleTaskStatus(task.id)}
                        className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                        title={task.enabled ? "禁用任务" : "启用任务"}
                      >
                        {task.enabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </button>

                      <button
                        onClick={() => setEditingTask(task)}
                        className="p-2 text-gray-600 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                        title="编辑任务"
                      >
                        <Edit className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => duplicateTask(task)}
                        className="p-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors"
                        title="复制任务"
                      >
                        <Copy className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => setSelectedTask(task)}
                        className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                        title="查看详情"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => deleteTask(task.id)}
                        className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                        title="删除任务"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {filteredTasks.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>没有找到匹配的定时任务</p>
                  <p className="text-sm">点击"创建任务"开始添加定时任务</p>
                </div>
              )}
            </div>
          )}

          {currentTab === 'executions' && (
            <div className="space-y-4">
              {executions.map((execution) => (
                <div
                  key={execution.id}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="font-medium text-gray-900">{execution.taskName}</h4>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          execution.status === 'completed' ? 'bg-green-100 text-green-800' :
                          execution.status === 'running' ? 'bg-blue-100 text-blue-800' :
                          execution.status === 'failed' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {execution.status === 'completed' ? '已完成' :
                           execution.status === 'running' ? '运行中' :
                           execution.status === 'failed' ? '失败' : '已取消'}
                        </span>
                      </div>

                      <div className="text-sm text-gray-600 space-y-1">
                        <div>开始时间: {execution.startTime.toLocaleString('zh-CN')}</div>
                        {execution.endTime && (
                          <div>结束时间: {execution.endTime.toLocaleString('zh-CN')}</div>
                        )}
                        {execution.duration && (
                          <div>执行时长: {Math.round(execution.duration / 60000)} 分钟</div>
                        )}
                      </div>
                    </div>

                    {execution.results && (
                      <div className="text-sm text-gray-600">
                        {execution.results.avgScore && (
                          <div>平均分数: {execution.results.avgScore}</div>
                        )}
                        {execution.results.testedUrls && (
                          <div>测试URL: {execution.results.testedUrls} 个</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {executions.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <Timer className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>暂无执行历史</p>
                </div>
              )}
            </div>
          )}

          {currentTab === 'analytics' && (
            <div className="text-center py-12 text-gray-500">
              <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>数据分析功能即将推出</p>
            </div>
          )}
        </div>
      </div>

      {/* 创建任务模态框 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold">创建定时任务</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <Plus className="w-5 h-5 transform rotate-45" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* 基本信息 */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    任务名称 *
                  </label>
                  <input
                    type="text"
                    value={taskForm.name}
                    onChange={(e) => setTaskForm(prev => ({ ...prev, name: e?.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="输入任务名称"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    任务描述
                  </label>
                  <textarea
                    value={taskForm.description}
                    onChange={(e) => setTaskForm(prev => ({ ...prev, description: e?.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="输入任务描述"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    测试类型
                  </label>
                  <select
                    value={taskForm.testType}
                    onChange={(e) => setTaskForm(prev => ({ ...prev, testType: e?.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {testTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 调度设置 */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">调度设置</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      调度类型
                    </label>
                    <select
                      value={taskForm.schedule.type}
                      onChange={(e) => setTaskForm(prev => ({
                        ...prev,
                        schedule: { ...prev.schedule, type: e?.target.value as any }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {scheduleTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      执行时间
                    </label>
                    <input
                      type="time"
                      value={taskForm.schedule.time}
                      onChange={(e) => setTaskForm(prev => ({
                        ...prev,
                        schedule: { ...prev.schedule, time: e?.target.value }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* 通知设置 */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">通知设置</h4>
                
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={taskForm.notifications.email}
                      onChange={(e) => setTaskForm(prev => ({
                        ...prev,
                        notifications: { ...prev.notifications, email: e?.target.checked }
                      }))}
                      className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <Mail className="w-4 h-4 mr-2" />
                    <span className="text-sm">邮件通知</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={taskForm.notifications.webhook}
                      onChange={(e) => setTaskForm(prev => ({
                        ...prev,
                        notifications: { ...prev.notifications, webhook: e?.target.checked }
                      }))}
                      className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <Webhook className="w-4 h-4 mr-2" />
                    <span className="text-sm">Webhook 通知</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 p-6 border-t">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
              >
                取消
              </button>
              <button
                onClick={createTask}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
              >
                创建任务
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduledTaskManager;
