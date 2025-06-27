import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  Filter,
  Download,
  RefreshCw,
  Calendar,
  AlertTriangle,
  Info,
  XCircle,
  CheckCircle,
  Clock,
  User,
  Activity,
  Database,
  Shield,
  Globe,
  Server
} from 'lucide-react';

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'debug';
  category: 'system' | 'auth' | 'api' | 'database' | 'security' | 'test';
  message: string;
  details?: string;
  userId?: string;
  userEmail?: string;
  ip?: string;
  userAgent?: string;
  requestId?: string;
  duration?: number;
}

interface LogFilter {
  level: string;
  category: string;
  dateRange: string;
  search: string;
}

const SystemLogs: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<LogFilter>({
    level: 'all',
    category: 'all',
    dateRange: 'today',
    search: ''
  });
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    loadLogs();
    
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(loadLogs, 10000); // 每10秒刷新
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [filter, autoRefresh]);

  const loadLogs = async () => {
    try {
      const params = new URLSearchParams({
        level: filter.level,
        category: filter.category,
        dateRange: filter.dateRange,
        search: filter.search
      });
      
      const response = await fetch(`/api/admin/logs?${params}`);
      if (response.ok) {
        const data = await response.json();
        setLogs(data.data || []);
      } else {
        // 使用模拟数据
        setLogs(getMockLogs());
      }
    } catch (error) {
      console.error('加载系统日志失败:', error);
      setLogs(getMockLogs());
    } finally {
      setLoading(false);
    }
  };

  const getMockLogs = (): LogEntry[] => [
    {
      id: '1',
      timestamp: '2025-06-19 15:30:25',
      level: 'info',
      category: 'auth',
      message: '用户登录成功',
      details: '用户 admin@testweb.com 从 IP 192.168.1.100 成功登录',
      userId: 'user_123',
      userEmail: 'admin@testweb.com',
      ip: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      requestId: 'req_abc123'
    },
    {
      id: '2',
      timestamp: '2025-06-19 15:28:15',
      level: 'error',
      category: 'api',
      message: 'API请求失败',
      details: 'POST /api/test/website 返回 500 错误: 数据库连接超时',
      ip: '192.168.1.105',
      requestId: 'req_def456',
      duration: 5000
    },
    {
      id: '3',
      timestamp: '2025-06-19 15:25:10',
      level: 'warning',
      category: 'system',
      message: '内存使用率过高',
      details: '系统内存使用率达到 85%，建议检查内存泄漏',
      requestId: 'sys_monitor_001'
    },
    {
      id: '4',
      timestamp: '2025-06-19 15:20:05',
      level: 'info',
      category: 'test',
      message: '网站测试完成',
      details: '用户 test@example.com 完成了对 https://example.com 的性能测试',
      userId: 'user_456',
      userEmail: 'test@example.com',
      ip: '192.168.1.110',
      requestId: 'test_789',
      duration: 15000
    },
    {
      id: '5',
      timestamp: '2025-06-19 15:15:30',
      level: 'error',
      category: 'security',
      message: '可疑登录尝试',
      details: '来自 IP 203.0.113.1 的多次失败登录尝试，已触发安全警报',
      ip: '203.0.113.1',
      requestId: 'sec_alert_001'
    },
    {
      id: '6',
      timestamp: '2025-06-19 15:10:45',
      level: 'info',
      category: 'database',
      message: '数据库备份完成',
      details: '定时数据库备份任务成功完成，备份文件大小: 2.3GB',
      requestId: 'backup_daily_001',
      duration: 180000
    },
    {
      id: '7',
      timestamp: '2025-06-19 15:05:20',
      level: 'debug',
      category: 'api',
      message: 'API调用跟踪',
      details: 'GET /api/admin/stats 响应时间: 125ms',
      ip: '192.168.1.100',
      requestId: 'req_ghi789',
      duration: 125
    },
    {
      id: '8',
      timestamp: '2025-06-19 15:00:00',
      level: 'info',
      category: 'system',
      message: '系统启动',
      details: 'Test Web App 系统成功启动，版本: v1.0.0',
      requestId: 'sys_startup_001'
    }
  ];

  const exportLogs = async () => {
    try {
      const params = new URLSearchParams({
        level: filter.level,
        category: filter.category,
        dateRange: filter.dateRange,
        search: filter.search,
        format: 'csv'
      });
      
      const response = await fetch(`/api/admin/logs/export?${params}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `system-logs-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('导出日志失败:', error);
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'info': return <Info className="w-4 h-4 text-blue-500" />;
      case 'debug': return <CheckCircle className="w-4 h-4 text-gray-500" />;
      default: return <Info className="w-4 h-4 text-gray-500" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'auth': return <User className="w-4 h-4" />;
      case 'api': return <Globe className="w-4 h-4" />;
      case 'database': return <Database className="w-4 h-4" />;
      case 'security': return <Shield className="w-4 h-4" />;
      case 'test': return <Activity className="w-4 h-4" />;
      case 'system': return <Server className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const filteredLogs = logs.filter(log => {
    if (filter.level !== 'all' && log.level !== filter.level) return false;
    if (filter.category !== 'all' && log.category !== filter.category) return false;
    if (filter.search && !log.message.toLowerCase().includes(filter.search.toLowerCase()) &&
        !log.details?.toLowerCase().includes(filter.search.toLowerCase())) return false;
    return true;
  });

  const logCounts = {
    total: logs.length,
    error: logs.filter(l => l.level === 'error').length,
    warning: logs.filter(l => l.level === 'warning').length,
    info: logs.filter(l => l.level === 'info').length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">加载系统日志...</p>
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
                <FileText className="w-8 h-8 text-blue-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">系统日志</h1>
                <p className="text-gray-300 mt-1">查看和分析系统运行日志</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-gray-700/50 px-3 py-2 rounded-lg border border-gray-600/50">
                <label className="text-sm font-medium text-gray-300">自动刷新</label>
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-800"
                  aria-label="启用自动刷新"
                  title="启用或禁用日志自动刷新功能"
                />
              </div>
              <button
                type="button"
                onClick={exportLogs}
                className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200 shadow-lg hover:shadow-green-500/25"
              >
                <Download className="w-4 h-4" />
                导出日志
              </button>
              <button
                type="button"
                onClick={loadLogs}
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
                <p className="text-sm font-medium text-gray-400 mb-1">总日志数</p>
                <p className="text-2xl font-bold text-white">{logCounts.total}</p>
              </div>
              <div className="p-3 bg-blue-500/20 rounded-xl border border-blue-500/30">
                <FileText className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-xl border border-gray-700/50 p-6 hover:shadow-2xl hover:border-red-500/30 transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400 mb-1">错误日志</p>
                <p className="text-2xl font-bold text-red-400">{logCounts.error}</p>
              </div>
              <div className="p-3 bg-red-500/20 rounded-xl border border-red-500/30">
                <XCircle className="w-6 h-6 text-red-400" />
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-xl border border-gray-700/50 p-6 hover:shadow-2xl hover:border-yellow-500/30 transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400 mb-1">警告日志</p>
                <p className="text-2xl font-bold text-yellow-400">{logCounts.warning}</p>
              </div>
              <div className="p-3 bg-yellow-500/20 rounded-xl border border-yellow-500/30">
                <AlertTriangle className="w-6 h-6 text-yellow-400" />
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-xl border border-gray-700/50 p-6 hover:shadow-2xl hover:border-blue-500/30 transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400 mb-1">信息日志</p>
                <p className="text-2xl font-bold text-blue-400">{logCounts.info}</p>
              </div>
              <div className="p-3 bg-blue-500/20 rounded-xl border border-blue-500/30">
                <Info className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </div>
        </div>

        {/* 筛选器 */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-xl border border-gray-700/50 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">日志级别</label>
              <select
                value={filter.level}
                onChange={(e) => setFilter({ ...filter, level: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 transition-colors duration-150"
                aria-label="选择日志级别"
                title="选择要筛选的日志级别"
              >
                <option value="all">全部级别</option>
                <option value="error">错误</option>
                <option value="warning">警告</option>
                <option value="info">信息</option>
                <option value="debug">调试</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">日志分类</label>
              <select
                value={filter.category}
                onChange={(e) => setFilter({ ...filter, category: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 transition-colors duration-150"
                aria-label="选择日志分类"
                title="选择要筛选的日志分类"
              >
                <option value="all">全部分类</option>
                <option value="system">系统</option>
                <option value="auth">认证</option>
                <option value="api">API</option>
                <option value="database">数据库</option>
                <option value="security">安全</option>
                <option value="test">测试</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">时间范围</label>
              <select
                value={filter.dateRange}
                onChange={(e) => setFilter({ ...filter, dateRange: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 transition-colors duration-150"
                aria-label="选择时间范围"
                title="选择要筛选的时间范围"
              >
                <option value="today">今天</option>
                <option value="yesterday">昨天</option>
                <option value="week">本周</option>
                <option value="month">本月</option>
                <option value="all">全部</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">搜索</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="搜索日志内容..."
                  value={filter.search}
                  onChange={(e) => setFilter({ ...filter, search: e.target.value })}
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 placeholder-gray-500 transition-colors duration-150"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 日志列表 */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-xl border border-gray-700/50">
          <div className="p-6 border-b border-gray-700/50">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">
                日志记录 ({filteredLogs.length})
              </h2>
              <div className="flex items-center gap-2 text-sm text-gray-300 bg-gray-700/50 px-3 py-1.5 rounded-lg border border-gray-600/50">
                <Clock className="w-4 h-4" />
                最后更新: {new Date().toLocaleTimeString()}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto dark-table-scrollbar">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-700/50 to-gray-600/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    时间
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    级别
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    分类
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    消息
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    用户/IP
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-gray-800/30 divide-y divide-gray-700/50">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-700/30 transition-colors duration-150">
                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-300 font-mono">
                      {log.timestamp}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-gray-700/50 rounded-lg border border-gray-600/50">
                          {getLevelIcon(log.level)}
                        </div>
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                          log.level === 'error' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                          log.level === 'warning' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                          log.level === 'info' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                          'bg-gray-500/20 text-gray-400 border-gray-500/30'
                        }`}>
                          {log.level.toUpperCase()}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-gray-700/50 rounded-lg border border-gray-600/50">
                          {getCategoryIcon(log.category)}
                        </div>
                        <span className="text-sm text-gray-300 capitalize font-medium">
                          {log.category}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="text-sm text-white font-medium">{log.message}</div>
                      {log.details && (
                        <div className="text-xs text-gray-400 mt-1 truncate max-w-md">
                          {log.details}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-400">
                      {log.userEmail && (
                        <div className="font-medium text-gray-300">{log.userEmail}</div>
                      )}
                      {log.ip && (
                        <div className="text-xs font-mono bg-gray-700/50 px-2 py-1 rounded border border-gray-600/50">{log.ip}</div>
                      )}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setSelectedLog(log)}
                        className="text-blue-400 hover:text-blue-300 text-sm font-medium hover:bg-blue-500/20 px-3 py-1.5 rounded-lg transition-colors duration-150 border border-transparent hover:border-blue-500/30"
                      >
                        查看详情
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredLogs.length === 0 && (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">没有找到匹配的日志记录</p>
            </div>
          )}
        </div>

        {/* 日志详情模态框 */}
        {selectedLog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">日志详情</h3>
                  <button
                    type="button"
                    onClick={() => setSelectedLog(null)}
                    className="text-gray-400 hover:text-gray-600"
                    aria-label="关闭日志详情"
                    title="关闭日志详情窗口"
                  >
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">基本信息</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">时间:</span>
                        <span className="text-gray-900">{selectedLog.timestamp}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">级别:</span>
                        <div className="flex items-center gap-2">
                          {getLevelIcon(selectedLog.level)}
                          <span className="text-gray-900">{selectedLog.level.toUpperCase()}</span>
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">分类:</span>
                        <div className="flex items-center gap-2">
                          {getCategoryIcon(selectedLog.category)}
                          <span className="text-gray-900 capitalize">{selectedLog.category}</span>
                        </div>
                      </div>
                      {selectedLog.requestId && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">请求ID:</span>
                          <span className="text-gray-900 font-mono text-xs">{selectedLog.requestId}</span>
                        </div>
                      )}
                      {selectedLog.duration && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">持续时间:</span>
                          <span className="text-gray-900">{selectedLog.duration}ms</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">用户信息</h4>
                    <div className="space-y-2 text-sm">
                      {selectedLog.userEmail && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">用户:</span>
                          <span className="text-gray-900">{selectedLog.userEmail}</span>
                        </div>
                      )}
                      {selectedLog.ip && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">IP地址:</span>
                          <span className="text-gray-900">{selectedLog.ip}</span>
                        </div>
                      )}
                      {selectedLog.userAgent && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">用户代理:</span>
                          <span className="text-gray-900 text-xs truncate max-w-48" title={selectedLog.userAgent}>
                            {selectedLog.userAgent}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">消息</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-900">{selectedLog.message}</p>
                  </div>
                </div>

                {selectedLog.details && (
                  <div className="mt-6">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">详细信息</h4>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <pre className="text-sm text-gray-900 whitespace-pre-wrap">{selectedLog.details}</pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SystemLogs;
