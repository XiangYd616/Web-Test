import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { FileText, Download, Calendar, Filter, Search, BarChart3, PieChart, TrendingUp, Users, Globe, Shield, Zap, Plus, RefreshCw, Eye, Trash2, Settings, Clock } from 'lucide-react';

interface ReportData {
  id: string;
  name: string;
  type: 'performance' | 'security' | 'accessibility' | 'seo' | 'comprehensive';
  createdAt: string;
  status: 'completed' | 'generating' | 'failed';
  size: string;
  downloadUrl?: string;
}

const Reports: React.FC = () => {
  const [reports, setReports] = useState<ReportData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedReports, setSelectedReports] = useState<string[]>([]);

  useEffect(() => {
    // 模拟加载报告数据
    const mockReports: ReportData[] = [
      {
        id: '1',
        name: '网站性能综合报告',
        type: 'performance',
        createdAt: '2025-01-15T10:30:00Z',
        status: 'completed',
        size: '2.3 MB',
        downloadUrl: '/api/reports/download/1'
      },
      {
        id: '2',
        name: '安全漏洞扫描报告',
        type: 'security',
        createdAt: '2025-01-14T15:45:00Z',
        status: 'completed',
        size: '1.8 MB',
        downloadUrl: '/api/reports/download/2'
      },
      {
        id: '3',
        name: 'SEO优化分析报告',
        type: 'seo',
        createdAt: '2025-01-13T09:20:00Z',
        status: 'completed',
        size: '3.1 MB',
        downloadUrl: '/api/reports/download/3'
      },
      {
        id: '4',
        name: '可访问性测试报告',
        type: 'accessibility',
        createdAt: '2025-01-12T14:15:00Z',
        status: 'completed',
        size: '1.5 MB',
        downloadUrl: '/api/reports/download/4'
      },
      {
        id: '5',
        name: '月度综合测试报告',
        type: 'comprehensive',
        createdAt: '2025-01-11T11:00:00Z',
        status: 'generating',
        size: '预计 5.2 MB'
      }
    ];

    setTimeout(() => {
      setReports(mockReports);
      setLoading(false);
    }, 1000);
  }, []);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'performance':
        return <Zap className="w-5 h-5 text-yellow-400" />;
      case 'security':
        return <Shield className="w-5 h-5 text-red-400" />;
      case 'accessibility':
        return <Users className="w-5 h-5 text-blue-400" />;
      case 'seo':
        return <Globe className="w-5 h-5 text-green-400" />;
      case 'comprehensive':
        return <BarChart3 className="w-5 h-5 text-purple-400" />;
      default:
        return <FileText className="w-5 h-5 text-gray-400" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'performance':
        return '性能测试';
      case 'security':
        return '安全扫描';
      case 'accessibility':
        return '可访问性';
      case 'seo':
        return 'SEO分析';
      case 'comprehensive':
        return '综合报告';
      default:
        return '未知类型';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="px-2 py-1 text-xs font-medium bg-green-900 text-green-300 rounded-full">已完成</span>;
      case 'generating':
        return <span className="px-2 py-1 text-xs font-medium bg-yellow-900 text-yellow-300 rounded-full">生成中</span>;
      case 'failed':
        return <span className="px-2 py-1 text-xs font-medium bg-red-900 text-red-300 rounded-full">失败</span>;
      default:
        return <span className="px-2 py-1 text-xs font-medium bg-gray-700 text-gray-300 rounded-full">未知</span>;
    }
  };

  const filteredReports = reports.filter(report => {
    const matchesSearch = report.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || report.type === filterType;
    return matchesSearch && matchesFilter;
  });

  const handleDownload = (report: ReportData) => {
    if (report.downloadUrl) {
      // 模拟下载
      console.log(`下载报告: ${report.name}`);
      // 实际实现中，这里会触发文件下载
    }
  };

  const handleBatchDownload = () => {
    const selectedReportData = reports.filter(report => selectedReports.includes(report.id));
    console.log('批量下载报告:', selectedReportData);
  };

  const generateNewReport = () => {
    console.log('生成新报告');
    // 这里会打开报告生成对话框或导航到报告生成页面
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">测试报告</h1>
          <p className="text-gray-300">管理和下载您的测试报告</p>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
            <div className="flex items-center">
              <FileText className="w-8 h-8 text-blue-400" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-300">总报告数</p>
                <p className="text-2xl font-bold text-white">{reports.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
            <div className="flex items-center">
              <Download className="w-8 h-8 text-green-400" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-300">已完成</p>
                <p className="text-2xl font-bold text-white">{reports.filter(r => r.status === 'completed').length}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
            <div className="flex items-center">
              <TrendingUp className="w-8 h-8 text-yellow-400" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-300">生成中</p>
                <p className="text-2xl font-bold text-white">{reports.filter(r => r.status === 'generating').length}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
            <div className="flex items-center">
              <PieChart className="w-8 h-8 text-purple-400" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-300">总大小</p>
                <p className="text-2xl font-bold text-white">8.7 MB</p>
              </div>
            </div>
          </div>
        </div>

        {/* 操作栏 */}
        <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 mb-6">
          <div className="p-6 border-b border-gray-700">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex flex-col sm:flex-row gap-4">
                {/* 搜索 */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="搜索报告..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400"
                  />
                </div>

                {/* 筛选 */}
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <select
                    id="filter-type-select"
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="pl-10 pr-8 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
                    aria-label="筛选报告类型"
                  >
                    <option value="all">所有类型</option>
                    <option value="performance">性能测试</option>
                    <option value="security">安全扫描</option>
                    <option value="accessibility">可访问性</option>
                    <option value="seo">SEO分析</option>
                    <option value="comprehensive">综合报告</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3">
                {selectedReports.length > 0 && (
                  <button
                    onClick={handleBatchDownload}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    批量下载 ({selectedReports.length})
                  </button>
                )}

                <button
                  onClick={generateNewReport}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  生成报告
                </button>
              </div>
            </div>
          </div>

          {/* 报告列表 */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    <input
                      id="select-all-reports"
                      type="checkbox"
                      checked={selectedReports.length === filteredReports.length && filteredReports.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedReports(filteredReports.map(r => r.id));
                        } else {
                          setSelectedReports([]);
                        }
                      }}
                      className="rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-800"
                      aria-label="全选或取消全选所有报告"
                      title="全选或取消全选所有报告"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    报告名称
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    类型
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    状态
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    创建时间
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    大小
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-gray-800 divide-y divide-gray-700">
                {filteredReports.map((report) => (
                  <tr key={report.id} className="hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        id={`select-report-${report.id}`}
                        type="checkbox"
                        checked={selectedReports.includes(report.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedReports([...selectedReports, report.id]);
                          } else {
                            setSelectedReports(selectedReports.filter(id => id !== report.id));
                          }
                        }}
                        className="rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-800"
                        aria-label={`选择报告: ${report.name}`}
                        title={`选择报告: ${report.name}`}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FileText className="w-5 h-5 text-gray-400 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-white">{report.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getTypeIcon(report.type)}
                        <span className="ml-2 text-sm text-gray-300">{getTypeLabel(report.type)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(report.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {new Date(report.createdAt).toLocaleDateString('zh-CN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {report.size}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {report.status === 'completed' && report.downloadUrl ? (
                        <button
                          onClick={() => handleDownload(report)}
                          className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
                        >
                          <Download className="w-4 h-4" />
                          下载
                        </button>
                      ) : (
                        <span className="text-gray-500">不可用</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredReports.length === 0 && (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-500" />
              <h3 className="mt-2 text-sm font-medium text-white">没有找到报告</h3>
              <p className="mt-1 text-sm text-gray-400">
                {searchTerm || filterType !== 'all' ? '尝试调整搜索条件或筛选器' : '开始生成您的第一个测试报告'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;
