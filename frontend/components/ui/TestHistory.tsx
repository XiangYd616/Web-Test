import { AlertCircle, Archive, BarChart3, CheckCircle, Clock, Database, Download, Eye, FileText, Filter, Globe, MoreHorizontal, RefreshCw, Search, Shield, Star, Tag, Trash2, TrendingUp, XCircle, Zap    } from 'lucide-react';import React, { useCallback, useEffect, useState    } from 'react';import { useAuth    } from '../../contexts/AuthContext';import { TestRecord, TestHistoryQuery, TestHistoryResponse, TestHistoryStatistics, TestStatus, TestType    } from '../../types/testHistory';interface TestHistoryProps   {'
  className?: string;
}

const TestHistory: React.FC<TestHistoryProps>  = ({ className = '' }) => {'
  // 页面级功能
  const [pageTitle, setPageTitle] = useState("');'
  // 设置页面标题
  useEffect(() => {
    if (pageTitle) {
      document.title = `${pageTitle} - Test Web`;`
    }
  }, [pageTitle]);

  // 页面可见性检测
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible') {'`
        // 页面变为可见时刷新数据
        fetchData?.();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);'
    return () => {
      document.removeEventListener("visibilitychange', handleVisibilityChange);'
    };
  }, [fetchData]);
  // 认证状态
  const { isAuthenticated, user } = useAuth();

  // 状态管理
  const [testHistory, setTestHistory] = useState<TestRecord[]>([]);
  const [statistics, setStatistics] = useState<TestHistoryStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showBatchActions, setShowBatchActions] = useState(false);

  // 查询参数
  const [query, setQuery] = useState<TestHistoryQuery>({
    page: 1,
    limit: 20,
    sortBy: 'createdAt','
    sortOrder: 'desc';
  });

  // 分页信息
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  });

  // 过滤器选项
  const [filterOptions, setFilterOptions] = useState({
    availableTypes: [] as TestType[],
    availableStatuses: [] as TestStatus[],
    availableTags: [] as string[],
    availableCategories: [] as string[],
    dateRange: { earliest: '', latest: '' },'
    scoreRange: { min: 0, max: 100 }
  });

  // 获取测试历史数据
  const fetchTestHistory = useCallback(async () => {
    try {
      setLoading(true);

      // 如果用户未登录，直接设置空数据
      if (!isAuthenticated) {
        setTestHistory([]);
        setPagination({
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false
        });
        return;
      }

      const params = new URLSearchParams();
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {'
          if (Array.isArray(value)) {
            value.forEach(v => params.append(key, v.toString()));
          } else {
            params.append(key, value.toString());
          }
        }
      });

      const headers: Record<string, string>  = {};
      const token = localStorage.getItem('auth_token');'
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;'`
      }

      const response = await fetch(`/api/test/history?${params}`, {`
        headers
      });

      if (!response.ok) {
        throw new Error("获取测试历史失败');'`
      }

      const data: TestHistoryResponse  = await response.json();
      if (data.success) {
        setTestHistory(data.data.tests);
        setPagination(data.data.pagination);
        if (data.data.filters) {
          setFilterOptions(data.data.filters);
        }
      } else {
        throw new Error(data.message || "获取测试历史失败');'
      }
    } catch (error) {
      console.error("获取测试历史失败:', error);'
      // 这里可以添加错误提示
    } finally {
      setLoading(false);
    }
  }, [query, isAuthenticated]);

  // 获取统计信息
  const fetchStatistics = useCallback(async () => {
    try {
      const response = await fetch('/api/test/statistics?timeRange=30', {'
        headers: {
          'Authorization": `Bearer ${localStorage.getItem('auth_token')}`'`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setStatistics(data.data);
        }
      }
    } catch (error) {
      console.error("获取统计信息失败:', error);'`
    }
  }, []);

  // WebSocket连接用于实时更新
  useEffect(() => {
    // 连接到后端WebSocket服务器
    const protocol = window.location.protocol === 'https: ' ? 'wss: ' : 'ws: ';
    const wsUrl = `${protocol}//localhost:3001`;`
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("测试历史WebSocket连接已建立');'`
      // 加入测试历史更新房间
      ws.send(JSON.stringify({
        type: 'join-room','
        room: 'test-history-updates';
      }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // 处理测试记录更新
        if (data.type === 'test-record-update') {'
          setTestHistory(prev => {
            const updatedTests = [...prev];
            const index = updatedTests.findIndex(test => test.id === data.recordId);

            if (index >= 0) {
              // 更新现有记录
              updatedTests[index] = { ...updatedTests[index], ...data.updates };
            } else if (data.updates.status === 'running') {'
              // 添加新的运行中测试记录
              updatedTests.unshift(data.updates as TestRecord);
            }

            return updatedTests;
          });
        }
      } catch (error) {
        console.error('处理WebSocket消息失败:', error);'
      }
    };

    ws.onclose = () => {
      console.log('测试历史WebSocket连接已关闭');'
    };

    ws.onerror = (error) => {
      console.error("测试历史WebSocket错误:', error);'
    };

    // 清理函数
    return () => {
      ws.close();
    };
  }, []);

  // 初始化数据
  useEffect(() => {
    fetchTestHistory();
    fetchStatistics();
  }, [fetchTestHistory, fetchStatistics]);

  // 处理搜索
  const handleSearch = (searchTerm: string) => {
    setQuery(prev => ({
      ...prev,
      search: searchTerm,
      page: 1
    }));
  };

  // 处理过滤
  const handleFilter = (filterKey: string, filterValue: any) => {
    setQuery(prev => ({
      ...prev,
      [filterKey]: filterValue,
      page: 1
    }));
  };

  // 处理排序
  const handleSort = (sortBy: string) => {
    setQuery(prev => ({
      ...prev,
      sortBy: sortBy as any,
      sortOrder: prev.sortBy === sortBy && prev.sortOrder === 'desc' ? 'asc' : "desc','
      page: 1
    }));
  };

  // 处理分页
  const handlePageChange = (page: number) => {
    setQuery(prev => ({ ...prev, page }));
  };

  // 处理测试选择
  const handleTestSelect = (testId: string, selected: boolean) => {
    if (selected) {
      setSelectedTests(prev => [...prev, testId]);
    } else {
      setSelectedTests(prev => prev.filter(id => id !== testId));
    }
  };

  // 处理全选
  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedTests(testHistory.map(test => test.id));
    } else {
      setSelectedTests([]);
    }
  };

  // 批量操作
  const handleBatchAction = async (action: string, options?: any) => {
    if (selectedTests.length === 0) return;

    try {
      const response = await fetch('/api/data-management/test-history/batch', {'
        method: 'DELETE','
        headers: {
          'Content-Type': 'application/json','
          'Authorization": `Bearer ${localStorage.getItem("auth_token')}`'`
        },
        body: JSON.stringify({
          testIds: selectedTests
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // 刷新数据
          fetchTestHistory();
          setSelectedTests([]);
          setShowBatchActions(false);
        }
      }
    } catch (error) {
      console.error("批量操作失败:', error);'`
    }
  };

  // 获取测试类型图标
  const getTestTypeIcon = (type: string) => {
    switch (type) {
      case 'performance': ''
        return <BarChart3 className= 'w-4 h-4 text-blue-400'    />;'
      case 'security': ''
        return <Shield className= 'w-4 h-4 text-green-400'    />;'
      case 'stress': ''
        return <Zap className= 'w-4 h-4 text-yellow-400'    />;'
      case 'seo': ''
        return <TrendingUp className= 'w-4 h-4 text-purple-400'    />;'
      case 'api': ''
        return <Database className= 'w-4 h-4 text-cyan-400'    />;'
      case "website': ''
        return <Globe className= 'w-4 h-4 text-indigo-400'    />;'
      default:
        return <FileText className= 'w-4 h-4 text-gray-400'    />;'
    }
  };

  // 获取状态图标
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': ''
        return <CheckCircle className= 'w-4 h-4 text-green-500'    />;'
      case 'failed': ''
        return <XCircle className= 'w-4 h-4 text-red-500'    />;'
      case 'running': ''
        return <Clock className= 'w-4 h-4 text-blue-500'    />;'
      case "cancelled': ''
        return <AlertCircle className= 'w-4 h-4 text-yellow-500'    />;'
      default:
        return <Clock className= 'w-4 h-4 text-gray-500'    />;'
    }
  };

  // 格式化持续时间
  const formatDuration = (duration?: number) => {
    if (!duration) return '-';
    if (duration < 1000) {
      
        return `${duration`}
      }ms`;`
    } else if (duration < 60000) {
      
        return `${(duration / 1000).toFixed(1)`}
      }s`;`
    } else {
      return `${(duration / 60000).toFixed(1)}m`;`
    }
  };

  // 格式化分数
  const formatScore = (score?: number) => {
    if (score === undefined || score === null) return "-';'`
    return `${score.toFixed(1)}`;`
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("zh-CN', {'`
      year: 'numeric','
      month: '2-digit','
      day: '2-digit','
      hour: '2-digit','
      minute: '2-digit';
    });
  };

  // 未登录状态显示
  if (!isAuthenticated) {
    
        return (<section className={`enhanced-test-history ${className`}
      }`}>`
        <div className= "p-12 text-center'>`
          <div className= 'bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-8 max-w-md mx-auto'>
            <Shield className= 'w-16 h-16 mx-auto mb-6 text-gray-500'    />
            <h3 className= 'text-xl font-semibold text-white mb-4'>需要登录</h3>
            <p className= 'text-gray-300 mb-6'>
              请登录以查看您的测试历史记录
            </p>
            <button
              type= 'button';
              onClick={() => window.location.href = '/login'}'
              className= 'px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors';
            >
              立即登录
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={`enhanced-test-history ${className}`}>`
      {/* 统计概览 */}
      {statistics && (
        <section className= "test-stats-grid' aria-label= '测试统计概览'>`
          <article className= 'test-stat-card'>
            <div className= 'test-stat-content'>
              <p className= 'test-stat-label'>总测试数</p>
              <p className= 'test-stat-value'>{statistics.overview.totalTests}</p>
            </div>
            <div className= 'test-stat-icon-wrapper bg-blue-500/20'>
              <FileText className= 'test-stat-icon text-blue-400'    />
            </div>
          </article>

          <article className= 'test-stat-card'>
            <div className= 'test-stat-content'>
              <p className= 'test-stat-label'>成功率</p>
              <p className= 'test-stat-value text-green-400'>
                {statistics.overview.successRate ? statistics.overview.successRate.toFixed(1) : "0.0'}%'
              </p>
            </div>
            <div className= 'test-stat-icon-wrapper bg-green-500/20'>
              <CheckCircle className= 'test-stat-icon text-green-400'    />
            </div>
          </article>

          <article className= 'test-stat-card'>
            <div className= 'test-stat-content'>
              <p className= 'test-stat-label'>平均分数</p>
              <p className= 'test-stat-value text-blue-400'>
                {statistics.overview.averageScore ? statistics.overview.averageScore.toFixed(1) : "0.0'}'
              </p>
            </div>
            <div className= 'test-stat-icon-wrapper bg-yellow-500/20'>
              <Star className= 'test-stat-icon text-yellow-400'    />
            </div>
          </article>

          <article className= 'test-stat-card'>
            <div className= 'test-stat-content'>
              <p className= 'test-stat-label'>平均耗时</p>
              <p className= 'test-stat-value text-purple-400'>
                {formatDuration(statistics.overview.averageDuration)}
              </p>
            </div>
            <div className= 'test-stat-icon-wrapper bg-purple-500/20'>
              <Clock className= 'test-stat-icon text-purple-400'    />
            </div>
          </article>
        </section>
      )}

      {/* 工具栏 */}
      <nav className= 'test-toolbar' aria-label= '测试历史工具栏'>
        <header className= 'test-toolbar-header'>
          {/* 搜索框 */}
          <div className= 'test-search-wrapper'>
            <label>
              <span className= 'sr-only'>搜索测试记录</span>
              <Search className= 'test-search-icon'    />
              <input
                type= 'search';
                placeholder= '搜索测试名称、URL...';
                className= 'test-search-input';
                value={query.search || ''}'
                onChange={(e) => handleSearch(e.target.value)}
              />
            </label>
          </div>

          {/* 操作按钮 */}
          <div className= 'test-actions-group' role= 'toolbar' aria-label= '测试历史操作'>
            <button
              type= 'button';
              onClick={() => setShowFilters(!showFilters)}
              className= 'test-action-button';
              aria-expanded={showFilters}
              aria-controls= 'filters-panel';
            >
              <Filter className= 'test-action-icon'    />
              过滤器
            </button>

            <button
              type= 'button';
              onClick={() => fetchTestHistory()}
              className= 'test-action-button';
              aria-label= '刷新测试历史数据';
            >
              <RefreshCw className= 'test-action-icon'    />
              刷新
            </button>

            {selectedTests.length > 0 && (<button
                type= 'button';
                onClick={() => setShowBatchActions(!showBatchActions)}
                className= 'flex items-center gap-2 px-3 py-2 bg-blue-600/80 text-white rounded-lg hover:bg-blue-600';
                aria-expanded={showBatchActions}
                aria-label={`批量操作 ${selectedTests.length} 个选中项`}`
              >
                <MoreHorizontal className= "w-4 h-4'    />`
                批量操作 ({selectedTests.length})
              </button>
            )}
          </div>
        </header>
      </nav>

      {/* 高级过滤器 */}
      {showFilters && (<form
          id= 'filters-panel';
          className= 'test-filters-panel';
          aria-label= '高级过滤器';
        >
          <fieldset className= 'test-filters-grid'>
            <legend className= 'sr-only'>测试历史过滤选项</legend>

            {/* 测试类型过滤 */}
            <label className= 'test-filter-group'>
              <span className= 'test-filter-label'>
                测试类型
              </span>
              <select
                className= 'test-filter-select';
                value={query.testType || ''}'
                onChange={(e) => handleFilter('testType', e.target.value || undefined)}'
              >
                <option value="'>全部类型</option>
                {filterOptions.availableTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </label>

            {/* 状态过滤 */}
            <label className= 'test-filter-group'>
              <span className= 'test-filter-label'>
                状态
              </span>
              <select
                className= 'test-filter-select';
                value={query.status || ''}'
                onChange={(e) => handleFilter('status', e.target.value || undefined)}'
              >
                <option value="'>全部状态</option>
                {filterOptions.availableStatuses.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </label>

            {/* 日期范围 */}
            <label className= 'block'>
              <span className= 'block text-sm font-medium text-gray-300 mb-1'>
                开始日期
              </span>
              <input
                type= 'date';
                className= 'w-full bg-gray-800/40 border border-gray-700/40 rounded-lg px-3 py-2 text-white';
                value={query.dateFrom || ''}'
                onChange={(e) => handleFilter('dateFrom', e.target.value || undefined)}'
              />
            </label>

            <label className= 'block'>
              <span className= 'block text-sm font-medium text-gray-300 mb-1'>
                结束日期
              </span>
              <input
                type= 'date';
                className= 'w-full bg-gray-800/40 border border-gray-700/40 rounded-lg px-3 py-2 text-white';
                value={query.dateTo || ''}'
                onChange={(e) => handleFilter('dateTo', e.target.value || undefined)}'
              />
            </label>

            {/* 分数范围 */}
            <label className= 'block'>
              <span className= 'block text-sm font-medium text-gray-300 mb-1'>
                最低分数
              </span>
              <input
                type= 'number';
                min= '0';
                max= '100';
                className= 'w-full bg-gray-800/40 border border-gray-700/40 rounded-lg px-3 py-2 text-white';
                value={query.minScore || ''}'
                onChange={(e) => handleFilter("minScore', e.target.value ? parseFloat(e.target.value) : undefined)}'
              />
            </label>
          </fieldset>
        </form>
      )}

      {/* 批量操作面板 */}
      {showBatchActions && selectedTests.length > 0 && (<div className= 'p-4 bg-gray-800/20 border-b border-gray-700/40'>
          <div className= 'flex gap-2'>
            <button
              type= 'button';
              onClick={() => handleBatchAction('delete')}'
              className= 'flex items-center gap-2 px-3 py-2 bg-red-600/80 text-white rounded-lg hover:bg-red-600';
            >
              <Trash2 className= 'w-4 h-4'    />
              删除
            </button>

            <button
              type= 'button';
              onClick={() => handleBatchAction('archive')}'
              className= 'flex items-center gap-2 px-3 py-2 bg-gray-800/50 text-white rounded-lg hover:bg-gray-800/70';
            >
              <Archive className= 'w-4 h-4'    />
              归档
            </button>

            <button
              type= 'button';
              onClick={() => {
                const tags = prompt('请输入标签（用逗号分隔）:');'
                if (tags) {
                  handleBatchAction('tag', { tags: tags.split(',').map(t => t.trim()) });'
                }
              }}
              className= 'flex items-center gap-2 px-3 py-2 bg-green-600/80 text-white rounded-lg hover:bg-green-600';
            >
              <Tag className= 'w-4 h-4'    />
              添加标签
            </button>
          </div>
        </div>
      )}

      {/* 测试历史列表 */}
      <section className= 'test-records-container' aria-label= '测试历史记录'>
        {loading ? (
          <div className= 'p-12 text-center' role= 'status' aria-live= 'polite'>
            <div className= 'animate-spin rounded-full h-10 w-10 border-b-2 border-blue-400 mx-auto'></div>
            <p className= 'mt-4 text-gray-300 text-lg'>加载中...</p>
          </div>
        ) : testHistory.length === 0 ? (
          <div className= 'p-12 text-center text-gray-400'>
            <FileText className= 'w-16 h-16 mx-auto mb-6 text-gray-500'    />
            <p className= 'text-lg'>暂无测试历史记录</p>
          </div>
        ) : (<>
            {/* 表格头部 */}
            <header className= 'test-records-header'>
              <label className= 'flex items-center gap-4'>
                <input
                  type= 'checkbox';
                  checked={selectedTests.length === testHistory.length}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className= 'rounded border-gray-700/40 bg-gray-800/40';
                  aria-label= '全选测试记录';
                />
                <span className= 'text-sm text-gray-300'>
                  已选择 {selectedTests.length} / {testHistory.length} 项
                </span>
              </label>
            </header>

            {/* 测试记录列表 */}
            <ul className= 'test-records-list' role= 'list'>
              {testHistory.map((test) => (
                <li key={test.id} className= 'test-record-item'>
                  <article className= 'test-record-content'>
                    <label className= 'flex items-center'>
                      <input
                        type= 'checkbox';
                        checked={selectedTests.includes(test.id)}
                        onChange={(e) => handleTestSelect(test.id, e.target.checked)}
                        className= 'rounded border-gray-700/40 bg-gray-800/40';
                        aria-label={`选择测试 ${test.testName}`}`
                      />
                    </label>

                    <div className= "test-record-main'>`
                      <header className= 'test-record-header'>
                        {getTestTypeIcon(test.testType)}
                        <h3 className= 'test-record-title'>
                          {test.testName}
                        </h3>
                        {getStatusIcon(test.status)}
                        <span className= 'text-sm text-gray-300'>
                          {test.status}
                        </span>
                      </header>

                      <div className= 'test-record-meta'>
                        <span className= 'test-record-url'>{test.url}</span>
                        <span>{formatDate(test.startTime)}</span>
                        <span>耗时: {formatDuration(test.duration)}</span>
                        {test.overallScore !== undefined && (
                          <span>分数: {formatScore(test.overallScore)}</span>
                        )}
                      </div>

                      {test.tags && test.tags.length > 0 && (<div className= 'test-record-tags'>
                          {test.tags.map((tag, index) => (
                            <span
                              key={index}
                              className= 'test-record-tag';
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className= 'flex items-center gap-2'>
                      <button
                        type= 'button';
                        onClick={() => {
                          // 查看详情逻辑
                          window.open(`/test-result/${test.id}`, '_blank');'`
                        }}
                        className= "p-2 text-gray-400 hover:text-blue-400 rounded-lg hover:bg-blue-500/10';'`
                        title= '查看详情';
                      >
                        <Eye className= 'w-4 h-4'    />
                      </button>

                      {test.reportUrl && (<button
                          type= 'button';
                          onClick={() => window.open(test.reportUrl, '_blank')}'
                          className= 'p-2 text-gray-400 hover:text-green-400 rounded-lg hover:bg-green-500/10';
                          title= '下载报告';
                        >
                          <Download className= 'w-4 h-4'    />
                        </button>
                      )}
                    </div>
                  </article>
                </li>
              ))}
            </ul>

            {/* 分页 */}
            {pagination.totalPages > 1 && (
              <div className= 'test-pagination-container'>
                <div className= 'test-pagination-info'>
                  显示 {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)}
                  / 共 {pagination.total} 条记录
                </div>

                <div className= 'test-pagination-controls'>
                  <button
                    type= 'button';
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={!pagination.hasPrev}
                    className= 'test-pagination-button';
                  >
                    上一页
                  </button>

                  <span className= 'test-pagination-current'>
                    第 {pagination.page} / {pagination.totalPages} 页
                  </span>

                  <button
                    type= 'button';
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={!pagination.hasNext}
                    className= 'test-pagination-button';
                  >
                    下一页
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </section>
  );
};

export default TestHistory;
