/**
 * 数据筛选和管理组件
 * 提供高级数据筛选、导出、批量操作功能
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {Filter, Search, Download, Trash2, Edit2, Eye, ChevronDown, RefreshCw, Database, FileText, Settings, MoreVertical, Archive, TrendingUp, CheckCircle} from 'lucide-react';
import { toast } from 'react-hot-toast';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

interface DataItem {
  id: string;
  name: string;
  type: string;
  status: 'active' | 'inactive' | 'pending' | 'archived';
  createdAt: Date;
  updatedAt: Date;
  size: number;
  owner: string;
  tags: string[];
  metrics?: {
    views: number;
    downloads: number;
    shares: number;
  };
  metadata?: Record<string, any>;
}

interface FilterConfig {
  field: string;
  operator: 'equals' | 'contains' | 'gt' | 'lt' | 'between' | 'in';
  value: any;
  label?: string;
}

interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
}

interface DataFiltersProps {
  data?: DataItem[];
  onFilterChange?: (filters: FilterConfig[]) => void;
  onDataExport?: (format: 'json' | 'csv' | 'excel') => void;
  onBulkAction?: (action: string, selectedIds: string[]) => void;
  showAdvancedFilters?: boolean;
  enableBulkOperations?: boolean;
}

const DataFilters: React.FC<DataFiltersProps> = ({
  data: initialData = [],
  onFilterChange,
  onDataExport,
  onBulkAction,
  showAdvancedFilters = true,
  enableBulkOperations = true
}) => {
  // 状态管理
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<FilterConfig[]>([]);
  const [activeFilters, setActiveFilters] = useState<FilterConfig[]>([]);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'createdAt', direction: 'desc' });
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [isLoading, setIsLoading] = useState(false);

  // 生成模拟数据
  const generateMockData = (): DataItem[] => {
    const types = ['document', 'image', 'video', 'dataset', 'report', 'config'];
    const statuses: ('active' | 'inactive' | 'pending' | 'archived')[] = ['active', 'inactive', 'pending', 'archived'];
    const owners = ['张三', '李四', '王五', '赵六', '钱七'];
    const tags = ['重要', '紧急', '已审核', '待处理', '归档', '公开', '私密'];

    return Array.from({ length: 100 }, (_, i) => ({
      id: `item_${i + 1}`,
      name: `数据文件_${i + 1}_${Math.random().toString(36).substr(2, 9)}`,
      type: types[Math.floor(Math.random() * types.length)],
      status: statuses[Math.floor(Math.random() * statuses.length)],
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
      size: Math.floor(Math.random() * 10000000),
      owner: owners[Math.floor(Math.random() * owners.length)],
      tags: tags.sort(() => 0.5 - Math.random()).slice(0, Math.floor(Math.random() * 3) + 1),
      metrics: {
        views: Math.floor(Math.random() * 1000),
        downloads: Math.floor(Math.random() * 100),
        shares: Math.floor(Math.random() * 50)
      }
    }));
  };

  const [data, setData] = useState<DataItem[]>(initialData.length > 0 ? initialData : generateMockData());

  // 获取唯一值用于过滤器选项
  const uniqueTypes = useMemo(() => [...new Set(data?.map(item => item.type))], [data]);
  const uniqueTags = useMemo(() => [...new Set(data?.flatMap(item => item.tags))], [data]);
  const _uniqueOwners = useMemo(() => [...new Set(data?.map(item => item.owner))], [data]);

  // 应用过滤器
  const filteredData = useMemo(() => {
    let result = [...data];

    // 搜索过滤
    if (searchTerm) {
      result = result.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.owner.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // 类型过滤
    if (selectedTypes.length > 0) {
      result = result.filter(item => selectedTypes.includes(item.type));
    }

    // 状态过滤
    if (selectedStatuses.length > 0) {
      result = result.filter(item => selectedStatuses.includes(item.status));
    }

    // 标签过滤
    if (selectedTags.length > 0) {
      result = result.filter(item =>
        item.tags.some(tag => selectedTags.includes(tag))
      );
    }

    // 日期范围过滤
    if (dateRange[0] && dateRange[1]) {
      result = result.filter(item =>
        item.createdAt >= dateRange[0]! && item.createdAt <= dateRange[1]!
      );
    }

    // 自定义过滤器
    activeFilters.forEach(filter => {
      result = result.filter(item => {
        const value = item[filter.field as keyof DataItem];
        switch (filter.operator) {
          case 'equals':
            return value === filter.value;
          case 'contains':
            return String(value).toLowerCase().includes(String(filter.value).toLowerCase());
          case 'gt':
            return value !== undefined && filter.value !== undefined && value > filter.value;
          case 'lt':
            return value !== undefined && filter.value !== undefined && value < filter.value;
          default:
            return true;
        }
      });
    });

    // 排序
    result.sort((a, b) => {
      const aValue = a[sortConfig.field as keyof DataItem];
      const bValue = b[sortConfig.field as keyof DataItem];
      
      if (aValue === bValue) return 0;
      if (aValue === undefined) return 1;
      if (bValue === undefined) return -1;
      
      const comparison = aValue > bValue ? 1 : -1;
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [data, searchTerm, selectedTypes, selectedStatuses, selectedTags, dateRange, activeFilters, sortConfig]);

  // 分页数据
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  // 选择所有项
  const handleSelectAll = () => {
    if (selectedItems.size === paginatedData.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(paginatedData.map(item => item.id)));
    }
  };

  // 选择单个项
  const handleSelectItem = (id: string) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedItems(newSelection);
  };

  // 添加自定义过滤器
  const _addCustomFilter = () => {
    const newFilter: FilterConfig = {
      field: 'name',
      operator: 'contains',
      value: '',
      label: '自定义过滤器'
    };
    setFilters([...filters, newFilter]);
  };

  // 删除过滤器
  const _removeFilter = (index: number) => {
    const newFilters = filters.filter((_, i) => i !== index);
    setFilters(newFilters);
  };

  // 应用过滤器
  const applyFilters = () => {
    setActiveFilters(filters.filter(f => f.value));
    if (onFilterChange) {
      onFilterChange(filters.filter(f => f.value));
    }
    toast.success('过滤器已应用');
  };

  // 重置过滤器
  const resetFilters = () => {
    setSearchTerm('');
    setFilters([]);
    setActiveFilters([]);
    setSelectedTypes([]);
    setSelectedStatuses([]);
    setSelectedTags([]);
    setDateRange([null, null]);
    setSelectedItems(new Set());
    toast.success('过滤器已重置');
  };

  // 导出数据
  const handleExport = (format: 'json' | 'csv' | 'excel') => {
    setIsLoading(true);
    
    setTimeout(() => {
      const exportData = selectedItems.size > 0
        ? data?.filter(item => selectedItems.has(item.id))
        : filteredData;

      if (format === 'json') {
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        downloadFile(blob, `data_export_${Date.now()}.json`);
      } else if (format === 'csv') {
        const csv = convertToCSV(exportData);
        const blob = new Blob([csv], { type: 'text/csv' });
        downloadFile(blob, `data_export_${Date.now()}.csv`);
      } else if (format === 'excel') {
        // 这里应该使用专门的库如 xlsx
        toast.error('Excel导出功能开发中');
      }

      if (onDataExport) {
        onDataExport(format);
      }

      setIsLoading(false);
      toast.success(`数据已导出为${format.toUpperCase()}格式`);
    }, 1000);
  };

  // 转换为CSV
  const convertToCSV = (data: DataItem[]): string => {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]).filter(key => key !== 'metadata').join(',');
    const rows = data?.map(item =>
      Object.entries(item)
        .filter(([key]) => key !== 'metadata')
        .map(([_, value]) => {
          if (Array.isArray(value)) return value.join(';');
          if (value instanceof Date) return value.toISOString();
          if (typeof value === 'object') return JSON.stringify(value);
          return String(value);
        })
        .join(',')
    );
    
    return [headers, ...rows].join('\n');
  };

  // 下载文件
  const downloadFile = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a?.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 批量操作
  const handleBulkOperation = (action: string) => {
    if (selectedItems.size === 0) {
      toast.error('请先选择要操作的项目');
      return;
    }

    setIsLoading(true);
    
    setTimeout(() => {

      
      /**

      
       * switch功能函数

      
       * @param {Object} params - 参数对象

      
       * @returns {Promise<Object>} 返回结果

      
       */
      const selectedIds = Array.from(selectedItems);
      
      switch (action) {
        case 'delete':
          setData(prev => prev.filter(item => !selectedItems.has(item.id)));
          toast.success(`已删除${selectedItems.size}个项目`);
          break;
        case 'archive':
          setData(prev => prev.map(item =>
            selectedItems.has(item.id) ? { ...item, status: 'archived' as const } : item
          ));
          toast.success(`已归档${selectedItems.size}个项目`);
          break;
        case 'activate':
          setData(prev => prev.map(item =>
            selectedItems.has(item.id) ? { ...item, status: 'active' as const } : item
          ));
          toast.success(`已激活${selectedItems.size}个项目`);
          break;
        default:
          break;
      }

      if (onBulkAction) {
        onBulkAction(action, selectedIds);
      }

      setSelectedItems(new Set());
      setIsLoading(false);
    }, 1000);
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  };

  // 格式化日期
  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'archived':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // 获取类型图标
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'document':
        return <FileText className="h-4 w-4" />;
      case 'dataset':
        return <Database className="h-4 w-4" />;
      case 'report':
        return <TrendingUp className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* 工具栏 */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Database className="h-6 w-6 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">数据管理</h2>
            <span className="text-sm text-gray-500">
              共 {filteredData.length} 条记录
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {/* 视图切换 */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1 rounded ${
                  viewMode === 'list' ? 'bg-white shadow-sm' : ''
                } transition-all`}
              >
                列表
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1 rounded ${
                  viewMode === 'grid' ? 'bg-white shadow-sm' : ''
                } transition-all`}
              >
                网格
              </button>
            </div>

            {/* 刷新按钮 */}
            <button
              onClick={() => setData(generateMockData())}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            {/* 设置按钮 */}
            <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* 搜索和过滤器栏 */}
        <div className="flex items-center space-x-4">
          {/* 搜索框 */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e?.target.value)}
              placeholder="搜索数据..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 过滤器按钮 */}
          <button
            onClick={() => setShowFilterPanel(!showFilterPanel)}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2"
          >
            <Filter className="h-5 w-5 text-gray-600" />
            <span>过滤器</span>
            {activeFilters.length > 0 && (
              <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
                {activeFilters.length}
              </span>
            )}
          </button>

          {/* 导出按钮 */}
          <div className="relative group">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2">
              <Download className="h-5 w-5" />
              <span>导出</span>
              <ChevronDown className="h-4 w-4" />
            </button>
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <button
                onClick={() => handleExport('json')}
                className="block w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors"
              >
                导出为 JSON
              </button>
              <button
                onClick={() => handleExport('csv')}
                className="block w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors"
              >
                导出为 CSV
              </button>
              <button
                onClick={() => handleExport('excel')}
                className="block w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors"
              >
                导出为 Excel
              </button>
            </div>
          </div>
        </div>

        {/* 过滤器面板 */}
        {showFilterPanel && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 类型过滤 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  类型
                </label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {uniqueTypes.map(type => (
                    <label key={type} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedTypes.includes(type)}
                        onChange={(e) => {
                          if (e?.target.checked) {
                            setSelectedTypes([...selectedTypes, type]);
                          } else {
                            setSelectedTypes(selectedTypes.filter(t => t !== type));
                          }
                        }}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">{type}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 状态过滤 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  状态
                </label>
                <div className="space-y-2">
                  {['active', 'inactive', 'pending', 'archived'].map(status => (
                    <label key={status} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedStatuses.includes(status)}
                        onChange={(e) => {
                          if (e?.target.checked) {
                            setSelectedStatuses([...selectedStatuses, status]);
                          } else {
                            setSelectedStatuses(selectedStatuses.filter(s => s !== status));
                          }
                        }}
                        className="mr-2"
                      />
                      <span className={`text-sm px-2 py-0.5 rounded ${getStatusColor(status)}`}>
                        {status}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 标签过滤 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  标签
                </label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {uniqueTags.map(tag => (
                    <label key={tag} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedTags.includes(tag)}
                        onChange={(e) => {
                          if (e?.target.checked) {
                            setSelectedTags([...selectedTags, tag]);
                          } else {
                            setSelectedTags(selectedTags.filter(t => t !== tag));
                          }
                        }}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">{tag}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 日期范围 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  创建日期
                </label>
                <DatePicker
                  selectsRange
                  startDate={dateRange[0]}
                  endDate={dateRange[1]}
                  onChange={(update: [Date | null, Date | null]) => {
                    setDateRange(update);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholderText="选择日期范围"
                  dateFormat="yyyy-MM-dd"
                />
              </div>
            </div>

            {/* 过滤器操作按钮 */}
            <div className="mt-4 flex justify-end space-x-2">
              <button
                onClick={resetFilters}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                重置
              </button>
              <button
                onClick={applyFilters}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                应用过滤器
              </button>
            </div>
          </div>
        )}

        {/* 批量操作栏 */}
        {enableBulkOperations && selectedItems.size > 0 && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg flex items-center justify-between">
            <span className="text-sm text-blue-700">
              已选择 {selectedItems.size} 个项目
            </span>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleBulkOperation('delete')}
                className="px-3 py-1 text-red-600 hover:bg-red-50 rounded transition-colors flex items-center space-x-1"
              >
                <Trash2 className="h-4 w-4" />
                <span>删除</span>
              </button>
              <button
                onClick={() => handleBulkOperation('archive')}
                className="px-3 py-1 text-blue-600 hover:bg-blue-100 rounded transition-colors flex items-center space-x-1"
              >
                <Archive className="h-4 w-4" />
                <span>归档</span>
              </button>
              <button
                onClick={() => handleBulkOperation('activate')}
                className="px-3 py-1 text-green-600 hover:bg-green-50 rounded transition-colors flex items-center space-x-1"
              >
                <CheckCircle className="h-4 w-4" />
                <span>激活</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 数据表格 */}
      {viewMode === 'list' ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {enableBulkOperations && (
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedItems.size === paginatedData.length && paginatedData.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300"
                    />
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  名称
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  类型
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  大小
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  所有者
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  创建时间
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  标签
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedData.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  {enableBulkOperations && (
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedItems.has(item.id)}
                        onChange={() => handleSelectItem(item.id)}
                        className="rounded border-gray-300"
                      />
                    </td>
                  )}
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      {getTypeIcon(item.type)}
                      <span className="ml-2 text-sm font-medium text-gray-900">
                        {item.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {item.type}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(item.status)}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {formatFileSize(item.size)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {item.owner}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {formatDate(item.createdAt)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {item.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <button className="text-gray-600 hover:text-blue-600 transition-colors">
                        <Eye className="h-4 w-4" />
                      </button>
                      <button className="text-gray-600 hover:text-green-600 transition-colors">
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button className="text-gray-600 hover:text-red-600 transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <button className="text-gray-600 hover:text-gray-900 transition-colors">
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        // 网格视图
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {paginatedData.map((item) => (
            <div
              key={item.id}
              className="bg-white border border-gray-200 rounded-lg hover:shadow-lg transition-shadow cursor-pointer"
            >
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center">
                    {getTypeIcon(item.type)}
                    <span className="ml-2 text-sm font-medium text-gray-900 truncate">
                      {item.name}
                    </span>
                  </div>
                  {enableBulkOperations && (
                    <input
                      type="checkbox"
                      checked={selectedItems.has(item.id)}
                      onChange={() => handleSelectItem(item.id)}
                      className="rounded border-gray-300"
                    />
                  )}
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">状态</span>
                    <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusColor(item.status)}`}>
                      {item.status}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">大小</span>
                    <span className="text-xs text-gray-700">{formatFileSize(item.size)}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">所有者</span>
                    <span className="text-xs text-gray-700">{item.owner}</span>
                  </div>
                  
                  <div className="flex flex-wrap gap-1 mt-2">
                    {item.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    {formatDate(item.createdAt)}
                  </span>
                  <div className="flex items-center space-x-1">
                    <button className="text-gray-600 hover:text-blue-600 transition-colors">
                      <Eye className="h-3 w-3" />
                    </button>
                    <button className="text-gray-600 hover:text-green-600 transition-colors">
                      <Edit2 className="h-3 w-3" />
                    </button>
                    <button className="text-gray-600 hover:text-red-600 transition-colors">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-700">
              显示 {((currentPage - 1) * itemsPerPage) + 1} 到 {Math.min(currentPage * itemsPerPage, filteredData.length)} 条，
              共 {filteredData.length} 条
            </span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e?.target.value));
                setCurrentPage(1);
              }}
              className="ml-2 px-3 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={10}>10条/页</option>
              <option value={20}>20条/页</option>
              <option value={50}>50条/页</option>
              <option value={100}>100条/页</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              上一页
            </button>

            {/* 页码 */}
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-1 rounded-lg ${
                      currentPage === pageNum
                        ? 'bg-blue-600 text-white'
                        : 'hover:bg-gray-50'
                    } transition-colors`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              下一页
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataFilters;
