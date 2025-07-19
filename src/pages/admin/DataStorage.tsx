import {
  Activity,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Code,
  Database,
  Download,
  Eye,
  FileText,
  Filter,
  Globe,
  RefreshCw,
  Search,
  Shield,
  SortAsc,
  SortDesc,
  Trash2,
  TrendingUp,
  Wifi,
  Zap
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import AnalyticsOverview from '../../components/analytics/AnalyticsOverview';
import ImportExport from '../../components/analytics/ImportExport';
import PerformanceAnalysis from '../../components/analytics/PerformanceAnalysis';
import RealTimeMonitoring from '../../components/analytics/RealTimeMonitoring';
import ReportManagement from '../../components/analytics/ReportManagement';
import { TestResultDisplay } from '../../components/testing';

interface TestRecord {
  id: string;
  testType: string;
  url?: string;
  status: 'completed' | 'failed' | 'running';
  overallScore?: number;
  startTime: string;
  endTime?: string;
  duration?: number;
  results?: any;
  error?: string;
}

interface FilterOptions {
  testType: string;
  status: string;
  dateRange: string;
  scoreRange: [number, number];
  searchQuery: string;
}

const DataStorage: React.FC = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'history' | 'reports' | 'import-export' | 'analytics' | 'performance' | 'monitoring'>('history');
  const [testRecords, setTestRecords] = useState<TestRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<TestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<TestRecord | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'score' | 'type' | 'status'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [filters, setFilters] = useState<FilterOptions>({
    testType: 'all',
    status: 'all',
    dateRange: 'all',
    scoreRange: [0, 100],
    searchQuery: ''
  });

  const testTypes = [
    { value: 'all', label: '全部类型', icon: Database },
    { value: 'website', label: '网站测试', icon: Globe },
    { value: 'stress', label: '压力测试', icon: Zap },
    { value: 'api', label: 'API测试', icon: Code },
    { value: 'ux', label: 'UX测试', icon: Eye },
    { value: 'compatibility', label: '兼容性测试', icon: FileText },
    { value: 'database', label: '数据库测试', icon: Database },
    { value: 'network', label: '网络测试', icon: Wifi },
    { value: 'security', label: '安全测试', icon: Shield }
  ];

  const statusOptions = [
    { value: 'all', label: '全部状态' },
    { value: 'completed', label: '已完成' },
    { value: 'failed', label: '失败' },
    { value: 'running', label: '运行中' }
  ];

  const dateRanges = [
    { value: 'all', label: '全部时间' },
    { value: 'today', label: '今天' },
    { value: 'week', label: '本周' },
    { value: 'month', label: '本月' },
    { value: 'quarter', label: '本季度' },
    { value: 'year', label: '今年' }
  ];

  // 根据路径设置活跃标签页
  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/reports')) {
      setActiveTab('reports');
    } else if (path.includes('/data-management')) {
      setActiveTab('import-export');
    } else if (path.includes('/analytics')) {
      setActiveTab('analytics');
    } else if (path.includes('/performance')) {
      setActiveTab('performance');
    } else if (path.includes('/monitoring')) {
      setActiveTab('monitoring');
    } else {
      setActiveTab('history');
    }
  }, [location.pathname]);

  // 模拟加载测试数据
  useEffect(() => {
    loadTestRecords();
  }, []);

  // 应用过滤器
  useEffect(() => {
    applyFilters();
  }, [testRecords, filters, sortBy, sortOrder]);

  // 获取认证头
  const getAuthHeaders = (): HeadersInit => {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  };

  const loadTestRecords = async () => {
    setLoading(true);
    try {
      console.log('🔄 Loading test records from backend...');

      // 从后端API加载真实数据（需要认证）
      const response = await fetch('http://localhost:3001/api/test-history?' + new URLSearchParams({
        sortBy: sortBy,
        sortOrder: sortOrder
      }), {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        console.log(`✅ Loaded ${data.data.length} test records from backend`);
        setTestRecords(data.data);
      } else {
        throw new Error(data.error || 'Failed to load test records');
      }
    } catch (error) {
      console.error('❌ Failed to load test records:', error);

      // 如果后端加载失败，显示空数据而不是模拟数据
      setTestRecords([]);

      // 可选：显示错误提示
      // alert(`加载测试记录失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 删除测试记录
  const handleDeleteRecord = async (recordId: string) => {
    if (!confirm('确定要删除这个测试记录吗？此操作无法撤销。')) {
      return;
    }

    try {
      console.log('🗑️ Deleting test record:', recordId);

      const response = await fetch(`http://localhost:3001/api/test-history/${recordId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        console.log('✅ Test record deleted successfully');
        // 从本地状态中移除记录
        setTestRecords(prev => prev.filter(record => record.id !== recordId));

        // 如果删除的是当前选中的记录，关闭详情模态框
        if (selectedRecord?.id === recordId) {
          setSelectedRecord(null);
        }

        alert('测试记录删除成功！');
      } else {
        throw new Error(data.message || 'Failed to delete test record');
      }
    } catch (error) {
      console.error('❌ Failed to delete test record:', error);
      alert('删除测试记录失败，请稍后重试。');
    }
  };

  const applyFilters = () => {
    let filtered = [...testRecords];

    // 按测试类型过滤
    if (filters.testType !== 'all') {
      filtered = filtered.filter(record => record.testType === filters.testType);
    }

    // 按状态过滤
    if (filters.status !== 'all') {
      filtered = filtered.filter(record => record.status === filters.status);
    }

    // 按日期范围过滤
    if (filters.dateRange !== 'all') {
      const now = new Date();
      const filterDate = new Date();

      switch (filters.dateRange) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
        case 'quarter':
          filterDate.setMonth(now.getMonth() - 3);
          break;
        case 'year':
          filterDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      filtered = filtered.filter(record =>
        new Date(record.startTime) >= filterDate
      );
    }

    // 按分数范围过滤
    filtered = filtered.filter(record => {
      if (!record.overallScore) return true;
      return record.overallScore >= filters.scoreRange[0] &&
        record.overallScore <= filters.scoreRange[1];
    });

    // 按搜索查询过滤
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(record =>
        record.url?.toLowerCase().includes(query) ||
        record.testType.toLowerCase().includes(query) ||
        record.id.toLowerCase().includes(query)
      );
    }

    // 排序
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case 'date':
          aValue = new Date(a.startTime).getTime();
          bValue = new Date(b.startTime).getTime();
          break;
        case 'score':
          aValue = a.overallScore || 0;
          bValue = b.overallScore || 0;
          break;
        case 'type':
          aValue = a.testType;
          bValue = b.testType;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          aValue = a.startTime;
          bValue = b.startTime;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredRecords(filtered);
  };

  const handleExportData = (format: 'json' | 'csv' | 'excel') => {
    const dataToExport = filteredRecords.map(record => ({
      ID: record.id,
      测试类型: getTestTypeLabel(record.testType),
      URL: record.url || '',
      状态: getStatusLabel(record.status),
      总分: record.overallScore || '',
      开始时间: new Date(record.startTime).toLocaleString('zh-CN'),
      结束时间: record.endTime ? new Date(record.endTime).toLocaleString('zh-CN') : '',
      耗时: record.duration ? `${record.duration}秒` : '',
      错误信息: record.error || ''
    }));

    switch (format) {
      case 'json':
        const jsonBlob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
        downloadFile(jsonBlob, `test-records-${Date.now()}.json`);
        break;
      case 'csv':
        const headers = Object.keys(dataToExport[0] || {});
        const csvContent = [
          '\uFEFF' + headers.join(','),
          ...dataToExport.map(row => headers.map(header => `"${row[header as keyof typeof row]}"`).join(','))
        ].join('\n');
        const csvBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
        downloadFile(csvBlob, `test-records-${Date.now()}.csv`);
        break;
    }
  };

  const downloadFile = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getTestTypeLabel = (type: string) => {
    const typeObj = testTypes.find(t => t.value === type);
    return typeObj ? typeObj.label : type;
  };

  const getStatusLabel = (status: string) => {
    const statusObj = statusOptions.find(s => s.value === status);
    return statusObj ? statusObj.label : status;
  };

  const getTestTypeIcon = (type: string) => {
    const typeObj = testTypes.find(t => t.value === type);
    const IconComponent = typeObj ? typeObj.icon : Database;
    return <IconComponent className="w-5 h-5" />;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-400';
      case 'failed': return 'text-red-400';
      case 'running': return 'text-blue-400';
      default: return 'text-gray-400';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-400';
    if (score >= 70) return 'text-yellow-400';
    if (score >= 50) return 'text-orange-400';
    return 'text-red-400';
  };

  return (
    <main className="data-management-container">
      <div className="data-management-wrapper space-y-6">
        {/* 页面标题 */}
        <header className="data-page-header">
          <div className="flex items-center space-x-3 mb-6">
            <Database className="w-8 h-8 text-blue-400" />
            <hgroup>
              <h1 className="data-page-title text-white font-bold">数据中心</h1>
              <p className="data-page-subtitle text-gray-300">从数据存储到深度分析的完整数据管理平台</p>
            </hgroup>
          </div>

          {/* 标签页导航 */}
          <nav className="flex items-center justify-between mb-4" aria-label="数据中心导航">
            <div className="data-tabs-nav flex space-x-1 flex-wrap" role="tablist">
              {[
                { id: 'history', label: '测试数据', icon: FileText },
                { id: 'analytics', label: '数据概览', icon: BarChart3 },
                { id: 'performance', label: '深度分析', icon: TrendingUp },
                { id: 'monitoring', label: '实时监控', icon: Activity, badge: 'NEW' },
                { id: 'reports', label: '报告管理', icon: BarChart3 },
                { id: 'import-export', label: '导入导出', icon: Download }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  aria-controls={`${tab.id}-panel`}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`data-tab-button flex items-center space-x-2 rounded-lg transition-colors ${activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                >
                  <tab.icon className="data-tab-icon" />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span className="px-2 py-0.5 text-xs bg-blue-500 text-white rounded-full">
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {activeTab === 'history' && (
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  <Filter className="w-4 h-4" />
                  <span>过滤器</span>
                  {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                <button
                  type="button"
                  onClick={loadTestRecords}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>刷新</span>
                </button>
              </div>
            )}
          </nav>

          {/* 统计信息 - 只在测试历史标签页显示 */}
          {activeTab === 'history' && (
            <section className="grid grid-cols-1 md:grid-cols-4 gap-4" aria-label="测试数据统计">
              <article className="bg-gray-700/30 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-white">{testRecords.length}</div>
                <div className="text-sm text-gray-400">总记录数</div>
              </article>
              <article className="bg-gray-700/30 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-400">
                  {testRecords.filter(r => r.status === 'completed').length}
                </div>
                <div className="text-sm text-gray-400">成功测试</div>
              </article>
              <article className="bg-gray-700/30 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-red-400">
                  {testRecords.filter(r => r.status === 'failed').length}
                </div>
                <div className="text-sm text-gray-400">失败测试</div>
              </article>
              <article className="bg-gray-700/30 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-400">
                  {Math.round(testRecords.filter(r => r.overallScore).reduce((sum, r) => sum + (r.overallScore || 0), 0) / testRecords.filter(r => r.overallScore).length) || 0}
                </div>
                <div className="text-sm text-gray-400">平均分数</div>
              </article>
            </section>
          )}
        </header>



        {/* 测试历史标签页内容 */}
        {activeTab === 'history' && (
          <>
            {/* 过滤器面板 */}
            {showFilters && (
              <section className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6" aria-label="过滤器面板">
                <h3 className="text-lg font-semibold text-white mb-4">过滤选项</h3>

                <form className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  {/* 搜索框 */}
                  <label className="block">
                    <span className="block text-sm font-medium text-gray-300 mb-2">搜索</span>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="search"
                        value={filters.searchQuery}
                        onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
                        placeholder="搜索URL、类型或ID..."
                        className="w-full pl-10 pr-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </label>

                  {/* 测试类型 */}
                  <label className="block">
                    <span className="block text-sm font-medium text-gray-300 mb-2">测试类型</span>
                    <select
                      value={filters.testType}
                      onChange={(e) => setFilters(prev => ({ ...prev, testType: e.target.value }))}
                      className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {testTypes.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </label>

                  {/* 状态 */}
                  <label className="block">
                    <span className="block text-sm font-medium text-gray-300 mb-2">状态</span>
                    <select
                      value={filters.status}
                      onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                      className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      aria-label="选择状态"
                      title="选择要筛选的测试状态"
                    >
                      {statusOptions.map(status => (
                        <option key={status.value} value={status.value}>{status.label}</option>
                      ))}
                    </select>
                  </label>

                  {/* 日期范围 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">时间范围</label>
                    <select
                      value={filters.dateRange}
                      onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
                      className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      aria-label="选择时间范围"
                      title="选择要筛选的时间范围"
                    >
                      {dateRanges.map(range => (
                        <option key={range.value} value={range.value}>{range.label}</option>
                      ))}
                    </select>
                  </div>
                </form>

                {/* 排序和导出 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-300">排序:</span>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="px-3 py-1 bg-gray-700/50 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        aria-label="选择排序方式"
                        title="选择数据排序的方式"
                      >
                        <option value="date">时间</option>
                        <option value="score">分数</option>
                        <option value="type">类型</option>
                        <option value="status">状态</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                        className="p-1 text-gray-400 hover:text-white transition-colors"
                      >
                        {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-300">导出:</span>
                    <button
                      type="button"
                      onClick={() => handleExportData('json')}
                      className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors"
                    >
                      JSON
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExportData('csv')}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
                    >
                      CSV
                    </button>
                  </div>
                </div>
              </section>
            )}

            {/* 测试记录列表 */}
            <section className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6" aria-label="测试记录列表">
              <header className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">
                  测试记录 ({filteredRecords.length})
                </h3>
              </header>

              {loading ? (
                <div className="flex items-center justify-center py-12" role="status" aria-live="polite">
                  <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
                  <span className="ml-3 text-gray-300">加载中...</span>
                </div>
              ) : filteredRecords.length === 0 ? (
                <div className="text-center py-12">
                  <Database className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">没有找到匹配的测试记录</p>
                </div>
              ) : (
                <ul className="space-y-4" role="list">
                  {filteredRecords.map((record) => (
                    <li key={record.id} className="bg-gray-700/30 rounded-lg p-4 border border-gray-600/50">
                      <article className="flex items-start justify-between">
                        <div className="flex items-start space-x-4">
                          {getTestTypeIcon(record.testType)}

                          <div className="flex-1">
                            <header className="flex items-center space-x-3 mb-2">
                              <h4 className="text-lg font-semibold text-white">
                                {getTestTypeLabel(record.testType)}
                              </h4>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(record.status)}`}>
                                {getStatusLabel(record.status)}
                              </span>
                              {record.overallScore && (
                                <span className={`text-sm font-bold ${getScoreColor(record.overallScore)}`}>
                                  {Math.round(record.overallScore)}分
                                </span>
                              )}
                            </header>

                            {record.url && (
                              <p className="text-sm text-gray-400 mb-2">{record.url}</p>
                            )}

                            <div className="flex items-center space-x-4 text-xs text-gray-500">
                              <span>ID: {record.id}</span>
                              <span>开始: {new Date(record.startTime).toLocaleString('zh-CN')}</span>
                              {record.duration && <span>耗时: {record.duration}秒</span>}
                            </div>

                            {record.error && (
                              <p className="text-sm text-red-400 mt-2">错误: {record.error}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => setSelectedRecord(record)}
                            className="p-2 text-gray-400 hover:text-white hover:bg-gray-600 rounded-lg transition-colors"
                            title="查看详情"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRecord(record.id)}
                            className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-600 rounded-lg transition-colors"
                            title="删除记录"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </article>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}

        {/* 标签页内容区域 */}
        <section id="reports-panel" role="tabpanel" aria-labelledby="reports-tab" hidden={activeTab !== 'reports'}>
          {activeTab === 'reports' && <ReportManagement />}
        </section>

        <section id="analytics-panel" role="tabpanel" aria-labelledby="analytics-tab" hidden={activeTab !== 'analytics'}>
          {activeTab === 'analytics' && <AnalyticsOverview />}
        </section>

        <section id="performance-panel" role="tabpanel" aria-labelledby="performance-tab" hidden={activeTab !== 'performance'}>
          {activeTab === 'performance' && <PerformanceAnalysis />}
        </section>

        <section id="monitoring-panel" role="tabpanel" aria-labelledby="monitoring-tab" hidden={activeTab !== 'monitoring'}>
          {activeTab === 'monitoring' && <RealTimeMonitoring />}
        </section>

        <section id="import-export-panel" role="tabpanel" aria-labelledby="import-export-tab" hidden={activeTab !== 'import-export'}>
          {activeTab === 'import-export' && <ImportExport />}
        </section>

        {/* 详情模态框 */}
        {selectedRecord && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <article className="bg-gray-800 rounded-xl border border-gray-700 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <header className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 id="modal-title" className="text-xl font-bold text-white">测试详情</h3>
                  <button
                    type="button"
                    onClick={() => setSelectedRecord(null)}
                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                    aria-label="关闭详情模态框"
                  >
                    ×
                  </button>
                </div>

                <TestResultDisplay
                  result={{
                    testId: selectedRecord.id,
                    testType: selectedRecord.testType,
                    url: selectedRecord.url,
                    status: selectedRecord.status,
                    overallScore: selectedRecord.overallScore,
                    startTime: selectedRecord.startTime,
                    endTime: selectedRecord.endTime,
                    actualDuration: selectedRecord.duration,
                    error: selectedRecord.error,
                    ...selectedRecord.results
                  }}
                  onViewDetails={() => { }}
                  onDownloadReport={() => { }}
                />
              </header>
            </article>
          </div>
        )}
      </div>
    </main>
  );
};

export default DataStorage;
