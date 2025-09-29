/**
 * 测试工程师专用仪表板
 * 为测试专业人员提供专门的工具和数据视图
 */

import React, { useState, useEffect } from 'react';
import {Zap, Shield, Globe, Code, BarChart3, Clock, CheckCircle, AlertTriangle, TrendingUp, Play, Calendar, Target, Activity, FileText, Settings} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface TestMetrics {
  totalTests: number;
  successRate: number;
  avgExecutionTime: number;
  failedTests: number;
  testsThisWeek: number;
  criticalIssues: number;
}

interface RecentTest {
  id: string;
  name: string;
  type: string;
  status: 'success' | 'failed' | 'running' | 'pending';
  duration: number;
  timestamp: string;
  score?: number;
}

interface TestTemplate {
  id: string;
  name: string;
  type: string;
  description: string;
  usageCount: number;
  lastUsed: string;
}

const TesterDashboard: React.FC = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<TestMetrics>({
    totalTests: 0,
    successRate: 0,
    avgExecutionTime: 0,
    failedTests: 0,
    testsThisWeek: 0,
    criticalIssues: 0
  });

  const [recentTests, setRecentTests] = useState<RecentTest[]>([]);
  const [testTemplates, setTestTemplates] = useState<TestTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  // 模拟数据加载
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      
      // 模拟API调用延迟
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 设置模拟指标数据
      setMetrics({
        totalTests: 247,
        successRate: 87.5,
        avgExecutionTime: 145,
        failedTests: 31,
        testsThisWeek: 42,
        criticalIssues: 5
      });

      // 设置最近测试数据
      setRecentTests([
        {
          id: '1',
          name: 'API性能基准测试',
          type: 'performance',
          status: 'success',
          duration: 234,
          timestamp: '2025-09-16T10:30:00Z',
          score: 92
        },
        {
          id: '2',
          name: '用户登录安全测试',
          type: 'security',
          status: 'failed',
          duration: 145,
          timestamp: '2025-09-16T09:15:00Z',
          score: 45
        },
        {
          id: '3',
          name: '移动端兼容性测试',
          type: 'compatibility',
          status: 'running',
          duration: 0,
          timestamp: '2025-09-16T11:00:00Z'
        },
        {
          id: '4',
          name: 'SEO检查脚本',
          type: 'seo',
          status: 'success',
          duration: 89,
          timestamp: '2025-09-16T08:45:00Z',
          score: 78
        },
        {
          id: '5',
          name: '压力测试-高并发',
          type: 'stress',
          status: 'pending',
          duration: 0,
          timestamp: '2025-09-16T11:30:00Z'
        }
      ]);

      // 设置测试模板数据
      setTestTemplates([
        {
          id: '1',
          name: 'API性能标准测试',
          type: 'performance',
          description: '标准的API性能测试模板，包含响应时间、吞吐量等指标',
          usageCount: 23,
          lastUsed: '2025-09-16T10:30:00Z'
        },
        {
          id: '2',
          name: '安全漏洞扫描',
          type: 'security',
          description: 'OWASP Top 10安全检查和漏洞扫描',
          usageCount: 15,
          lastUsed: '2025-09-15T16:20:00Z'
        },
        {
          id: '3',
          name: '移动端响应式测试',
          type: 'compatibility',
          description: '多设备屏幕尺寸的响应式设计测试',
          usageCount: 31,
          lastUsed: '2025-09-16T09:00:00Z'
        }
      ]);

      setLoading(false);
    };

    loadData();
  }, []);

  // 获取测试类型颜色
  const getTestTypeColor = (type: string) => {
    const colors = {
      performance: 'text-blue-600 bg-blue-100',
      security: 'text-red-600 bg-red-100',
      compatibility: 'text-purple-600 bg-purple-100',
      seo: 'text-green-600 bg-green-100',
      stress: 'text-orange-600 bg-orange-100',
      api: 'text-indigo-600 bg-indigo-100'
    };
    return colors[type as keyof typeof colors] || 'text-gray-600 bg-gray-100';
  };

  // 获取状态图标
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'running':
        return <Activity className="h-4 w-4 text-blue-500 animate-pulse" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  // 快速操作按钮
  const quickActions = [
    {
      name: '新建压力测试',
      icon: Zap,
      href: '/stress-test',
      color: 'bg-red-500 hover:bg-red-600'
    },
    {
      name: '安全扫描',
      icon: Shield,
      href: '/security-test',
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    {
      name: 'SEO检查',
      icon: Globe,
      href: '/seo-test',
      color: 'bg-green-500 hover:bg-green-600'
    },
    {
      name: 'API测试',
      icon: Code,
      href: '/api-test',
      color: 'bg-purple-500 hover:bg-purple-600'
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载测试数据...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">测试工程师工作台</h1>
          <p className="mt-2 text-gray-600">
            欢迎回来，{user?.profile?.fullName || user?.username}！专注于您的测试工作
          </p>
        </div>

        {/* 关键指标卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Target className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">总测试数</p>
                <p className="text-2xl font-semibold text-gray-900">{metrics.totalTests}</p>
                <p className="text-xs text-green-600">本月 +{metrics.testsThisWeek}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">成功率</p>
                <p className="text-2xl font-semibold text-gray-900">{metrics.successRate.toFixed(1)}%</p>
                <p className="text-xs text-green-600">+2.1% 上周</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-8 w-8 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">平均耗时</p>
                <p className="text-2xl font-semibold text-gray-900">{metrics.avgExecutionTime}s</p>
                <p className="text-xs text-red-600">+5s 昨日</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">失败测试</p>
                <p className="text-2xl font-semibold text-gray-900">{metrics.failedTests}</p>
                <p className="text-xs text-red-600">需要关注</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">本周测试</p>
                <p className="text-2xl font-semibold text-gray-900">{metrics.testsThisWeek}</p>
                <p className="text-xs text-green-600">活跃度高</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FileText className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">关键问题</p>
                <p className="text-2xl font-semibold text-gray-900">{metrics.criticalIssues}</p>
                <p className="text-xs text-red-600">待处理</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 快速操作 */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow mb-6">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">快速开始测试</h2>
                <p className="text-sm text-gray-500 mt-1">选择测试类型立即开始</p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {quickActions.map((action, index) => (
                    <button
                      key={index}
                      onClick={() => window.location.href = action.href}
                      className={`group relative p-4 rounded-lg text-white transition-all duration-200 ${action.color}`}
                    >
                      <action.icon className="h-8 w-8 mx-auto mb-2" />
                      <span className="text-sm font-medium">{action.name}</span>
                      <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 rounded-lg transition-opacity"></div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 最近的测试 */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">最近测试记录</h2>
                <p className="text-sm text-gray-500 mt-1">您最近执行的测试结果</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        测试名称
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        类型
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        状态
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        耗时
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        评分
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        执行时间
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {recentTests.map((test) => (
                      <tr key={test.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{test.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTestTypeColor(test.type)}`}>
                            {test.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {getStatusIcon(test.status)}
                            <span className="ml-2 text-sm text-gray-900 capitalize">{test.status}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {test.duration > 0 ? `${test.duration}s` : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {test.score ? (
                            <span className={`font-medium ${test.score >= 80 ? 'text-green-600' : test.score >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                              {test.score}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(test.timestamp).toLocaleTimeString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* 侧边栏信息 */}
          <div className="space-y-6">
            {/* 测试模板 */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">常用测试模板</h2>
                <p className="text-sm text-gray-500 mt-1">快速创建标准化测试</p>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {testTemplates.map((template) => (
                    <div key={template.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 cursor-pointer transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-gray-900">{template.name}</h4>
                          <p className="text-xs text-gray-600 mt-1">{template.description}</p>
                          <div className="flex items-center mt-2 space-x-4">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTestTypeColor(template.type)}`}>
                              {template.type}
                            </span>
                            <span className="text-xs text-gray-500">使用 {template.usageCount} 次</span>
                          </div>
                        </div>
                        <button className="ml-2 p-1 text-gray-400 hover:text-blue-600">
                          <Play className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <button className="w-full mt-4 px-4 py-2 text-sm text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50 transition-colors">
                  查看所有模板
                </button>
              </div>
            </div>

            {/* 今日计划 */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">今日测试计划</h2>
                <p className="text-sm text-gray-500 mt-1">预定的测试任务</p>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">API回归测试</p>
                      <p className="text-xs text-gray-500">14:00 - 预计30分钟</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">安全扫描例行检查</p>
                      <p className="text-xs text-gray-500">16:30 - 预计45分钟</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">性能基准测试</p>
                      <p className="text-xs text-gray-500">18:00 - 预计1小时</p>
                    </div>
                  </div>
                </div>
                <button className="w-full mt-4 px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors flex items-center justify-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  管理计划
                </button>
              </div>
            </div>

            {/* 工具箱 */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">测试工具箱</h2>
                <p className="text-sm text-gray-500 mt-1">常用工具和设置</p>
              </div>
              <div className="p-6">
                <div className="space-y-2">
                  <button className="w-full text-left px-3 py-2 text-sm text-gray-700 rounded-md hover:bg-gray-100 flex items-center">
                    <Settings className="h-4 w-4 mr-3" />
                    测试配置管理
                  </button>
                  <button className="w-full text-left px-3 py-2 text-sm text-gray-700 rounded-md hover:bg-gray-100 flex items-center">
                    <FileText className="h-4 w-4 mr-3" />
                    报告模板
                  </button>
                  <button className="w-full text-left px-3 py-2 text-sm text-gray-700 rounded-md hover:bg-gray-100 flex items-center">
                    <BarChart3 className="h-4 w-4 mr-3" />
                    数据分析工具
                  </button>
                  <button className="w-full text-left px-3 py-2 text-sm text-gray-700 rounded-md hover:bg-gray-100 flex items-center">
                    <Target className="h-4 w-4 mr-3" />
                    批量测试工具
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TesterDashboard;
