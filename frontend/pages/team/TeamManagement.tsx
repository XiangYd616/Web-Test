/**
 * 团队管理页面
 * 为团队管理者提供团队设置、成员管理和项目组织功能
 */

import React, { useState, useEffect } from 'react';
import {Users, Settings, Plus, Search, Filter, MoreVertical, Edit, UserPlus, Mail, Calendar, Briefcase, Eye, CheckCircle, XCircle, Clock, AlertTriangle} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: string;
  department: string;
  status: 'active' | 'inactive' | 'pending';
  joinDate: string;
  lastActivity: string;
  projectsCount: number;
  performance: number;
  permissions: string[];
}

interface TeamProject {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'completed' | 'paused' | 'planning';
  progress: number;
  memberCount: number;
  deadline: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  tags: string[];
}

interface TeamSettings {
  id: string;
  name: string;
  description: string;
  avatar?: string;
  size: number;
  department: string;
  timezone: string;
  workingHours: {
    start: string;
    end: string;
  };
  notifications: {
    email: boolean;
    slack: boolean;
    inApp: boolean;
  };
  permissions: {
    canInvite: boolean;
    canCreateProjects: boolean;
    canManageSettings: boolean;
  };
}

const TeamManagement: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'members' | 'projects' | 'settings'>('members');
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [projects, setProjects] = useState<TeamProject[]>([]);
  const [teamSettings, setTeamSettings] = useState<TeamSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);

  // 模拟数据加载
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      
      // 模拟API调用延迟
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 设置团队成员数据
      setMembers([
        {
          id: '1',
          name: '张三',
          email: 'zhang.san@company.com',
          role: '前端工程师',
          department: '技术部',
          status: 'active',
          joinDate: '2024-01-15',
          lastActivity: '2025-09-16T11:30:00Z',
          projectsCount: 3,
          performance: 92,
          permissions: ['test:execute', 'project:read']
        },
        {
          id: '2',
          name: '李四',
          email: 'li.si@company.com',
          role: '后端工程师',
          department: '技术部',
          status: 'active',
          joinDate: '2023-08-20',
          lastActivity: '2025-09-16T12:00:00Z',
          projectsCount: 5,
          performance: 88,
          permissions: ['test:execute', 'project:write', 'api:manage']
        },
        {
          id: '3',
          name: '王五',
          email: 'wang.wu@company.com',
          role: '测试工程师',
          department: '质量部',
          status: 'active',
          joinDate: '2024-03-10',
          lastActivity: '2025-09-16T10:45:00Z',
          projectsCount: 4,
          performance: 95,
          permissions: ['test:read', 'test:write', 'test:execute']
        },
        {
          id: '4',
          name: '赵六',
          email: 'zhao.liu@company.com',
          role: '产品经理',
          department: '产品部',
          status: 'pending',
          joinDate: '2025-09-01',
          lastActivity: '',
          projectsCount: 0,
          performance: 0,
          permissions: ['project:read']
        }
      ]);

      // 设置项目数据
      setProjects([
        {
          id: '1',
          name: '用户管理系统重构',
          description: '重构现有用户管理系统，提升性能和用户体验',
          status: 'active',
          progress: 75,
          memberCount: 4,
          deadline: '2025-10-15',
          priority: 'high',
          tags: ['前端', '后端', '重构']
        },
        {
          id: '2',
          name: '移动端应用开发',
          description: '开发配套的移动端应用',
          status: 'active',
          progress: 60,
          memberCount: 3,
          deadline: '2025-11-30',
          priority: 'medium',
          tags: ['移动端', 'React Native']
        },
        {
          id: '3',
          name: '数据分析平台',
          description: '构建内部数据分析和报表平台',
          status: 'planning',
          progress: 15,
          memberCount: 2,
          deadline: '2025-12-31',
          priority: 'low',
          tags: ['数据', '分析', '可视化']
        }
      ]);

      // 设置团队配置
      setTeamSettings({
        id: '1',
        name: '技术团队',
        description: '负责产品技术研发的核心团队',
        size: 12,
        department: '技术部',
        timezone: 'Asia/Shanghai',
        workingHours: {
          start: '09:00',
          end: '18:00'
        },
        notifications: {
          email: true,
          slack: false,
          inApp: true
        },
        permissions: {
          canInvite: true,
          canCreateProjects: true,
          canManageSettings: false
        }
      });

      setLoading(false);
    };

    loadData();
  }, []);

  // 获取状态颜色和图标
  const getStatusInfo = (status: string) => {
    const statusMap = {
      active: { color: 'text-green-600 bg-green-100', icon: CheckCircle, label: '活跃' },
      inactive: { color: 'text-gray-600 bg-gray-100', icon: XCircle, label: '非活跃' },
      pending: { color: 'text-yellow-600 bg-yellow-100', icon: Clock, label: '待激活' },
      completed: { color: 'text-blue-600 bg-blue-100', icon: CheckCircle, label: '已完成' },
      paused: { color: 'text-red-600 bg-red-100', icon: XCircle, label: '暂停' },
      planning: { color: 'text-purple-600 bg-purple-100', icon: Calendar, label: '规划中' }
    };
    return statusMap[status as keyof typeof statusMap] || statusMap.active;
  };

  // 获取优先级颜色
  const getPriorityColor = (priority: string) => {
    const colors = {
      low: 'text-gray-600 bg-gray-100',
      medium: 'text-blue-600 bg-blue-100',
      high: 'text-orange-600 bg-orange-100',
      critical: 'text-red-600 bg-red-100'
    };
    return colors[priority as keyof typeof colors] || colors.medium;
  };

  // 过滤成员
  const filteredMembers = members.filter(member =>
    member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载团队数据...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">团队管理</h1>
          <p className="mt-2 text-gray-600">
            管理团队成员、项目和设置
          </p>
        </div>

        {/* 导航标签 */}
        <div className="mb-8">
          <nav className="flex space-x-8">
            {[
              { key: 'members', label: '团队成员', icon: Users },
              { key: 'projects', label: '项目管理', icon: Briefcase },
              { key: 'settings', label: '团队设置', icon: Settings }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center px-3 py-2 border-b-2 font-medium text-sm ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4 mr-2" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* 团队成员标签页 */}
        {activeTab === 'members' && (
          <div className="space-y-6">
            {/* 搜索和操作栏 */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="搜索团队成员..."
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <button className="px-3 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md">
                    <Filter className="h-4 w-4" />
                  </button>
                </div>
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  邀请成员
                </button>
              </div>

              {/* 成员统计 */}
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{members.length}</div>
                  <div className="text-sm text-gray-500">总成员</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{members.filter(m => m.status === 'active').length}</div>
                  <div className="text-sm text-gray-500">活跃成员</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{members.filter(m => m.status === 'pending').length}</div>
                  <div className="text-sm text-gray-500">待激活</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{Math.round(members.reduce((acc, m) => acc + m.performance, 0) / members.length)}</div>
                  <div className="text-sm text-gray-500">平均绩效</div>
                </div>
              </div>
            </div>

            {/* 成员列表 */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        成员
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        角色/部门
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        状态
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        项目数
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        绩效
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        加入时间
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredMembers.map((member) => {
                      const statusInfo = getStatusInfo(member.status);
                      return (
                        <tr key={member.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                                  {member.name.charAt(0)}
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{member.name}</div>
                                <div className="text-sm text-gray-500">{member.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{member.role}</div>
                            <div className="text-sm text-gray-500">{member.department}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
                              <statusInfo.icon className="h-3 w-3 mr-1" />
                              {statusInfo.label}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {member.projectsCount}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="text-sm text-gray-900 mr-2">{member.performance}%</div>
                              <div className="w-16 bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${
                                    member.performance >= 90 ? 'bg-green-500' :
                                    member.performance >= 80 ? 'bg-blue-500' :
                                    member.performance >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                                  }`}
                                  style={{ width: `${member.performance}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(member.joinDate).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end space-x-2">
                              <button className="text-blue-600 hover:text-blue-900">
                                <Edit className="h-4 w-4" />
                              </button>
                              <button className="text-gray-600 hover:text-gray-900">
                                <Eye className="h-4 w-4" />
                              </button>
                              <button className="text-gray-400 hover:text-gray-600">
                                <MoreVertical className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 项目管理标签页 */}
        {activeTab === 'projects' && (
          <div className="space-y-6">
            {/* 项目操作栏 */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">团队项目</h2>
                  <p className="text-sm text-gray-500 mt-1">管理团队的所有项目</p>
                </div>
                <button
                  onClick={() => setShowProjectModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  创建项目
                </button>
              </div>
            </div>

            {/* 项目网格 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => {
                const statusInfo = getStatusInfo(project.status);
                return (
                  <div key={project.id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-900 mb-2">{project.name}</h3>
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{project.description}</p>
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-500 mb-4">
                          <span className="flex items-center">
                            <Users className="h-4 w-4 mr-1" />
                            {project.memberCount} 成员
                          </span>
                          <span className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            {new Date(project.deadline).toLocaleDateString()}
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

                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
                              {statusInfo.label}
                            </span>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(project.priority)}`}>
                              {project.priority}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1 mt-3">
                          {project.tags.map((tag, index) => (
                            <span key={index} className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      <button className="text-gray-400 hover:text-gray-600">
                        <MoreVertical className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 团队设置标签页 */}
        {activeTab === 'settings' && teamSettings && (
          <div className="space-y-6">
            {/* 基本信息设置 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">团队基本信息</h2>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">团队名称</label>
                  <input
                    type="text"
                    value={teamSettings.name}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">所属部门</label>
                  <input
                    type="text"
                    value={teamSettings.department}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">团队描述</label>
                  <textarea
                    value={teamSettings.description}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* 工作时间设置 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">工作时间设置</h2>
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">时区</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="Asia/Shanghai">北京时间 (UTC+8)</option>
                    <option value="America/New_York">纽约时间 (UTC-5)</option>
                    <option value="Europe/London">伦敦时间 (UTC+0)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">开始时间</label>
                  <input
                    type="time"
                    value={teamSettings.workingHours.start}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">结束时间</label>
                  <input
                    type="time"
                    value={teamSettings.workingHours.end}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* 通知设置 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">通知设置</h2>
              <div className="space-y-4">
                {[
                  { key: 'email', label: '邮件通知', icon: Mail },
                  { key: 'inApp', label: '应用内通知', icon: AlertTriangle }
                ].map((notification) => (
                  <div key={notification.key} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <notification.icon className="h-5 w-5 text-gray-400 mr-3" />
                      <span className="text-sm font-medium text-gray-900">{notification.label}</span>
                    </div>
                    <button
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        teamSettings.notifications[notification.key as keyof typeof teamSettings.notifications]
                          ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          teamSettings.notifications[notification.key as keyof typeof teamSettings.notifications]
                            ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* 保存按钮 */}
            <div className="flex justify-end">
              <button className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                保存设置
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamManagement;
