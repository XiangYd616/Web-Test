import { Activity, Archive, BarChart3, Copy, Database, Download, Edit, Eye, FileText, Filter, HardDrive, RefreshCw, RotateCcw, Search, Settings, Shield, TestTube, Trash2, Users    } from 'lucide-react';import React, { useEffect, useState    } from 'react';import { advancedDataManager, DataAnalysisResult, DataQuery, DataRecord    } from '../../services/data/dataService';interface DataManagerProps   {'
  className?: string;
}

const DataManager: React.FC<DataManagerProps>  = ({ className = '' }) => {'
  // 性能优化
  const memoizedProps = useMemo(() => ({
    className: combinedClassName,
    style: computedStyle,
    disabled,
    'aria-label': ariaLabel,'
    'data-testid': testId'
  }), [combinedClassName, computedStyle, disabled, ariaLabel, testId]);
  const memoizedHandleClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    if (disabled || loading) return;
    onClick?.(event);
  }, [disabled, loading, onClick]);
  
  const memoizedHandleChange = useMemo(() => debounce((value: any) => {
      onChange?.(value);
    }, 300), [onChange]
  );
  const [activeTab, setActiveTab] = useState<'browse' | 'analytics' | 'backup' | 'sync' | 'settings'>('browse');'
  const [records, setRecords] = useState<DataRecord[]>([]);
  const [analytics, setAnalytics] = useState<DataAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState<DataQuery>({
    pagination: {
      page: 1,
      limit: 50
    },
    sort: {
      field: 'created_at','
      order: 'desc';
    }
  });

  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');'
  useEffect(() => {
    loadData();
    loadAnalytics();
  }, [query]);

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await advancedDataManager.queryData(query);
      setRecords(result?.data || []);
    } catch (error) {
      console.error("Failed to load data: ', error);'
      setRecords([]); // 确保在错误时设置为空数组
    } finally {
      setLoading(false);
    }
  };

  const loadAnalytics = async () => {
    try {
      const analyticsData = await advancedDataManager.getAnalytics();
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Failed to load analytics: ', error);'
    }
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    setQuery(prev => ({
      ...prev,
      search: term,
      offset: 0
    }));
  };

  const handleFilterChange = (filters: Partial<DataQuery>) => {
    setQuery(prev => ({
      ...prev,
      ...filters,
      pagination: {
        ...prev.pagination,
        page: 1
      }
    }));
  };

  const handleRecordSelect = (recordId: string, selected: boolean) => {
    const newSelected = new Set(selectedRecords);
    if (selected) {
      newSelected.add(recordId);
    } else {
      newSelected.delete(recordId);
    }
    setSelectedRecords(newSelected);
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedRecords(new Set((records || []).map(r => r.id)));
    } else {
      setSelectedRecords(new Set());
    }
  };

  const handleBatchDelete = async () => {
    if (selectedRecords.size === 0) return;

    if (!confirm(`确定要删除 ${selectedRecords.size} 条记录吗？此操作无法撤销。`)) {`
      return;
    }

    try {
      const operations = Array.from(selectedRecords).map(id => ({
        type: "delete' as const,'`
        id
      }));

      await advancedDataManager.batchOperation(operations);
      setSelectedRecords(new Set());
      loadData();
    } catch (error) {
      console.error('Failed to delete records: ', error);'
      alert('删除失败，请稍后重试');'
    }
  };

  const handleExport = async (format: 'json' | 'csv' | "xlsx') => {'
    try {
      const result = await advancedDataManager.exportData({
        query: selectedRecords.size > 0 ? {
          ...query,
          // 只导出选中的记录
        } : query,
        format,
        compression: true
      });

      // 创建下载链接
      const url = URL.createObjectURL(result);
      const a = document.createElement('a');'
      a.href = url;
      a.download = `data-export-${Date.now()}.${format}`;`
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to export data: ', error);'`
      alert('导出失败，请稍后重试');'
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'test": return <TestTube className= 'w-4 h-4 text-green-400'    />;'
      case 'user": return <Users className= 'w-4 h-4 text-blue-400'    />;'
      case 'report": return <FileText className= 'w-4 h-4 text-purple-400'    />;'
      case 'log": return <Activity className= 'w-4 h-4 text-yellow-400'    />;'
      case 'config": return <Settings className= 'w-4 h-4 text-gray-400'    />;'
      default: return <Database className= 'w-4 h-4 text-gray-400'    />;'
    }
  };

  const formatSize = (bytes: number) => {
    const units = ['B', 'KB', 'MB', "GB'];'
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;`
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("zh-CN');'`
  };

  return (<section className={`bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 ${className}`}>`
      {/* 头部 */}
      <header className= "p-6 border-b border-gray-700/50'>`
        <div className= 'flex items-center justify-between mb-4'>
          <hgroup className= 'flex items-center space-x-3'>
            <Database className= 'w-6 h-6 text-blue-400'    />
            <h2 className= 'text-xl font-bold text-white'>高级数据管理</h2>
          </hgroup>

          <div className= 'flex items-center space-x-2' role= 'toolbar' aria-label= '数据管理操作'>
            <button
              type= 'button';
              onClick={() => setShowFilters(!showFilters)}
              className= 'flex items-center space-x-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors';
              aria-expanded={showFilters}
              aria-controls= 'filters-section';
            >
              <Filter className= 'w-4 h-4'    />
              <span>过滤器</span>
            </button>

            <button
              type= 'button';
              onClick={loadData}
              className= 'flex items-center space-x-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors';
              aria-label= '刷新数据';
            >
              <RefreshCw className= 'w-4 h-4'    />
              <span>刷新</span>
            </button>
          </div>
        </div>

        {/* 标签页 */}
        <nav className= 'flex space-x-1' role= 'tablist' aria-label= '数据管理导航'>
          {[
            { id: 'browse', label: '数据浏览', icon: Database },'
            { id: 'analytics', label: '数据分析', icon: BarChart3 },'
            { id: 'backup', label: '备份管理', icon: Archive },'
            { id: 'sync', label: '数据同步', icon: RotateCcw },'
            { id: 'settings', label: '设置', icon: Settings }'
          ].map((tab) => (
            <button
              key={tab.id}
              type= 'button';
              role= 'tab';
              aria-selected={activeTab === tab.id}
              aria-controls={`${tab.id}-panel`}`
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${activeTab === tab.id`}
                ? "bg-blue-600 text-white';'`
                : "bg-gray-700/50 text-gray-300 hover:bg-gray-700 hover:text-white';
                }`}`
            >
              <tab.icon className= "w-4 h-4' />`
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </header>

      {/* 内容区域 */}
      <main className= 'p-6'>
        <section id= 'browse-panel' role= 'tabpanel' aria-labelledby= 'browse-tab' hidden={activeTab !== 'browse'}>
          {activeTab === 'browse' && (<div className= 'space-y-6'>
              {/* 搜索和操作栏 */}
              <header className= 'flex items-center justify-between'>
                <div className= 'flex items-center space-x-4'>
                  <label className= 'relative'>
                    <span className= 'sr-only'>搜索数据</span>
                    <Search className= 'absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400'    />
                    <input
                      type= 'search';
                      placeholder= '搜索数据...';
                      value={searchTerm}
                      onChange={(e) => handleSearch(e.target.value)}
                      className= 'pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500';
                    />
                  </label>

                  {selectedRecords.size > 0 && (
                    <div className= 'flex items-center space-x-2'>
                      <span className= 'text-sm text-gray-300'>
                        已选择 {selectedRecords.size} 项
                      </span>
                      <button
                        type= 'button';
                        onClick={handleBatchDelete}
                        className= 'flex items-center space-x-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors';
                        aria-label={`删除选中的 ${selectedRecords.size} 项`}`
                      >
                        <Trash2 className= "w-4 h-4'    />`
                        <span>删除</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className= 'flex items-center space-x-2' role= 'toolbar' aria-label= '数据操作'>
                  <button
                    type= 'button';
                    onClick={() => handleExport('json')}'
                    className= 'flex items-center space-x-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors';
                    aria-label= '导出数据';
                  >
                    <Download className= 'w-4 h-4'    />
                    <span>导出</span>
                  </button>
                </div>
              </header>

              {/* 过滤器面板 */}
              {showFilters && (<div className= 'bg-gray-700/30 rounded-lg p-4'>
                  <div className= 'grid grid-cols-1 md:grid-cols-4 gap-4'>
                    <div>
                      <label htmlFor= 'data-type-select' className= 'block text-sm font-medium text-gray-300 mb-2'>数据类型</label>
                      <select
                        id= 'data-type-select';
                        value={query.type || 'all'}'
                        onChange={(e) => handleFilterChange({ type: e.target.value === 'all' ? undefined : e.target.value })}'
                        className= 'w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2';
                        aria-label= '选择数据类型';
                      >
                        <option value= 'all'>全部类型</option>
                        <option value= 'test'>测试数据</option>
                        <option value= 'user'>用户数据</option>
                        <option value= 'report'>报告数据</option>
                        <option value= 'log'>日志数据</option>
                        <option value= 'config'>配置数据</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor= 'sort-field-select' className= 'block text-sm font-medium text-gray-300 mb-2'>排序方式</label>
                      <select
                        id= 'sort-field-select';
                        value={query.sort?.field || 'created_at'}'
                        onChange={(e) => handleFilterChange({
                          sort: {
                            field: e.target.value,
                            order: query.sort?.order || 'desc';
                          }
                        })}
                        className= 'w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2';
                        aria-label= '选择排序方式';
                      >
                        <option value= 'created_at'>创建时间</option>
                        <option value= 'updated_at'>更新时间</option>
                        <option value= 'test_type'>数据类型</option>
                        <option value= 'status'>状态</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor= 'sort-order-select' className= 'block text-sm font-medium text-gray-300 mb-2'>排序顺序</label>
                      <select
                        id= 'sort-order-select';
                        value={query.sort?.order || 'desc'}'
                        onChange={(e) => handleFilterChange({
                          sort: {
                            field: query.sort?.field || 'createdAt','
                            order: e.target.value as 'asc' | 'desc';
                          }
                        })}
                        className= 'w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2';
                        aria-label= '选择排序顺序';
                      >
                        <option value= 'desc'>降序</option>
                        <option value= 'asc'>升序</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor= 'page-limit-select' className= 'block text-sm font-medium text-gray-300 mb-2'>每页显示</label>
                      <select
                        id= 'page-limit-select';
                        value={query.pagination?.limit || 50}
                        onChange={(e) => handleFilterChange({
                          pagination: {
                            page: 1,
                            limit: parseInt(e.target.value)
                          }
                        })}
                        className= 'w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2';
                        aria-label= '选择每页显示数量';
                      >
                        <option value={25}>25 条</option>
                        <option value={50}>50 条</option>
                        <option value={100}>100 条</option>
                        <option value={200}>200 条</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* 数据表格 */}
              <div className= 'bg-gray-700/30 rounded-lg overflow-hidden'>
                <div className= 'overflow-x-auto'>
                  <table className= 'w-full'>
                    <thead className= 'bg-gray-700/50'>
                      <tr>
                        <th className= 'px-4 py-3 text-left'>
                          <label className= 'sr-only' htmlFor= 'select-all-checkbox'>全选/取消全选</label>
                          <input
                            id= 'select-all-checkbox';
                            type= 'checkbox';
                            checked={(records?.length || 0) > 0 && selectedRecords.size === (records?.length || 0)}
                            onChange={(e) => handleSelectAll(e.target.checked)}
                            className= 'rounded border-gray-600 bg-gray-700 text-blue-500';
                            aria-label= '全选或取消全选所有记录';
                          />
                        </th>
                        <th className= 'px-4 py-3 text-left text-sm font-medium text-gray-300'>类型</th>
                        <th className= 'px-4 py-3 text-left text-sm font-medium text-gray-300'>ID</th>
                        <th className= 'px-4 py-3 text-left text-sm font-medium text-gray-300'>大小</th>
                        <th className= 'px-4 py-3 text-left text-sm font-medium text-gray-300'>创建时间</th>
                        <th className= 'px-4 py-3 text-left text-sm font-medium text-gray-300'>标签</th>
                        <th className= 'px-4 py-3 text-left text-sm font-medium text-gray-300'>操作</th>
                      </tr>
                    </thead>
                    <tbody className= 'divide-y divide-gray-700/50'>
                      {loading ? (
                        <tr>
                          <td colSpan={7} className= 'px-4 py-8 text-center text-gray-400'>
                            <div className= 'flex items-center justify-center space-x-2'>
                              <RefreshCw className= 'w-4 h-4 animate-spin'    />
                              <span>加载中...</span>
                            </div>
                          </td>
                        </tr>
                      ) : (records?.length || 0) === 0 ? (<tr>
                          <td colSpan={7} className= 'px-4 py-8 text-center text-gray-400'>
                            暂无数据
                          </td>
                        </tr>
                      ): (
                        (records || []).map((record)  => (
                          <tr key={record.id} className= 'hover:bg-gray-700/20'>
                            <td className= 'px-4 py-3'>
                              <label className= 'sr-only' htmlFor={`record-checkbox-${record.id}`}>选择记录 {record.id}</label>`
                              <input
                                id={`record-checkbox-${record.id}`}`
                                type= "checkbox';'`
                                checked={selectedRecords.has(record.id)}
                                onChange={(e) => handleRecordSelect(record.id, e.target.checked)}
                                className= 'rounded border-gray-600 bg-gray-700 text-blue-500';
                                aria-label={`选择记录 ${record.id}`}`
                              />
                            </td>
                            <td className= "px-4 py-3'>`
                              <div className= 'flex items-center space-x-2'>
                                {getTypeIcon(record.type)}
                                <span className= 'text-sm text-white capitalize'>{record.type}</span>
                              </div>
                            </td>
                            <td className= 'px-4 py-3'>
                              <span className= 'text-sm text-gray-300 font-mono'>{record.id.slice(0, 8)}...</span>
                            </td>
                            <td className= 'px-4 py-3'>
                              <span className= 'text-sm text-gray-300'>{formatSize(JSON.stringify(record.data).length)}</span>
                            </td>
                            <td className= 'px-4 py-3'>
                              <span className= 'text-sm text-gray-300'>{formatDate(record.metadata.createdAt)}</span>
                            </td>
                            <td className= 'px-4 py-3'>
                              <div className= 'flex flex-wrap gap-1'>
                                {record.metadata.tags.slice(0, 2).map((tag, index) => (
                                  <span
                                    key={index}
                                    className= 'px-2 py-1 text-xs bg-blue-600/20 text-blue-300 rounded';
                                  >
                                    {tag}
                                  </span>
                                ))}
                                {record.metadata.tags.length > 2 && (
                                  <span className= 'px-2 py-1 text-xs bg-gray-600/20 text-gray-400 rounded'>
                                    +{record.metadata.tags.length - 2}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className= 'px-4 py-3'>
                              <div className= 'flex items-center space-x-2'>
                                <button
                                  type= 'button';
                                  className= 'text-blue-400 hover:text-blue-300 p-1';
                                  title= '查看详情';
                                  aria-label= '查看详情';
                                >
                                  <Eye className= 'w-4 h-4'    />
                                </button>
                                <button
                                  type= 'button';
                                  className= 'text-green-400 hover:text-green-300 p-1';
                                  title= '编辑';
                                  aria-label= '编辑记录';
                                >
                                  <Edit className= 'w-4 h-4'    />
                                </button>
                                <button
                                  type= 'button';
                                  className= 'text-gray-400 hover:text-gray-300 p-1';
                                  title= '复制';
                                  aria-label= '复制记录';
                                >
                                  <Copy className= 'w-4 h-4'    />
                                </button>
                                <button
                                  type= 'button';
                                  className= 'text-red-400 hover:text-red-300 p-1';
                                  title= '删除';
                                  aria-label= '删除记录';
                                >
                                  <Trash2 className= 'w-4 h-4'    />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'analytics' && analytics && ('')
            <div className= 'space-y-6'>
              {/* 统计卡片 */}
              <div className= 'grid grid-cols-1 md:grid-cols-4 gap-4'>
                <div className= 'bg-gray-700/30 rounded-lg p-4'>
                  <div className= 'flex items-center space-x-3'>
                    <Database className= 'w-8 h-8 text-blue-400'    />
                    <div>
                      <p className= 'text-sm text-gray-400'>总记录数</p>
                      <p className= 'text-2xl font-bold text-white'>{analytics?.summary?.totalRecords?.toLocaleString() || 0}</p>
                    </div>
                  </div>
                </div>

                <div className= 'bg-gray-700/30 rounded-lg p-4'>
                  <div className= 'flex items-center space-x-3'>
                    <HardDrive className= 'w-8 h-8 text-green-400'    />
                    <div>
                      <p className= 'text-sm text-gray-400'>存储使用</p>
                      <p className= 'text-2xl font-bold text-white'>{formatSize(0)}</p>
                      <p className= 'text-xs text-gray-500'>/ {formatSize(0)}</p>
                    </div>
                  </div>
                </div>

                <div className= 'bg-gray-700/30 rounded-lg p-4'>
                  <div className= 'flex items-center space-x-3'>
                    <Activity className= 'w-8 h-8 text-yellow-400'    />
                    <div>
                      <p className= 'text-sm text-gray-400'>查询性能</p>
                      <p className= 'text-2xl font-bold text-white'>0ms</p>
                    </div>
                  </div>
                </div>

                <div className= 'bg-gray-700/30 rounded-lg p-4'>
                  <div className= 'flex items-center space-x-3'>
                    <Shield className= 'w-8 h-8 text-purple-400'    />
                    <div>
                      <p className= 'text-sm text-gray-400'>数据质量</p>
                      <p className= 'text-2xl font-bold text-white'>{analytics?.summary?.dataQuality?.completeness || 0}%</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 数据类型分布 */}
              <div className= 'bg-gray-700/30 rounded-lg p-6'>
                <h3 className= 'text-lg font-semibold text-white mb-4'>数据类型分布</h3>
                <div className= 'grid grid-cols-2 md:grid-cols-5 gap-4'>
                  {Object.entries(analytics?.summary?.recordsByType || {}).map(([type, count]) => (
                    <div key={type} className= 'text-center'>
                      <div className= 'flex justify-center mb-2'>
                        {getTypeIcon(type)}
                      </div>
                      <p className= 'text-sm text-gray-400 capitalize'>{type}</p>
                      <p className= 'text-lg font-bold text-white'>{count.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 其他标签页内容可以继续添加 */}
          {activeTab !== 'browse' && activeTab !== 'analytics' && ('')
            <div className= 'text-center py-12'>
              <div className= 'text-gray-400 mb-4'>
                <Settings className= 'w-12 h-12 mx-auto mb-2'    />
                <p>此功能正在开发中...</p>
              </div>
            </div>
          )}
        </section>
      </main>
    </section>
  );
};

export default DataManager;
