import React, { useState } from 'react';

import { Search, Filter, RefreshCw, ChevronDown, ChevronUp, X, Database, Globe, Zap, Shield, Code, Eye, Wifi, FileText } from 'lucide-react';

interface QueryFilters {
  testType: string;
  status: string;
  dateRange: string;
  scoreRange: [number, number];
  searchQuery: string;
  tags: string[];
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

interface DataQueryPanelProps {
  filters: QueryFilters;
  onFiltersChange: (filters: QueryFilters) => void;
  onSearch: () => void;
  onExport: (format: 'json' | 'csv' | 'excel') => void;
  onReset: () => void;
  resultCount?: number;
  isLoading?: boolean;
}

const DataQueryPanel: React.FC<DataQueryPanelProps> = ({
  filters,
  onFiltersChange,
  onSearch,
  onExport,
  onReset,
  resultCount = 0,
  isLoading = false
}) => {
  
  const memoizedHandleClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    if (disabled || loading) return;
    onClick?.(event);
  }, [disabled, loading, onClick]);
  
  const memoizedHandleChange = useMemo(() => 
    debounce((value: any) => {
      onChange?.(value);
    }, 300), [onChange]
  );
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const testTypes = [
    { value: 'all', label: '全部类型', icon: Database },
    { value: 'website', label: '网站测试', icon: Globe },
    { value: 'stress', label: '压力测试', icon: Zap },
    { value: 'api', label: 'API测试', icon: Code },
    { value: 'ux', label: 'UX测试', icon: Eye },
    { value: 'compatibility', label: '兼容性测试', icon: FileText },
    { value: 'database', label: '数据库测试', icon: Database },
    { value: 'network', label: '网络测试', icon: Wifi },
    { value: 'security', label: '安全测试', icon: Shield }
  ];

  const statusOptions = [
    { value: 'all', label: '全部状态' },
    { value: 'completed', label: '已完成' },
    { value: 'failed', label: '失败' },
    { value: 'running', label: '运行中' }
  ];

  const dateRanges = [
    { value: 'all', label: '全部时间' },
    { value: 'today', label: '今天' },
    { value: 'week', label: '本周' },
    { value: 'month', label: '本月' },
    { value: 'quarter', label: '本季度' },
    { value: 'year', label: '今年' },
    { value: 'custom', label: '自定义' }
  ];

  const sortOptions = [
    { value: 'date', label: '时间' },
    { value: 'score', label: '分数' },
    { value: 'type', label: '类型' },
    { value: 'status', label: '状态' },
    { value: 'duration', label: '耗时' }
  ];

  const commonTags = [
    'production', 'staging', 'development', 'api', 'frontend', 'backend',
    'mobile', 'desktop', 'performance', 'security', 'accessibility'
  ];

  const updateFilter = (key: keyof QueryFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const addTag = (tag: string) => {
    if (!filters.tags.includes(tag)) {
      updateFilter('tags', [...filters.tags, tag]);
    }
  };

  const removeTag = (tag: string) => {
    updateFilter('tags', filters.tags.filter(t => t !== tag));
  };

  const handleReset = () => {
    onReset();
    setShowAdvanced(false);
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
      {/* 基础搜索栏 */}
      <div className="flex items-center space-x-4 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={filters.searchQuery}
            onChange={(e) => updateFilter('searchQuery', e.target.value)}
            placeholder="搜索测试记录..."
            className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            onKeyPress={(e) => e.key === 'Enter' && onSearch()}
          />
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center space-x-2 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
        >
          <Filter className="w-5 h-5" />
          <span>过滤器</span>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        <button
          onClick={onSearch}
          disabled={isLoading}
          className="flex items-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
        >
          {isLoading ? (
            <RefreshCw className="w-5 h-5 animate-spin" />
          ) : (
            <Search className="w-5 h-5" />
          )}
          <span>搜索</span>
        </button>
      </div>

      {/* 展开的过滤器面板 */}
      {isExpanded && (
        <div className="space-y-6">
          {/* 基础过滤器 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 测试类型 */}
            <div>
              <label htmlFor="test-type-select" className="block text-sm font-medium text-gray-300 mb-2">测试类型</label>
              <select
                id="test-type-select"
                value={filters.testType}
                onChange={(e) => updateFilter('testType', e.target.value)}
                className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="选择测试类型"
              >
                {testTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            {/* 状态 */}
            <div>
              <label htmlFor="status-select" className="block text-sm font-medium text-gray-300 mb-2">状态</label>
              <select
                id="status-select"
                value={filters.status}
                onChange={(e) => updateFilter('status', e.target.value)}
                className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="选择测试状态"
              >
                {statusOptions.map(status => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
            </div>

            {/* 时间范围 */}
            <div>
              <label htmlFor="date-range-select" className="block text-sm font-medium text-gray-300 mb-2">时间范围</label>
              <select
                id="date-range-select"
                value={filters.dateRange}
                onChange={(e) => updateFilter('dateRange', e.target.value)}
                className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="选择时间范围"
              >
                {dateRanges.map(range => (
                  <option key={range.value} value={range.value}>{range.label}</option>
                ))}
              </select>
            </div>

            {/* 排序 */}
            <div>
              <label htmlFor="sort-by-select" className="block text-sm font-medium text-gray-300 mb-2">排序</label>
              <div className="flex space-x-2">
                <select
                  id="sort-by-select"
                  value={filters.sortBy}
                  onChange={(e) => updateFilter('sortBy', e.target.value)}
                  className="flex-1 px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="选择排序字段"
                >
                  {sortOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <button
                  onClick={() => updateFilter('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white hover:bg-gray-600 transition-colors"
                  title={filters.sortOrder === 'asc' ? '升序' : '降序'}
                >
                  {filters.sortOrder === 'asc' ? '↑' : '↓'}
                </button>
              </div>
            </div>
          </div>

          {/* 分数范围 */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              分数范围: {filters.scoreRange[0]} - {filters.scoreRange[1]}
            </label>
            <div className="flex items-center space-x-4">
              <input
                id="score-range-min"
                type="range"
                min="0"
                max="100"
                value={filters.scoreRange[0]}
                onChange={(e) => updateFilter('scoreRange', [parseInt(e.target.value), filters.scoreRange[1]])}
                className="flex-1"
                aria-label={`最低分数: ${filters.scoreRange[0]}`}
                title={`最低分数: ${filters.scoreRange[0]}`}
              />
              <input
                id="score-range-max"
                type="range"
                min="0"
                max="100"
                value={filters.scoreRange[1]}
                onChange={(e) => updateFilter('scoreRange', [filters.scoreRange[0], parseInt(e.target.value)])}
                className="flex-1"
                aria-label={`最高分数: ${filters.scoreRange[1]}`}
                title={`最高分数: ${filters.scoreRange[1]}`}
              />
            </div>
          </div>

          {/* 标签 */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">标签</label>
            <div className="space-y-3">
              {/* 已选标签 */}
              {filters.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {filters.tags.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-3 py-1 bg-blue-600 text-white rounded-full text-sm"
                    >
                      {tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="ml-2 hover:text-red-300 transition-colors"
                        aria-label={`删除标签: ${tag}`}
                        title={`删除标签: ${tag}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* 常用标签 */}
              <div className="flex flex-wrap gap-2">
                {commonTags.filter(tag => !filters.tags.includes(tag)).map(tag => (
                  <button
                    key={tag}
                    onClick={() => addTag(tag)}
                    className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-full text-sm transition-colors"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-700">
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-400">
                找到 {resultCount} 条记录
              </span>
            </div>

            <div className="flex items-center space-x-3">
              {/* 导出按钮 */}
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-300">导出:</span>
                <button
                  onClick={() => onExport('json')}
                  className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors"
                >
                  JSON
                </button>
                <button
                  onClick={() => onExport('csv')}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
                >
                  CSV
                </button>
                <button
                  onClick={() => onExport('excel')}
                  className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm transition-colors"
                >
                  Excel
                </button>
              </div>

              {/* 重置按钮 */}
              <button
                onClick={handleReset}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
              >
                重置
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 快速统计 */}
      {!isExpanded && resultCount > 0 && (
        <div className="flex items-center justify-between text-sm text-gray-400">
          <span>找到 {resultCount} 条记录</span>
          <div className="flex items-center space-x-2">
            <span>快速导出:</span>
            <button
              onClick={() => onExport('csv')}
              className="text-blue-400 hover:text-blue-300 transition-colors"
            >
              CSV
            </button>
            <button
              onClick={() => onExport('json')}
              className="text-green-400 hover:text-green-300 transition-colors"
            >
              JSON
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataQueryPanel;
