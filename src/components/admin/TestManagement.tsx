import React, { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';

import { Clock, Download, Filter, TestTube, TrendingUp, User } from 'lucide-react';

interface TestRecord {
  id: string;
  type: 'stress' | 'content' | 'compatibility' | 'api';
  url: string;
  user: string;
  status: 'completed' | 'running' | 'failed';
  createdAt: string;
  duration: number;
  score?: number;
  requests?: number;
  errors?: number;
}

const TestManagement: React.FC = () => {
  const [tests, setTests] = useState<TestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<'all' | 'stress' | 'content' | 'compatibility' | 'api'>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'completed' | 'running' | 'failed'>('all');
  const [dateRange, setDateRange] = useState('today');

  // 加载测试数据
  useEffect(() => {
    const loadTests = async () => {
      try {
        setLoading(true);
        const data = await adminService.getTestHistory();
        setTests(data);
      } catch (error) {
        console.error('加载测试数据失败', error);
      } finally {
        setLoading(false);
      }
    };

    loadTests();
  }, []);

  const filteredTests = tests.filter(test => {
    const matchesType = selectedType === 'all' || test.type === selectedType;
    const matchesStatus = selectedStatus === 'all' || test.status === selectedStatus;
    return matchesType && matchesStatus;
  });

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'stress': return '压力测试';
      case 'content': return '内容检测';
      case 'compatibility': return '兼容性测试';
      case 'api': return 'API测试';
      default: return type;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'running': return 'bg-blue-100 text-blue-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return '已完成';
      case 'running': return '运行中';
      case 'failed': return '失败';
      default: return status;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'stress': return 'bg-orange-100 text-orange-800';
      case 'content': return 'bg-blue-100 text-blue-800';
      case 'compatibility': return 'bg-purple-100 text-purple-800';
      case 'api': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const totalTests = tests.length;
  const completedTests = tests.filter(t => t.status === 'completed').length;
  const runningTests = tests.filter(t => t.status === 'running').length;
  const failedTests = tests.filter(t => t.status === 'failed').length;

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <TestTube className="w-6 h-6 text-green-600" />
          <h2 className="text-2xl font-bold text-gray-900">测试管理</h2>
        </div>
        <button type="button" className="btn btn-primary flex items-center space-x-2">
          <Download className="w-4 h-4" />
          <span>导出报告</span>
        </button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <TestTube className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">总测试数</p>
              <p className="text-2xl font-bold text-gray-900">{totalTests}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">已完成</p>
              <p className="text-2xl font-bold text-gray-900">{completedTests}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">运行中</p>
              <p className="text-2xl font-bold text-gray-900">{runningTests}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <TestTube className="w-6 h-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">失败</p>
              <p className="text-2xl font-bold text-gray-900">{failedTests}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 筛选器 */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center space-x-4 mb-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <span className="text-lg font-medium text-gray-900">筛选条件</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label htmlFor="test-type-select" className="block text-sm font-medium text-gray-700 mb-2">测试类型</label>
            <select
              id="test-type-select"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as any)}
              className="input"
              aria-label="选择测试类型"
            >
              <option value="all">所有类型</option>
              <option value="stress">压力测试</option>
              <option value="content">内容检测</option>
              <option value="compatibility">兼容性测试</option>
              <option value="api">API测试</option>
            </select>
          </div>

          <div>
            <label htmlFor="test-status-select" className="block text-sm font-medium text-gray-700 mb-2">状态</label>
            <select
              id="test-status-select"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="input"
              aria-label="选择测试状态"
            >
              <option value="all">所有状态</option>
              <option value="completed">已完成</option>
              <option value="running">运行中</option>
              <option value="failed">失败</option>
            </select>
          </div>

          <div>
            <label htmlFor="date-range-select" className="block text-sm font-medium text-gray-700 mb-2">时间范围</label>
            <select
              id="date-range-select"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="input"
              aria-label="选择时间范围"
            >
              <option value="today">今天</option>
              <option value="week">本周</option>
              <option value="month">本月</option>
              <option value="all">全部</option>
            </select>
          </div>

          <div className="flex items-end">
            <div className="text-sm text-gray-600">
              显示 {filteredTests.length} / {totalTests} 条记录
            </div>
          </div>
        </div>
      </div>

      {/* 测试列表 */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  测试信息
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  类型
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  用户
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  评分
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  时间
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTests.map((test) => (
                <tr key={test.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{test.url}</div>
                      <div className="text-sm text-gray-500">
                        {test.requests > 0 && `${test.requests} 请求`}
                        {test.errors > 0 && ` • ${test.errors} 错误`}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(test.type)}`}>
                      {getTypeLabel(test.type)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <User className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900">{test.user}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(test.status)}`}>
                      {getStatusLabel(test.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {test.score ? `${test.score}分` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{test.createdAt}</div>
                    <div className="text-sm text-gray-500">
                      {test.duration > 0 ? `${test.duration}秒` : '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button type="button" className="text-blue-600 hover:text-blue-900">
                        查看详情
                      </button>
                      {test.status === 'running' && (
                        <button type="button" className="text-red-600 hover:text-red-900">
                          停止
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TestManagement;
