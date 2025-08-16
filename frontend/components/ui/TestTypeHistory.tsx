/**
 * 测试类型专属历史组件
 * 用于在每个测试页面显示该测试类型的历史记录
 */

import { Calendar, Download, Eye, Filter, MoreHorizontal, RefreshCw, Search, Star, // Trash2 } from 'lucide-react'; // 已修复
import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import type { TestRecord, TestType } from '../../types/testHistory';

interface TestTypeHistoryProps {
  testType: TestType;
  className?: string;
  compact?: boolean;
  maxHeight?: string;
  onTestSelect?: (test: TestRecord) => void;
  onTestRerun?: (test: TestRecord) => void;
  showActions?: boolean;
}

export const TestTypeHistory: React.FC<TestTypeHistoryProps> = ({
  testType,
  className = '',
  compact = false,
  maxHeight = '600px',
  onTestSelect,
  onTestRerun,
  showActions = true
}) => {
  const { isAuthenticated } = useAuth();
  
  // 状态管理
  const [tests, setTests] = useState<TestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTest, setSelectedTest] = useState<string | null>(null);

  // 分页状态
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const limit = compact ? 5 : 10;

  // 测试类型配置
  const testTypeConfig = {
    stress: { name: '压力测试', icon: '⚡', color: 'var(--color-danger)' },
    performance: { name: '性能测试', icon: '🚀', color: 'var(--color-primary)' },
    security: { name: '安全测试', icon: '🛡️', color: 'var(--color-warning)' },
    api: { name: 'API测试', icon: '🔌', color: '#8b5cf6' },
    compatibility: { name: '兼容性测试', icon: '🌐', color: '#06b6d4' },
    seo: { name: 'SEO测试', icon: '📈', color: 'var(--color-success)' },
    accessibility: { name: '可访问性测试', icon: '♿', color: '#6366f1' }
  };

  const config = testTypeConfig[testType] || { name: '测试', icon: '🔧', color: 'var(--color-gray-500)' };

  // 加载测试历史
  const loadTestHistory = useCallback(async (reset = false) => {
    if (!isAuthenticated) return;

    try {
      setLoading(true);
      const currentPage = reset ? 1 : page;
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
        testType,
        ...(searchQuery && { search: searchQuery }),
        ...(statusFilter !== 'all' && { status: statusFilter })
      });

      const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
      const response = await fetch(`/api/test/history?${params}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('获取测试历史失败');
      }

      const data = await response.json();
      
      if (data.success) {
        if (reset) {
          setTests(data.data.tests);
          setPage(1);
        } else {
          setTests(prev => [...prev, ...data.data.tests]);
        }
        setHasMore(data.data.pagination.hasNext);
      }
    } catch (error) {
      console.error('获取测试历史失败:', error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, testType, searchQuery, statusFilter, page, limit]);

  // 初始加载和搜索变化时重新加载
  useEffect(() => {
    loadTestHistory(true);
  }, [testType, searchQuery, statusFilter]);

  // 加载更多
  const loadMore = () => {
    if (!loading && hasMore) {
      setPage(prev => prev + 1);
      loadTestHistory(false);
    }
  };

  // 处理搜索
  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  // 处理状态筛选
  const handleStatusFilter = (status: string) => {
    setStatusFilter(status);
  };

  // 处理测试选择
  const handleTestClick = (test: TestRecord) => {
    setSelectedTest(test.id);
    onTestSelect?.(test);
  };

  // 处理重新运行
  const handleRerun = (test: TestRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    onTestRerun?.(test);
  };

  // 格式化时间
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;
    return date.toLocaleDateString('zh-CN');
  };

  // 获取状态样式
  const getStatusStyle = (status: string) => {
    const styles = {
      completed: 'bg-green-100 text-green-800',
      running: 'bg-blue-100 text-blue-800',
      failed: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800',
      cancelled: 'bg-gray-100 text-gray-800'
    };
    return styles[status as keyof typeof styles] || styles.pending;
  };

  // 获取状态文本
  const getStatusText = (status: string) => {
    const texts = {
      completed: '已完成',
      running: '运行中',
      failed: '失败',
      pending: '等待中',
      cancelled: '已取消'
    };
    return texts[status as keyof typeof texts] || status;
  };

  if (!isAuthenticated) {
    
        return (
      <div className="test-type-history-empty">
        <p>请登录后查看测试历史</p>
      </div>
    );
      }

  return (
    <div className={`test-type-history ${className}`} style={{ maxHeight }}>
      {/* 头部 */}
      <div className="history-header">
        <div className="header-title">
          <span className="test-icon">{config.icon}</span>
          <h3>{config.name}历史</h3>
          <span className="test-count">({tests.length})</span>
        </div>
        
        {!compact && (
          <div className="header-actions">
            <button
              onClick={() => loadTestHistory(true)}
              className="action-btn refresh-btn"
              disabled={loading}
            >
              <RefreshCw className={`icon ${loading ? 'spinning' : ''}`} />
            </button>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`action-btn filter-btn ${showFilters ? 'active' : ''}`}
            >
              <Filter className="icon" />
            </button>
          </div>
        )}
      </div>

      {/* 搜索和筛选 */}
      {(!compact || showFilters) && (
        <div className="history-filters">
          <div className="search-box">
            <Search className="search-icon" />
            <input
              type="text"
              placeholder="搜索测试名称或URL..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="search-input"
            />
          </div>
          
          {showFilters && (
            <div className="status-filters">
              {['all', 'completed', 'running', 'failed'].map(status => (
                <button
                  key={status}
                  onClick={() => handleStatusFilter(status)}
                  className={`status-filter ${statusFilter === status ? 'active' : ''}`}
                >
                  {status === 'all' ? '全部' : getStatusText(status)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 测试列表 */}
      <div className="history-list">
        {tests.length === 0 && !loading ? (
          <div className="empty-state">
            <div className="empty-icon">{config.icon}</div>
            <p>暂无{config.name}历史记录</p>
            <p className="empty-hint">完成测试后，历史记录将显示在这里</p>
          </div>
        ) : (
          tests.map(test => (
            <div
              key={test.id}
              className={`history-item ${selectedTest === test.id ? 'selected' : ''}`}
              onClick={() => handleTestClick(test)}
            >
              <div className="item-main">
                <div className="item-header">
                  <h4 className="test-name">{test.testName}</h4>
                  <span className={`status-badge ${getStatusStyle(test.status)}`}>
                    {getStatusText(test.status)}
                  </span>
                </div>
                
                <div className="item-details">
                  <span className="test-url">{test.url}</span>
                  <span className="test-time">
                    <Calendar className="time-icon" />
                    {formatTime(test.createdAt)}
                  </span>
                </div>
                
                {test.overallScore && (
                  <div className="item-score">
                    <Star className="score-icon" />
                    <span className="score-value">{test.overallScore}</span>
                  </div>
                )}
              </div>
              
              {showActions && (
                <div className="item-actions">
                  <button
                    onClick={(e) => handleTestClick(test)}
                    className="action-btn view-btn"
                    title="查看详情"
                  >
                    <Eye className="icon" />
                  </button>
                  
                  {onTestRerun && test.status === 'completed' && (
                    <button
                      onClick={(e) => handleRerun(test, e)}
                      className="action-btn rerun-btn"
                      title="重新运行"
                    >
                      <RefreshCw className="icon" />
                    </button>
                  )}
                  
                  <button className="action-btn more-btn" title="更多操作">
                    <MoreHorizontal className="icon" />
                  </button>
                </div>
              )}
            </div>
          ))
        )}
        
        {/* 加载更多 */}
        {hasMore && !loading && (
          <button onClick={loadMore} className="load-more-btn">
            加载更多
          </button>
        )}
        
        {loading && (
          <div className="loading-indicator">
            <RefreshCw className="spinning" />
            <span>加载中...</span>
          </div>
        )}
      </div>

      {/* 样式 */}
      <style jsx>{`
        .test-type-history {
          background: white;
          border-radius: var(--radius-2xl);
          border: 1px solid var(--color-gray-200);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .history-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--spacing-4) 20px;
          border-bottom: 1px solid var(--color-gray-100);
          background: #fafafa;
        }

        .header-title {
          display: flex;
          align-items: center;
          gap: var(--spacing-2);
        }

        .test-icon {
          font-size: var(--font-size-xl);
        }

        .header-title h3 {
          margin: 0;
          font-size: var(--font-size-base);
          font-weight: 600;
          color: var(--color-gray-800);
        }

        .test-count {
          color: var(--color-gray-500);
          font-size: var(--font-size-sm);
        }

        .header-actions {
          display: flex;
          gap: var(--spacing-2);
        }

        .action-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: var(--spacing-8);
          height: var(--spacing-8);
          border: 1px solid var(--color-gray-300);
          border-radius: var(--radius-lg);
          background: white;
          cursor: pointer;
          transition: all 0.2s;
        }

        .action-btn:hover {
          border-color: ${config.color};
          color: ${config.color};
        }

        .action-btn.active {
          background: ${config.color};
          border-color: ${config.color};
          color: white;
        }

        .icon {
          width: var(--spacing-4);
          height: var(--spacing-4);
        }

        .spinning {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .history-filters {
          padding: var(--spacing-4) 20px;
          border-bottom: 1px solid var(--color-gray-100);
          background: #fafafa;
        }

        .search-box {
          position: relative;
          margin-bottom: var(--spacing-3);
        }

        .search-icon {
          position: absolute;
          left: var(--spacing-3);
          top: 50%;
          transform: translateY(-50%);
          width: var(--spacing-4);
          height: var(--spacing-4);
          color: var(--color-gray-400);
        }

        .search-input {
          width: 100%;
          padding: var(--spacing-2) 12px 8px 36px;
          border: 1px solid var(--color-gray-300);
          border-radius: var(--radius-lg);
          font-size: var(--font-size-sm);
        }

        .search-input:focus {
          outline: none;
          border-color: ${config.color};
        }

        .status-filters {
          display: flex;
          gap: var(--spacing-2);
          flex-wrap: wrap;
        }

        .status-filter {
          padding: var(--spacing-1) 12px;
          border: 1px solid var(--color-gray-300);
          border-radius: var(--radius-3xl);
          background: white;
          font-size: var(--font-size-xs);
          cursor: pointer;
          transition: all 0.2s;
        }

        .status-filter:hover {
          border-color: ${config.color};
        }

        .status-filter.active {
          background: ${config.color};
          border-color: ${config.color};
          color: white;
        }

        .history-list {
          flex: 1;
          overflow-y: auto;
          padding: var(--spacing-2);
        }

        .empty-state {
          text-align: center;
          padding: var(--spacing-10) 20px;
          color: var(--color-gray-500);
        }

        .empty-icon {
          font-size: 48px;
          margin-bottom: var(--spacing-4);
        }

        .empty-hint {
          font-size: var(--font-size-sm);
          margin-top: var(--spacing-2);
        }

        .history-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--spacing-3) 16px;
          margin-bottom: var(--spacing-2);
          border: 1px solid var(--color-gray-200);
          border-radius: var(--radius-xl);
          cursor: pointer;
          transition: all 0.2s;
        }

        .history-item:hover {
          border-color: ${config.color};
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .history-item.selected {
          border-color: ${config.color};
          background: ${config.color}08;
        }

        .item-main {
          flex: 1;
        }

        .item-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--spacing-2);
        }

        .test-name {
          margin: 0;
          font-size: var(--font-size-sm);
          font-weight: 500;
          color: var(--color-gray-800);
        }

        .status-badge {
          padding: var(--spacing-0\.5) 8px;
          border-radius: var(--radius-2xl);
          font-size: var(--font-size-xs);
          font-weight: 500;
        }

        .item-details {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: var(--font-size-xs);
          color: var(--color-gray-500);
        }

        .test-url {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          margin-right: var(--spacing-3);
        }

        .test-time {
          display: flex;
          align-items: center;
          gap: var(--spacing-1);
        }

        .time-icon {
          width: var(--spacing-3);
          height: var(--spacing-3);
        }

        .item-score {
          display: flex;
          align-items: center;
          gap: var(--spacing-1);
          margin-top: var(--spacing-2);
          color: ${config.color};
          font-size: var(--font-size-sm);
          font-weight: 500;
        }

        .score-icon {
          width: 14px;
          height: 14px;
        }

        .item-actions {
          display: flex;
          gap: var(--spacing-1);
          margin-left: var(--spacing-3);
        }

        .view-btn:hover {
          color: var(--color-primary);
          border-color: var(--color-primary);
        }

        .rerun-btn:hover {
          color: var(--color-success);
          border-color: var(--color-success);
        }

        .load-more-btn {
          width: 100%;
          padding: var(--spacing-3);
          border: 1px dashed var(--color-gray-300);
          border-radius: var(--radius-xl);
          background: white;
          color: var(--color-gray-500);
          cursor: pointer;
          transition: all 0.2s;
        }

        .load-more-btn:hover {
          border-color: ${config.color};
          color: ${config.color};
        }

        .loading-indicator {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--spacing-2);
          padding: var(--spacing-5);
          color: var(--color-gray-500);
        }
      `}</style>
    </div>
  );
};

export default TestTypeHistory;
