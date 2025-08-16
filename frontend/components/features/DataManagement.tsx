/**
 * 统一数据管理组件 - 重构版
 * 整合测试历史、统计分析、数据中心功能
 */

import {
  BarChart3,
  Database,
  FileText,
  Filter,
  RefreshCw,
  // Search
} from 'lucide-react'; // 已修复
import React, { useEffect, useState } from 'react';
import TestHistory from '../ui/TestHistory.tsx';
import {unifiedTestHistoryService} from '../../services/testing/testHistoryService';
import type { TestStatistics, TestType } from '../../types/testHistory';

interface DataManagementProps {
  className?: string;
  defaultTab?: 'history' | 'statistics' | 'export';
}

export const DataManagement: React.FC<DataManagementProps> = ({
  className = '',
  defaultTab = 'history'
}) => {
  // 状态管理
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [statistics, setStatistics] = useState<TestStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTestTypes, setSelectedTestTypes] = useState<TestType[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // 测试类型选项
  const testTypeOptions: { value: TestType; label: string; icon: React.ReactNode }[] = [
    { value: 'stress', label: '压力测试', icon: '⚡' },
    { value: 'security', label: '安全测试', icon: '🛡️' },
    { value: 'api', label: 'API测试', icon: '🔌' },
    { value: 'performance', label: '性能测试', icon: '🚀' },
    { value: 'compatibility', label: '兼容性测试', icon: '🌐' },
    { value: 'seo', label: 'SEO测试', icon: '📈' },
    { value: 'database', label: '数据库测试', icon: '💾' },
    { value: 'network', label: '网络测试', icon: '🌐' }
  ];

  // 标签页配置
  const tabs = [
    {
      id: 'history',
      label: '测试历史',
      icon: FileText,
      description: '查看和管理所有测试记录'
    },
    {
      id: 'statistics',
      label: '统计分析',
      icon: BarChart3,
      description: '测试数据统计和趋势分析'
    },
    {
      id: 'export',
      label: '数据中心',
      icon: Database,
      description: '数据导出、备份和管理'
    }
  ];

  // 加载统计数据
  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    try {
      setLoading(true);
      const stats = await unifiedTestHistoryService.getTestStatistics();
      setStatistics(stats);
    } catch (error) {
      console.error('加载统计数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 刷新数据
  const handleRefresh = async () => {
    unifiedTestHistoryService.clearCache();
    await loadStatistics();
  };

  // 处理搜索
  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  // 处理测试类型过滤
  const handleTestTypeFilter = (testType: TestType) => {
    setSelectedTestTypes(prev =>
      prev.includes(testType)
        ? prev.filter(t => t !== testType)
        : [...prev, testType]
    );
  };

  return (
    <div className={`unified-data-management ${className}`}>
      {/* 页面头部 */}
      <div className="data-management-header">
        <div className="header-content">
          <div className="title-section">
            <h1 className="page-title">
              <Database className="title-icon" />
              数据管理
              <span className="version-badge">v2.0</span>
            </h1>
            <p className="page-description">
              统一管理测试历史、数据分析和导出功能
            </p>
          </div>

          <div className="header-actions">
            <button
              onClick={handleRefresh}
              className="action-button refresh-button"
              disabled={loading}
            >
              <RefreshCw className={`icon ${loading ? 'spinning' : ''}`} />
              刷新
            </button>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`action-button filter-button ${showFilters ? 'active' : ''}`}
            >
              <Filter className="icon" />
              筛选
            </button>
          </div>
        </div>

        {/* 搜索和过滤栏 */}
        <div className={`search-filter-bar ${showFilters ? 'expanded' : ''}`}>
          <div className="search-section">
            <div className="search-input-wrapper">
              <Search className="search-icon" />
              <input
                type="text"
                placeholder="搜索测试名称、URL或标签..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="search-input"
              />
            </div>
          </div>

          {showFilters && (
            <div className="filter-section">
              <div className="filter-group">
                <label className="filter-label">测试类型:</label>
                <div className="test-type-filters">
                  {testTypeOptions.map(option => (
                    <button
                      key={option.value}
                      onClick={() => handleTestTypeFilter(option.value)}
                      className={`test-type-filter ${selectedTestTypes.includes(option.value) ? 'active' : ''
                        }`}
                    >
                      <span className="filter-icon">{option.icon}</span>
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 标签页导航 */}
      <div className="tab-navigation">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            >
              <Icon className="tab-icon" />
              <div className="tab-content">
                <span className="tab-label">{tab.label}</span>
                <span className="tab-description">{tab.description}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* 标签页内容 */}
      <div className="tab-content-area">
        {activeTab === 'history' && (
          <div className="history-tab">
            <TestHistory
              showStatistics={true}
              showFilters={true}
              showBatchActions={true}
              testType={selectedTestTypes.length > 0 ? selectedTestTypes : undefined}
            />
          </div>
        )}

        {activeTab === 'statistics' && (
          <div className="statistics-tab">
            <div className="placeholder-panel">
              <TrendingUp className="placeholder-icon" />
              <h3>统计分析</h3>
              <p>测试数据统计和趋势分析功能正在开发中...</p>
              {statistics && (
                <div className="basic-stats">
                  <p>总测试数: {statistics.totalTests || 0}</p>
                  <p>成功测试: {statistics.completedTests || 0}</p>
                  <p>失败测试: {statistics.failedTests || 0}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'export' && (
          <div className="export-tab">
            <div className="placeholder-panel">
              <Download className="placeholder-icon" />
              <h3>数据中心</h3>
              <p>数据导出、备份和管理功能正在开发中...</p>
            </div>
          </div>
        )}
      </div>

      {/* 样式 */}
      <style jsx>{`
        .unified-data-management {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 20px;
        }

        .data-management-header {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 24px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }

        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
        }

        .title-section {
          flex: 1;
        }

        .page-title {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 28px;
          font-weight: 700;
          color: #1a202c;
          margin: 0 0 8px 0;
        }

        .title-icon {
          width: 32px;
          height: 32px;
          color: #667eea;
        }

        .version-badge {
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          margin-left: 12px;
        }

        .page-description {
          color: #718096;
          font-size: 16px;
          margin: 0;
        }

        .header-actions {
          display: flex;
          gap: 12px;
        }

        .action-button {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          border: 2px solid #e2e8f0;
          border-radius: 10px;
          background: white;
          color: #4a5568;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .action-button:hover {
          border-color: #667eea;
          color: #667eea;
          transform: translateY(-1px);
        }

        .action-button.active {
          background: #667eea;
          border-color: #667eea;
          color: white;
        }

        .action-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .spinning {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .search-filter-bar {
          border-top: 1px solid #e2e8f0;
          padding-top: 20px;
          transition: all 0.3s ease;
        }

        .search-input-wrapper {
          position: relative;
          max-width: 400px;
        }

        .search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          width: 20px;
          height: 20px;
          color: #a0aec0;
        }

        .search-input {
          width: 100%;
          padding: 12px 12px 12px 44px;
          border: 2px solid #e2e8f0;
          border-radius: 10px;
          font-size: 14px;
          transition: border-color 0.2s;
        }

        .search-input:focus {
          outline: none;
          border-color: #667eea;
        }

        .filter-section {
          margin-top: 16px;
        }

        .filter-group {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }

        .filter-label {
          font-weight: 600;
          color: #4a5568;
          white-space: nowrap;
        }

        .test-type-filters {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .test-type-filter {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          background: white;
          color: #4a5568;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .test-type-filter:hover {
          border-color: #667eea;
          color: #667eea;
        }

        .test-type-filter.active {
          background: #667eea;
          border-color: #667eea;
          color: white;
        }

        .tab-navigation {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }

        .tab-button {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 20px;
          background: rgba(255, 255, 255, 0.9);
          border: 2px solid transparent;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
        }

        .tab-button:hover {
          background: white;
          border-color: #667eea;
          transform: translateY(-2px);
          box-shadow: 0 4px 20px rgba(102, 126, 234, 0.15);
        }

        .tab-button.active {
          background: white;
          border-color: #667eea;
          box-shadow: 0 4px 20px rgba(102, 126, 234, 0.2);
        }

        .tab-icon {
          width: 24px;
          height: 24px;
          color: #667eea;
          flex-shrink: 0;
        }

        .tab-content {
          flex: 1;
        }

        .tab-label {
          display: block;
          font-size: 16px;
          font-weight: 600;
          color: #1a202c;
          margin-bottom: 4px;
        }

        .tab-description {
          display: block;
          font-size: 14px;
          color: #718096;
        }

        .tab-content-area {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          min-height: 600px;
        }

        .placeholder-panel {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          text-align: center;
          color: #718096;
        }

        .placeholder-icon {
          width: 64px;
          height: 64px;
          color: #cbd5e0;
          margin-bottom: 20px;
        }

        .placeholder-panel h3 {
          font-size: 24px;
          font-weight: 600;
          color: #4a5568;
          margin: 0 0 12px 0;
        }

        .placeholder-panel p {
          font-size: 16px;
          margin: 0 0 20px 0;
          max-width: 400px;
        }

        .basic-stats {
          background: #f7fafc;
          border-radius: 8px;
          padding: 16px;
          margin-top: 20px;
        }

        .basic-stats p {
          margin: 4px 0;
          font-size: 14px;
          color: #4a5568;
        }

        @media (max-width: 768px) {
          .unified-data-management {
            padding: 12px;
          }

          .header-content {
            flex-direction: column;
            gap: 16px;
          }

          .tab-navigation {
            grid-template-columns: 1fr;
          }

          .filter-group {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>
    </div>
  );
};

export default DataManagement;
