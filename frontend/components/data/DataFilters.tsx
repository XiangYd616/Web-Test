import { useState } from 'react';
import type { FC } from 'react';
import { ChevronDown, Filter, RefreshCw, Search } from 'lucide-react';
import { FilterOptions } from '../../../hooks/useDataStorage';

interface DataFiltersProps {
  filters: FilterOptions;
  onFiltersChange: (filters: Partial<FilterOptions>) => void;
  onRefresh: () => void;
  loading: boolean;
}

const DataFilters: React.FC<DataFiltersProps> = ({
  filters,
  onFiltersChange,
  onRefresh,
  loading
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const testTypes = [
    { value: '', label: '全部类型' },
    { value: 'website', label: '网站测试' },
    { value: 'security', label: '安全检测' },
    { value: 'api', label: 'API测试' },
    { value: 'network', label: '网络测试' },
    { value: 'performance', label: '性能测试' }
  ];

  const statusOptions = [
    { value: '', label: '全部状态' },
    { value: 'completed', label: '已完成' },
    { value: 'failed', label: '失败' },
    { value: 'running', label: '运行中' }
  ];

  const dateRangeOptions = [
    { value: '', label: '全部时间' },
    { value: 'today', label: '今天' },
    { value: 'week', label: '本周' },
    { value: 'month', label: '本月' },
    { value: 'quarter', label: '本季度' }
  ];

  const handleSearchChange = (value: string) => {
    onFiltersChange({ searchQuery: value });
  };

  const handleFilterChange = (key: keyof FilterOptions, value: any) => {
    onFiltersChange({ [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({
      testType: '',
      status: '',
      dateRange: '',
      scoreRange: [0, 100],
      searchQuery: ''
    });
  };

  const hasActiveFilters = filters.testType || filters.status || filters.dateRange ||
    filters.searchQuery || filters.scoreRange[0] > 0 || filters.scoreRange[1] < 100;

  return (
    <section className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6" aria-label="数据过滤器">
      {/* 基础过滤器 */}
      <form className="flex flex-wrap items-center gap-4 mb-4">
        {/* 搜索框 */}
        <label className="flex-1 min-w-[200px] max-w-md relative">
          <span className="sr-only">搜索测试记录</span>
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="search"
            placeholder="搜索测试记录..."
            value={filters.searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </label>

        {/* 测试类型 */}
        <label htmlFor="test-type-filter">
          <span className="sr-only">选择测试类型</span>
          <select
            id="test-type-filter"
            value={filters.testType}
            onChange={(e) => handleFilterChange('testType', e.target.value)}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {testTypes.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </label>

        {/* 状态 */}
        <label htmlFor="status-filter">
          <span className="sr-only">选择状态</span>
          <select
            id="status-filter"
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {statusOptions.map(status => (
              <option key={status.value} value={status.value}>{status.label}</option>
            ))}
          </select>
        </label>

        {/* 时间范围 */}
        <label htmlFor="date-range-filter">
          <span className="sr-only">选择时间范围</span>
          <select
            id="date-range-filter"
            value={filters.dateRange}
            onChange={(e) => handleFilterChange('dateRange', e.target.value)}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {dateRangeOptions.map(range => (
              <option key={range.value} value={range.value}>{range.label}</option>
            ))}
          </select>
        </label>

        {/* 高级过滤器切换 */}
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${showAdvanced ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
            }`}
          aria-expanded={showAdvanced}
          aria-controls="advanced-filters"
        >
          <Filter className="w-4 h-4" />
          <span>高级</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
        </button>

        {/* 刷新按钮 */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center space-x-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
          aria-label="刷新数据"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>刷新</span>
        </button>

        {/* 清除过滤器 */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="px-3 py-2 text-gray-400 hover:text-white transition-colors"
            aria-label="清除所有过滤器"
          >
            清除过滤器
          </button>
        )}
      </form>

      {/* 高级过滤器 */}
      {showAdvanced && (
        <fieldset id="advanced-filters" className="border-t border-gray-700/50 pt-4">
          <legend className="sr-only">高级过滤选项</legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 分数范围 */}
            <fieldset>
              <legend className="block text-sm font-medium text-gray-300 mb-2">
                分数范围: {filters.scoreRange[0]} - {filters.scoreRange[1]}
              </legend>
              <div className="flex items-center space-x-3">
                <label className="flex-1">
                  <span className="sr-only">最小分数</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={filters.scoreRange[0]}
                    onChange={(e) => handleFilterChange('scoreRange', [parseInt(e.target.value), filters.scoreRange[1]])}
                    className="w-full"
                  />
                </label>
                <label className="flex-1">
                  <span className="sr-only">最大分数</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={filters.scoreRange[1]}
                    onChange={(e) => handleFilterChange('scoreRange', [filters.scoreRange[0], parseInt(e.target.value)])}
                    className="w-full"
                  />
                </label>
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>0</span>
                <span>50</span>
                <span>100</span>
              </div>
            </fieldset>

            {/* 其他高级选项可以在这里添加 */}
            <fieldset>
              <legend className="block text-sm font-medium text-gray-300 mb-2">
                其他选项
              </legend>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-300">仅显示有建议的测试</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-300">仅显示最近更新</span>
                </label>
              </div>
            </fieldset>
          </div>
        </fieldset>
      )}

      {/* 活跃过滤器显示 */}
      {hasActiveFilters && (
        <footer className="mt-4 pt-4 border-t border-gray-700/50">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-400">活跃过滤器:</span>
            {filters.testType && (
              <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">
                类型: {testTypes.find(t => t.value === filters.testType)?.label}
              </span>
            )}
            {filters.status && (
              <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">
                状态: {statusOptions.find(s => s.value === filters.status)?.label}
              </span>
            )}
            {filters.dateRange && (
              <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs">
                时间: {dateRangeOptions.find(d => d.value === filters.dateRange)?.label}
              </span>
            )}
            {filters.searchQuery && (
              <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs">
                搜索: {filters.searchQuery}
              </span>
            )}
          </div>
        </footer>
      )}
    </section>
  );
};

export default DataFilters;
