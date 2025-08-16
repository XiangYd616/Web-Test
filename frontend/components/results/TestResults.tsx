/**
 * 增强的测试结果展示组件
 * 提供更好的用户体验、可视化图表、性能优化和交互增强
 */

import { Activity, AlertTriangle, BarChart3, CheckCircle, Clock, Download, Eye, EyeOff, Maximize2, PieChart as PieChartIcon, Search, Share2, // Zap } from 'lucide-react'; // 已修复
import React, { useCallback, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, // YAxis } from 'recharts'; // 已修复
interface TestResult {
  id: string;
  type: string;
  url: string;
  score: number;
  status: 'success' | 'warning' | 'error';
  timestamp: string;
  duration: number;
  metrics: Record<string, any>;
  details: any;
}

interface TestResultsProps {
  results: TestResult[];
  loading?: boolean;
  onResultClick?: (result: TestResult) => void;
  onExport?: (format: string) => void;
  onShare?: (result: TestResult) => void;
}

const TestResults: React.FC<TestResultsProps> = ({
  results,
  loading = false,
  onResultClick,
  onExport,
  onShare
}) => {
  
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
  
  const componentId = useId();
  const errorId = `${componentId}-error`;
  const descriptionId = `${componentId}-description`;
  
  const ariaProps = {
    id: componentId,
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledBy,
    'aria-describedby': [
      error ? errorId : null,
      description ? descriptionId : null,
      ariaDescribedBy
    ].filter(Boolean).join(' ') || undefined,
    'aria-invalid': !!error,
    'aria-disabled': disabled,
    'aria-busy': loading,
    'aria-expanded': expanded,
    'aria-selected': selected,
    role: role,
    tabIndex: disabled ? -1 : (tabIndex ?? 0)
  };
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'chart'>('grid');
  const [chartType, setChartType] = useState<'bar' | 'line' | 'pie' | 'radar'>('bar');
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'timestamp' | 'score' | 'duration'>('timestamp');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedResults, setSelectedResults] = useState<Set<string>>(new Set());
  const [showDetails, setShowDetails] = useState<Record<string, boolean>>({});

  // 过滤和排序结果
  const filteredAndSortedResults = useMemo(() => {
    let filtered = results;

    // 应用类型过滤
    if (filterType !== 'all') {
      filtered = filtered.filter(result => result.type === filterType);
    }

    // 应用搜索过滤
    if (searchTerm) {
      filtered = filtered.filter(result =>
        result.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
        result.type.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // 应用排序
    filtered.sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case 'score':
          aValue = a.score;
          bValue = b.score;
          break;
        case 'duration':
          aValue = a.duration;
          bValue = b.duration;
          break;
        case 'timestamp':
        default:
          aValue = new Date(a.timestamp).getTime();
          bValue = new Date(b.timestamp).getTime();
          break;
      }

      if (sortOrder === 'asc') {
        
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [results, filterType, searchTerm, sortBy, sortOrder]);

  // 统计数据
  const statistics = useMemo(() => {
    const total = results.length;
    const successful = results.filter(r => r.status === 'success').length;
    const warnings = results.filter(r => r.status === 'warning').length;
    const errors = results.filter(r => r.status === 'error').length;
    const averageScore = results.reduce((sum, r) => sum + r.score, 0) / total || 0;
    const averageDuration = results.reduce((sum, r) => sum + r.duration, 0) / total || 0;

    return {
      total,
      successful,
      warnings,
      errors,
      averageScore: Math.round(averageScore * 10) / 10,
      averageDuration: Math.round(averageDuration * 10) / 10,
      successRate: Math.round((successful / total) * 100) || 0
    };
  }, [results]);

  // 图表数据
  const chartData = useMemo(() => {
    switch (chartType) {
      case 'bar':
        return filteredAndSortedResults.map(result => ({
          name: result.type,
          score: result.score,
          duration: result.duration,
          url: result.url.substring(0, 20) + '...'
        }));

      case 'line':
        return filteredAndSortedResults.map((result, index) => ({
          index: index + 1,
          score: result.score,
          timestamp: new Date(result.timestamp).toLocaleDateString()
        }));

      case 'pie':
        const typeGroups = results.reduce((acc, result) => {
          acc[result.type] = (acc[result.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        return Object.entries(typeGroups).map(([type, count]) => ({
          name: type,
          value: count
        }));

      case 'radar':
        const avgMetrics = results.reduce((acc, result) => {
          Object.keys(result.metrics || {}).forEach(key => {
            if (typeof result.metrics[key] === 'number') {
              acc[key] = (acc[key] || 0) + result.metrics[key];
            }
          });
          return acc;
        }, {} as Record<string, number>);

        return Object.entries(avgMetrics).map(([metric, value]) => ({
          metric,
          value: Math.round((value / results.length) * 10) / 10
        }));

      default:
        return [];
    }
  }, [filteredAndSortedResults, chartType, results]);

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-green-500 bg-green-500/10 border-green-500/20';
      case 'warning':
        return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
      case 'error':
        return 'text-red-500 bg-red-500/10 border-red-500/20';
      default:
        return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
    }
  };

  // 获取状态图标
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  // 获取分数颜色
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-500';
    if (score >= 70) return 'text-yellow-500';
    if (score >= 50) return 'text-orange-500';
    return 'text-red-500';
  };

  // 切换详情显示
  const toggleDetails = useCallback((resultId: string) => {
    setShowDetails(prev => ({
      ...prev,
      [resultId]: !prev[resultId]
    }));
  }, []);

  // 选择结果
  const toggleSelection = useCallback((resultId: string) => {
    setSelectedResults(prev => {
      const newSet = new Set(prev);
      if (newSet.has(resultId)) {
        newSet.delete(resultId);
      } else {
        newSet.add(resultId);
      }
      return newSet;
    });
  }, []);

  // 全选/取消全选
  const toggleSelectAll = useCallback(() => {
    if (selectedResults.size === filteredAndSortedResults.length) {
      setSelectedResults(new Set());
    } else {
      setSelectedResults(new Set(filteredAndSortedResults.map(r => r.id)));
    }
  }, [selectedResults.size, filteredAndSortedResults]);

  // 导出选中结果
  const exportSelected = useCallback((format: string) => {
    if (onExport) {
      onExport(format);
    }
  }, [onExport]);

  if (loading) {
    
        return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
      }

  return (
    <div className="space-y-6">
      {/* 统计概览 */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-2xl font-bold text-white">{statistics.total}</div>
          <div className="text-gray-400 text-sm">总测试数</div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-2xl font-bold text-green-400">{statistics.successful}</div>
          <div className="text-gray-400 text-sm">成功</div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-2xl font-bold text-yellow-400">{statistics.warnings}</div>
          <div className="text-gray-400 text-sm">警告</div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-2xl font-bold text-red-400">{statistics.errors}</div>
          <div className="text-gray-400 text-sm">错误</div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-2xl font-bold text-blue-400">{statistics.averageScore}</div>
          <div className="text-gray-400 text-sm">平均分数</div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-2xl font-bold text-purple-400">{statistics.averageDuration}s</div>
          <div className="text-gray-400 text-sm">平均耗时</div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-2xl font-bold text-green-400">{statistics.successRate}%</div>
          <div className="text-gray-400 text-sm">成功率</div>
        </div>
      </div>

      {/* 控制栏 */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="flex flex-wrap items-center gap-4">
          {/* 搜索 */}
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="搜索URL或测试类型..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* 过滤器 */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">所有类型</option>
            <option value="performance">性能测试</option>
            <option value="seo">SEO测试</option>
            <option value="security">安全测试</option>
            <option value="accessibility">可访问性</option>
          </select>

          {/* 排序 */}
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('-');
              setSortBy(field as any);
              setSortOrder(order as any);
            }}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="timestamp-desc">最新优先</option>
            <option value="timestamp-asc">最旧优先</option>
            <option value="score-desc">分数降序</option>
            <option value="score-asc">分数升序</option>
            <option value="duration-desc">耗时降序</option>
            <option value="duration-asc">耗时升序</option>
          </select>

          {/* 视图模式 */}
          <div className="flex bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1 rounded ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-gray-300'}`}
            >
              网格
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-gray-300'}`}
            >
              列表
            </button>
            <button
              onClick={() => setViewMode('chart')}
              className={`px-3 py-1 rounded ${viewMode === 'chart' ? 'bg-blue-600 text-white' : 'text-gray-300'}`}
            >
              图表
            </button>
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-2">
            <button
              onClick={toggleSelectAll}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              {selectedResults.size === filteredAndSortedResults.length ? '取消全选' : '全选'}
            </button>

            {selectedResults.size > 0 && (
              <button
                onClick={() => exportSelected('json')}
                className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                导出选中
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 图表视图 */}
      {viewMode === 'chart' && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-medium">数据可视化</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setChartType('bar')}
                className={`px-3 py-1 rounded ${chartType === 'bar' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
              >
                <BarChart3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setChartType('line')}
                className={`px-3 py-1 rounded ${chartType === 'line' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
              >
                <Activity className="w-4 h-4" />
              </button>
              <button
                onClick={() => setChartType('pie')}
                className={`px-3 py-1 rounded ${chartType === 'pie' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
              >
                <PieChartIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setChartType('radar')}
                className={`px-3 py-1 rounded ${chartType === 'radar' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
              >
                <Zap className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'bar' && (
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-gray-700)" />
                  <XAxis dataKey="name" stroke="var(--color-gray-400)" />
                  <YAxis stroke="var(--color-gray-400)" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-gray-800)',
                      border: '1px solid var(--color-gray-700)',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="score" fill="var(--color-primary)" name="分数" />
                  <Bar dataKey="duration" fill="var(--color-success)" name="耗时(s)" />
                </BarChart>
              )}

              {chartType === 'line' && (
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-gray-700)" />
                  <XAxis dataKey="index" stroke="var(--color-gray-400)" />
                  <YAxis stroke="var(--color-gray-400)" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-gray-800)',
                      border: '1px solid var(--color-gray-700)',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="score" stroke="var(--color-primary)" strokeWidth={2} />
                </LineChart>
              )}

              {chartType === 'pie' && (
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['var(--color-primary)', 'var(--color-success)', 'var(--color-warning)', 'var(--color-danger)', '#8B5CF6'][index % 5]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              )}

              {chartType === 'radar' && (
                <RadarChart data={chartData}>
                  <PolarGrid stroke="var(--color-gray-700)" />
                  <PolarAngleAxis dataKey="metric" stroke="var(--color-gray-400)" />
                  <PolarRadiusAxis stroke="var(--color-gray-400)" />
                  <Radar name="指标" dataKey="value" stroke="var(--color-primary)" fill="var(--color-primary)" fillOpacity={0.6} />
                </RadarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 结果列表 */}
      {viewMode !== 'chart' && (
        <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
          {filteredAndSortedResults.map((result) => (
            <div
              key={result.id}
              className={`bg-gray-800 rounded-lg border border-gray-700 p-4 hover:border-gray-600 transition-colors ${selectedResults.has(result.id) ? 'ring-2 ring-blue-500' : ''
                }`}
            >
              {/* 结果头部 */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedResults.has(result.id)}
                    onChange={() => toggleSelection(result.id)}
                    className="rounded text-blue-600"
                  />
                  <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs border ${getStatusColor(result.status)}`}>
                    {getStatusIcon(result.status)}
                    {result.status.toUpperCase()}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggleDetails(result.id)}
                    className="p-1 text-gray-400 hover:text-white"
                  >
                    {showDetails[result.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>

                  {onShare && (
                    <button
                      onClick={() => onShare(result)}
                      className="p-1 text-gray-400 hover:text-white"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    onClick={() => onResultClick?.(result)}
                    className="p-1 text-gray-400 hover:text-white"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* 结果内容 */}
              <div className="space-y-2">
                <div>
                  <div className="text-white font-medium">{result.type.toUpperCase()}</div>
                  <div className="text-gray-400 text-sm truncate">{result.url}</div>
                </div>

                <div className="flex items-center justify-between">
                  <div className={`text-2xl font-bold ${getScoreColor(result.score)}`}>
                    {result.score}
                  </div>
                  <div className="text-gray-400 text-sm">
                    {result.duration}s
                  </div>
                </div>

                <div className="text-gray-400 text-xs">
                  {new Date(result.timestamp).toLocaleString()}
                </div>

                {/* 详细信息 */}
                {showDetails[result.id] && (
                  <div className="mt-3 pt-3 border-t border-gray-700">
                    <div className="space-y-2 text-sm">
                      {Object.entries(result.metrics || {}).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="text-gray-400">{key}:</span>
                          <span className="text-white">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 空状态 */}
      {filteredAndSortedResults.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 text-lg mb-2">没有找到匹配的测试结果</div>
          <div className="text-gray-500 text-sm">尝试调整搜索条件或过滤器</div>
        </div>
      )}
    </div>
  );
};

export default TestResults;
