import {
  Activity,
  BarChart3,
  Database,
  Download,
  FileText
} from 'lucide-react';
import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';

// 组件导入
import AnalyticsOverview from '../../components/analytics/AnalyticsOverview';
import ImportExport from '../../components/analytics/ImportExport';
import RealTimeMonitoring from '../../components/analytics/RealTimeMonitoring';
import ReportManagement from '../../components/analytics/ReportManagement';
import { Pagination } from '../../components/shared';
import { TestResultDisplay } from '../../components/testing';

// 本地组件导入
import { DataFilters, DataList, DataStats } from './components';

// Hook导入
import { TestRecord, useDataStorage } from '../../hooks/useDataStorage';

const DataStorage: React.FC = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'history' | 'reports' | 'import-export' | 'analytics' | 'monitoring'>('history');
  const [selectedRecord, setSelectedRecord] = useState<TestRecord | null>(null);
  const [showTestResult, setShowTestResult] = useState(false);

  // 使用数据管理Hook
  const {
    testRecords,
    loading,
    error,
    pagination,
    filters,
    sortBy,
    sortOrder,
    handlePageChange,
    handlePageSizeChange,
    handleSort,
    updateFilters,
    deleteRecord,
    refreshData
  } = useDataStorage();

  // 根据URL路径设置活跃标签页
  React.useEffect(() => {
    const path = location.pathname;
    if (path.includes('/analytics')) {
      setActiveTab('analytics');
    } else if (path.includes('/monitoring')) {
      setActiveTab('monitoring');
    } else if (path.includes('/reports')) {
      setActiveTab('reports');
    } else if (path.includes('/import-export')) {
      setActiveTab('import-export');
    } else {
      setActiveTab('history');
    }
  }, [location.pathname]);

  // 记录操作处理
  const handleViewRecord = (record: TestRecord) => {
    setSelectedRecord(record);
    setShowTestResult(true);
  };

  const handleEditRecord = (record: TestRecord) => {
    console.log('编辑记录:', record);
    // TODO: 实现编辑功能
  };

  const handleCopyRecord = (record: TestRecord) => {
    console.log('复制记录:', record);
    // TODO: 实现复制功能
  };

  const handleDeleteRecord = async (id: string) => {
    if (window.confirm('确定要删除这条记录吗？')) {
      await deleteRecord(id);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 页面标题 */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <Database className="w-8 h-8 text-blue-400" />
              <div>
                <h1 className="text-2xl font-bold text-white">数据中心</h1>
                <p className="text-gray-300">从数据存储到深度分析的完整数据管理平台</p>
              </div>
            </div>
          </div>

          {/* 标签页导航 */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex space-x-1 flex-wrap">
              {[
                { id: 'history', label: '测试数据', icon: FileText },
                { id: 'analytics', label: '数据概览', icon: BarChart3 },
                { id: 'monitoring', label: '实时监控', icon: Activity, badge: 'NEW' },
                { id: 'reports', label: '报告管理', icon: BarChart3 },
                { id: 'import-export', label: '导入导出', icon: Download }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors relative ${activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
                    }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-green-500 text-white text-xs rounded-full">
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 错误显示 */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4">
            <p className="text-red-400">错误: {error}</p>
          </div>
        )}

        {/* 标签页内容 */}
        {activeTab === 'history' && (
          <>
            {/* 统计信息 */}
            <DataStats
              records={testRecords}
              pagination={pagination}
              loading={loading}
            />

            {/* 过滤器 */}
            <DataFilters
              filters={filters}
              onFiltersChange={updateFilters}
              onRefresh={refreshData}
              loading={loading}
            />

            {/* 数据列表 */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">
                  测试记录 (第 {pagination.page} 页，共 {pagination.total} 条)
                </h3>
              </div>

              <DataList
                records={testRecords}
                loading={loading}
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSort={handleSort}
                onView={handleViewRecord}
                onEdit={handleEditRecord}
                onCopy={handleCopyRecord}
                onDelete={handleDeleteRecord}
              />

              {/* 分页 */}
              {pagination.totalPages > 1 && (
                <div className="mt-6 pt-4 border-t border-gray-700/50">
                  <Pagination
                    current={pagination.page}
                    total={pagination.total}
                    pageSize={pagination.limit}
                    totalPages={pagination.totalPages}
                    onChange={handlePageChange}
                    onPageSizeChange={handlePageSizeChange}
                    showSizeChanger={true}
                    showTotal={true}
                  />
                </div>
              )}
            </div>
          </>
        )}

        {/* 其他标签页内容 */}
        {activeTab === 'reports' && <ReportManagement />}
        {activeTab === 'analytics' && <AnalyticsOverview />}
        {activeTab === 'monitoring' && <RealTimeMonitoring />}
        {activeTab === 'import-export' && <ImportExport />}

        {/* 测试结果详情弹窗 */}
        {showTestResult && selectedRecord && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">测试结果详情</h2>
                <button
                  type="button"
                  onClick={() => {
                    setShowTestResult(false);
                    setSelectedRecord(null);
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              <TestResultDisplay
                result={{
                  ...selectedRecord,
                  testId: selectedRecord.id, // 将 id 映射为 testId
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DataStorage;
