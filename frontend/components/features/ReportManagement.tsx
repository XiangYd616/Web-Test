import { CheckCircle, Clock, Download, Eye, FileText, Filter, Plus, Share2, Trash2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { ReportConfig } from '../../services/reporting/index';
import reportService, { Report } from '../../services/reporting/reportService';


export interface ReportManagementProps {
  // 基础属性
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  
  // 事件处理
  onClick?: (event: React.MouseEvent<HTMLElement>) => void;
  onChange?: (value: any) => void;
  onFocus?: (event: React.FocusEvent<HTMLElement>) => void;
  onBlur?: (event: React.FocusEvent<HTMLElement>) => void;
  
  // 状态属性
  disabled?: boolean;
  loading?: boolean;
  error?: string | boolean;
  
  // 数据属性
  value?: any;
  defaultValue?: any;
  
  // 配置属性
  size?: 'small' | 'medium' | 'large';
  variant?: 'primary' | 'secondary' | 'outline';
  
  // 可访问性
  'aria-label'?: string;
  'aria-describedby'?: string;
  role?: string;
  tabIndex?: number;
}


interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: 'performance' | 'security' | 'comprehensive';
  icon: React.ReactNode;
}

const ReportManagement: React.FC<ReportManagementProps> = (props) => {
  
  // 页面级功能
  const [pageTitle, setPageTitle] = useState('');

  // 设置页面标题
  useEffect(() => {
    if (pageTitle) {
      document.title = `${pageTitle} - Test Web`;
    }
  }, [pageTitle]);

  // 页面可见性检测
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // 页面变为可见时刷新数据
        fetchData?.();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchData]);
  
  const memoizedHandleClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    if (disabled || loading) return;
    onClick?.(event);
  }, [disabled, loading, onClick]);
  
  const memoizedHandleChange = useMemo(() => 
    debounce((value: any) => {
      onChange?.(value);
    }, 300), [onChange]
  );
  const [reports, setReports] = useState<Report[]>([]);
  const [showCreateReport, setShowCreateReport] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [reportConfig, setReportConfig] = useState<ReportConfig>({
    dateRange: 30,
    testTypes: [],
    includeCharts: true,
    includeRecommendations: true,
    includeMonitoring: false,
    includeRawData: false
  });
  const [reportName, setReportName] = useState('');
  const [reportFormat, setReportFormat] = useState<'pdf' | 'excel' | 'html'>('pdf');
  const [loading, setLoading] = useState(true);

  const reportTemplates = reportService.getReportTemplates();

  // 初始化数据加载
  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    try {
      const reportList = await reportService.getReports();
      setReports(reportList);
    } catch (error) {
      console.error('Failed to load reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const createReport = async () => {
    if (!reportName || !selectedTemplate) return;

    try {
      const report = await reportService.generateReport(
        reportName,
        selectedTemplate as 'performance' | 'security' | 'comprehensive',
        reportFormat,
        reportConfig
      );

      setReports(prev => [report, ...prev]);
      setShowCreateReport(false);

      // 重置表单
      setReportName('');
      setReportFormat('pdf');
      setReportConfig({
        dateRange: 30,
        testTypes: [],
        includeCharts: true,
        includeRecommendations: true,
        includeMonitoring: false,
        includeRawData: false
      });
      setSelectedTemplate('');

      // 定期检查报告状态
      const checkStatus = setInterval(async () => {
        const updatedReports = await reportService.getReports();
        setReports(updatedReports);

        const updatedReport = updatedReports.find(r => r.id === report.id);
        if (updatedReport && updatedReport.status !== 'generating') {
          clearInterval(checkStatus);
        }
      }, 2000);

    } catch (error) {
      console.error('Failed to create report:', error);
    }
  };

  const deleteReport = async (id: string) => {
    try {
      await reportService.deleteReport(id);
      setReports(prev => prev.filter(report => report.id !== id));
    } catch (error) {
      console.error('Failed to delete report:', error);
    }
  };

  const downloadReport = async (id: string) => {
    try {
      await reportService.downloadReport(id);
    } catch (error) {
      console.error('Failed to download report:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-400 bg-green-500/20';
      case 'generating': return 'text-yellow-400 bg-yellow-500/20';
      case 'failed': return 'text-red-400 bg-red-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'generating': return <Clock className="w-4 h-4 animate-spin" />;
      case 'failed': return <Trash2 className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'pdf': return '📄';
      case 'excel': return '📊';
      case 'html': return '🌐';
      default: return '📄';
    }
  };

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">报告管理</h2>
        <button
          onClick={() => setShowCreateReport(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>生成报告</span>
        </button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm font-medium">总报告数</p>
              <p className="text-2xl font-bold text-white mt-1">{reports.length}</p>
            </div>
            <FileText className="w-8 h-8 text-blue-400" />
          </div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm font-medium">已完成</p>
              <p className="text-2xl font-bold text-green-400 mt-1">
                {reports.filter(r => r.status === 'completed').length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm font-medium">生成中</p>
              <p className="text-2xl font-bold text-yellow-400 mt-1">
                {reports.filter(r => r.status === 'generating').length}
              </p>
            </div>
            <Clock className="w-8 h-8 text-yellow-400" />
          </div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm font-medium">总大小</p>
              <p className="text-2xl font-bold text-white mt-1">
                {reports
                  .filter(r => r.size !== '-')
                  .reduce((total, r) => total + parseFloat(r.size.replace(' MB', '')), 0)
                  .toFixed(1)} MB
              </p>
            </div>
            <Download className="w-8 h-8 text-purple-400" />
          </div>
        </div>
      </div>

      {/* 报告列表 */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">报告列表</h3>
          <div className="flex items-center space-x-3">
            <button className="flex items-center space-x-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors">
              <Filter className="w-4 h-4" />
              <span>筛选</span>
            </button>
          </div>
        </div>

        {reports.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">暂无报告</h3>
            <p className="text-gray-400 mb-6">开始生成您的第一个测试报告</p>
            <button
              onClick={() => setShowCreateReport(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              生成报告
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 text-gray-300">报告名称</th>
                  <th className="text-left py-3 px-4 text-gray-300">类型</th>
                  <th className="text-left py-3 px-4 text-gray-300">状态</th>
                  <th className="text-left py-3 px-4 text-gray-300">测试数量</th>
                  <th className="text-left py-3 px-4 text-gray-300">大小</th>
                  <th className="text-left py-3 px-4 text-gray-300">创建时间</th>
                  <th className="text-left py-3 px-4 text-gray-300">操作</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => (
                  <tr key={report.id} className="border-b border-gray-700/50">
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{getTypeIcon(report.type)}</span>
                        <div>
                          <div className="text-white font-medium">{report.name}</div>
                          <div className="text-gray-400 text-xs">{report.dateRange}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs font-medium uppercase">
                        {report.type}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}>
                        {getStatusIcon(report.status)}
                        <span>
                          {report.status === 'completed' ? '已完成' :
                            report.status === 'generating' ? '生成中' : '失败'}
                        </span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-white">{report.testCount}</td>
                    <td className="py-3 px-4 text-white">{report.size}</td>
                    <td className="py-3 px-4 text-gray-300">
                      {new Date(report.createdAt).toLocaleDateString('zh-CN')}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        {report.status === 'completed' && (
                          <>
                            <button className="p-1 text-gray-400 hover:text-blue-400 transition-colors" title="预览">
                              <Eye className="w-4 h-4" />
                            </button>
                            <button className="p-1 text-gray-400 hover:text-green-400 transition-colors" title="下载">
                              <Download className="w-4 h-4" />
                            </button>
                            <button className="p-1 text-gray-400 hover:text-purple-400 transition-colors" title="分享">
                              <Share2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => deleteReport(report.id)}
                          className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                          title="删除"
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
        )}
      </div>

      {/* 创建报告模态框 */}
      {showCreateReport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-white mb-6">生成新报告</h3>

            {/* 报告模板选择 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-3">选择报告模板</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {reportTemplates.map((template) => (
                  <div
                    key={template.id}
                    onClick={() => setSelectedTemplate(template.id)}
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${selectedTemplate === template.id
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-gray-600 hover:border-gray-500'
                      }`}
                  >
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="text-blue-400">
                        {template.type === 'performance' ? '⚡' :
                          template.type === 'security' ? '🔒' : '📊'}
                      </div>
                      <h4 className="text-white font-medium">{template.name}</h4>
                    </div>
                    <p className="text-gray-400 text-sm">{template.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* 报告配置 */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">报告名称</label>
                <input
                  type="text"
                  value={reportName}
                  onChange={(e) => setReportName(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例如：月度性能报告"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">报告格式</label>
                  <select
                    value={reportFormat}
                    onChange={(e) => setReportFormat(e.target.value as 'pdf' | 'excel' | 'html')}
                    className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    title="选择报告格式"
                    aria-label="选择报告格式"
                  >
                    <option value="pdf">PDF</option>
                    <option value="excel">Excel</option>
                    <option value="html">HTML</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">时间范围</label>
                  <select
                    value={reportConfig.dateRange}
                    onChange={(e) => setReportConfig(prev => ({ ...prev, dateRange: parseInt(e.target.value) }))}
                    className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    title="选择时间范围"
                    aria-label="选择报告时间范围"
                  >
                    <option value="7">最近7天</option>
                    <option value="30">最近30天</option>
                    <option value="90">最近90天</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-300">报告选项</label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={reportConfig.includeCharts}
                      onChange={(e) => setReportConfig(prev => ({ ...prev, includeCharts: e.target.checked }))}
                      className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-gray-300">包含图表和可视化</span>
                  </label>
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={reportConfig.includeRecommendations}
                      onChange={(e) => setReportConfig(prev => ({ ...prev, includeRecommendations: e.target.checked }))}
                      className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-gray-300">包含优化建议</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={() => setShowCreateReport(false)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                title="取消生成报告"
                aria-label="取消生成报告"
              >
                取消
              </button>
              <button
                type="button"
                onClick={createReport}
                disabled={!reportName || !selectedTemplate}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                title="生成报告"
                aria-label="生成报告"
              >
                生成报告
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportManagement;
