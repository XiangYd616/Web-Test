/**
 * 项目管理者专用仪表板
 * 为项目管理者和团队领导者提供团队管理和项目概览
 */

import React, { useState, useEffect } from 'react';
import {Users, TrendingUp, Calendar, Target, BarChart3, Clock, CheckCircle, FileText, Settings, MessageSquare, RefreshCw, UserCheck, Briefcase} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface TeamMetrics {
  totalTeamMembers: number;
  activeProjects: number;
  completedTasks: number;
  pendingTasks: number;
  teamPerformance: number;
  onTimeDelivery: number;
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  status: 'online' | 'offline' | 'busy';
  currentTask: string;
  performance: number;
  tasksCompleted: number;
  lastActive: string;
}

interface Project {
  id: string;
  name: string;
  status: 'planning' | 'in-progress' | 'testing' | 'completed' | 'on-hold';
  progress: number;
  deadline: string;
  assignedMembers: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

interface TaskSummary {
  id: string;
  title: string;
  assignee: string;
  status: 'todo' | 'in-progress' | 'review' | 'completed';
  priority: 'low' | 'medium' | 'high';
  dueDate: string;
  project: string;
}

const ManagerDashboard: React.FC = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<TeamMetrics>({
    totalTeamMembers: 0,
    activeProjects: 0,
    completedTasks: 0,
    pendingTasks: 0,
    teamPerformance: 0,
    onTimeDelivery: 0
  });

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [recentTasks, setRecentTasks] = useState<TaskSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState('7d');

  // 模拟数据加载
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      
      // 模拟API调用延迟
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 设置团队指标数据
      setMetrics({
        totalTeamMembers: 12,
        activeProjects: 5,
        completedTasks: 143,
        pendingTasks: 28,
        teamPerformance: 87.5,
        onTimeDelivery: 92.3
      });

      // 设置团队成员数据
      setTeamMembers([
        {
          id: '1',
          name: '张三',
          role: 'Frontend Developer',
          status: 'online',
          currentTask: '用户界面优化',
          performance: 92,
          tasksCompleted: 15,
          lastActive: '2025-09-16T12:00:00Z'
        },
        {
          id: '2',
          name: '李四',
          role: 'Backend Developer',
          status: 'busy',
          currentTask: 'API性能优化',
          performance: 88,
          tasksCompleted: 12,
          lastActive: '2025-09-16T11:30:00Z'
        },
        {
          id: '3',
          name: '王五',
          role: 'QA Engineer',
          status: 'online',
          currentTask: '自动化测试脚本',
          performance: 95,
          tasksCompleted: 18,
          lastActive: '2025-09-16T12:10:00Z'
        },
        {
          id: '4',
          name: '赵六',
          role: 'DevOps Engineer',
          status: 'offline',
          currentTask: '部署环境配置',
          performance: 85,
          tasksCompleted: 10,
          lastActive: '2025-09-16T09:45:00Z'
        }
      ]);

      // 设置项目数据
      setProjects([
        {
          id: '1',
          name: '用户管理系统重构',
          status: 'in-progress',
          progress: 75,
          deadline: '2025-10-15',
          assignedMembers: 4,
          priority: 'high'
        },
        {
          id: '2',
          name: '移动端应用开发',
          status: 'testing',
          progress: 90,
          deadline: '2025-09-30',
          assignedMembers: 3,
          priority: 'critical'
        },
        {
          id: '3',
          name: 'API文档更新',
          status: 'planning',
          progress: 25,
          deadline: '2025-11-01',
          assignedMembers: 2,
          priority: 'medium'
        },
        {
          id: '4',
          name: '性能监控系统',
          status: 'in-progress',
          progress: 60,
          deadline: '2025-10-30',
          assignedMembers: 5,
          priority: 'high'
        }
      ]);

      // 设置任务数据
      setRecentTasks([
        {
          id: '1',
          title: '完成用户登录界面设计',
          assignee: '张三',
          status: 'completed',
          priority: 'high',
          dueDate: '2025-09-16',
          project: '用户管理系统重构'
        },
        {
          id: '2',
          title: 'API性能测试',
          assignee: '王五',
          status: 'in-progress',
          priority: 'medium',
          dueDate: '2025-09-18',
          project: '性能监控系统'
        },
        {
          id: '3',
          title: '数据库优化方案',
          assignee: '李四',
          status: 'review',
          priority: 'high',
          dueDate: '2025-09-17',
          project: '用户管理系统重构'
        }
      ]);

      setLoading(false);
    };

    loadData();
  }, [selectedTimeRange]);

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    const colors = {
      online: 'text-green-600 bg-green-100',
      busy: 'text-yellow-600 bg-yellow-100',
      offline: 'text-gray-600 bg-gray-100',
      'in-progress': 'text-blue-600 bg-blue-100',
      completed: 'text-green-600 bg-green-100',
      planning: 'text-purple-600 bg-purple-100',
      testing: 'text-orange-600 bg-orange-100',
      'on-hold': 'text-red-600 bg-red-100',
      todo: 'text-gray-600 bg-gray-100',
      review: 'text-yellow-600 bg-yellow-100'
    };
    return colors[status as keyof typeof colors] || 'text-gray-600 bg-gray-100';
  };

  // 获取优先级颜色
  const getPriorityColor = (priority: string) => {
    const colors = {
      low: 'text-gray-600 bg-gray-100',
      medium: 'text-blue-600 bg-blue-100',
      high: 'text-orange-600 bg-orange-100',
      critical: 'text-red-600 bg-red-100'
    };
    return colors[priority as keyof typeof colors] || 'text-gray-600 bg-gray-100';
  };

  // 获取性能颜色
  const getPerformanceColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载管理数据...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面标题和时间范围选择 */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">团队管理工作台</h1>
            <p className="mt-2 text-gray-600">
              欢迎回来，{user?.profile?.fullName || user?.username}！管理您的团队和项目
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={selectedTimeRange}
              onChange={(e) => setSelectedTimeRange(e?.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
            >
              <option value="7d">最近7天</option>
              <option value="30d">最近30天</option>
              <option value="90d">最近90天</option>
            </select>
            <button className="p-2 text-gray-500 hover:text-gray-700">
              <RefreshCw className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* 关键指标卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">团队成员</p>
                <p className="text-2xl font-semibold text-gray-900">{metrics.totalTeamMembers}</p>
                <p className="text-xs text-green-600">全员活跃</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Briefcase className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">活跃项目</p>
                <p className="text-2xl font-semibold text-gray-900">{metrics.activeProjects}</p>
                <p className="text-xs text-blue-600">进行中</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">完成任务</p>
                <p className="text-2xl font-semibold text-gray-900">{metrics.completedTasks}</p>
                <p className="text-xs text-green-600">本月 +23</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-8 w-8 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">待处理任务</p>
                <p className="text-2xl font-semibold text-gray-900">{metrics.pendingTasks}</p>
                <p className="text-xs text-red-600">需关注</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">团队表现</p>
                <p className="text-2xl font-semibold text-gray-900">{metrics.teamPerformance.toFixed(1)}%</p>
                <p className="text-xs text-green-600">+3.2% 上周</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Target className="h-8 w-8 text-indigo-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">按时交付</p>
                <p className="text-2xl font-semibold text-gray-900">{metrics.onTimeDelivery.toFixed(1)}%</p>
                <p className="text-xs text-green-600">优秀</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 项目概览和任务管理 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 项目概览 */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">项目概览</h2>
                    <p className="text-sm text-gray-500 mt-1">当前进行中的项目状态</p>
                  </div>
                  <button className="px-4 py-2 text-sm text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50">
                    创建项目
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {projects.map((project) => (
                    <div key={project.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h4 className="text-sm font-medium text-gray-900">{project.name}</h4>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(project.status)}`}>
                              {project.status}
                            </span>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(project.priority)}`}>
                              {project.priority}
                            </span>
                          </div>
                          <div className="mb-3">
                            <div className="flex justify-between text-sm text-gray-600 mb-1">
                              <span>进度</span>
                              <span>{project.progress}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${project.progress}%` }}
                              ></div>
                            </div>
                          </div>
                          <div className="flex items-center text-xs text-gray-500 space-x-4">
                            <span className="flex items-center">
                              <Users className="h-4 w-4 mr-1" />
                              {project.assignedMembers} 成员
                            </span>
                            <span className="flex items-center">
                              <Calendar className="h-4 w-4 mr-1" />
                              截止: {new Date(project.deadline).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 最近任务 */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">最近任务活动</h2>
                <p className="text-sm text-gray-500 mt-1">团队成员的任务进展</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        任务
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        负责人
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        状态
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        优先级
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        截止日期
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {recentTasks.map((task) => (
                      <tr key={task.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{task.title}</div>
                            <div className="text-sm text-gray-500">{task.project}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {task.assignee}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(task.status)}`}>
                            {task.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(task.dueDate).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* 团队信息和工具 */}
          <div className="space-y-6">
            {/* 团队成员 */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">团队成员</h2>
                <p className="text-sm text-gray-500 mt-1">成员状态和表现</p>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {teamMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-blue-300">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                          {member.name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">{member.name}</h4>
                          <p className="text-xs text-gray-500">{member.role}</p>
                          <p className="text-xs text-gray-600 mt-1">{member.currentTask}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(member.status)}`}>
                          {member.status}
                        </span>
                        <div className="flex items-center mt-1">
                          <span className={`text-sm font-medium ${getPerformanceColor(member.performance)}`}>
                            {member.performance}%
                          </span>
                          <span className="text-xs text-gray-500 ml-2">
                            {member.tasksCompleted} 任务
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <button className="w-full mt-4 px-4 py-2 text-sm text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50 transition-colors">
                  查看所有成员
                </button>
              </div>
            </div>

            {/* 快速操作 */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">管理工具</h2>
                <p className="text-sm text-gray-500 mt-1">常用管理功能</p>
              </div>
              <div className="p-6">
                <div className="space-y-2">
                  <button className="w-full text-left px-3 py-2 text-sm text-gray-700 rounded-md hover:bg-gray-100 flex items-center">
                    <Calendar className="h-4 w-4 mr-3" />
                    项目时间规划
                  </button>
                  <button className="w-full text-left px-3 py-2 text-sm text-gray-700 rounded-md hover:bg-gray-100 flex items-center">
                    <BarChart3 className="h-4 w-4 mr-3" />
                    团队绩效分析
                  </button>
                  <button className="w-full text-left px-3 py-2 text-sm text-gray-700 rounded-md hover:bg-gray-100 flex items-center">
                    <FileText className="h-4 w-4 mr-3" />
                    生成项目报告
                  </button>
                  <button className="w-full text-left px-3 py-2 text-sm text-gray-700 rounded-md hover:bg-gray-100 flex items-center">
                    <UserCheck className="h-4 w-4 mr-3" />
                    成员考核管理
                  </button>
                  <button className="w-full text-left px-3 py-2 text-sm text-gray-700 rounded-md hover:bg-gray-100 flex items-center">
                    <MessageSquare className="h-4 w-4 mr-3" />
                    团队沟通记录
                  </button>
                  <button className="w-full text-left px-3 py-2 text-sm text-gray-700 rounded-md hover:bg-gray-100 flex items-center">
                    <Settings className="h-4 w-4 mr-3" />
                    团队设置管理
                  </button>
                </div>
              </div>
            </div>

            {/* 绩效概览 */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">团队绩效</h2>
                <p className="text-sm text-gray-500 mt-1">本周绩效概览</p>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">整体表现</span>
                    <span className="text-sm font-medium text-green-600">{metrics.teamPerformance.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: `${metrics.teamPerformance}%` }}
                    ></div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">按时交付率</span>
                    <span className="text-sm font-medium text-blue-600">{metrics.onTimeDelivery.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${metrics.onTimeDelivery}%` }}
                    ></div>
                  </div>

                  <div className="pt-4 border-t border-gray-200">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">本周完成</span>
                      <span className="font-medium">23 个任务</span>
                    </div>
                    <div className="flex justify-between text-sm mt-2">
                      <span className="text-gray-500">平均工时</span>
                      <span className="font-medium">42.5 小时</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboard;
